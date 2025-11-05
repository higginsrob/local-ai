// Storage management for ~/.ai directory
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config } from '../types/config.ts';
import type { Profile } from '../types/profile.ts';
import type { Agent } from '../types/agent.ts';
import type { Session } from '../types/session.ts';

export class Storage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.homedir(), '.ai');
  }

  async init(): Promise<void> {
    // Create directory structure
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'profiles'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'agents'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'sessions'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'bin'), { recursive: true });

    // Create default config if it doesn't exist
    const configPath = path.join(this.baseDir, 'config.json');
    try {
      await fs.access(configPath);
    } catch {
      await this.saveConfig({
        currentProfile: 'default',
        currentAgent: null,
        currentSession: null,
        dockerHost: 'unix:///var/run/docker.sock',
      });
    }

    // Create default profile if it doesn't exist
    try {
      await this.loadProfile('default');
    } catch {
      await this.saveProfile({
        name: 'default',
        attributes: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Config operations
  async loadConfig(): Promise<Config> {
    const configPath = path.join(this.baseDir, 'config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  }

  async saveConfig(config: Config): Promise<void> {
    const configPath = path.join(this.baseDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  // Profile operations
  async loadProfile(name: string): Promise<Profile> {
    const profilePath = path.join(this.baseDir, 'profiles', `${name}.json`);
    const data = await fs.readFile(profilePath, 'utf-8');
    return JSON.parse(data);
  }

  async saveProfile(profile: Profile): Promise<void> {
    const profilePath = path.join(this.baseDir, 'profiles', `${profile.name}.json`);
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
  }

  async deleteProfile(name: string): Promise<void> {
    const profilePath = path.join(this.baseDir, 'profiles', `${name}.json`);
    await fs.unlink(profilePath);
  }

  async listProfiles(): Promise<string[]> {
    const profilesDir = path.join(this.baseDir, 'profiles');
    const files = await fs.readdir(profilesDir);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  }

  // Agent operations
  async loadAgent(name: string): Promise<Agent> {
    const agentPath = path.join(this.baseDir, 'agents', `${name}.json`);
    const data = await fs.readFile(agentPath, 'utf-8');
    return JSON.parse(data);
  }

  async saveAgent(agent: Agent): Promise<void> {
    const agentPath = path.join(this.baseDir, 'agents', `${agent.name}.json`);
    await fs.writeFile(agentPath, JSON.stringify(agent, null, 2));
  }

  async deleteAgent(name: string): Promise<void> {
    const agentPath = path.join(this.baseDir, 'agents', `${name}.json`);
    await fs.unlink(agentPath);
  }

  async listAgents(): Promise<string[]> {
    const agentsDir = path.join(this.baseDir, 'agents');
    const files = await fs.readdir(agentsDir);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  }

  // Session operations
  async loadSession(id: string): Promise<Session> {
    const sessionPath = path.join(this.baseDir, 'sessions', `${id}.json`);
    const data = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(data);
  }

  async saveSession(session: Session): Promise<void> {
    const sessionPath = path.join(this.baseDir, 'sessions', `${session.id}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
  }

  async deleteSession(id: string): Promise<void> {
    const sessionPath = path.join(this.baseDir, 'sessions', `${id}.json`);
    await fs.unlink(sessionPath);
  }

  async listSessions(): Promise<string[]> {
    const sessionsDir = path.join(this.baseDir, 'sessions');
    const files = await fs.readdir(sessionsDir);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  }

  async deleteAllSessions(): Promise<void> {
    const sessions = await this.listSessions();
    await Promise.all(sessions.map(id => this.deleteSession(id)));
  }

  // Bin operations
  getBinPath(name: string): string {
    return path.join(this.baseDir, 'bin', name);
  }

  async listBinExecutables(): Promise<string[]> {
    const binDir = path.join(this.baseDir, 'bin');
    try {
      const files = await fs.readdir(binDir);
      return files;
    } catch {
      return [];
    }
  }

  // Utility
  getBaseDir(): string {
    return this.baseDir;
  }

  async cleanup(): Promise<void> {
    // For testing: remove the entire directory
    await fs.rm(this.baseDir, { recursive: true, force: true });
  }
}

