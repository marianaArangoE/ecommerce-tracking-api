import Joi from 'joi';

// Campos comunes
const identifier = Joi.string().required().messages({
  'string.empty': 'Datos requeridos, inicia sesion con email o cc',
  'any.required': 'Datos requeridos, inicia sesion con email o cc',
});

const password = Joi.string()
  .min(8)
  .pattern(/[a-z]/)
  .pattern(/[A-Z]/)
  .pattern(/\d/)
  .messages({
    'string.min': 'password mínimo 8',
    'string.pattern.base': 'password requiere minúscula, mayúscula y número',
  });

const email = Joi.string().email().messages({
  'string.email': 'El formato del email es inválido',
  'any.required': 'El email es requerido',
});

const cc = Joi.string().required().messages({
  'string.empty': 'La cédula es requerida',
  'any.required': 'La cédula es requerida',
});

const name = Joi.string().messages({
  'string.empty': 'El nombre es requerido',
  'any.required': 'El nombre es requerido',
});

const phone = Joi.string().optional().allow('').messages({
  'string.base': 'El teléfono debe ser un texto',
});

const role = Joi.string().valid('admin', 'customer').messages({
  'any.only': 'El rol debe ser admin o customer',
});

const token = Joi.string().required().messages({
  'string.empty': 'token requerido',
  'any.required': 'token requerido',
});

const refreshToken = Joi.string().required().messages({
  'string.empty': 'refreshToken requerido',
  'any.required': 'refreshToken requerido',
});

const addressId = Joi.string().required().messages({
  'string.empty': 'El ID de la dirección es requerido',
  'any.required': 'El ID de la dirección es requerido',
});

const city = Joi.string().messages({
  'string.empty': 'La ciudad es requerida',
  'any.required': 'La ciudad es requerida',
});

const postalCode = Joi.string().messages({
  'string.empty': 'El código postal es requerido',
  'any.required': 'El código postal es requerido',
});

const address = Joi.string().messages({
  'string.empty': 'La dirección es requerida',
  'any.required': 'La dirección es requerida',
});

const userIdParam = Joi.string()
  .pattern(/^\d+$/)
  .messages({
    'string.pattern.base': 'id debe ser numérico',
    'any.required': 'id es requerido',
  });

// Schemas para body
export const loginSchema = Joi.object({
  identifier: identifier,
  password: password.required(),
});

export const refreshSchema = Joi.object({
  refreshToken: refreshToken,
});

export const logoutSchema = Joi.object({
  refreshToken: refreshToken,
});

export const updateMeSchema = Joi.object({
  name: name.optional(),
  phone: phone,
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar',
});

export const addAddressSchema = Joi.object({
  id: addressId,
  city: city.required(),
  postalCode: postalCode.required(),
  address: address.required(),
});

export const updateAddressSchema = Joi.object({
  city: city.optional(),
  postalCode: postalCode.optional(),
  address: address.optional(),
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar',
});

export const registerSchema = Joi.object({
  cc: cc,
  email: email.required(),
  password: password.required(),
  name: name.required(),
  phone: phone,
  role: role.required(),
});

export const verifyEmailSchema = Joi.object({
  token: token,
});

// Schemas para params
export const getUserIdSchema = Joi.object({
  id: userIdParam.required(),
});

export const addressIdParamSchema = Joi.object({
  id: addressId.required(),
});

