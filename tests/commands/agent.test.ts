import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('agent command', () => {
  test('should be defined', async () => {
    const { agentCommand } = await import('../../src/commands/agent.ts');
    assert.ok(typeof agentCommand === 'function');
  });

  // Note: Full integration tests would test each subcommand
});

