import { PassThrough, Readable } from 'stream';
import type { Container } from 'dockerode';
import { docker } from '../docker';
import { managerApi } from '../lib/managerApi';
import type { AgentInterface, AgentMessage, AgentReplyChunk, AgentToolCall, AgentTool } from './AgentInterface';

const TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'execCommand',
      description: 'Run a shell command inside the app container and return its combined stdout/stderr output.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to run' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'softRestart',
      description: 'Restart the app process inside the container. Call this after modifying any app files so the changes take effect.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI assistant that can inspect and modify a running web application inside a Docker container. \
The app source code is in the current working directory. \
After making any changes to the application files, always call softRestart so the changes take effect.`;

export class ContainerAgent {
  constructor(
    private agent: AgentInterface,
    private container: Container,
  ) {}

  get tools(): AgentTool[] {
    return TOOLS;
  }

  async *streamReply(messages: AgentMessage[], model: string): AsyncIterable<AgentReplyChunk> {
    const messagesWithSystem: AgentMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    while (true) {
      const toolCalls: AgentToolCall[] = [];
      const textParts: string[] = [];

      for await (const chunk of this.agent.streamReply(messagesWithSystem, this.tools, model)) {
        yield chunk;
        if (chunk.type === 'text-delta') textParts.push(chunk.delta);
        if (chunk.type === 'tool_call') toolCalls.push(chunk.tool_call);
      }

      if (toolCalls.length === 0) break;

      messagesWithSystem.push({
        role: 'assistant',
        content: textParts.length > 0 ? textParts.join('') : null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const result = await this.dispatch(tc);
        yield { type: 'tool_result', tool_call_id: tc.id, result };
        messagesWithSystem.push(
          { role: 'tool', content: result, tool_call_id: tc.id, tool_name: tc.function.name },
        );
      }
    }
  }

  private async dispatch(tc: AgentToolCall): Promise<string> {
    if (tc.function.name === 'execCommand') {
      const { command } = tc.function.arguments as { command: string };
      return this.execCommand(command);
    }
    if (tc.function.name === 'softRestart') {
      return this.softRestart();
    }
    return `Unknown tool: ${tc.function.name}`;
  }

  async softRestart(): Promise<string> {
    await managerApi.restart(this.container);
    return 'App restarted successfully.';
  }

  async execCommand(command: string): Promise<string> {
    const exec = await this.container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/workspace/code',
    });

    const stream = await exec.start({}) as unknown as Readable;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stdout = new PassThrough();
      const stderr = new PassThrough();

      stdout.on('data', (d: Buffer) => chunks.push(d));
      stderr.on('data', (d: Buffer) => chunks.push(d));

      (docker as any).modem.demuxStream(stream, stdout, stderr);

      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    });
  }
}
