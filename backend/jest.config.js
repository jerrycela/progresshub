/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    // 已測試模組的覆蓋率門檻 (70%+)
    './src/middleware/errorHandler.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/middleware/auth.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/config/env.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/utils/response.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/utils/gitlab/encryption.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/utils/gitlab/webhookVerifier.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/services/authService.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/routes/health.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 10000,
};
