export interface ChatMessage {
  role: 'user' | 'agent' | 'tool';
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

    let currentAgentMsg: ChatMessage | null = null;

    const getOrCreateAgentMsg = (): ChatMessage => {
      if (!currentAgentMsg) {
        currentAgentMsg = { role: 'agent', text: '' };
        this.messages.push(currentAgentMsg);
      }
      return currentAgentMsg;
    };

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

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'text-delta') {
            getOrCreateAgentMsg().text += data.delta;
          } else if (data.type === 'tool_call') {
            const { name, arguments: args } = data.tool_call.function;
            const preview = name === 'execCommand' ? `$ ${args.command}` : `${name}(${JSON.stringify(args)})`;
            this.messages.push({ role: 'tool', text: preview });
            currentAgentMsg = null; // next text-delta gets a fresh bubble
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        }
      }

      // Remove trailing empty agent bubble (agent only used tools, no final text)
      if (currentAgentMsg?.text === '') {
        this.messages.splice(this.messages.indexOf(currentAgentMsg), 1);
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed';
      console.error('[AgentChat] Error:', err);
      if (currentAgentMsg?.text === '') {
        this.messages.splice(this.messages.indexOf(currentAgentMsg), 1);
      }
    } finally {
      this.loading = false;
    }
  }
}
