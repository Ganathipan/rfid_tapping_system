module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/integration/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/utils/setup.js'],
  testTimeout: 30000, // 30 seconds for integration tests
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude server startup file
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  // Run tests sequentially to avoid database conflicts
  maxWorkers: 1,
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  // Set environment variables for tests
  setupFiles: ['<rootDir>/tests/integration/utils/env-setup.js']
};