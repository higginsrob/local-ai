// Session/chat history types

export interface Session {
  id: string;
  agentName: string | null;
  profileName: string;
  messages: Message[];
  metadata: SessionMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface SessionMetadata {
  tokenCount: number;
  toolCalls: number;
}

