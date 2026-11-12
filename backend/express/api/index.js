// Vercel Function: every request is rewritten here (vercel.json) and handled by the
// Express app, built by `npm run build` (tsup) with @studio/shared bundled in.
export {default} from '../dist/vercel.js';
