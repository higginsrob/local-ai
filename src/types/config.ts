// Configuration types

export interface ModelCache {
  [modelName: string]: {
    ctxSize: number;
    lastConfigured: string; // ISO timestamp
  };
}

export interface Config {
  currentProfile: string;
  currentAgent: string | null;
  dockerHost: string;
  llamaCppEndpoint?: string;
  modelCache?: ModelCache; // Cache of last configured model parameters
}

