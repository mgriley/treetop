import { streamText, tool, jsonSchema, type LanguageModel } from 'ai';
import { AgentInterface, type AgentMessage, type AgentTool, type AgentReplyChunk, type AgentToolCall, type ModelInfo } from './AgentInterface';

export class VercelAgentInterface extends AgentInterface {
  constructor(private modelFactory: (model: string) => LanguageModel) {
    super();
  }

  async *streamReply(
    messages: AgentMessage[],
    tools: AgentTool[],
    model: string,
  ): AsyncIterable<AgentReplyChunk> {
    const result = streamText({
      model: this.modelFactory(model),
      messages: messages.map(toVercelMessage),
      tools: Object.fromEntries(
        tools.map((t) => [
          t.function.name,
          tool({
            description: t.function.description,
            inputSchema: jsonSchema(t.function.parameters),
          }),
        ])
      ),
    });

    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        yield { type: 'text-delta', delta: part.text };
      } else if (part.type === 'tool-call') {
        const toolCall: AgentToolCall = {
          id: part.toolCallId,
          type: 'function',
          function: { name: part.toolName, arguments: part.input as Record<string, unknown> },
        };
        yield { type: 'tool_call', tool_call: toolCall };
      }
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return [
      { name: 'claude-opus-4-7' },
      { name: 'claude-sonnet-4-6' },
      { name: 'claude-haiku-4-5-20251001' },
    ];
  }
}

function toVercelMessage(msg: AgentMessage) {
  if (msg.role === 'tool') {
    return {
      role: 'tool' as const,
      content: [
        {
          type: 'tool-result' as const,
          toolCallId: msg.tool_call_id!,
          toolName: msg.tool_name!,
          output: { type: 'text' as const, value: msg.content ?? '' },
        },
      ],
    };
  }

  if (msg.role === 'assistant' && msg.tool_calls?.length) {
    const toolCallParts = msg.tool_calls.map((tc) => ({
      type: 'tool-call' as const,
      toolCallId: tc.id,
      toolName: tc.function.name,
      input: tc.function.arguments,
    }));
    return {
      role: 'assistant' as const,
      content: msg.content
        ? [{ type: 'text' as const, text: msg.content }, ...toolCallParts]
        : toolCallParts,
    };
  }

  return { role: msg.role as 'system' | 'user' | 'assistant', content: msg.content ?? '' };
}
