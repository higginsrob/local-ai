import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DockerModelManager } from '../../src/lib/docker-model-manager.ts';
import { Storage } from '../../src/lib/storage.ts';
import { ConfigManager } from '../../src/lib/config.ts';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

describe('DockerModelManager', () => {
  let testDir: string;
  let storage: Storage;
  let configManager: ConfigManager;
  let modelManager: DockerModelManager;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `ai-test-${Date.now()}`);
    storage = new Storage(testDir);
    await storage.init();
    configManager = new ConfigManager(storage);
    modelManager = new DockerModelManager(storage);
  });

  test('should create manager instance', () => {
    assert.ok(modelManager);
    assert.ok(modelManager instanceof DockerModelManager);
  });

  // Note: Most methods in DockerModelManager are private or interact with Docker CLI
  // These tests would require mocking exec/execSync or actual Docker environment
  // For now, we test the basic instantiation
  
  test('should accept storage parameter', () => {
    const managerWithStorage = new DockerModelManager(storage);
    assert.ok(managerWithStorage);
  });

  test('should work without storage parameter', () => {
    const managerWithoutStorage = new DockerModelManager();
    assert.ok(managerWithoutStorage);
  });
});

