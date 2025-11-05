// CLI-related types
import type { Session } from './session.ts';

export interface RunOptions {
  ctxSize?: string;
  maxTokens?: string;
  temperature?: string;
  topP?: string;
  topN?: string;
  mcpServers?: string;
  tools?: string;
  toolChoice?: string;
  toolCallMode?: 'native' | 'prompt';
  thinking?: boolean;
  debug?: boolean;
}

export interface InteractiveOptions {
  model: string;
  ctxSize: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  topN: number;
  mcpServers: string[];
  tools: string[];
  toolChoice?: string;
  toolCallMode: 'native' | 'prompt';
  thinking: boolean;
  debug: boolean;
}

export interface SlashCommandResult {
  exit?: boolean;
  settings?: Partial<InteractiveOptions>;
  session?: Session;
}

