import { createProductSchema, updateProductSchema, getProductSchema } from "../productSchema";

describe("productSchema (Joi) validations", () => {
  it("valid create product passes", () => {
    const dto = {
      id: "prod_1",
      sku: "SKU12345",
      name: "Camisa",
      priceCents: 1999,
      currency: "COP",
      stock: 10,
      status: "active",
      images: ["https://example.com/img.jpg"],
    };
    const { error, value } = createProductSchema.validate(dto);
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ id: "prod_1", sku: "SKU12345" });
  });

  it("create product fails with negative price", () => {
    const bad = {
      id: "prod_2",
      sku: "SKU12345",
      name: "Mala",
      priceCents: -100,
      currency: "COP",
      stock: 1,
      status: "active",
      images: ["https://example.com/img.jpg"],
    };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/Mas de cero|positive/i);
  });

  it("create product fails with short sku", () => {
    const bad = {
      id: "prod_3",
      sku: "ABC",
      name: "ShortSKU",
      priceCents: 1000,
      currency: "USD",
      stock: 1,
      status: "active",
      images: ["https://example.com/img.jpg"],
    };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/SKU debe tener al menos 8|min/i);
  });

  it("create product fails with invalid currency", () => {
    const bad = {
      id: "prod_4",
      sku: "SKU12345X",
      name: "BadCurrency",
      priceCents: 1000,
      currency: "ABC",
      stock: 1,
      status: "active",
      images: ["https://example.com/img.jpg"],
    };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/La moneda debe ser una de/);
  });

  it("update schema allows partial and rejects invalid fields", () => {
    const ok = { priceCents: 5000 };
    const { error: e1 } = updateProductSchema.validate(ok);
    expect(e1).toBeUndefined();

    const bad = { priceCents: -10 };
    const { error: e2 } = updateProductSchema.validate(bad);
    expect(e2).toBeDefined();
  });

  it("getProductSchema requires id", () => {
    const { error } = getProductSchema.validate({ id: "x" });
    expect(error).toBeUndefined();

    const { error: e2 } = getProductSchema.validate({});
    expect(e2).toBeDefined();
  });
});