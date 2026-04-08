import { Boom } from "@hapi/boom";
import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import mongoose, { mongo } from "mongoose";

export function boomErrorHandler(
  err: Boom,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.isBoom) {
    const { output } = err;
    res.status(output.statusCode).json(output.payload);
  } else {
    next(err);
  }
}

function isMongoServerError(err: Error): err is mongo.MongoServerError {
  return (err as mongo.MongoServerError).code !== undefined;
}

export const mongoErrorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: "ValidationError",
      message: err.message,
      fields: Object.keys(err.errors),
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: "CastError",
      message: `El campo '${err.path}' tiene un valor inválido.`,
      value: err.value,
    });
    return;
  }

  if (isMongoServerError(err) && err.code === 11000 && err.keyValue) {
    const duplicated = Object.keys(err.keyValue).join(", ");
    res.status(409).json({
      error: "DuplicateKeyError",
      message: `El valor del campo ya existe.`,
      keyValue: err.keyValue,
    });
    return;
  }

  next(err);
};

export function genericErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(500).json({ message: err.message, stack: err.stack });
}
