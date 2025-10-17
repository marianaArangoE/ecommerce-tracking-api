// Mock ProductModel before importing the service
jest.mock("../model", () => ({
  ProductModel: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

import { productService } from "../service";
import { ProductModel } from "../model";

const mocked = ProductModel as unknown as {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  updateOne: jest.Mock;
  deleteOne: jest.Mock;
};

describe("productService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getAllProducts returns result when found", async () => {
    mocked.find.mockResolvedValue([{ id: "1" }]);
    const res = await productService.getAllProducts();
    expect(res).toEqual([{ id: "1" }]);
    expect(mocked.find).toHaveBeenCalledTimes(1);
  });

  it("getAllProducts throws 404 when not found", async () => {
    mocked.find.mockResolvedValue(null);
    await expect(productService.getAllProducts()).rejects.toHaveProperty("output.statusCode", 404);
  });

  it("getByIdProduct returns product when found", async () => {
    mocked.findOne.mockResolvedValue({ id: "p1" });
    const res = await productService.getByIdProduct("p1");
    expect(res).toEqual({ id: "p1" });
    expect(mocked.findOne).toHaveBeenCalledWith({ id: "p1" });
  });

  it("getByIdProduct throws 404 when not found", async () => {
    mocked.findOne.mockResolvedValue(null);
    await expect(productService.getByIdProduct("x")).rejects.toHaveProperty("output.statusCode", 404);
  });

  it("getAllProductsCustomer queries stock>0", async () => {
    mocked.find.mockResolvedValue([{ id: "c1" }]);
    const res = await productService.getAllProductsCustomer();
    expect(res).toEqual([{ id: "c1" }]);
    expect(mocked.find).toHaveBeenCalledWith({ stock: { $gt: 0 } });
  });

  it("getByIdProductCustomer queries id and stock>0", async () => {
    mocked.findOne.mockResolvedValue({ id: "c2" });
    const res = await productService.getByIdProductCustomer("c2");
    expect(res).toEqual({ id: "c2" });
    expect(mocked.findOne).toHaveBeenCalledWith({ id: "c2", stock: { $gt: 0 } });
  });

  it("createProduct calls create and returns new product", async () => {
    mocked.create.mockResolvedValue({ id: "new" });
    const res = await productService.createProduct({} as any);
    expect(res).toEqual({ id: "new" });
    expect(mocked.create).toHaveBeenCalled();
  });

  it("updateProduct calls updateOne after existence check", async () => {
    mocked.findOne.mockResolvedValue({ id: "u1" });
    mocked.updateOne.mockResolvedValue({ matchedCount: 1 });
    const res = await productService.updateProduct("u1", { name: "X" } as any);
    expect(mocked.findOne).toHaveBeenCalledWith({ id: "u1" });
    expect(mocked.updateOne).toHaveBeenCalledWith({ id: "u1" }, { $set: { name: "X" } }, { runValidators: true });
    expect(res).toEqual({ matchedCount: 1 });
  });

  it("updateProduct rejects when product not found", async () => {
    mocked.findOne.mockResolvedValue(null);
    await expect(productService.updateProduct("no", {})).rejects.toHaveProperty("output.statusCode", 404);
  });

  it("deleteProduct removes product when exists", async () => {
    mocked.findOne.mockResolvedValue({ id: "d1" });
    mocked.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const res = await productService.deleteProduct("d1");
    expect(mocked.deleteOne).toHaveBeenCalledWith({ id: "d1" });
    expect(res).toEqual({ deletedCount: 1 });
  });

  it("deleteProduct throws when nothing deleted", async () => {
    mocked.findOne.mockResolvedValue({ id: "d2" });
    mocked.deleteOne.mockResolvedValue({ deletedCount: 0 });
    await expect(productService.deleteProduct("d2")).rejects.toHaveProperty("output.statusCode");
  });
});