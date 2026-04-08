import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import boom from "@hapi/boom";

export function schemaValidator(
  property: "body" | "query" | "params",
  schema: Joi.ObjectSchema
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[property];
    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
      next(boom.badRequest(error));
    } else {
      next();
    }
  };
}