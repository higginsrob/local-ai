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
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  n_ctx?: number;  // Context window size
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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

