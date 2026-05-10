import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { z } from 'zod';
import { docker } from '../docker';
import { streamContainerLogs } from '../lib/streamLogs';

const router = Router();

const MANAGER_IMAGE = 'treetop-app-manager';
const NETWORK = 'treetop_web';
const APP_PORT = 3000;
const DATA_ROOT = '/treetop-data/apps';           // path inside the treetop container
const HOST_DATA_ROOT = process.env.HOST_DATA_ROOT  // path on the Docker host
  ? `${process.env.HOST_DATA_ROOT}/apps`
  : DATA_ROOT;

const AppId = z.object({ id: z.string() });
const AppName = z.string().min(1).max(63).regex(/^[a-z0-9][a-z0-9-]*$/, 'Name must be lowercase alphanumeric with hyphens');

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
    name: c.Labels['treetop.app.name'],
    installUrl: c.Labels['treetop.app.installUrl'],
    url: `http://${c.Labels['treetop.app.name']}.localhost`,
    status: c.State,
  }));

  res.json(apps);
});

// Get info for a single app by name
router.get('/by-name/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: [`treetop.app.name=${name}`] }),
  });
  if (containers.length === 0) { res.status(404).json({ error: 'App not found' }); return; }
  const container = docker.getContainer(containers[0].Id);
  const info = await container.inspect();
  res.json({
    id: info.Config.Labels['treetop.app.id'],
    name,
    installUrl: info.Config.Labels['treetop.app.installUrl'],
    url: `http://${name}.localhost`,
    status: info.State.Running ? 'running' : 'stopped',
  });
});

// Get info for a single app by id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  const info = await container.inspect();
  const name = info.Config.Labels['treetop.app.name'];
  res.json({
    id,
    name,
    installUrl: info.Config.Labels['treetop.app.installUrl'],
    url: `http://${name}.localhost`,
    status: info.State.Running ? 'running' : 'stopped',
  });
});

// Install a new app from a URL
router.post('/install', async (req: Request, res: Response) => {
  const { url, name } = z.object({
    url: z.string().url(),
    name: AppName,
  }).parse(req.body);

  const id = randomUUID();
  const hostname = `${name}.localhost`;
  const workspaceDir = `${DATA_ROOT}/${id}`;       // used for fs operations inside this container
  const hostWorkspaceDir = `${HOST_DATA_ROOT}/${id}`; // used for the bind mount path Docker resolves on the host

  mkdirSync(workspaceDir, { recursive: true });

  const container = await docker.createContainer({
    name: `treetop-app-${name}`,
    Image: MANAGER_IMAGE,
    Env: [`APP_URL=${url}`],
    HostConfig: {
      Binds: [`${hostWorkspaceDir}:/workspace`],
      NetworkMode: NETWORK,
      RestartPolicy: { Name: 'unless-stopped' },
    },
    Labels: {
      'treetop.managed': 'true',
      'treetop.app.id': id,
      'treetop.app.name': name,
      'treetop.app.installUrl': url,
      'traefik.enable': 'true',
      [`traefik.http.routers.${id}.rule`]: `Host(\`${hostname}\`)`,
      [`traefik.http.services.${id}.loadbalancer.server.port`]: String(APP_PORT),
    },
  });

  await container.start();

  res.json({ id, name, url: `http://${hostname}` });
});

// Rename an app — recreates the container with updated labels since Docker labels are immutable
router.patch('/:id/name', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const { name } = z.object({ name: AppName }).parse(req.body);

  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }

  const info = await container.inspect();
  const hostname = `${name}.localhost`;

  const updatedLabels = {
    ...info.Config.Labels,
    'treetop.app.name': name,
    [`traefik.http.routers.${id}.rule`]: `Host(\`${hostname}\`)`,
  };

  await container.remove({ force: true });

  const newContainer = await docker.createContainer({
    name: `treetop-app-${name}`,
    Image: info.Config.Image,
    Env: info.Config.Env ?? [],
    HostConfig: {
      NetworkMode: NETWORK,
      RestartPolicy: info.HostConfig.RestartPolicy,
    },
    Labels: updatedLabels,
  });

  await newContainer.start();

  res.json({ id, name, url: `http://${hostname}` });
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
