import {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
} from "../productSchema";

describe("productSchema (Joi) validations", () => {
  const validBase = {
    id: "prod_1",
    sku: "SKU12345",
    name: "Camisa",
    priceCents: 1999, // número válido (sin decimales problemáticos, sigo con traumas)
    currency: "COP",
    stock: 10,
    status: "active",
    images: ["https://example.com/img.jpg"],
  };

  it("valid create product passes", () => {
    const { error, value } = createProductSchema.validate(validBase);
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ id: "prod_1", sku: "SKU12345" });
  });

  it("create product fails with negative price", () => {
    const bad = { ...validBase, id: "prod_2", priceCents: -100 };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.details[0].message).toMatch(/precio.*mayor.*cero|number\.positive|El precio debe ser mayor que cero/i);
  });

  it("create product fails with more than 2 decimals", () => {
    const bad = { ...validBase, id: "prod_dec", priceCents: 1.234 };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.details[0].message).toMatch(/2 decimales|precision|decimales/i);
  });

  it("create product fails when integer part has too many digits", () => {
    const bad = { ...validBase, id: "prod_big", priceCents: 123456789 };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.details[0].message).toMatch(/parte entera|más de .* dígitos|number\.maxDigits|La parte entera/i);
  });

  it("create product fails with short sku", () => {
    const bad = { ...validBase, id: "prod_sku", sku: "ABC" };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.details[0].message).toMatch(/SKU debe tener al menos 8|string\.min|El SKU/i);
  });

  it("create product fails with invalid currency", () => {
    const bad = { ...validBase, id: "prod_cur", currency: "ABC" };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error!.details[0].message).toMatch(/La moneda debe ser una de|any\.only|moneda/i);
  });

  it("update schema allows partial and rejects invalid fields", () => {
    const ok = { priceCents: 5000 };
    const { error: e1 } = updateProductSchema.validate(ok);
    expect(e1).toBeUndefined();

    const bad = { priceCents: -10 };
    const { error: e2 } = updateProductSchema.validate(bad);
    expect(e2).toBeDefined();
    expect(e2!.details[0].message).toMatch(/mayor.*cero|number\.positive|El precio/i);
  });

  it("getProductSchema requires id", () => {
    const { error } = getProductSchema.validate({ id: "x" });
    expect(error).toBeUndefined();

    const { error: e2 } = getProductSchema.validate({});
    expect(e2).toBeDefined();
    expect(e2!.details[0].message).toBeDefined();
  });
});