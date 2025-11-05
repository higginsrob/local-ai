// Docker AI Models types

export interface CompletionRequest {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCallResponse[];
  tool_call_id?: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolCallResponse {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface CompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChoice[];
}

export interface CompletionChoice {
  text?: string;
  delta?: {
    role?: string;
    content?: string;
    tool_calls?: ToolCallResponse[];
  };
  index: number;
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

