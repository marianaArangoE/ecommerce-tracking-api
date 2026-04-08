import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { schemaValidator } from '../validatorHandler';

describe('schemaValidator', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('debería pasar con datos válidos en body', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
    });
    mockReq.body = { name: 'Test', email: 'test@example.com' };

    const middleware = schemaValidator('body', schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('debería fallar con datos inválidos en body', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
    });
    mockReq.body = { name: 'Test' }; // falta email

    const middleware = schemaValidator('body', schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    const error = (mockNext as jest.Mock).mock.calls[0][0];
    expect(error.isBoom).toBe(true);
    expect(error.output.statusCode).toBe(400);
  });

  it('debería validar query params', () => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100),
    });
    mockReq.query = { page: '1', limit: '10' };

    const middleware = schemaValidator('query', schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('debería validar params', () => {
    const schema = Joi.object({
      id: Joi.string().required(),
    });
    mockReq.params = { id: '12345678' };

    const middleware = schemaValidator('params', schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('debería fallar con query params inválidos', () => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).required(),
    });
    mockReq.query = { page: '0' }; // inválido, debe ser >= 1

    const middleware = schemaValidator('query', schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    const error = (mockNext as jest.Mock).mock.calls[0][0];
    expect(error.isBoom).toBe(true);
  });
});

