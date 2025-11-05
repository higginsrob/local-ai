import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { Storage } from '../../src/lib/storage.ts';
import { ConfigManager } from '../../src/lib/config.ts';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  let storage: Storage;
  let configManager: ConfigManager;
  const testDir = path.join(os.tmpdir(), 'test-ai-config-' + Date.now());

  before(async () => {
    storage = new Storage(testDir);
    await storage.init();
    configManager = new ConfigManager(storage);
  });

  after(async () => {
    await storage.cleanup();
  });

  test('should get config', async () => {
    const config = await configManager.getConfig();
    assert.strictEqual(config.currentProfile, 'default');
  });

  test('should update config', async () => {
    const updated = await configManager.updateConfig({ currentAgent: 'test-agent' });
    assert.strictEqual(updated.currentAgent, 'test-agent');
  });

  test('should get and set current profile', async () => {
    await configManager.setCurrentProfile('developer');
    const profile = await configManager.getCurrentProfile();
    assert.strictEqual(profile, 'developer');
  });

  test('should get and set current agent', async () => {
    await configManager.setCurrentAgent('coder');
    const agent = await configManager.getCurrentAgent();
    assert.strictEqual(agent, 'coder');
  });

  test('should get and set current session', async () => {
    await configManager.setCurrentSession('session-123');
    const session = await configManager.getCurrentSession();
    assert.strictEqual(session, 'session-123');
  });

  test('should get docker host', async () => {
    const dockerHost = await configManager.getDockerHost();
    assert.strictEqual(dockerHost, 'unix:///var/run/docker.sock');
  });

  test('should get default llama.cpp endpoint', async () => {
    const endpoint = await configManager.getLlamaCppEndpoint();
    assert.strictEqual(endpoint, 'http://localhost:12434');
  });

  test('should set and get llama.cpp endpoint', async () => {
    await configManager.setLlamaCppEndpoint('http://localhost:9090');
    const endpoint = await configManager.getLlamaCppEndpoint();
    assert.strictEqual(endpoint, 'http://localhost:9090');
  });
});

