export interface App {
  id: string;
  installUrl: string;
  url: string;
  status: string;
}

export async function listApps(): Promise<App[]> {
  const res = await fetch('/api/apps');
  if (!res.ok) throw new Error('Failed to fetch apps');
  return res.json();
}

export async function installApp(url: string): Promise<App> {
  const res = await fetch('/api/apps/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to install app');
  }
  return res.json();
}
