export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: AgentToolCall[];  // present when role is 'assistant' and model invoked tools
  tool_call_id?: string;         // present when role is 'tool' (result of a tool call)
  tool_name?: string;            // present when role is 'tool' (name of the tool that was called)
}

export interface AgentToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface AgentTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;  // JSON Schema object
  };
}

export type AgentReplyChunk =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool_call'; tool_call: AgentToolCall }
  | { type: 'tool_result'; tool_call_id: string; result: string };

export interface ModelInfo {
  name: string;
}

export interface AgentReply {
  content: string | null;
  tool_calls?: AgentToolCall[];
}

export abstract class AgentInterface {
  abstract streamReply(
    messages: AgentMessage[],
    tools: AgentTool[],
    model: string,
  ): AsyncIterable<AgentReplyChunk>;

  /**
   * For convenience, also provide a method that collects the streamed chunks into a single reply object. 
   */
  async getReply(messages: AgentMessage[], tools: AgentTool[], model: string): Promise<AgentReply> {
    const textParts: string[] = [];
    const tool_calls: AgentToolCall[] = [];

    for await (const chunk of this.streamReply(messages, tools, model)) {
      if (chunk.type === 'text-delta') {
        textParts.push(chunk.delta);
      } else if (chunk.type === 'tool_call') {
        tool_calls.push(chunk.tool_call);
      }
    }

    return {
      content: textParts.length > 0 ? textParts.join('') : null,
      tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
    };
  }

  abstract getAvailableModels(): Promise<ModelInfo[]>;
}
