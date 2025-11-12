import { Request, Response } from 'express';
import { AuthReq } from '../../../application/middlewares/auth';
import * as UserSvc from '../../services/userService';

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const result = await UserSvc.login({ identifier, password });
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 401).json({ error: e.message || 'INVALID_CREDENTIALS' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const nuevosTokens = await UserSvc.refresh(req.body.refreshToken);
    res.json(nuevosTokens);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'REFRESH_ERROR' });
  }
};

export const logout = async (req: AuthReq, res: Response) => {
  try {
    const resultado = await UserSvc.logout(req.user?.sub ?? req.body.userId, req.body.refreshToken);
    res.json(resultado);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'LOGOUT_ERROR' });
  }
};

export const getAddresses = async (req: AuthReq, res: Response) => {
  const addresses = await UserSvc.getAddresses(req.user!.sub);
  res.json({ addresses });
};

export const getMe = async (req: AuthReq, res: Response) => {
  const me = await UserSvc.getMe(req.user!.sub);
  res.json(me);
};

export const updateMe = async (req: AuthReq, res: Response) => {
  const me = await UserSvc.updateMe(req.user!.sub, {
    name: req.body.name,
    phone: req.body.phone,
  });
  res.json(me);
};

export const addAddress = async (req: AuthReq, res: Response) => {
  const addresses = await UserSvc.addAddress(req.user!.sub, req.body);
  res.status(201).json({ addresses });
};

export const updateAddress = async (req: AuthReq, res: Response) => {
  try {
    const addr = await UserSvc.updateAddress(req.user!.sub, req.params.id, req.body);
    res.json({ address: addr });
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'ADDRESS_UPDATE_ERROR' });
  }
};

export const removeAddress = async (req: AuthReq, res: Response) => {
  try {
    const addresses = await UserSvc.removeAddress(req.user!.sub, req.params.id);
    res.json({ addresses });
  } catch (e: any) {
    res.status(e.status || 404).json({ error: e.message || 'ADDRESS_DELETE_ERROR' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const user = await UserSvc.register({
      cc: req.body.cc?.trim(),
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      phone: req.body.phone,
      role: req.body.role,
    });
    res.status(201).json(user);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'REGISTER_ERROR' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const user = await UserSvc.verifyEmail(req.body.token);
    res.json({ message: 'Email verificado exitosamente', user });
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'VERIFICATION_ERROR' });
  }
};

export const verifyEmailPage = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Error de Verificación</h2>
              <p>Token de verificación no válido o faltante.</p>
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #007bff;">Volver al inicio</a></p>
            </body>
          </html>
        `);
    }

    const user = await UserSvc.verifyEmail(token);

    return res.status(200).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #27ae60;">✅ ¡Email Verificado!</h2>
            <p>Tu email <strong>${user.email}</strong> ha sido verificado exitosamente.</p>
            <p>Ahora puedes realizar compras en nuestra plataforma.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Continuar</a></p>
          </body>
        </html>
      `);
  } catch (e: any) {
    return res.status(e.status || 400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">❌ Error de Verificación</h2>
            <p>${e.message === 'INVALID_OR_EXPIRED_TOKEN' ? 'El token ha expirado o no es válido.' : 'Error al verificar el email.'}</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #007bff;">Volver al inicio</a></p>
          </body>
        </html>
      `);
  }
};

export const resendVerification = async (req: AuthReq, res: Response) => {
  try {
    const result = await UserSvc.resendVerificationEmail(req.user!.sub);
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'RESEND_ERROR' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const u = await UserSvc.getById(req.params.id);
    res.json(u);
  } catch (e: any) {
    res.status(e.status || 404).json({ error: e.message || 'USER_NOT_FOUND' });
  }
};

