export interface App {
  id: string;
  name: string;
  installUrl: string;
  url: string;
  status: string;
}

export async function getApp(id: string): Promise<App> {
  const res = await fetch(`/api/apps/${id}`);
  if (!res.ok) throw new Error('App not found');
  return res.json();
}

export async function getAppByName(name: string): Promise<App> {
  const res = await fetch(`/api/apps/by-name/${name}`);
  if (!res.ok) throw new Error('App not found');
  return res.json();
}

export async function listApps(): Promise<App[]> {
  const res = await fetch('/api/apps');
  if (!res.ok) throw new Error('Failed to fetch apps');
  return res.json();
}

export async function renameApp(id: string, name: string): Promise<App> {
  const res = await fetch(`/api/apps/${id}/name`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to rename app');
  }
  return res.json();
}

export async function restartApp(id: string): Promise<void> {
  const res = await fetch(`/api/apps/${id}/restart`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restart app');
}

export async function startApp(id: string): Promise<void> {
  const res = await fetch(`/api/apps/${id}/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start app');
}

export async function stopApp(id: string): Promise<void> {
  const res = await fetch(`/api/apps/${id}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop app');
}

export async function deleteApp(id: string): Promise<void> {
  const res = await fetch(`/api/apps/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete app');
}

export interface SecretStatus {
  key: string;
  isSet: boolean;
}

export async function listSecrets(): Promise<SecretStatus[]> {
  const res = await fetch('/api/secrets');
  if (!res.ok) throw new Error('Failed to fetch secrets');
  return res.json();
}

export async function setSecret(key: string, value: string): Promise<void> {
  const res = await fetch(`/api/secrets/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to set secret');
  }
}

export async function clearSecret(key: string): Promise<void> {
  const res = await fetch(`/api/secrets/${key}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear secret');
}

export async function installApp(url: string, name: string): Promise<App> {
  const res = await fetch('/api/apps/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to install app');
  }
  return res.json();
}
