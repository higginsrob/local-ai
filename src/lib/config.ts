// Configuration utilities
import { Storage } from './storage.ts';
import type { Config } from '../types/config.ts';

export class ConfigManager {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async getConfig(): Promise<Config> {
    return await this.storage.loadConfig();
  }

  async updateConfig(updates: Partial<Config>): Promise<Config> {
    const config = await this.storage.loadConfig();
    const updatedConfig = { ...config, ...updates };
    await this.storage.saveConfig(updatedConfig);
    return updatedConfig;
  }

  async getCurrentProfile(): Promise<string> {
    const config = await this.storage.loadConfig();
    return config.currentProfile;
  }

  async setCurrentProfile(profileName: string): Promise<void> {
    await this.updateConfig({ currentProfile: profileName });
  }

  async getCurrentAgent(): Promise<string | null> {
    const config = await this.storage.loadConfig();
    return config.currentAgent;
  }

  async setCurrentAgent(agentName: string | null): Promise<void> {
    await this.updateConfig({ currentAgent: agentName });
  }

  async getDockerHost(): Promise<string> {
    const config = await this.storage.loadConfig();
    return config.dockerHost;
  }

  async getLlamaCppEndpoint(): Promise<string> {
    const config = await this.storage.loadConfig();
    return config.llamaCppEndpoint || 'http://localhost:12434';
  }

  async setLlamaCppEndpoint(endpoint: string): Promise<void> {
    await this.updateConfig({ llamaCppEndpoint: endpoint });
  }
}

