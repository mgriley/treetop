import type { Request, Response, NextFunction } from 'express';
import { AdminAuth } from '../lib/AdminAuth';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'];
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !AdminAuth.checkToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
