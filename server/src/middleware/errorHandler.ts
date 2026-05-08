import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', details: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
