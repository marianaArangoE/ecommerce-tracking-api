// Mock the service before importing controller
jest.mock(
  "../service",
  () => ({
    productService: {
      getAllProducts: jest.fn(),
      getAllProductsCustomer: jest.fn(),
      getByIdProduct: jest.fn(),
      getByIdProductCustomer: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
    },
  }),
  { virtual: true }
);

import { productController } from "../controller";
import { productService } from "../service";

const svc = productService as unknown as {
  getAllProducts: jest.Mock;
  getAllProductsCustomer: jest.Mock;
  getByIdProduct: jest.Mock;
  getByIdProductCustomer: jest.Mock;
  createProduct: jest.Mock;
  updateProduct: jest.Mock;
  deleteProduct: jest.Mock;
};

describe("productController", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getAllProducts -> admin calls getAllProducts and sends result", async () => {
    const req: any = { user: { role: "admin" } };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    svc.getAllProducts.mockResolvedValue([1]);
    await productController.getAllProducts(req, res, next);
    expect(svc.getAllProducts).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith([1]);
    expect(next).not.toHaveBeenCalled();
  });

  it("getAllProducts -> customer calls getAllProductsCustomer and sends result", async () => {
    const req: any = { user: { role: "customer" } };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    svc.getAllProductsCustomer.mockResolvedValue([2]);
    await productController.getAllProducts(req, res, next);
    expect(svc.getAllProductsCustomer).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith([2]);
    expect(next).not.toHaveBeenCalled();
  });

  it("getByIdProduct -> admin calls getByIdProduct and sends result", async () => {
    const req: any = { params: { id: "x" }, user: { role: "admin" } };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    svc.getByIdProduct.mockResolvedValue({ id: "x" });
    await productController.getByIdProduct(req, res, next);
    expect(svc.getByIdProduct).toHaveBeenCalledWith("x");
    expect(res.send).toHaveBeenCalledWith({ id: "x" });
    expect(next).not.toHaveBeenCalled();
  });

  it("getByIdProduct -> customer calls getByIdProductCustomer and sends result", async () => {
    const req: any = { params: { id: "y" }, user: { role: "customer" } };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    svc.getByIdProductCustomer.mockResolvedValue({ id: "y" });
    await productController.getByIdProduct(req, res, next);
    expect(svc.getByIdProductCustomer).toHaveBeenCalledWith("y");
    expect(res.send).toHaveBeenCalledWith({ id: "y" });
    expect(next).not.toHaveBeenCalled();
  });

  it("createProduct calls service.createProduct with body and sends result", async () => {
    const dto = { name: "P" };
    const req: any = { body: dto };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    svc.createProduct.mockResolvedValue({ id: "n" });
    await productController.createProduct(req, res, next);
    expect(svc.createProduct).toHaveBeenCalledWith(dto);
    expect(res.send).toHaveBeenCalledWith({ id: "n" });
    expect(next).not.toHaveBeenCalled();
  });

  it("updateProduct calls service.updateProduct with params.id and body and sends result", async () => {
    const req: any = { params: { id: "i1" }, body: { name: "X" } };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    svc.updateProduct.mockResolvedValue({ matchedCount: 1 });
    await productController.updateProduct(req, res, next);
    expect(svc.updateProduct).toHaveBeenCalledWith("i1", { name: "X" });
    expect(res.send).toHaveBeenCalledWith({ matchedCount: 1 });
    expect(next).not.toHaveBeenCalled();
  });

  it("deleteProduct calls service.deleteProduct with params.id and sends result", async () => {
    const req: any = { params: { id: "i2" } };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    svc.deleteProduct.mockResolvedValue({ deletedCount: 1 });
    await productController.deleteProduct(req, res, next);
    expect(svc.deleteProduct).toHaveBeenCalledWith("i2");
    expect(res.send).toHaveBeenCalledWith({ deletedCount: 1 });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards errors to next when service throws", async () => {
    const req: any = { user: { role: "admin" } };
    const res: any = { send: jest.fn() };
    const next = jest.fn();
    const err = new Error("boom");
    svc.getAllProducts.mockRejectedValue(err);
    await productController.getAllProducts(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});