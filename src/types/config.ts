// Configuration types

export interface Config {
  currentProfile: string;
  currentAgent: string | null;
  currentSession: string | null;
  dockerHost: string;
  llamaCppEndpoint?: string;
}

