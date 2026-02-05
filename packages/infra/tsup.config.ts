import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'health/index': 'src/health/index.ts',
    'logging/index': 'src/logging/index.ts',
    'queue/index': 'src/queue/index.ts',
    'email/index': 'src/email/index.ts',
    'cache/index': 'src/cache/index.ts',
    'storage/index': 'src/storage/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,
});
