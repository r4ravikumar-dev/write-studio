import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {env} from './config/env';
import {requireUser} from './middleware/auth';
import {errorHandler, notFound} from './middleware/errors';
import {appRouter} from './routes/app';
import {appAssetsRouter, appMediaRouter} from './routes/appAssets';
import {appCaseStudiesRouter} from './routes/appCaseStudies';
import {appAccountRouter} from './routes/appAccount';

/**
 * The Studio's data API. Every route needs a valid access token from the
 * Django auth service and only ever touches the signed-in user's own rows
 * and files. There are no public routes and no special accounts.
 *
 *   /api/app/workspace      the user's personal workspace
 *   /api/app/case-studies   their private case studies
 *   /api/app/assets         their private media library
 *   /api/app/media          streams one of their files (for /studio/files)
 *   /api/app/account        account lifecycle (storage purge before deletion)
 */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Behind one proxy (Vercel, Render, Fly…): trust its X-Forwarded-For.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({origin: env.corsOrigins, credentials: false}));
  // Case-study documents are JSON and can be large; files never come through here.
  app.use(express.json({limit: '5mb'}));

  app.get('/health', (_req, res) => {
    res.json({ok: true});
  });

  app.use('/api/app/account', requireUser, appAccountRouter);
  app.use('/api/app/case-studies', requireUser, appCaseStudiesRouter);
  app.use('/api/app/assets', requireUser, appAssetsRouter);
  app.use('/api/app/media', requireUser, appMediaRouter);
  app.use('/api/app', requireUser, appRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
