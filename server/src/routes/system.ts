import { Router, Request, Response } from 'express';
import { docker } from '../docker';
import { streamContainerLogs } from '../lib/streamLogs';

const router = Router();

async function findServiceContainer(service: string) {
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: [`com.docker.compose.service=${service}`] }),
  });
  if (containers.length === 0) return null;
  return docker.getContainer(containers[0].Id);
}

router.get('/logs/:service', async (req: Request, res: Response) => {
  const { service } = req.params;
  const container = await findServiceContainer(service);
  if (!container) { res.status(404).json({ error: `Container '${service}' not found` }); return; }
  await streamContainerLogs(container, req, res);
});

export default router;
