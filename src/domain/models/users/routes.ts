import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';
import { requireAuth, AuthReq } from '../../../application/middlewares/auth';
import * as UserSvc from './service';

const router = Router();
const strongPwd = body('password')
  .isLength({ min: 8 }).withMessage('password mínimo 8')
  .matches(/[a-z]/).withMessage('password requiere minúscula')
  .matches(/[A-Z]/).withMessage('password requiere mayúscula')
  .matches(/\d/).withMessage('password requiere número');
/* ==================== LOGIN ==================== */
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('identifier requerido (email o cc)'),
    // ⚠️ no usamos .isLength() en password; evitamos 400 y devolvemos 401 genérico
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const identifier = String(req.body.identifier ?? '').trim();
      const password = typeof req.body.password === 'string' ? req.body.password : '';

      // si falta password o viene vacía -> mismo mensaje
      if (!password) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      }

      const result = await UserSvc.login({ identifier, password });
      return res.json(result);
    } catch (e: any) {
      // mantenemos códigos específicos cuando aplican (ej. 423 ACCOUNT_LOCKED)
      const status = e.status ?? 401;
      const error =
        e.message === 'INVALID_CREDENTIALS' || !e.message
          ? 'INVALID_CREDENTIALS'
          : e.message; // p.ej. ACCOUNT_LOCKED
      return res.status(status).json({ error, unlockAt: e.unlockAt });
    }
  }
);
// REFRESH
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('refreshToken requerido')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const out = await UserSvc.refresh(req.body.refreshToken);
      res.json(out);
    } catch (e:any) {
      res.status(e.status || 400).json({ error: e.message || 'REFRESH_ERROR' });
    }
  }
);

// LOGOUT (revocar refresh) – puedes exigir requireAuth si quieres
router.post(
  '/logout',
  [body('refreshToken').notEmpty().withMessage('refreshToken requerido')],
  validate,
  async (req: AuthReq, res: Response) => {
    try {
      const out = await UserSvc.logout(req.user?.sub ?? req.body.userId, req.body.refreshToken);
      res.json(out);
    } catch (e:any) {
      res.status(e.status || 400).json({ error: e.message || 'LOGOUT_ERROR' });
    }
  }
);

/* ==================== LISTAR USUARIOS ==================== */
router.get('/', async (_req: Request, res: Response) => {
  const out = await UserSvc.list();
  return res.json(out);
});

// LISTAR direcciones del usuario
//
router.get('/me/addresses', requireAuth, async (req: AuthReq, res: Response) => {
  const addresses = await UserSvc.getAddresses(req.user!.sub);
  res.json({ addresses });
});

/* ==================== PERFIL ==================== */
router.get('/me', requireAuth, async (req: AuthReq, res: Response) => {
  const me = await UserSvc.getMe(req.user!.sub);
  res.json(me);
});

router.patch(
  '/me',
  requireAuth,
  [body('name').optional().isString(), body('phone').optional().isString()],
  validate,
  async (req: AuthReq, res: Response) => {
    const me = await UserSvc.updateMe(req.user!.sub, {
      name: req.body.name,
      phone: req.body.phone,
    });
    res.json(me);
  }
);

router.post(
  '/me/addresses',
  requireAuth,
  [
    body('id').notEmpty(),
    body('city').notEmpty(),
    body('postalCode').notEmpty(),
    body('address').notEmpty(),
  ],
  validate,
  async (req: AuthReq, res: Response) => {
    const addresses = await UserSvc.addAddress(req.user!.sub, req.body);
    res.status(201).json({ addresses });
  }
);
// ACTUALIZAR dirección por id
//
router.patch(
  '/me/addresses/:id',
  requireAuth,
  [
    param('id').notEmpty(),
    body('city').optional().isString(),
    body('postalCode').optional().isString(),
    body('address').optional().isString(),
  ],
  validate,
  async (req: AuthReq, res: Response) => {
    try {
      const addr = await UserSvc.updateAddress(req.user!.sub, req.params.id, {
        city: req.body.city,
        postalCode: req.body.postalCode,
        address: req.body.address,
      });
      res.json({ address: addr });
    } catch (e:any) {
      res.status(e.status || 400).json({ error: e.message || 'ADDRESS_UPDATE_ERROR' });
    }
  }
);
router.delete(
  '/me/addresses/:id',
  requireAuth,
  [param('id').notEmpty()],
  validate,
  async (req: AuthReq, res: Response) => {
    try {
      const addresses = await UserSvc.removeAddress(req.user!.sub, req.params.id);
      res.json({ addresses });
    } catch (e:any) {
      res.status(e.status || 404).json({ error: e.message || 'ADDRESS_DELETE_ERROR' });
    }
  }
);

/* ==================== REGISTRO ==================== */
router.post(
  '/register',
  [
    body('cc').notEmpty().withMessage('cc requerida'),
    body('email').isEmail().withMessage('email inválido'),
    strongPwd,  // 👈 política fuerte
    body('name').notEmpty().withMessage('name requerido'),
    body('role').isIn(['admin', 'customer']).withMessage('role debe ser admin o customer'),
  ],
  validate,
  async (req: Request, res: Response) => {
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
  }
);

/* ==================== VERIFICACIÓN DE EMAIL ==================== */
// Verificar email con token (POST para API)
router.post(
  '/verify-email',
  [
    body('token').notEmpty().withMessage('token requerido'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const user = await UserSvc.verifyEmail(req.body.token);
      res.json({ message: 'Email verificado exitosamente', user });
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message || 'VERIFICATION_ERROR' });
    }
  }
);

// Verificar email con token (GET para enlaces del navegador)
router.get(
  '/verify-email',
  async (req: Request, res: Response) => {
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
  }
);

// Reenviar email de verificación
router.post(
  '/resend-verification',
  requireAuth,
  async (req: AuthReq, res: Response) => {
    try {
      const result = await UserSvc.resendVerificationEmail(req.user!.sub);
      res.json(result);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message || 'RESEND_ERROR' });
    }
  }
);

/* ==================== OBTENER POR ID (AL FINAL) ==================== */
// validamos que sea numérico
router.get(
  '/:id',
  [
    param('id')
      .isInt().withMessage('id debe ser numérico')  // asegura que sea CC numérica
      .bail()
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const u = await UserSvc.getById(req.params.id);
      res.json(u);
    } catch (e: any) {
      res.status(e.status || 404).json({ error: e.message || 'USER_NOT_FOUND' });
    }
  }
);

export default router;
