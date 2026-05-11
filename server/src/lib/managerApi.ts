import type { Container } from 'dockerode';

const MANAGER_MGMT_PORT = 4000;

async function call(container: Container, path: string): Promise<void> {
  const info = await container.inspect();
  const name = info.Name.replace(/^\//, '');
  const res = await fetch(`http://${name}:${MANAGER_MGMT_PORT}${path}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Manager API error: ${res.status}`);
}

export const managerApi = {
  restart: (container: Container) => call(container, '/restart'),
};
