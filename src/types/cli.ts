// CLI-related types
import type { Session } from './session.ts';

export interface RunOptions {
  ctxSize?: string;
  maxTokens?: string;
  temperature?: string;
  topP?: string;
  topN?: string;
  debug?: boolean;
}

export interface InteractiveOptions {
  model: string;
  ctxSize: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  topN: number;
  debug: boolean;
}

export interface SlashCommandResult {
  exit?: boolean;
  settings?: Partial<InteractiveOptions>;
  session?: Session;
  modelReloadRequired?: boolean;
  switchToAgent?: string;
  switchToMeeting?: string[];
}

