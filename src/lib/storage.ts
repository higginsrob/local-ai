// Storage management for ~/.ai directory
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config } from '../types/config.ts';
import type { Profile } from '../types/profile.ts';
import type { Agent } from '../types/agent.ts';
import type { Session } from '../types/session.ts';
import type { MeetingSession } from '../types/meeting.ts';

export class Storage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.homedir(), '.ai');
  }

  // Sanitize names for use in file paths (replace slashes with double underscores)
  private sanitizeName(name: string): string {
    return name.replace(/\//g, '__');
  }

  // Reverse sanitization to get original name
  private unsanitizeName(name: string): string {
    return name.replace(/__/g, '/');
  }

  async init(): Promise<void> {
    // Create directory structure
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'profiles'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'agents'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'sessions'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'meetings'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'bin'), { recursive: true });

    // Create default config if it doesn't exist
    const configPath = path.join(this.baseDir, 'config.json');
    try {
      await fs.access(configPath);
    } catch {
      await this.saveConfig({
        currentProfile: 'default',
        currentAgent: null,
        dockerHost: 'unix:///var/run/docker.sock',
        modelCache: {},
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
    const sanitizedName = this.sanitizeName(name);
    const profilePath = path.join(this.baseDir, 'profiles', `${sanitizedName}.json`);
    const data = await fs.readFile(profilePath, 'utf-8');
    return JSON.parse(data);
  }

  async saveProfile(profile: Profile): Promise<void> {
    const sanitizedName = this.sanitizeName(profile.name);
    const profilePath = path.join(this.baseDir, 'profiles', `${sanitizedName}.json`);
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
  }

  async deleteProfile(name: string): Promise<void> {
    const sanitizedName = this.sanitizeName(name);
    const profilePath = path.join(this.baseDir, 'profiles', `${sanitizedName}.json`);
    await fs.unlink(profilePath);
  }

  async listProfiles(): Promise<string[]> {
    const profilesDir = path.join(this.baseDir, 'profiles');
    const files = await fs.readdir(profilesDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => this.unsanitizeName(f.replace('.json', '')));
  }

  // Agent operations
  async loadAgent(name: string): Promise<Agent> {
    const sanitizedName = this.sanitizeName(name);
    const agentPath = path.join(this.baseDir, 'agents', `${sanitizedName}.json`);
    const data = await fs.readFile(agentPath, 'utf-8');
    return JSON.parse(data);
  }

  async saveAgent(agent: Agent): Promise<void> {
    const sanitizedName = this.sanitizeName(agent.name);
    const agentPath = path.join(this.baseDir, 'agents', `${sanitizedName}.json`);
    await fs.writeFile(agentPath, JSON.stringify(agent, null, 2));
  }

  async deleteAgent(name: string): Promise<void> {
    const sanitizedName = this.sanitizeName(name);
    const agentPath = path.join(this.baseDir, 'agents', `${sanitizedName}.json`);
    await fs.unlink(agentPath);
  }

  async listAgents(): Promise<string[]> {
    const agentsDir = path.join(this.baseDir, 'agents');
    const files = await fs.readdir(agentsDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => this.unsanitizeName(f.replace('.json', '')));
  }

  // Session operations
  async loadSession(id: string): Promise<Session> {
    const sanitizedId = this.sanitizeName(id);
    const sessionPath = path.join(this.baseDir, 'sessions', `${sanitizedId}.json`);
    const data = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(data);
  }

  async saveSession(session: Session): Promise<void> {
    const sanitizedId = this.sanitizeName(session.id);
    const sessionPath = path.join(this.baseDir, 'sessions', `${sanitizedId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
  }

  async deleteSession(id: string): Promise<void> {
    const sanitizedId = this.sanitizeName(id);
    const sessionPath = path.join(this.baseDir, 'sessions', `${sanitizedId}.json`);
    await fs.unlink(sessionPath);
  }

  async listSessions(): Promise<string[]> {
    const sessionsDir = path.join(this.baseDir, 'sessions');
    const files = await fs.readdir(sessionsDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => this.unsanitizeName(f.replace('.json', '')));
  }

  async deleteAllSessions(): Promise<void> {
    const sessions = await this.listSessions();
    await Promise.all(sessions.map(id => this.deleteSession(id)));
  }

  // Meeting session operations
  async loadMeetingSession(id: string): Promise<MeetingSession> {
    const sanitizedId = this.sanitizeName(id);
    const meetingPath = path.join(this.baseDir, 'meetings', `${sanitizedId}.json`);
    const data = await fs.readFile(meetingPath, 'utf-8');
    return JSON.parse(data);
  }

  async saveMeetingSession(meeting: MeetingSession): Promise<void> {
    const sanitizedId = this.sanitizeName(meeting.id);
    const meetingPath = path.join(this.baseDir, 'meetings', `${sanitizedId}.json`);
    await fs.writeFile(meetingPath, JSON.stringify(meeting, null, 2));
  }

  async deleteMeetingSession(id: string): Promise<void> {
    const sanitizedId = this.sanitizeName(id);
    const meetingPath = path.join(this.baseDir, 'meetings', `${sanitizedId}.json`);
    await fs.unlink(meetingPath);
  }

  async listMeetingSessions(): Promise<string[]> {
    const meetingsDir = path.join(this.baseDir, 'meetings');
    try {
      const files = await fs.readdir(meetingsDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => this.unsanitizeName(f.replace('.json', '')));
    } catch {
      return [];
    }
  }

  async deleteAllMeetingSessions(): Promise<void> {
    const meetings = await this.listMeetingSessions();
    await Promise.all(meetings.map(id => this.deleteMeetingSession(id)));
  }

  // Agent lock operations (for preventing multiple terminals running same agent)
  async isAgentLocked(agentName: string): Promise<boolean> {
    const lockPath = this.getAgentLockPath(agentName);
    try {
      const pidStr = await fs.readFile(lockPath, 'utf-8');
      const pid = parseInt(pidStr.trim());
      
      // Check if the process is still running
      try {
        process.kill(pid, 0); // Signal 0 checks if process exists without killing it
        return true; // Process exists, agent is locked
      } catch {
        // Process doesn't exist, remove stale lock
        await this.unlockAgent(agentName);
        return false;
      }
    } catch {
      return false; // No lock file exists
    }
  }

  async lockAgent(agentName: string): Promise<void> {
    const lockPath = this.getAgentLockPath(agentName);
    await fs.writeFile(lockPath, process.pid.toString());
  }

  async unlockAgent(agentName: string): Promise<void> {
    const lockPath = this.getAgentLockPath(agentName);
    try {
      await fs.unlink(lockPath);
    } catch {
      // Lock file doesn't exist, ignore
    }
  }

  private getAgentLockPath(agentName: string): string {
    const sanitizedName = this.sanitizeName(agentName);
    return path.join(this.baseDir, 'agents', `${sanitizedName}.lock`);
  }

  // Session lock operations (deprecated - kept for compatibility)
  async isSessionLocked(sessionId: string): Promise<boolean> {
    const lockPath = this.getSessionLockPath(sessionId);
    try {
      const pidStr = await fs.readFile(lockPath, 'utf-8');
      const pid = parseInt(pidStr.trim());
      
      // Check if the process is still running
      try {
        process.kill(pid, 0); // Signal 0 checks if process exists without killing it
        return true; // Process exists, session is locked
      } catch {
        // Process doesn't exist, remove stale lock
        await this.unlockSession(sessionId);
        return false;
      }
    } catch {
      return false; // No lock file exists
    }
  }

  async lockSession(sessionId: string): Promise<void> {
    const lockPath = this.getSessionLockPath(sessionId);
    await fs.writeFile(lockPath, process.pid.toString());
  }

  async unlockSession(sessionId: string): Promise<void> {
    const lockPath = this.getSessionLockPath(sessionId);
    try {
      await fs.unlink(lockPath);
    } catch {
      // Lock file doesn't exist, ignore
    }
  }

  private getSessionLockPath(sessionId: string): string {
    const sanitizedId = this.sanitizeName(sessionId);
    return path.join(this.baseDir, 'sessions', `${sanitizedId}.lock`);
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

