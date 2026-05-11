import { generateText, tool, jsonSchema, type LanguageModel } from 'ai';
import type { AgentInterface, AgentMessage, AgentTool, AgentReply, AgentToolCall } from './AgentInterface';

export class VercelAgentInterface implements AgentInterface {
  constructor(private modelFactory: (model: string) => LanguageModel) {}

  async getReply(messages: AgentMessage[], tools: AgentTool[], model: string): Promise<AgentReply> {
    const result = await generateText({
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

    const toolCalls: AgentToolCall[] = result.toolCalls.map((tc) => ({
      id: tc.toolCallId,
      type: 'function',
      function: { name: tc.toolName, arguments: tc.input as Record<string, unknown> },
    }));

    return {
      content: result.text || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    };
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
