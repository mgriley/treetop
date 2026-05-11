import { Router, Request, Response } from 'express';
import { Container } from 'dockerode';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import { docker } from '../docker';
import { streamContainerLogs } from '../lib/streamLogs';
import { SecretsStore } from '../lib/SecretsStore';
import { managerApi } from '../lib/managerApi';
import { VercelAgentInterface } from '../agent/VercelAgentInterface';
import { ContainerAgent } from '../agent/ContainerAgent';

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

async function isNameTaken(name: string, excludeId?: string): Promise<boolean> {
  const containers = await docker.listContainers({
    all: true,
    filters: JSON.stringify({ label: [`treetop.app.name=${name}`] }),
  });
  return containers.some(c => c.Labels['treetop.app.id'] !== excludeId);
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

  if (await isNameTaken(name)) {
    res.status(409).json({ error: `An app named '${name}' already exists` });
    return;
  }

  const id = randomUUID();
  const hostname = `${name}.localhost`;
  const workspaceDir = `${DATA_ROOT}/${id}`;       // used for fs operations inside this container
  const hostWorkspaceDir = `${HOST_DATA_ROOT}/${id}`; // used for the bind mount path Docker resolves on the host

  mkdirSync(workspaceDir, { recursive: true });

  const container = await docker.createContainer({
    name: `treetop-app-${name}`,
    Image: MANAGER_IMAGE,
    Env: [`APP_URL=${url}`, `NPM_CONFIG_CACHE=/workspace/.npm-cache`],
    HostConfig: {
      Binds: [`${hostWorkspaceDir}:/workspace`],
      NetworkMode: NETWORK,
      RestartPolicy: { Name: 'unless-stopped' },
      // Security hardening — containers may run untrusted code
      CapDrop: ['ALL'],                              // strip all Linux capabilities
      SecurityOpt: ['no-new-privileges:true'],       // block execve-based privilege escalation
      ReadonlyRootfs: true,                          // root FS is immutable; only workspace + tmpfs are writable
      Tmpfs: {
        '/tmp': 'rw,noexec,nosuid,size=64m',         // scratch space, no exec bit
        '/root': 'rw,nosuid,size=32m',               // npm needs a home dir during install
      },
      Memory: 512 * 1024 * 1024,                    // 512 MB RAM cap
      MemorySwap: 512 * 1024 * 1024,                // swap = Memory → no swap allowed
      NanoCpus: 1_000_000_000,                      // 1 CPU
      PidsLimit: 200,                               // cap process count to limit fork bombs
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

  if (await isNameTaken(name, id)) {
    res.status(409).json({ error: `An app named '${name}' already exists` });
    return;
  }

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
      ...info.HostConfig,
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

// Restart an app container
router.post('/:id/restart', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  await container.restart();
  res.json({ id });
});

// Soft-restart — restarts only the app process inside the container via the manager API
router.post('/:id/soft-restart', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }
  await managerApi.restart(container);
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

// Stream an AI agent conversation for a given app over SSE
router.post('/:id/agent', async (req: Request, res: Response) => {
  const { id } = AppId.parse(req.params);
  const { prompt, model } = z.object({
    prompt: z.string().min(1),
    model: z.string().default('claude-sonnet-4-6'),
  }).parse(req.body);

  const container = await findContainer(id);
  if (!container) { res.status(404).json({ error: 'App not found' }); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const apiKey = SecretsStore.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      send({ type: 'error', message: 'ANTHROPIC_API_KEY is not set. Add it in Admin → Secrets.' });
      return;
    }
    const agentInterface = new VercelAgentInterface(createAnthropic({ apiKey }));
    const containerAgent = new ContainerAgent(agentInterface, container);
    const messages = [{ role: 'user' as const, content: prompt }];

    for await (const chunk of containerAgent.streamReply(messages, model)) {
      send(chunk);
    }

    send({ type: 'done' });
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : 'Agent error' });
  } finally {
    res.end();
  }
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
