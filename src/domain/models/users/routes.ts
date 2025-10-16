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

export default router;
