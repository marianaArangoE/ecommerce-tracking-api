// Mock the model module before importing the service
jest.mock(
  "../model",
  () => ({
    ProductModel: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    },
  }),
  { virtual: true }
);

import { productService } from "../service";
import * as ModelModule from "../model";

const mocked = (ModelModule as any).ProductModel as {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  updateOne: jest.Mock;
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
    expect(mocked.find).toHaveBeenCalledWith();
  });

  it("getAllProducts throws 404 when not found (null)", async () => {
    mocked.find.mockResolvedValue(null);
    await expect(productService.getAllProducts()).rejects.toHaveProperty(
      "output.statusCode",
      404
    );
  });

  it("getByIdProduct returns product when found", async () => {
    mocked.findOne.mockResolvedValue({ id: "p1" });
    const res = await productService.getByIdProduct("p1");
    expect(res).toEqual({ id: "p1" });
    expect(mocked.findOne).toHaveBeenCalledWith({ id: "p1" });
  });

  it("getByIdProduct throws 404 when not found", async () => {
    mocked.findOne.mockResolvedValue(null);
    await expect(productService.getByIdProduct("x")).rejects.toHaveProperty(
      "output.statusCode",
      404
    );
  });

  it("getAllProductsCustomer queries stock>0 and active status", async () => {
    mocked.find.mockResolvedValue([{ id: "c1" }]);
    const res = await productService.getAllProductsCustomer();
    expect(res).toEqual([{ id: "c1" }]);
    expect(mocked.find).toHaveBeenCalledWith({ stock: { $gt: 0 }, status: "active" });
  });

  it("getAllProductsCustomer throws 404 when not found", async () => {
    mocked.find.mockResolvedValue(null);
    await expect(productService.getAllProductsCustomer()).rejects.toHaveProperty(
      "output.statusCode",
      404
    );
  });

  it("getByIdProductCustomer queries id and stock>0 and returns product", async () => {
    mocked.findOne.mockResolvedValue({ id: "c2" });
    const res = await productService.getByIdProductCustomer("c2");
    expect(res).toEqual({ id: "c2" });
    expect(mocked.findOne).toHaveBeenCalledWith({
      id: "c2",
      stock: { $gt: 0 },
    });
  });

  it("getByIdProductCustomer throws 404 when not found", async () => {
    mocked.findOne.mockResolvedValue(null);
    await expect(productService.getByIdProductCustomer("nope")).rejects.toHaveProperty(
      "output.statusCode",
      404
    );
  });

  it("createProduct calls create and returns new product", async () => {
    const payload = { sku: "S1", name: "P" };
    mocked.create.mockResolvedValue({ id: "new", ...payload });
    const res = await productService.createProduct(payload as any);
    expect(res).toEqual({ id: "new", ...payload });
    expect(mocked.create).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it("updateProduct calls updateOne after existence check and returns result", async () => {
    mocked.findOne.mockResolvedValue({ id: "u1" });
    mocked.updateOne.mockResolvedValue({ matchedCount: 1 });
    const res = await productService.updateProduct("u1", { name: "X" } as any);
    expect(mocked.findOne).toHaveBeenCalledWith({ id: "u1" });
    expect(mocked.updateOne).toHaveBeenCalledWith(
      { id: "u1" },
      { $set: { name: "X" } },
      { runValidators: true }
    );
    expect(res).toEqual({ matchedCount: 1 });
  });

  it("updateProduct rejects when product not found", async () => {
    mocked.findOne.mockResolvedValue(null);
    await expect(productService.updateProduct("no", {})).rejects.toHaveProperty(
      "output.statusCode",
      404
    );
  });

  it("deleteProduct archives product (sets status archived) when exists", async () => {
    mocked.findOne.mockResolvedValue({ id: "d1" });
    mocked.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const res = await productService.deleteProduct("d1");
    expect(mocked.findOne).toHaveBeenCalledWith({ id: "d1" });
    expect(mocked.updateOne).toHaveBeenCalledWith(
      { id: "d1" },
      { $set: { status: "archived" } },
      { runValidators: true }
    );
    expect(res).toEqual({ modifiedCount: 1 });
  });

  it("deleteProduct throws when updateOne returns falsy", async () => {
    mocked.findOne.mockResolvedValue({ id: "d2" });
    mocked.updateOne.mockResolvedValue(null);
    await expect(productService.deleteProduct("d2")).rejects.toHaveProperty(
      "output.statusCode"
    );
  });
});