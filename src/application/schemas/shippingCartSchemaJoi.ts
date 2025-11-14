import Joi from 'joi';

// Campos comunes
const productId = Joi.string().required().messages({
  'string.empty': 'productId requerido',
  'any.required': 'productId requerido',
});

const quantity = Joi.number()
  .integer()
  .min(1)
  .max(999)
  .required()
  .messages({
    'number.base': 'quantity debe ser un número',
    'number.integer': 'quantity debe ser entero 1..999',
    'number.min': 'quantity debe ser entero 1..999',
    'number.max': 'quantity debe ser entero 1..999',
    'any.required': 'quantity requerido',
  });

// Schemas para body
export const addItemSchema = Joi.object({
  productId: productId,
  quantity: quantity,
});

export const setItemQuantitySchema = Joi.object({
  quantity: quantity,
});

// Schemas para params
export const productIdParamSchema = Joi.object({
  productId: productId,
});

