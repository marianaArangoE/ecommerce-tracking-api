import Joi from "joi";

const id = Joi.string();
const sku = Joi.string();
const name = Joi.string();
const description = Joi.string();
const price = Joi.number().integer();
const stock = Joi.number().integer().min(1);
const imageUrl = Joi.string();
const categoryId = Joi.string();
const isActive = Joi.boolean();
const createdAt = Joi.string();

export const getProductSchema = Joi.object({
  id: id.required(),
});

export const createProductSchema = Joi.object({
  sku: sku.required(),
  name: name.required(),
  description: description.optional(),
  price: price.required(),
  stock: stock.required(),
  imageUrl: imageUrl.required(),
  categoryId: categoryId.required(),
  isActive: isActive.required(),
});

export const updateProductSchema = Joi.object({
  sku: sku.optional(),
  name: name.optional(),
  description: description.optional(),
  price: price.optional(),
  stock: stock.optional(),
  imageUrl: imageUrl.optional(),
  categoryId: categoryId.optional(),
  isActive: isActive.optional(),
});