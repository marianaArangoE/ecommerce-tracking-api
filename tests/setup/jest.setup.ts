// Configuración global para Jest
import dotenv from 'dotenv';

// Cargar variables de entorno para las pruebas
dotenv.config({ path: '.env.test' });

// Configuración global de Jest
beforeAll(async () => {
  // Configuración inicial que se ejecuta antes de todas las pruebas
  console.log('Configurando entorno de pruebas...');
});

afterAll(async () => {
  // Limpieza después de todas las pruebas
  console.log('Finalizando pruebas...');
});

// Configuración para cada prueba
beforeEach(() => {
  // Configuración que se ejecuta antes de cada prueba individual
});

afterEach(() => {
  // Limpieza después de cada prueba individual
});
