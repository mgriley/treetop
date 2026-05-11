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

export interface AgentReply {
  content: string | null;
  tool_calls?: AgentToolCall[];
}

export interface AgentInterface {
  getReply(messages: AgentMessage[], tools: AgentTool[], model: string): Promise<AgentReply>;
}
