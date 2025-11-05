import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('session command', () => {
  test('should be defined', async () => {
    const { sessionCommand } = await import('../../src/commands/session.ts');
    assert.ok(typeof sessionCommand === 'function');
  });

  // Note: Full integration tests would test each subcommand
});

