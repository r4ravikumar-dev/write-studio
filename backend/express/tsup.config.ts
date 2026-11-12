import {defineConfig} from 'tsup';

export default defineConfig({
  // index = long-running server (npm start); vercel = Vercel Function (api/index.js).
  entry: ['src/index.ts', 'src/vercel.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  // The shared package ships TypeScript source: bundle it in.
  noExternal: ['@studio/shared'],
});
