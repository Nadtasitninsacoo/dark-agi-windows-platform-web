import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Vitest 4 needs this config present, and on this project's default (forks) pool it
// loads @vitest/runner twice, so the copy the test file sees never gets its runner
// attached and every `describe` throws "Cannot read properties of undefined (reading
// 'config')". The `vmThreads` pool evaluates each test module once in a shared VM
// context, which keeps a single runner instance and fixes it. The `@/` alias mirrors
// tsconfig paths so tests can import app modules the same way the app does.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'vmThreads',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
