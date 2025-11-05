import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Storage } from '../../src/lib/storage.ts';
import path from 'path';
import os from 'os';

describe('Storage', () => {
  let storage: Storage;
  const testDir = path.join(os.tmpdir(), 'test-ai-' + Date.now());

  before(async () => {
    storage = new Storage(testDir);
    await storage.init();
  });

  after(async () => {
    await storage.cleanup();
  });

  describe('initialization', () => {
    test('should create directory structure', async () => {
      const baseDir = storage.getBaseDir();
      assert.strictEqual(baseDir, testDir);
    });

    test('should create default config', async () => {
      const config = await storage.loadConfig();
      assert.strictEqual(config.currentProfile, 'default');
      assert.strictEqual(config.currentAgent, null);
      assert.strictEqual(config.currentSession, null);
    });

    test('should create default profile', async () => {
      const profile = await storage.loadProfile('default');
      assert.strictEqual(profile.name, 'default');
    });
  });

  describe('config operations', () => {
    test('should save and load config', async () => {
      const config = {
        currentProfile: 'test',
        currentAgent: 'coder',
        currentSession: 'session-1',
        dockerHost: 'unix:///var/run/docker.sock',
      };
      await storage.saveConfig(config);
      const loaded = await storage.loadConfig();
      assert.deepStrictEqual(loaded, config);
    });
  });

  describe('profile operations', () => {
    test('should save and load profile', async () => {
      const profile = {
        name: 'developer',
        attributes: { role: 'developer', expertise: ['typescript'] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storage.saveProfile(profile);
      const loaded = await storage.loadProfile('developer');
      assert.deepStrictEqual(loaded, profile);
    });

    test('should list profiles', async () => {
      const profiles = await storage.listProfiles();
      assert.ok(profiles.includes('default'));
      assert.ok(profiles.includes('developer'));
    });

    test('should delete profile', async () => {
      await storage.deleteProfile('developer');
      const profiles = await storage.listProfiles();
      assert.ok(!profiles.includes('developer'));
    });
  });

  describe('agent operations', () => {
    test('should save and load agent', async () => {
      const agent = {
        name: 'coder',
        model: 'llama3',
        systemPrompt: 'You are a helpful assistant',
        tools: ['filesystem'],
        mcpServers: ['docker://mcp-filesystem'],
        modelParams: {
          ctxSize: 4096,
          maxTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
          topN: 40,
        },
        attributes: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storage.saveAgent(agent);
      const loaded = await storage.loadAgent('coder');
      assert.deepStrictEqual(loaded, agent);
    });

    test('should list agents', async () => {
      const agents = await storage.listAgents();
      assert.ok(agents.includes('coder'));
    });

    test('should delete agent', async () => {
      await storage.deleteAgent('coder');
      const agents = await storage.listAgents();
      assert.ok(!agents.includes('coder'));
    });
  });

  describe('session operations', () => {
    test('should save and load session', async () => {
      const session = {
        id: 'session-1',
        agentName: 'coder',
        profileName: 'default',
        messages: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ],
        metadata: {
          tokenCount: 100,
          toolCalls: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storage.saveSession(session);
      const loaded = await storage.loadSession('session-1');
      assert.deepStrictEqual(loaded, session);
    });

    test('should list sessions', async () => {
      const sessions = await storage.listSessions();
      assert.ok(sessions.includes('session-1'));
    });

    test('should delete session', async () => {
      await storage.deleteSession('session-1');
      const sessions = await storage.listSessions();
      assert.ok(!sessions.includes('session-1'));
    });

    test('should delete all sessions', async () => {
      await storage.saveSession({
        id: 'session-2',
        agentName: null,
        profileName: 'default',
        messages: [],
        metadata: { tokenCount: 0, toolCalls: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await storage.saveSession({
        id: 'session-3',
        agentName: null,
        profileName: 'default',
        messages: [],
        metadata: { tokenCount: 0, toolCalls: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await storage.deleteAllSessions();
      const sessions = await storage.listSessions();
      assert.strictEqual(sessions.length, 0);
    });
  });

  describe('bin operations', () => {
    test('should get bin path', () => {
      const binPath = storage.getBinPath('my-agent');
      assert.ok(binPath.includes('bin'));
      assert.ok(binPath.includes('my-agent'));
    });

    test('should list bin executables', async () => {
      const executables = await storage.listBinExecutables();
      assert.ok(Array.isArray(executables));
    });
  });
});

