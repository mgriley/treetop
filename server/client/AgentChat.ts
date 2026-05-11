export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
}

export class AgentChat {
  messages: ChatMessage[] = [];
  loading = false;
  error = '';

  constructor(readonly appId: string) {}

  async send(prompt: string): Promise<void> {
    this.messages.push({ role: 'user', text: prompt });
    this.loading = true;
    this.error = '';
    try {
      const res = await fetch(`/api/apps/${this.appId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Agent request failed');
      }
      const data = await res.json();
      this.messages.push({ role: 'agent', text: data.result ?? '(no response yet)' });
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed';
    } finally {
      this.loading = false;
    }
  }
}
