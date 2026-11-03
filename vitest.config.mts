import { defineConfig } from 'vitest/config';

/** Unit tests: pure Node, Supabase and fetch mocked. `npm test`. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
