# Guía de Pruebas - Ecommerce Tracking API

Este directorio contiene todas las pruebas para la API de seguimiento de ecommerce.

## Estructura de Pruebas

```
tests/
├── setup/                 # Configuración global de pruebas
│   └── jest.setup.ts     # Configuración inicial de Jest
├── unit/                 # Pruebas unitarias
│   ├── domain/           # Pruebas de lógica de dominio
│   ├── application/      # Pruebas de controladores
│   └── utils/           # Pruebas de funciones utilitarias
├── integration/          # Pruebas de integración
└── README.md            # Este archivo
```

## Comandos de Pruebas

### Ejecutar todas las pruebas
```bash
npm test
```

### Ejecutar pruebas en modo watch (desarrollo)
```bash
npm run test:watch
```

### Ejecutar solo pruebas unitarias
```bash
npm run test:unit
```

### Ejecutar solo pruebas de integración
```bash
npm run test:integration
```

### Generar reporte de cobertura
```bash
npm run test:coverage
```

## Tipos de Pruebas

### 1. Pruebas Unitarias (`tests/unit/`)

Las pruebas unitarias se enfocan en probar funciones individuales o métodos de forma aislada.

**Ejemplos incluidos:**
- `domain/models/users/service.test.ts` - Pruebas del servicio de usuarios
- `application/controllers/controller.test.ts` - Pruebas de controladores
- `utils/helpers.test.ts` - Pruebas de funciones utilitarias

**Características:**
- Usan mocks para aislar dependencias
- Son rápidas de ejecutar
- Cubren casos de éxito y error
- Verifican lógica de negocio

### 2. Pruebas de Integración (`tests/integration/`)

Las pruebas de integración verifican que los componentes trabajen correctamente juntos.

**Ejemplos incluidos:**
- `users.test.ts` - Flujo completo de registro, login y gestión de usuarios

**Características:**
- Usan la aplicación real con base de datos de prueba
- Verifican flujos completos de usuario
- Incluyen autenticación y autorización

## Configuración

### Variables de Entorno

Las pruebas usan variables de entorno específicas definidas en `jest.setup.ts`:

```typescript
// Configuración para pruebas
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/ecommerce-test';
```

### Base de Datos de Pruebas

Las pruebas de integración usan una base de datos separada:
- **Desarrollo:** `mongodb://localhost:27017/ecommerce-tracking`
- **Pruebas:** `mongodb://localhost:27017/ecommerce-tracking-test`

## Escribir Nuevas Pruebas

### Estructura de una Prueba Unitaria

```typescript
import { functionToTest } from '../../../src/path/to/function';

// Mock de dependencias
jest.mock('../../../src/path/to/dependency');

describe('Function Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('success case', () => {
    it('debería hacer algo exitosamente', async () => {
      // Arrange
      const input = { /* datos de entrada */ };
      const expectedOutput = { /* resultado esperado */ };
      
      // Act
      const result = await functionToTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('error case', () => {
    it('debería manejar errores correctamente', async () => {
      // Arrange
      const invalidInput = { /* datos inválidos */ };
      
      // Act & Assert
      await expect(functionToTest(invalidInput))
        .rejects.toThrow('Error message');
    });
  });
});
```

### Estructura de una Prueba de Integración

```typescript
import request from 'supertest';
import { app } from '../../src/app';

describe('API Endpoint', () => {
  it('debería responder correctamente', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
```

## Mejores Prácticas

### 1. Nomenclatura
- Usar nombres descriptivos: `debería registrar usuario exitosamente`
- Agrupar pruebas relacionadas con `describe`
- Usar el patrón Arrange-Act-Assert

### 2. Mocks
- Mockear dependencias externas (base de datos, APIs)
- Limpiar mocks entre pruebas con `beforeEach`
- Verificar que los mocks se llamen correctamente

### 3. Datos de Prueba
- Usar datos realistas pero simples
- Crear factories para datos complejos
- Limpiar datos entre pruebas

### 4. Cobertura
- Apuntar a >80% de cobertura de código
- Cubrir casos de éxito y error
- Probar validaciones y edge cases

## Debugging

### Ejecutar una prueba específica
```bash
npm test -- --testNamePattern="nombre de la prueba"
```

### Ejecutar pruebas de un archivo específico
```bash
npm test tests/unit/domain/models/users/service.test.ts
```

### Modo verbose para más información
```bash
npm test -- --verbose
```

## Troubleshooting

### Problemas Comunes

1. **Error de conexión a MongoDB**
   - Verificar que MongoDB esté ejecutándose
   - Comprobar la URI de conexión

2. **Variables de entorno no encontradas**
   - Verificar que `.env.test` existe
   - Comprobar la configuración en `jest.setup.ts`

3. **Mocks no funcionan**
   - Verificar que los mocks estén en el lugar correcto
   - Usar `jest.clearAllMocks()` en `beforeEach`

4. **Timeouts en pruebas**
   - Aumentar el timeout en `jest.config.js`
   - Verificar que las operaciones asíncronas se completen
