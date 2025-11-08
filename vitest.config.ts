import { defineProject, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/react-app'),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Use projects to define separate configurations for React and Worker tests
    projects: [
      // React tests (use jsdom environment)
      defineProject({
        plugins: [react()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src/react-app'),
          },
        },
        test: {
          name: 'react',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/react-app/**/*.test.{ts,tsx}'],
          coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
              'node_modules/',
              'dist/',
              '**/*.config.{ts,js}',
              '**/vite-env.d.ts',
              '**/*.test.{ts,tsx}',
            ],
          },
        },
      }),
      // Worker tests (use node environment with undici for Web APIs)
      defineProject({
        test: {
          name: 'worker',
          globals: true,
          environment: 'node',
          include: ['src/worker/**/*.test.ts'],
          coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
              'node_modules/',
              'dist/',
              '**/*.config.{ts,js}',
              '**/vite-env.d.ts',
              '**/*.test.ts',
            ],
          },
        },
      }),
    ],
  },
});
