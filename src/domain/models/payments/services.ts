
import crypto from 'crypto';
import { PaymentMethodModel, PaymentIntentModel } from './model';
import { OrderModel } from '../orders/orderModel';

const nowISO = () => new Date().toISOString();
const newId = (p: string) => `${p}_${crypto.randomBytes(8).toString('hex')}`;
const newToken = () => 'tok_' + crypto.randomBytes(12).toString('hex');
//usuarios y sus metodos de pago
export async function listMyMethods(userId: string) {
  return PaymentMethodModel.find({ userId })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();
}

export async function addMethod(userId: string, input: {
  type: 'credit_card'|'debit_card'|'paypal'|'transfer'|'cash_on_delivery';
  provider?: string;
  cardNumber?: string;    // esto es solo para mockear una tarjeta
  setDefault?: boolean;
}) {
  let last4: string | undefined;
  let token: string | undefined;
  let tokenized = false;

  if (input.type === 'credit_card' || input.type === 'debit_card') {
    if (!input.cardNumber || input.cardNumber.replace(/\D/g, '').length < 12) {
      const e:any = new Error('CARD_INVALID'); e.status = 400; throw e;
    }
    const digits = input.cardNumber.replace(/\D/g, '');
    last4 = digits.slice(-4);
    token = newToken();
    tokenized = true;
  }

  const isDefault = Boolean(input.setDefault);
  if (isDefault) {
    await PaymentMethodModel.updateMany({ userId }, { $set: { isDefault: false } });
  }

  const doc = await PaymentMethodModel.create({
    userId,
    type: input.type,
    provider: input.provider,
    last4,
    token,
    tokenized,
    isDefault,
    createdAt: nowISO(),
  });

  return doc.toJSON();
}

export async function setDefault(userId: string, id: string) {
  const pm = await PaymentMethodModel.findOne({ _id: id, userId });
  if (!pm) { const e:any = new Error('PAYMENT_METHOD_NOT_FOUND'); e.status = 404; throw e; }

  await PaymentMethodModel.updateMany({ userId }, { $set: { isDefault: false } });
  pm.isDefault = true;
  await pm.save();
  return { ok: true };
}

export async function removeMethod(userId: string, id: string) {
  const pm = await PaymentMethodModel.findOne({ _id: id, userId });
  if (!pm) { const e:any = new Error('PAYMENT_METHOD_NOT_FOUND'); e.status = 404; throw e; }
  await PaymentMethodModel.deleteOne({ _id: id, userId });
  return { ok: true };
}

export async function getDefaultMethod(userId: string) {
  return PaymentMethodModel.findOne({ userId, isDefault: true }).lean();
}

//crear el pago para una orden
type Method = 'card'|'transfer'|'cod';

export async function createPaymentIntent(params: {
  userId: string;
  orderId: string;
  method?: Method;
  paymentMethodId?: string;
  provider?: string;
}) {
  const { userId, orderId } = params;

  // Orden debe existir y estar PENDIENTE
  const ord = await OrderModel.findOne({ orderId, userId });
  if (!ord) { const e:any = new Error('ORDER_NOT_FOUND'); e.status = 404; throw e; }
  if (ord.status !== 'PENDIENTE') { const e:any = new Error('ORDER_NOT_PENDING'); e.status = 400; throw e; }

 
  const existing = await PaymentIntentModel.findOne({ orderId, userId }).lean();
  if (existing) return existing;
  let resolved: Method = params.method || 'card';
  let provider = params.provider;
  let paymentMethodId = params.paymentMethodId;

  if (paymentMethodId) {
    const pm = await PaymentMethodModel.findOne({ _id: paymentMethodId, userId }).lean();
    if (!pm) { const e:any = new Error('PAYMENT_METHOD_NOT_FOUND'); e.status = 404; throw e; }
    if (pm.type === 'credit_card' || pm.type === 'debit_card') { resolved = 'card'; provider = pm.provider || provider; }
    else if (pm.type === 'paypal' || pm.type === 'transfer')   { resolved = 'transfer'; provider = pm.provider || provider; }
    else if (pm.type === 'cash_on_delivery')                   { resolved = 'cod'; provider = 'COD'; }
  }

  const base = {
    userId,
    orderId,
    amountCents: ord.totalCents,
    currency: ord.currency,
    method: resolved,
    provider,
    paymentMethodId,
    status: '' as 'requires_confirmation'|'pending'|'succeeded'|'failed',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  if (resolved === 'card') {
    const doc = await PaymentIntentModel.create({
      ...base,
      status: 'requires_confirmation',
      clientSecret: newId('sec'),
    });
    return doc.toJSON();
  }

  if (resolved === 'transfer') {
    const doc = await PaymentIntentModel.create({
      ...base,
      status: 'pending',
      ref: newId('ref'),
    });
    return doc.toJSON();
  }

  // COD
  const doc = await PaymentIntentModel.create({
    ...base,
    status: 'pending',
    provider: base.provider || 'COD',
  });
  return doc.toJSON();
}

export async function confirmCardPayment(userId: string, intentId: string, succeed: boolean) {
  const intent = await PaymentIntentModel.findOne({ _id: intentId, userId, method: 'card' });
  if (!intent) { const e:any = new Error('INTENT_NOT_FOUND'); e.status = 404; throw e; }
  if (intent.status !== 'requires_confirmation') { const e:any = new Error('INVALID_INTENT_STATE'); e.status = 400; throw e; }

  if (!succeed) {
    intent.status = 'failed';
    intent.updatedAt = nowISO();
    await intent.save();
    await OrderModel.updateOne(
      { orderId: intent.orderId, userId },
      { $set: { paymentStatus: 'failed', updatedAt: nowISO() } }
    );
    return intent.toJSON();
  }

  intent.status = 'succeeded';
  intent.updatedAt = nowISO();
  await intent.save();

  await OrderModel.updateOne(
    { orderId: intent.orderId, userId, status: 'PENDIENTE' },
    { $set: { paymentStatus: 'paid', status: 'PROCESANDO', updatedAt: nowISO() } }
  );

  return intent.toJSON();
}

export async function adminConfirmTransfer(orderId: string) {
  // marca pago recibido por transferencia
  const ord = await OrderModel.findOneAndUpdate(
    { orderId, status: 'PENDIENTE' },
    { $set: { paymentStatus: 'paid', status: 'PROCESANDO', updatedAt: nowISO() } },
    { new: true }
  ).lean();
  if (!ord) { const e:any = new Error('ORDER_NOT_PENDING'); e.status = 400; throw e; }

  await PaymentIntentModel.updateOne(
    { orderId, method: 'transfer' },
    { $set: { status: 'succeeded', updatedAt: nowISO() } }
  );

  return { ok: true, order: ord };
}

export async function adminMarkCodPaid(orderId: string) {
  const ord = await OrderModel.findOneAndUpdate(
    { orderId, status: 'PENDIENTE' },
    { $set: { paymentStatus: 'paid', status: 'PROCESANDO', updatedAt: nowISO() } },
    { new: true }
  ).lean();
  if (!ord) { const e:any = new Error('ORDER_NOT_PENDING'); e.status = 400; throw e; }

  await PaymentIntentModel.updateOne(
    { orderId, method: 'cod' },
    { $set: { status: 'succeeded', updatedAt: nowISO() } }
  );

  return { ok: true, order: ord };
}
