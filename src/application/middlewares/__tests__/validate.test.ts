import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validate } from '../validate';

jest.mock('express-validator');

const mockValidationResult = validationResult as jest.MockedFunction<typeof validationResult>;

describe('validate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    mockReq = {};
    jest.clearAllMocks();
  });

  it('debería pasar si no hay errores de validación', () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: jest.fn().mockReturnValue([]),
    } as any);

    validate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('debería retornar error si hay errores de validación', () => {
    const mockErrors = [
      { type: 'field', path: 'email', msg: 'Email inválido' },
      { type: 'field', path: 'password', msg: 'Password requerido' },
    ];
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: jest.fn().mockReturnValue(mockErrors),
    } as any);

    validate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      errors: [
        { field: 'email', msg: 'Email inválido' },
        { field: 'password', msg: 'Password requerido' },
      ],
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería manejar errores sin tipo field', () => {
    const mockErrors = [
      { type: 'unknown', msg: 'Error desconocido' },
    ];
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: jest.fn().mockReturnValue(mockErrors),
    } as any);

    validate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      errors: [{ field: 'unknown', msg: 'Error desconocido' }],
    });
  });
});

