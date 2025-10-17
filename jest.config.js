/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Corre ambos proyectos por defecto: jest elegirá el que aplica por patrón
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testTimeout: 15000,
      testMatch: [
        '<rootDir>/src/**/*.test.ts',
        '<rootDir>/src/**/*.spec.ts',
      ],
  
      setupFilesAfterEnv: [],
      roots: ['<rootDir>/src'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testTimeout: 30000,
      testMatch: [
        '<rootDir>/tests/**/*.spec.ts',
        '<rootDir>/tests/**/*.test.ts',
      ],
      // 👇 solo integración usa Mongo en memoria
      setupFilesAfterEnv: ['<rootDir>/tests/setupMongo.ts'],
      roots: ['<rootDir>/tests'],
    },
  ],
};
