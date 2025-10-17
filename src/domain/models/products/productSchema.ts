import Joi from "joi";

const id = Joi.string();
const sku = Joi.string().alphanum().min(8).max(20).messages({
  "string.base": "El SKU debe ser un texto alfanumérico, osea solo [aZ]/[09]",
  "string.alphanum": "Nada de simbolos especiales, en el SKU Rey",
  "string.min": "El SKU debe tener al menos 8 caracteres",
  "string.max": "El SKU no puede superar los 20 caracteres",
});
const name = Joi.string();
const description = Joi.string().optional();
const priceCents = Joi.number()
  .positive()
  .custom((value, helpers) => {
    if (!Number.isFinite(value)) {
      return helpers.error("number.base");
    }

    // 1) comprobar decimales: value * 100 debe ser (prácticamente) entero
    const multiplied = value * 100;
    // tolerancia para evitar problemas por imprecisión de float
    const diff = Math.abs(multiplied - Math.round(multiplied));
    if (diff > 1e-8) {
      return helpers.error("number.precision", { limit: 2 });
    }

    // 2) comprobar cantidad máxima de dígitos en la parte entera (ej: 8)
    const integerPartLength = Math.trunc(Math.abs(value)).toString().length;
    const MAX_INTEGER_DIGITS = 8;
    if (integerPartLength > MAX_INTEGER_DIGITS) {
      return helpers.error("number.maxDigits", { limit: MAX_INTEGER_DIGITS });
    }

    return value;
  })
  .messages({
    "number.base": "El precio debe ser un número válido.",
    "number.positive": "El precio debe ser mayor que cero.",
    "number.precision": "El precio solo puede tener hasta 2 decimales (ej: 1234.56).",
    "number.maxDigits": "La parte entera no puede tener más de {{#limit}} dígitos.",
  });

/*
.string()
  .pattern(/^\d{1,8}(\.\d{1,2})?$/)
  .messages({
    "string.pattern.base": "El precio debe tener máximo 8 dígitos enteros y 2 decimales (ej: 99999999.99)",
  })
  .custom((value, helpers) => parseFloat(value));
  */
const currency = Joi.string()
  .length(3)
  .uppercase()
  .valid("COP", "USD", "EUR", "MXN")
  .messages({
    "any.only": "La moneda debe ser una de: COP, USD, EUR o MXN, sino de malas",
  });
const stock = Joi.number().integer().min(1).max(9999);
const status = Joi.string().valid("draft", "active", "archived");
const categoryId = Joi.string().optional();
const images = Joi.array().items(Joi.string().uri()).min(1);
const brand = Joi.string().optional();
const tags = Joi.array().items(Joi.string()).optional();
const createdAt = Joi.string().isoDate();
const updatedAt = Joi.string().isoDate();

export const getProductSchema = Joi.object({
  id: id.required(),
});

export const createProductSchema = Joi.object({
  id: id.required(),
  sku: sku.required(),
  name: name.required(),
  description: description.optional(),
  priceCents: priceCents.required(),
  currency: currency.required(),
  stock: stock.required(),
  status: status.required(),
  categoryId: categoryId.optional(),
  images: images.required(),
  brand: brand.optional(),
  tags: tags.optional(),
});

export const updateProductSchema = Joi.object({
  sku: sku.optional(),
  name: name.optional(),
  description: description.optional(),
  priceCents: priceCents.optional(),
  currency: currency.optional(),
  stock: stock.optional(),
  status: status.optional(),
  categoryId: categoryId.optional(),
  images: images.optional(),
  brand: brand.optional(),
  tags: tags.optional(),
});
