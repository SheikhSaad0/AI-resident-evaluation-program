// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Only look for tests within the __tests__ directory
  roots: ['<rootDir>/__tests__'],
  // Only treat files ending in .test.ts or .spec.ts as test files
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  clearMocks: true,
  coverageDirectory: 'coverage',
  // Use Babel to transform files, which is more robust for Next.js/React projects
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      babelConfig: true,
    }],
  },
};