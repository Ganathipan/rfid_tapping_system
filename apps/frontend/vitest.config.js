import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    pool: 'forks',
    // Suppress unhandled promise rejection warnings in tests
    silent: false,
    onConsoleLog: (log, type) => {
      // Suppress React act warnings and other test-specific warnings
      if (log.includes('not wrapped in act') || 
          log.includes('React Router Future Flag Warning') ||
          log.includes('Invalid value for prop')) {
        return false;
      }
      return true;
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        '*.config.js',
        '*.config.ts',
        'dist/',
        'public/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});