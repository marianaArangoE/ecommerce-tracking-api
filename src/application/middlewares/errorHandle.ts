import { Boom } from "@hapi/boom";
import { NextFunction, Request, Response } from "express";

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

export function genericErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
    res.status(500).json({'message': err.message, 'stack': err.stack});
}
