// Agent configuration types

export interface Agent {
  name: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  mcpServers: string[];
  modelParams: ModelParams;
  attributes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ModelParams {
  ctxSize: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  topN: number;
}

