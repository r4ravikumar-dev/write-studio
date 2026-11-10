import type {NextFunction, Request, Response} from 'express';
import {HttpError} from '../lib/http';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({error: 'Not found.'});
}

/** Every error leaves as {error, ...details}; unexpected ones are logged, not leaked. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({error: error.message, ...error.details});
    return;
  }
  if (error && typeof error === 'object' && 'type' in error && (error as {type: string}).type === 'entity.too.large') {
    res.status(413).json({error: 'This is too large to save. Move some of it into another case study, then try again.'});
    return;
  }
  console.error('[api] unexpected error:', error);
  res.status(500).json({error: 'Something went wrong on our side. Try again in a moment.'});
}
