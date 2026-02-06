import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'presets/index': 'src/presets/index.ts',
    'components/index': 'src/components/index.ts',
    'plugins/index': 'src/plugins/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  splitting: false,
  external: ['react', 'react-dom', 'astro', '@astrojs/starlight'],
});
