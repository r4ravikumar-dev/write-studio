import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** Next.js's recommended rules (Core Web Vitals + TypeScript). */
export default defineConfig([...nextVitals, ...nextTs, globalIgnores(['.next/**', 'next-env.d.ts', 'src/theme/portfolio.css.d.ts'])]);
