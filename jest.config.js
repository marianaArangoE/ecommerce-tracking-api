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
        '<rootDir>/tests/unit/**/*.test.ts',
        '<rootDir>/tests/unit/**/*.spec.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      roots: ['<rootDir>/src', '<rootDir>/tests/unit'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/server.ts'
      ],
      coverageDirectory: 'coverage',
      coverageReporters: ['text', 'lcov', 'html'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testTimeout: 30000,
      testMatch: [
        '<rootDir>/tests/integration/**/*.spec.ts',
        '<rootDir>/tests/integration/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setupMongo.ts'],
      roots: ['<rootDir>/tests/integration'],
    },
  ],
};
