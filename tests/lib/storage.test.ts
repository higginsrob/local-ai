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
      // Note: currentSession was removed - sessions are now tied to agents via deterministic IDs
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
        model: 'ai/llama3.2:latest',
        systemPrompt: 'You are a helpful assistant',
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

    test('should handle agent names with slashes', async () => {
      const agent = {
        name: 'openai/gpt-4',
        model: 'openai/gpt-4',
        systemPrompt: 'You are a helpful assistant',
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
      const loaded = await storage.loadAgent('openai/gpt-4');
      assert.deepStrictEqual(loaded, agent);
      
      // Verify it appears in the list with the original name
      const agents = await storage.listAgents();
      assert.ok(agents.includes('openai/gpt-4'));
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

    test('should delete agent with slash in name', async () => {
      await storage.deleteAgent('openai/gpt-4');
      const agents = await storage.listAgents();
      assert.ok(!agents.includes('openai/gpt-4'));
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

  describe('meeting session operations', () => {
    test('should save and load meeting session', async () => {
      const meetingSession = {
        id: 'room-executive',
        roomName: 'executive',
        agentNames: ['ceo', 'cto', 'cfo'],
        profileName: 'default',
        sharedMessages: [
          { role: 'user' as const, content: 'What is our strategy?', timestamp: new Date().toISOString() },
        ],
        bufferedResponses: [],
        maxChainLength: 5,
        checkInTokenLimit: 512,
        metadata: {
          activeAgents: ['ceo', 'cto', 'cfo'],
          totalMessages: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await storage.saveMeetingSession(meetingSession);
      const loaded = await storage.loadMeetingSession('room-executive');
      assert.deepStrictEqual(loaded, meetingSession);
    });

    test('should list meeting sessions', async () => {
      const meetings = await storage.listMeetingSessions();
      assert.ok(meetings.includes('room-executive'));
    });

    test('should delete meeting session', async () => {
      await storage.deleteMeetingSession('room-executive');
      const meetings = await storage.listMeetingSessions();
      assert.ok(!meetings.includes('room-executive'));
    });

    test('should delete all meeting sessions', async () => {
      await storage.saveMeetingSession({
        id: 'room-dev',
        roomName: 'dev',
        agentNames: ['dev', 'qa'],
        profileName: 'default',
        sharedMessages: [],
        bufferedResponses: [],
        maxChainLength: 5,
        checkInTokenLimit: 512,
        metadata: { activeAgents: ['dev', 'qa'], totalMessages: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await storage.deleteAllMeetingSessions();
      const meetings = await storage.listMeetingSessions();
      assert.strictEqual(meetings.length, 0);
    });
  });

  describe('archive operations', () => {
    test('should save and load archive', async () => {
      const archive = {
        id: 'archive-1',
        agentName: 'coder',
        profileName: 'default',
        messages: [
          { role: 'user' as const, content: 'Test message' },
        ],
        metadata: { tokenCount: 10, toolCalls: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.saveArchive('test-archive', archive);
      const loaded = await storage.loadArchive('test-archive');
      assert.deepStrictEqual(loaded, archive);
    });

    test('should list archives', async () => {
      const archives = await storage.listArchives();
      assert.ok(archives.includes('test-archive'));
    });

    test('should delete archive', async () => {
      await storage.deleteArchive('test-archive');
      const archives = await storage.listArchives();
      assert.ok(!archives.includes('test-archive'));
    });
  });

  describe('agent locking', () => {
    test('should lock and unlock agent', async () => {
      const agentName = 'test-agent';
      
      // Initially not locked
      const locked1 = await storage.isAgentLocked(agentName);
      assert.strictEqual(locked1, false);

      // Lock the agent
      await storage.lockAgent(agentName);
      const locked2 = await storage.isAgentLocked(agentName);
      assert.strictEqual(locked2, true);

      // Unlock the agent
      await storage.unlockAgent(agentName);
      const locked3 = await storage.isAgentLocked(agentName);
      assert.strictEqual(locked3, false);
    });

    test('should handle multiple agent locks', async () => {
      await storage.lockAgent('agent1');
      await storage.lockAgent('agent2');
      
      assert.strictEqual(await storage.isAgentLocked('agent1'), true);
      assert.strictEqual(await storage.isAgentLocked('agent2'), true);
      assert.strictEqual(await storage.isAgentLocked('agent3'), false);

      await storage.unlockAgent('agent1');
      
      assert.strictEqual(await storage.isAgentLocked('agent1'), false);
      assert.strictEqual(await storage.isAgentLocked('agent2'), true);

      await storage.unlockAgent('agent2');
    });

    test('should clean up lock files when unlocking', async () => {
      await storage.lockAgent('cleanup-test');
      assert.strictEqual(await storage.isAgentLocked('cleanup-test'), true);
      
      await storage.unlockAgent('cleanup-test');
      assert.strictEqual(await storage.isAgentLocked('cleanup-test'), false);
      
      // Unlocking again should not throw
      await storage.unlockAgent('cleanup-test');
      assert.strictEqual(await storage.isAgentLocked('cleanup-test'), false);
    });
  });
});

