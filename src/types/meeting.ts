// Meeting-related types for multi-agent sessions

export interface MeetingSession {
  id: string;
  agentNames: string[];
  profileName: string;
  sharedMessages: MeetingMessage[];
  bufferedResponses: BufferedResponse[];
  metadata: MeetingMetadata;
  maxChainLength: number; // Max length of agent-to-agent conversation chains
  checkInTokenLimit: number; // Tokens before agents should check in with user (default: 1024)
  createdAt: string;
  updatedAt: string;
}

export interface MeetingMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  agentName?: string; // Which agent spoke (for assistant messages)
  targetAgent?: string; // Which agent was targeted (for user messages)
  chainDepth?: number; // Depth in agent-to-agent chain (0 = user message)
  timestamp: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface BufferedResponse {
  agentName: string;
  content: string;
  timestamp: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface MeetingMetadata {
  activeAgents: string[];
  totalMessages: number;
  lastResponseStats?: {
    agentName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    contextWindowSize: number;
  };
}

export interface TargetedMessage {
  content: string;
  targetedAgents: string[];
  isDirectTarget: boolean; // true if <agent>, or @<agent>, false if broadcast
}

