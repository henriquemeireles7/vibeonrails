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
    'realtime/index': 'src/realtime/index.ts',
    'monitoring/index': 'src/monitoring/index.ts',
    'rate-limit/index': 'src/rate-limit/index.ts',
    'flags/index': 'src/flags/index.ts',
    'analytics/index': 'src/analytics/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,
});
