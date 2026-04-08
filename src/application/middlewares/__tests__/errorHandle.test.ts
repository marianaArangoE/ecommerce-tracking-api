import mongoose from "mongoose";
import {
  boomErrorHandler,
  mongoErrorHandler,
  genericErrorHandler,
} from "../errorHandle";

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("errorHandle middlewares", () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("boomErrorHandler", () => {
    it("sends boom output when isBoom is true", () => {
      const err: any = {
        isBoom: true,
        output: { statusCode: 418, payload: { error: "I am a teapot" } },
      };
      const req: any = {};
      const res = mockRes();

      boomErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(418);
      expect(res.json).toHaveBeenCalledWith({ error: "I am a teapot" });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next when error is not boom", () => {
      const err = new Error("not boom");
      const req: any = {};
      const res = mockRes();

      boomErrorHandler(err as any, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("mongoErrorHandler", () => {
    it("handles mongoose ValidationError", () => {
      const err = new mongoose.Error.ValidationError();
      // add a fake field error so Object.keys(err.errors) has entries
      (err as any).errors = { name: new Error("required") };
      err.message = "validation failed";

      const req: any = {};
      const res = mockRes();

      mongoErrorHandler(err as any, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "ValidationError",
          message: err.message,
          fields: ["name"],
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("handles mongoose CastError", () => {
      // CastError constructor: (type, value, path) works for tests
      const err = new mongoose.Error.CastError("ObjectId", "bad-value", "userId");
      const req: any = {};
      const res = mockRes();

      mongoErrorHandler(err as any, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "CastError",
          message: expect.stringContaining("userId"),
          value: "bad-value",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("handles duplicate key mongo server error (11000)", () => {
      const err: any = new Error("dup");
      err.code = 11000;
      err.keyValue = { sku: "SKU123" };

      const req: any = {};
      const res = mockRes();

      mongoErrorHandler(err as any, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "DuplicateKeyError",
          keyValue: { sku: "SKU123" },
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next for unknown errors", () => {
      const err = new Error("something else");
      const req: any = {};
      const res = mockRes();

      mongoErrorHandler(err as any, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("genericErrorHandler", () => {
    it("returns 500 with message and stack", () => {
      const err = new Error("boom");
      err.stack = "stack-trace";
      const req: any = {};
      const res = mockRes();

      genericErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "boom",
        stack: "stack-trace",
      });
    });
  });
});
