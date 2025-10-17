import { productRouter } from "../routes";

describe("productRouter", () => {
  it("exporta las rutas esperadas con los métodos correctos", () => {
    // extraer solo las capas que representan rutas
    const layers: any[] = (productRouter as any).stack.filter(
      (s: any) => s.route
    );

    const routes = layers.map((l: any) => ({
      path: l.route.path,
      methods: Object.keys(l.route.methods).sort(),
    }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/", methods: ["get"] },
        { path: "/:id", methods: ["get"] },
        { path: "/", methods: ["post"] },
        { path: "/:id", methods: ["patch"] },
        { path: "/:id", methods: ["delete"] },
      ])
    );

    expect(routes.length).toBeGreaterThanOrEqual(5);
  });
});
