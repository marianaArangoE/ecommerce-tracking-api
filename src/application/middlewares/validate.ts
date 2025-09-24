// src/middlewares/validate.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError, Result } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const result: Result<ValidationError> = validationResult(req);

  if (!result.isEmpty()) {
    const errs = result.array({ onlyFirstError: true }).map(e => {
      if (e.type === 'field') {
        return { field: e.path, msg: e.msg };
      }
      return { field: 'unknown', msg: e.msg };
    });

    return res.status(400).json({ errors: errs });
  }

  return next();
};
