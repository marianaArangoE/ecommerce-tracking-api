import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';
import { requireAuth } from '../../../application/middlewares/auth';
import * as Controller from './userController';

export const userRouter = Router();

const strongPwd = body('password')
  .isLength({ min: 8 }).withMessage('password mínimo 8')
  .matches(/[a-z]/).withMessage('password requiere minúscula')
  .matches(/[A-Z]/).withMessage('password requiere mayúscula')
  .matches(/\d/).withMessage('password requiere número');


// LOGIN
userRouter.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Datos requeridos, inicia sesion con email o cc'),
  ],
validate,
  Controller.login
);
// REFRESH
userRouter.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('refreshToken requerido')],
  validate,
  Controller.refresh
);

// LOGOUT 
// invalida el refresh token, ya no se podrá usar para refresh
userRouter.post(
  '/logout',
  [body('refreshToken').notEmpty().withMessage('refreshToken requerido')],
  validate,
  Controller.logout
);


// LISTAR direcciones del usuario
userRouter.get(
  '/me/addresses', 
  requireAuth,
  Controller.getAddresses
);

// Ver Perfil
userRouter.get(
  '/me', 
  requireAuth,
  Controller.getMe
);
// Actualizar perfil
userRouter.patch(
  '/me',
  requireAuth,
  [body('name').optional().isString(), body('phone').optional().isString()],
  validate,
  Controller.updateMe
);
// agregar la dirección al usuario
userRouter.post(
  '/me/addresses',
  requireAuth,
  [
    body('id').notEmpty(),
    body('city').notEmpty(),
    body('postalCode').notEmpty(),
    body('address').notEmpty(),
  ],
  validate,
  Controller.addAddress
);
// ACTUALIZAR dirección por id
userRouter.patch(
  '/me/addresses/:id',
  requireAuth,
  [
    param('id').notEmpty().withMessage('El ID de la dirección en la URL es requerido'),
    body('city').optional().isString(),
    body('postalCode').optional().isString(),
    body('address').optional().isString(),
  ],
  validate,
  Controller.updateAddress
);

//eliminar dirección por id
userRouter.delete(
  '/me/addresses/:id',
  requireAuth,
 [param('id').notEmpty().withMessage('El ID de la dirección es requerido en la URL')],
  validate,
  Controller.removeAddress
);

// registrar usuario nuevo
userRouter.post(
  '/register',
  [
    body('cc').notEmpty().withMessage('La cédula es requerida'),
    body('email').isEmail().withMessage('El formato del email es inválido'),
    strongPwd,
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('role').isIn(['admin', 'customer']).withMessage('El rol debe ser admin o customer'),
  ],
  validate,
  Controller.register
);

/* ==================== VERIFICACIÓN DE EMAIL ==================== */
// Verificar email con token (POST para API)
userRouter.post(
  '/verify-email',
  [
    body('token').notEmpty().withMessage('token requerido'),
  ],
  validate,
  Controller.verifyEmail
);

// Verificar email con token (GET para enlaces del navegador)
userRouter.get(
  '/verify-email',
  Controller.verifyEmailPage
);

// Reenviar email de verificación
userRouter.post(
  '/resend-verification',
  requireAuth,
  Controller.resendVerification
);

/* ==================== OBTENER POR ID (AL FINAL) ==================== */
// validamos que sea numérico
userRouter.get(
  '/:id',
  [
    param('id')
      .isInt().withMessage('id debe ser numérico')  // asegura que sea CC numérica
      .bail()
  ],
  validate,
  Controller.getById
);

//export default userRouter;
