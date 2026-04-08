import Joi from 'joi';

// Campos comunes
const addressId = Joi.string().required().messages({
  'string.empty': 'addressId es requerido',
  'any.required': 'addressId es requerido',
});

const shippingMethod = Joi.string().required().messages({
  'string.empty': 'shippingMethod es requerido',
  'any.required': 'shippingMethod es requerido',
});

const paymentMethod = Joi.string().required().messages({
  'string.empty': 'paymentMethod es requerido',
  'any.required': 'paymentMethod es requerido',
});

const checkoutId = Joi.string().required().messages({
  'string.empty': 'checkoutId es requerido',
  'any.required': 'checkoutId es requerido',
});

// Schemas para body
export const createCheckoutSchema = Joi.object({
  addressId: addressId,
  shippingMethod: shippingMethod,
  paymentMethod: paymentMethod,
});

// Schemas para params
export const checkoutIdParamSchema = Joi.object({
  id: checkoutId,
});

