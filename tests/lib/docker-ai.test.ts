import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DockerAIClient } from '../../src/lib/docker-ai.ts';

describe('DockerAIClient', () => {
  test('should create client with default URL', () => {
    const client = new DockerAIClient();
    assert.strictEqual(client.getBaseURL(), 'http://localhost:12434');
  });

  test('should create client with custom URL', () => {
    const client = new DockerAIClient('http://localhost:9090');
    assert.strictEqual(client.getBaseURL(), 'http://localhost:9090');
  });

  // Note: Integration tests with actual Docker AI Models would go here
  // For now, we're just testing construction
});

