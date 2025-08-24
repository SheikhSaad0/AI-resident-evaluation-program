// jest.config.cjs

/** @type {import('jest').Config} */
const config = {
  // ... your other jest config options
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Add this line to explicitly define what a test file is
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};

module.exports = config;