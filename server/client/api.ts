import { reactive } from 'vue';

export interface App {
  id: string;
  name: string;
  installUrl: string;
  url: string;
  status: string;
}

// --- Auth state ---

export const authState = reactive({
  token: localStorage.getItem('admin-token') ?? '',
});

export function setToken(token: string) {
  authState.token = token;
  localStorage.setItem('admin-token', token);
}

export function clearToken() {
  authState.token = '';
  localStorage.removeItem('admin-token');
}

// Attaches the auth token and clears it on 401 so the login screen re-appears.
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {}),
    },
  });
  if (res.status === 401) clearToken();
  return res;
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Invalid password');
  const { token } = await res.json();
  setToken(token);
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  clearToken();
}

// --- Apps ---

export async function getApp(id: string): Promise<App> {
  const res = await apiFetch(`/api/apps/${id}`);
  if (!res.ok) throw new Error('App not found');
  return res.json();
}

export async function getAppByName(name: string): Promise<App> {
  const res = await apiFetch(`/api/apps/by-name/${name}`);
  if (!res.ok) throw new Error('App not found');
  return res.json();
}

export async function listApps(): Promise<App[]> {
  const res = await apiFetch('/api/apps');
  if (!res.ok) throw new Error('Failed to fetch apps');
  return res.json();
}

export async function renameApp(id: string, name: string): Promise<App> {
  const res = await apiFetch(`/api/apps/${id}/name`, {
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
  const res = await apiFetch(`/api/apps/${id}/restart`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restart app');
}

export async function softRestartApp(id: string): Promise<void> {
  const res = await apiFetch(`/api/apps/${id}/soft-restart`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to soft-restart app');
}

export async function startApp(id: string): Promise<void> {
  const res = await apiFetch(`/api/apps/${id}/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start app');
}

export async function stopApp(id: string): Promise<void> {
  const res = await apiFetch(`/api/apps/${id}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop app');
}

export async function deleteApp(id: string): Promise<void> {
  const res = await apiFetch(`/api/apps/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete app');
}

export async function installApp(url: string, name: string): Promise<App> {
  const res = await apiFetch('/api/apps/install', {
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

// --- Secrets ---

export interface SecretStatus {
  key: string;
  isSet: boolean;
}

export async function listSecrets(): Promise<SecretStatus[]> {
  const res = await apiFetch('/api/secrets');
  if (!res.ok) throw new Error('Failed to fetch secrets');
  return res.json();
}

export async function setSecret(key: string, value: string): Promise<void> {
  const res = await apiFetch(`/api/secrets/${key}`, {
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
  const res = await apiFetch(`/api/secrets/${key}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear secret');
}
