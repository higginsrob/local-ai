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
  lastRequestStats?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    contextWindowSize: number;
    timings?: {
      cache_n?: number;
      predicted_ms?: number;
      predicted_n?: number;
      predicted_per_second?: number;
      predicted_per_token_ms?: number;
      prompt_ms?: number;
      prompt_n?: number;
      prompt_per_second?: number;
      prompt_per_token_ms?: number;
    };
  };
}

