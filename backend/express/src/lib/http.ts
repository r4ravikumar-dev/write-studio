import type {NextFunction, Request, RequestHandler, Response} from 'express';

/** An error with the HTTP status to answer with and a message safe to show. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Forwards a rejected promise to the error handler. */
export const handle =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** A route param as a string (Express 5 types them loosely). */
export const param = (req: Request, name: string) => String(req.params[name] ?? '');

export const UUID = /^[0-9a-f-]{36}$/i;

export function requireUuid(value: string) {
  if (!UUID.test(value)) throw new HttpError(404, 'Not found.');
  return value;
}
