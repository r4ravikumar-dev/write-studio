import {createApp} from './app';

/**
 * Entry for Vercel Functions: the app without a port listener.
 * tsup bundles it (with @studio/shared) into dist/vercel.js, which api/index.js exports.
 * Local and long-running hosts keep using src/index.ts.
 */
export default createApp();
