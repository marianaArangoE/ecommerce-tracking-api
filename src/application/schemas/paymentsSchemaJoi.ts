import Joi from 'joi';

// Campos comunes
const paymentMethodType = Joi.string()
  .valid('credit_card', 'debit_card', 'paypal', 'transfer', 'cash_on_delivery')
  .required()
  .messages({
    'any.only': 'type debe ser uno de: credit_card, debit_card, paypal, transfer, cash_on_delivery',
    'any.required': 'type es requerido',
  });

const provider = Joi.string().optional().allow('').messages({
  'string.base': 'provider debe ser un texto',
});

const cardNumber = Joi.string().optional().allow('').messages({
  'string.base': 'cardNumber debe ser un texto',
});

const setDefault = Joi.boolean().optional().messages({
  'boolean.base': 'setDefault debe ser un booleano',
});

const paymentMethodId = Joi.string().optional().allow('').messages({
  'string.base': 'paymentMethodId debe ser un texto',
});

const paymentMethod = Joi.string()
  .valid('card', 'transfer', 'cod')
  .optional()
  .messages({
    'any.only': 'method debe ser uno de: card, transfer, cod',
  });

const intentId = Joi.string().required().messages({
  'string.empty': 'intentId es requerido',
  'any.required': 'intentId es requerido',
});

const succeed = Joi.boolean().required().messages({
  'boolean.base': 'succeed debe ser un booleano',
  'any.required': 'succeed es requerido',
});

const methodId = Joi.string().required().messages({
  'string.empty': 'id es requerido',
  'any.required': 'id es requerido',
});

const orderId = Joi.string().required().messages({
  'string.empty': 'orderId es requerido',
  'any.required': 'orderId es requerido',
});

// Schemas para body
export const addPaymentMethodSchema = Joi.object({
  type: paymentMethodType,
  provider: provider,
  cardNumber: cardNumber,
  setDefault: setDefault,
});

export const createPaymentIntentSchema = Joi.object({
  method: paymentMethod,
  paymentMethodId: paymentMethodId,
  provider: provider,
});

export const confirmCardPaymentSchema = Joi.object({
  intentId: intentId,
  succeed: succeed,
});

// Schemas para params
export const methodIdParamSchema = Joi.object({
  id: methodId,
});

export const orderIdPaymentParamSchema = Joi.object({
  orderId: orderId,
});

