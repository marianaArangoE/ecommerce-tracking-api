import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configuración del transporter de email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Generar token de verificación
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Enviar email de verificación
export async function sendVerificationEmail(
  email: string, 
  name: string, 
  verificationToken: string
): Promise<void> {
  const transporter = createTransporter();
  
  const verificationUrl = process.env.FRONTEND_URL + `/api/v1/users/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Ecommerce API'}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verifica tu email - Confirmación de cuenta',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">¡Hola ${name}!</h2>
        <p>Gracias por registrarte en nuestra plataforma. Para completar tu registro, necesitas verificar tu dirección de email.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verificar Email
          </a>
        </div>
        
        <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p><strong>Importante:</strong> Este enlace expirará en 24 horas por seguridad.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Si no creaste esta cuenta, puedes ignorar este email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email de verificación enviado a: ${email}`);
  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    throw new Error('ERROR_SENDING_EMAIL');
  }
}

// Reenviar email de verificación
export async function resendVerificationEmail(
  email: string, 
  name: string, 
  verificationToken: string
): Promise<void> {
  await sendVerificationEmail(email, name, verificationToken);
}

// Tipo para los datos de la orden
export interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  address: {
    city: string;
    postalCode: string;
    address: string;
  };
  shippingMethod: 'standard' | 'express';
  paymentMethod: 'card' | 'transfer' | 'cod';
  createdAt: string;
}

// Función auxiliar para formatear moneda
function formatCurrency(cents: number, currency: string = 'COP'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Función auxiliar para obtener nombre del método de pago
function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    card: 'Tarjeta',
    transfer: 'Transferencia',
    cod: 'Contra Entrega',
  };
  return labels[method] || method;
}

// Función auxiliar para obtener nombre del método de envío
function getShippingMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    standard: 'Estándar',
    express: 'Express',
  };
  return labels[method] || method;
}

// Enviar email de confirmación de orden
export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  const transporter = createTransporter();
  
  const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}`;
  
  // Generar tabla de items
  const itemsHtml = data.items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px; text-align: left;">
        <strong>${item.name}</strong><br>
        <small style="color: #666;">SKU: ${item.sku}</small>
      </td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">${formatCurrency(item.unitPriceCents, data.currency)}</td>
      <td style="padding: 12px; text-align: right; font-weight: bold;">${formatCurrency(item.totalCents, data.currency)}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Ecommerce API'}" <${process.env.SMTP_USER}>`,
    to: data.customerEmail,
    subject: `Confirmación de Orden #${data.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #007bff;">
            <h1 style="color: #007bff; margin: 0;">¡Orden Confirmada!</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Gracias por tu compra</p>
          </div>

          <!-- Saludo -->
          <div style="margin-bottom: 25px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Hola ${data.customerName},</h2>
            <p style="color: #555; line-height: 1.6;">
              Tu orden <strong>#${data.orderId}</strong> ha sido confirmada exitosamente. 
              Estamos procesando tu pedido y te notificaremos cuando sea enviado.
            </p>
          </div>

          <!-- Información de la Orden -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h3 style="color: #333; margin-top: 0;">Información de la Orden</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Número de Orden:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #333;"><strong>#${data.orderId}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Fecha:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #333;">${new Date(data.createdAt).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Estado:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #f39c12; font-weight: bold;">Pendiente de Pago</td>
              </tr>
            </table>
          </div>

          <!-- Items de la Orden -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #333; margin-bottom: 15px;">Productos</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: white;">
              <thead>
                <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="padding: 12px; text-align: left; color: #333;">Producto</th>
                  <th style="padding: 12px; text-align: center; color: #333;">Cantidad</th>
                  <th style="padding: 12px; text-align: right; color: #333;">Precio Unit.</th>
                  <th style="padding: 12px; text-align: right; color: #333;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Resumen de Costos -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Subtotal:</td>
                <td style="padding: 8px 0; text-align: right; color: #333;">${formatCurrency(data.subtotalCents, data.currency)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Envío (${getShippingMethodLabel(data.shippingMethod)}):</td>
                <td style="padding: 8px 0; text-align: right; color: #333;">${formatCurrency(data.shippingCents, data.currency)}</td>
              </tr>
              <tr style="border-top: 2px solid #dee2e6; margin-top: 10px;">
                <td style="padding: 12px 0; font-size: 18px; font-weight: bold; color: #333;">Total:</td>
                <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: #007bff;">${formatCurrency(data.totalCents, data.currency)}</td>
              </tr>
            </table>
          </div>

          <!-- Información de Envío -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #333; margin-bottom: 15px;">Dirección de Envío</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
              <p style="margin: 5px 0; color: #555;">
                ${data.address.address}<br>
                ${data.address.city} - ${data.address.postalCode}
              </p>
            </div>
          </div>

          <!-- Información de Pago -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #333; margin-bottom: 15px;">Método de Pago</h3>
            <p style="color: #555; padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
              <strong>${getPaymentMethodLabel(data.paymentMethod)}</strong>
            </p>
          </div>

          <!-- Botón para Ver Orden -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" 
               style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Ver Detalles de la Orden
            </a>
          </div>

          <!-- Footer -->
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; line-height: 1.6; text-align: center;">
            Si tienes alguna pregunta sobre tu orden, no dudes en contactarnos.<br>
            Recibirás actualizaciones sobre el estado de tu pedido por email.
          </p>
          <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
            Este es un email automático, por favor no respondas directamente.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email de confirmación de orden enviado a: ${data.customerEmail} - Orden: ${data.orderId}`);
  } catch (error) {
    console.error('Error enviando email de confirmación de orden:', error);
    // No lanzar error para no romper el flujo de creación de orden
    // Solo loguear el error
  }
}