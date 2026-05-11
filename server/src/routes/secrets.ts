import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SecretsStore } from '../lib/SecretsStore';

const router = Router();

export const PRESET_KEYS = ['ANTHROPIC_API_KEY'];

const PresetKey = z.string().refine((k) => PRESET_KEYS.includes(k), { message: 'Not a recognized secret key' });

// Return the preset keys and which ones are currently set
router.get('/', (_req: Request, res: Response) => {
  const set = SecretsStore.keys();
  res.json(PRESET_KEYS.map((key) => ({ key, isSet: set.includes(key) })));
});

// Set a preset secret
router.put('/:key', (req: Request, res: Response) => {
  const key = PresetKey.parse(req.params.key);
  const { value } = z.object({ value: z.string().min(1) }).parse(req.body);
  SecretsStore.set(key, value);
  res.json({ key });
});

// Clear a preset secret
router.delete('/:key', (req: Request, res: Response) => {
  const key = PresetKey.parse(req.params.key);
  const deleted = SecretsStore.delete(key);
  if (!deleted) { res.status(404).json({ error: 'Secret not set' }); return; }
  res.json({ key });
});

export default router;
