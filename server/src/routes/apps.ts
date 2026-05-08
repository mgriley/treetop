import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { docker } from '../docker';
import { streamContainerLogs } from '../lib/streamLogs';

const router = Router();

const MANAGER_IMAGE = 'treetop-app-manager';
const NETWORK = 'treetop_web';
const APP_PORT = 3000;

const AppId = z.object({ id: z.string() });

async function findContainer(id: string) {
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: [`treetop.app.id=${id}`] }),
  });
  if (containers.length === 0) return null;
  return docker.getContainer(containers[0].Id);
}

// List all installed apps by querying Docker for treetop-managed containers
router.get('/', async (req: Request, res: Response) => {
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: ['treetop.managed=true'] }),
  });

  const apps = containers.map((c) => ({
    id: c.Labels['treetop.app.id'],
    installUrl: c.Labels['treetop.app.installUrl'],
    url: `http://${c.Labels['treetop.app.id']}.localhost`,
    status: c.State,
  }));

  res.json(apps);
});

// Get info for a single app
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  const info = await container.inspect();
  res.json({
    id,
    installUrl: info.Config.Labels['treetop.app.installUrl'],
    url: `http://${id}.localhost`,
    status: info.State.Running ? 'running' : 'stopped',
  });
});

// Install a new app from a URL
router.post('/install', async (req: Request, res: Response) => {
  const { url } = z.object({ url: z.string().url() }).parse(req.body);

  const id = randomUUID();
  const hostname = `${id}.localhost`;

  const container = await docker.createContainer({
    name: `treetop-app-${id}`,
    Image: MANAGER_IMAGE,
    Env: [`APP_URL=${url}`],
    HostConfig: {
      NetworkMode: NETWORK,
      RestartPolicy: { Name: 'unless-stopped' },
    },
    Labels: {
      'treetop.managed': 'true',
      'treetop.app.id': id,
      'treetop.app.installUrl': url,
      'traefik.enable': 'true',
      [`traefik.http.routers.${id}.rule`]: `Host(\`${hostname}\`)`,
      [`traefik.http.services.${id}.loadbalancer.server.port`]: String(APP_PORT),
    },
  });

  await container.start();

  res.json({ id, url: `http://${hostname}` });
});

// Start an installed app
router.post('/:id/start', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  await container.start();
  res.json({ id });
});

// Stop a running app
router.post('/:id/stop', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  await container.stop();
  res.json({ id });
});

// Stream container logs as SSE
router.get('/:id/logs', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  await streamContainerLogs(container, req, res);
});

// Delete an app and its container
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  await container.remove({ force: true });
  res.json({ id });
});

export default router;
