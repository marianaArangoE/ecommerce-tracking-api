import Joi from 'joi';

// Campos comunes
const orderId = Joi.string().required().messages({
  'string.empty': 'orderId es requerido',
  'any.required': 'orderId es requerido',
});

const checkoutId = Joi.string().required().messages({
  'string.empty': 'checkoutId es requerido',
  'any.required': 'checkoutId es requerido',
});

const email = Joi.string().email().required().messages({
  'string.email': 'El formato del email es inválido',
  'string.empty': 'email es requerido',
  'any.required': 'email es requerido',
});

const status = Joi.string().valid('PROCESANDO', 'COMPLETADA').messages({
  'any.only': 'status debe ser PROCESANDO o COMPLETADA',
  'any.required': 'status es requerido',
});

const reason = Joi.string().optional().allow('').messages({
  'string.base': 'reason debe ser un texto',
});

const hours = Joi.number().integer().min(1).max(168).optional().messages({
  'number.base': 'hours debe ser un número',
  'number.integer': 'hours debe ser un número entero',
  'number.min': 'hours debe ser al menos 1',
  'number.max': 'hours no puede ser mayor a 168',
});

const orderStatus = Joi.string().optional().messages({
  'string.base': 'status debe ser un texto',
});

// Schemas para body
export const confirmOrderSchema = Joi.object({
  checkoutId: checkoutId,
  email: email,
});

export const advanceStatusSchema = Joi.object({
  status: status.required(),
});

export const cancelOrderSchema = Joi.object({
  reason: reason,
});

export const adminAutoCancelSchema = Joi.object({
  hours: hours,
});

// Schemas para params
export const orderIdParamSchema = Joi.object({
  orderId: orderId,
});

// Schemas para query
export const listOrdersQuerySchema = Joi.object({
  status: orderStatus,
}).unknown(false);

export const adminSummaryQuerySchema = Joi.object({
  from: Joi.string().isoDate().optional().allow('').messages({
    'string.isoDate': 'from debe ser una fecha válida en formato ISO',
  }),
  to: Joi.string().isoDate().optional().allow('').messages({
    'string.isoDate': 'to debe ser una fecha válida en formato ISO',
  }),
}).unknown(false);

export const adminTopProductsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().default(10).messages({
    'number.base': 'limit debe ser un número',
    'number.integer': 'limit debe ser un número entero',
    'number.min': 'limit debe ser al menos 1',
    'number.max': 'limit no puede ser mayor a 100',
  }),
}).unknown(false);

export const adminDailyQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(180).optional().default(14).messages({
    'number.base': 'days debe ser un número',
    'number.integer': 'days debe ser un número entero',
    'number.min': 'days debe ser al menos 1',
    'number.max': 'days no puede ser mayor a 180',
  }),
}).unknown(false);

