import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';
import { requireAuth, AuthReq } from '../../../application/middlewares/auth';
import * as UserSvc from './service';

const router = Router();

/* ==================== LOGIN ==================== */
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('identifier requerido (email o cc)'),
    body('password').isLength({ min: 8 }).withMessage('password mínimo 8'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await UserSvc.login({
        identifier: req.body.identifier,
        password: req.body.password,
      });
      return res.json(result);
    } catch (e: any) {
      return res.status(e.status || 400).json({ error: e.message || 'LOGIN_ERROR' });
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
    body('password').isLength({ min: 8 }).withMessage('password mínimo 8'),
    body('name').notEmpty().withMessage('name requerido'),
    body('role')
      .isIn(['admin', 'customer'])
      .withMessage('role debe ser admin o customer'),  
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
