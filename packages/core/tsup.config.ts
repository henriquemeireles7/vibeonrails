import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'api/index': 'src/api/index.ts',
    'database/index': 'src/database/index.ts',
    'security/index': 'src/security/index.ts',
    'shared/index': 'src/shared/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,
});
