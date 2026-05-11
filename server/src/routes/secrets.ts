import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SecretsStore } from '../lib/SecretsStore';

const router = Router();

const SecretKey = z.string().min(1).regex(/^[A-Z0-9_]+$/, 'Key must be uppercase alphanumeric with underscores');

const EXPECTED_KEYS = ['ANTHROPIC_API_KEY'];

// Return the list of keys that the system expects to be set
router.get('/expected', (_req: Request, res: Response) => {
  res.json(EXPECTED_KEYS);
});

// List secret keys (never values)
router.get('/', (_req: Request, res: Response) => {
  res.json(SecretsStore.keys());
});

// Set or update a secret
router.put('/:key', (req: Request, res: Response) => {
  const key = SecretKey.parse(req.params.key);
  const { value } = z.object({ value: z.string().min(1) }).parse(req.body);
  SecretsStore.set(key, value);
  res.json({ key });
});

// Delete a secret
router.delete('/:key', (req: Request, res: Response) => {
  const key = SecretKey.parse(req.params.key);
  const deleted = SecretsStore.delete(key);
  if (!deleted) { res.status(404).json({ error: 'Secret not found' }); return; }
  res.json({ key });
});

export default router;
