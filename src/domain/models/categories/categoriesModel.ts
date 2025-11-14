export interface Category {
  id: string;             // Identificador único de la categoría (UUID o _id de Mongo)
  name: string;           // Nombre de la categoría, ej: "Consolas y Videojuegos"
  slug: string;           // Identificador legible en URLs. Ej: "consolas-y-videojuegos"
  parentId?: string;      // Id de la categoría padre (para subcategorías)
  createdAt: string;      // Fecha de creación (ISO 8601)
  updatedAt: string;      // Fecha de última modificación (ISO 8601)
}
