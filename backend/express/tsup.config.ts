import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  // The shared package ships TypeScript source: bundle it in.
  noExternal: ['@studio/shared'],
});
