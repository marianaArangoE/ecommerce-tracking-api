import { Router } from 'express';
import { schemaValidator } from '../middlewares/validatorHandler';
import { requireAuth } from '../middlewares/auth';
import * as Controller from '../controllers/userController';
import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  updateMeSchema,
  addAddressSchema,
  updateAddressSchema,
  registerSchema,
  verifyEmailSchema,
  getUserIdSchema,
  addressIdParamSchema,
} from '../schemas/userSchemaJoi';

export const userRouter = Router();

// LOGIN
userRouter.post(
  '/login',
  schemaValidator('body', loginSchema),
  Controller.login
);

// REFRESH
userRouter.post(
  '/refresh',
  schemaValidator('body', refreshSchema),
  Controller.refresh
);

// LOGOUT 
// invalida el refresh token, ya no se podrá usar para refresh
userRouter.post(
  '/logout',
  requireAuth,
  schemaValidator('body', logoutSchema),
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
  schemaValidator('body', updateMeSchema),
  Controller.updateMe
);

// agregar la dirección al usuario
userRouter.post(
  '/me/addresses',
  requireAuth,
  schemaValidator('body', addAddressSchema),
  Controller.addAddress
);

// ACTUALIZAR dirección por id
userRouter.patch(
  '/me/addresses/:id',
  requireAuth,
  schemaValidator('params', addressIdParamSchema),
  schemaValidator('body', updateAddressSchema),
  Controller.updateAddress
);

//eliminar dirección por id
userRouter.delete(
  '/me/addresses/:id',
  requireAuth,
  schemaValidator('params', addressIdParamSchema),
  Controller.removeAddress
);

// registrar usuario nuevo
userRouter.post(
  '/register',
  schemaValidator('body', registerSchema),
  Controller.register
);

/* ==================== VERIFICACIÓN DE EMAIL ==================== */
// Verificar email con token (POST para API)
userRouter.post(
  '/verify-email',
  schemaValidator('body', verifyEmailSchema),
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
  schemaValidator('params', getUserIdSchema),
  Controller.getById
);

//export default userRouter;
