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
  .precision(2) // máximo 2 decimales
  .positive()
  .messages({
    "number.base": "Solo numeros pls",
    "number.positive": "Mas de cero, ni modo sea gratis",
    "number.precision":
      "Se como validar para que solo entren 2, pero no para que solo se vean 2",
  });
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
