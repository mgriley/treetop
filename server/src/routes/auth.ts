import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { AdminAuth } from '../lib/AdminAuth';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  limit: 10,                 // max 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/login', loginLimiter, async (req, res) => {
  const { password } = z.object({ password: z.string() }).parse(req.body);
  if (!await AdminAuth.verify(password)) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  res.json({ token: AdminAuth.createToken() });
});

router.post('/logout', (req, res) => {
  const header = req.headers['authorization'];
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) AdminAuth.revokeToken(token);
  res.json({ ok: true });
});

export default router;
