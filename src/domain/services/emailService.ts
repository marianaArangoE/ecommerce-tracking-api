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
