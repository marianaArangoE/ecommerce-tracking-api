# 🧪 Guía de Pruebas Unitarias con Jest

## ✅ Configuración Completada

Se ha configurado Jest exitosamente en tu proyecto con las siguientes características:

### 📦 Paquetes Instalados

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

- **jest**: Framework de pruebas
- **@types/jest**: Tipos TypeScript para Jest
- **ts-jest**: Preprocesador TypeScript para Jest
- **supertest**: Para pruebas de integración HTTP
- **@types/supertest**: Tipos TypeScript para Supertest

### ⚙️ Configuración

**Archivo `jest.config.js`** creado con:
- Preset: `ts-jest` para TypeScript
- Entorno: `node`
- Cobertura de código configurada
- Timeout: 10 segundos

## 🚀 Comandos Disponibles

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch (desarrollo)
npm run test:watch

# Ejecutar solo pruebas unitarias
npm run test:unit

# Ejecutar solo pruebas de integración
npm run test:integration

# Generar reporte de cobertura
npm run test:coverage
```

## 📁 Estructura de Pruebas

```
tests/
├── setup/
│   └── jest.setup.ts           # Configuración global
├── unit/                        # Pruebas unitarias
│   ├── domain/
│   │   └── models/
│   │       └── users/
│   │           └── service.test.ts
│   ├── application/
│   │   └── controllers/
│   │       └── controller.test.ts
│   └── utils/
│       └── helpers.test.ts
└── integration/                 # Pruebas de integración
    └── users.test.ts
```

## 📝 Ejemplos de Pruebas Creadas

### 1. Pruebas de Servicio (service.test.ts)

Pruebas para el servicio de usuarios incluyendo:
- ✅ Registro de usuarios
- ✅ Login con validación
- ✅ Refresh tokens
- ✅ Logout
- ✅ Obtener usuario por ID
- ✅ Actualizar perfil

### 2. Pruebas de Controladores (controller.test.ts)

Pruebas para los controladores HTTP:
- ✅ Manejo de requests/responses
- ✅ Validación de errores
- ✅ Códigos de estado HTTP

### 3. Pruebas de Utilidades (helpers.test.ts)

Funciones auxiliares de ejemplo:
- ✅ Validación de emails
- ✅ Formateo de números de teléfono
- ✅ Generación de strings aleatorios
- ✅ Sanitización de inputs

### 4. Pruebas de Integración (users.test.ts)

Flujos completos de la API:
- ✅ Registro e2e
- ✅ Login e2e
- ✅ Gestión de perfil

## 🔧 Cómo Crear Nuevas Pruebas

### Prueba Unitaria Básica

```typescript
import { funcionAProbar } from '../../../src/ruta/funcion';

describe('Nombre de la Función', () => {
  it('debería hacer algo específico', async () => {
    // Arrange (Preparar)
    const entrada = { datos: 'test' };
    
    // Act (Actuar)
    const resultado = await funcionAProbar(entrada);
    
    // Assert (Verificar)
    expect(resultado).toEqual({ esperado: 'valor' });
  });
});
```

### Prueba con Mocks

```typescript
import { funcion } from '../../../src/ruta';
import { Dependencia } from '../../../src/dependencia';

// Mockear dependencia
jest.mock('../../../src/dependencia');

describe('Función con Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería usar el mock correctamente', async () => {
    // Configurar mock
    const mockDependencia = Dependencia as jest.Mocked<typeof Dependencia>;
    mockDependencia.metodo.mockResolvedValue('valor');
    
    // Ejecutar y verificar
    const resultado = await funcion();
    expect(mockDependencia.metodo).toHaveBeenCalled();
  });
});
```

### Prueba de Integración

```typescript
import request from 'supertest';
import { app } from '../../src/app';

describe('API Endpoint', () => {
  it('debería responder correctamente', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ datos: 'test' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## 🎯 Mejores Prácticas

### 1. **Nomenclatura Clara**
```typescript
// ✅ Bueno
it('debería retornar 404 si el usuario no existe', ...)

// ❌ Malo
it('test user', ...)
```

### 2. **Organizar con describe**
```typescript
describe('UserService', () => {
  describe('register', () => {
    it('caso de éxito', ...)
    it('caso de error', ...)
  });
  
  describe('login', () => {
    it('caso de éxito', ...)
    it('caso de error', ...)
  });
});
```

### 3. **Patrón AAA (Arrange-Act-Assert)**
```typescript
it('ejemplo', async () => {
  // Arrange: Preparar datos y mocks
  const input = { ... };
  mock.mockResolvedValue(...);
  
  // Act: Ejecutar la función
  const result = await funcion(input);
  
  // Assert: Verificar resultados
  expect(result).toBe(...);
});
```

### 4. **Limpiar entre Pruebas**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // Limpiar recursos si es necesario
});
```

## 🐛 Debugging

### Ejecutar una prueba específica
```bash
npm test -- --testNamePattern="nombre de la prueba"
```

### Ejecutar un archivo específico
```bash
npm test tests/unit/domain/models/users/service.test.ts
```

### Modo verbose
```bash
npm test -- --verbose
```

### Detectar handles abiertos
```bash
npm test -- --detectOpenHandles
```

## 📊 Cobertura de Código

El reporte de cobertura se genera en la carpeta `coverage/`:

```bash
npm run test:coverage
```

Luego abre `coverage/lcov-report/index.html` en tu navegador para ver el reporte visual.

## ⚠️ Nota Importante

Algunas pruebas pueden necesitar ajustes según la estructura real de tu proyecto:

1. **Rutas de la API**: Verifica que las rutas coincidan con tu implementación
2. **Controladores**: Adapta las pruebas de controladores a tu implementación real
3. **Mocks**: Ajusta los mocks según tus dependencias reales

## 🔗 Recursos Útiles

- [Documentación de Jest](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🎉 ¡Listo!

Tu proyecto ya está configurado para ejecutar pruebas unitarias con Jest. Ejecuta:

```bash
npm test
```

Para comenzar a probar tu código.

