import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { generateVerificationToken, sendVerificationEmail, resendVerificationEmail } from '../../../../src/domain/services/emailService';

// Mock de nodemailer
jest.mock('nodemailer');
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// Mock de crypto
jest.mock('crypto');
const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('Email Service', () => {
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configurar variables de entorno
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'test-password';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.APP_NAME = 'Test App';

    // Mock del transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };

    mockNodemailer.createTransport.mockReturnValue(mockTransporter);
  });

  describe('generateVerificationToken', () => {
    it('debería generar un token de verificación', () => {
      // Arrange
      const mockRandomBytes = Buffer.from('test-token-bytes');
      mockCrypto.randomBytes.mockReturnValue(mockRandomBytes as any);

      // Act
      const token = generateVerificationToken();

      // Assert
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('debería generar tokens únicos', () => {
      // Arrange
      const mockRandomBytes1 = Buffer.from('token1');
      const mockRandomBytes2 = Buffer.from('token2');
      
      mockCrypto.randomBytes
        .mockReturnValueOnce(mockRandomBytes1 as any)
        .mockReturnValueOnce(mockRandomBytes2 as any);

      // Act
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();

      // Assert
      expect(token1).not.toBe(token2);
      expect(mockCrypto.randomBytes).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendVerificationEmail', () => {
    it('debería enviar email de verificación exitosamente', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'verification-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Test App" <test@example.com>',
        to: email,
        subject: 'Verifica tu email - Confirmación de cuenta',
        html: expect.stringContaining(name)
      });
    });

    it('debería incluir el token en la URL de verificación', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-verification-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(`token=${token}`);
      expect(mailOptions.html).toContain('http://localhost:3000/api/v1/users/verify-email');
    });

    it('debería incluir el nombre del usuario en el email', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Juan Pérez';
      const token = 'test-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(`¡Hola ${name}!`);
    });

    it('debería manejar errores al enviar email', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';
      const error = new Error('SMTP Error');
      
      mockTransporter.sendMail.mockRejectedValue(error);

      // Act & Assert
      await expect(sendVerificationEmail(email, name, token))
        .rejects.toThrow('ERROR_SENDING_EMAIL');
    });

    it('debería usar valores por defecto para variables de entorno', async () => {
      // Arrange
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.APP_NAME;
      
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com', // valor por defecto
        port: 587, // valor por defecto
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      });

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Ecommerce API" <test@example.com>', // valor por defecto
        to: email,
        subject: 'Verifica tu email - Confirmación de cuenta',
        html: expect.any(String)
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('debería reenviar email de verificación exitosamente', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'new-verification-token';

      // Act
      await resendVerificationEmail(email, name, token);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Test App" <test@example.com>',
        to: email,
        subject: 'Verifica tu email - Confirmación de cuenta',
        html: expect.stringContaining(name)
      });
    });

    it('debería incluir mensaje de reenvío en el email', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';

      // Act
      await resendVerificationEmail(email, name, token);

      // Assert
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(name);
      expect(mailOptions.html).toContain('verificar tu dirección de email');
    });

    it('debería manejar errores al reenviar email', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';
      const error = new Error('SMTP Error');
      
      mockTransporter.sendMail.mockRejectedValue(error);

      // Act & Assert
      await expect(resendVerificationEmail(email, name, token))
        .rejects.toThrow('ERROR_SENDING_EMAIL');
    });
  });

  describe('Email Content Validation', () => {
    it('debería incluir todos los elementos necesarios en el email', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = mailOptions.html;

      // Verificar elementos del email
      expect(htmlContent).toContain(`¡Hola ${name}!`);
      expect(htmlContent).toContain('Verificar Email');
      expect(htmlContent).toContain('24 horas');
      expect(htmlContent).toContain('Si no creaste esta cuenta');
      expect(htmlContent).toContain('http://localhost:3000/api/v1/users/verify-email');
    });

    it('debería tener el formato HTML correcto', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = mailOptions.html;

      // Verificar estructura HTML
      expect(htmlContent).toContain('<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"');
      expect(htmlContent).toContain('<h2 style="color: #333;"');
      expect(htmlContent).toContain('<a href=');
      expect(htmlContent).toContain('background-color: #007bff');
      expect(htmlContent).toContain('</div>');
    });
  });

  describe('Configuration', () => {
    it('debería configurar el transporter correctamente', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      });
    });

    it('debería manejar diferentes puertos SMTP', async () => {
      // Arrange
      process.env.SMTP_PORT = '465';
      process.env.SMTP_HOST = 'smtp.custom.com';
      
      const email = 'test@example.com';
      const name = 'Test User';
      const token = 'test-token';

      // Act
      await sendVerificationEmail(email, name, token);

      // Assert
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.custom.com',
        port: 465,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      });
    });
  });
});
