import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
<<<<<<< HEAD
import { users } from './mock';
import { validate } from '../../../application/middlewares/validate';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('email inválido'),
    body('password').isLength({ min: 8 }).withMessage('password mínimo 8')
  ],
  validate,
  (req: Request, res: Response) => {
    const { email } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    // Mock tokens (no JWT real)
    const accessToken = `mock_access_${user.id}_${Date.now()}`;
    const refreshToken = `mock_refresh_${user.id}_${Date.now()}`;

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  }
);
router.get('/', (_req: Request, res: Response) => 
  res.json({ items: users, total: users.length })
);

router.get('/:id',
  [param('id').notEmpty()],
  validate,
  (req: Request, res: Response) => {
    const u = users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    res.json(u);
  }
);

router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty()
  ],
  validate,
  (req: Request, res: Response) => {
    const id = `u${users.length+1}`;
    const newUser = {
      id,
      email: req.body.email,
      passwordHash: '***',
      name: req.body.name,
      role: 'USER',
      emailVerified: false,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    res.status(201).json(newUser);
=======
import { validate } from '../../../application/middlewares/validate';
import { requireAuth, AuthReq } from '../../../application/middlewares/auth';
import * as UserSvc from './service';

const router = Router();

const strongPwd = body('password')
  .isLength({ min: 8 }).withMessage('password mínimo 8')
  .matches(/[a-z]/).withMessage('password requiere minúscula')
  .matches(/[A-Z]/).withMessage('password requiere mayúscula')
  .matches(/\d/).withMessage('password requiere número');


// LOGIN
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Datos requeridos, inicia sesion con email o cc'),
  ],
validate,
  async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;
      const result = await UserSvc.login({ identifier, password });
      return res.json(result);
    } catch (e: any) {
      return res.status(e.status || 401).json({ error: e.message || 'INVALID_CREDENTIALS' });
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
      const nuevosTokens = await UserSvc.refresh(req.body.refreshToken);
      res.json(nuevosTokens);

    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message || 'REFRESH_ERROR' });
    }
  }
);

// LOGOUT 
// invalida el refresh token, ya no se podrá usar para refresh
router.post(
  '/logout',
  [body('refreshToken').notEmpty().withMessage('refreshToken requerido')],
  validate,
async (req: AuthReq, res: Response) => {
    try {
      //se verifica el user que viene en el token y el del body
      const resultado = await UserSvc.logout(req.user?.sub ?? req.body.userId, req.body.refreshToken);
      res.json(resultado);
      
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message || 'LOGOUT_ERROR' });
    }
  }
);


// LISTAR direcciones del usuario
router.get(
  '/me/addresses', 
  requireAuth, async (req: AuthReq, res: Response) => {
  const addresses = await UserSvc.getAddresses(req.user!.sub);
  res.json({ addresses });
});

// Ver Perfil
router.get(
  '/me', 
  requireAuth, async (req: AuthReq, res: Response) => {
  const me = await UserSvc.getMe(req.user!.sub);
  res.json(me);
});
// Actualizar perfil
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
// agregar la dirección al usuario
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
router.patch(
  '/me/addresses/:id',
  requireAuth,
  [
    param('id').notEmpty().withMessage('El ID de la dirección en la URL es requerido'),
    body('city').optional().isString(),
    body('postalCode').optional().isString(),
    body('address').optional().isString(),
  ],
  validate,
  async (req: AuthReq, res: Response) => {
    try {
const addr = await UserSvc.updateAddress(req.user!.sub,req.params.id,req.body );
      res.json({ address: addr });
    } catch (e:any) {
      res.status(e.status || 400).json({ error: e.message || 'ADDRESS_UPDATE_ERROR' });
    }
  }
);

//eliminar dirección por id
router.delete(
  '/me/addresses/:id',
  requireAuth,
 [param('id').notEmpty().withMessage('El ID de la dirección es requerido en la URL')],
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

// registrar usuario nuevo
router.post(
  '/register',
  [
    body('cc').notEmpty().withMessage('La cédula es requerida'),
    body('email').isEmail().withMessage('El formato del email es inválido'),
    strongPwd,
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('role').isIn(['admin', 'customer']).withMessage('El rol debe ser admin o customer'),
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
>>>>>>> origin/develop
  }
);

export default router;
