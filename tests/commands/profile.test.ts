import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('profile command', () => {
  test('should be defined', async () => {
    const { profileCommand } = await import('../../src/commands/profile.ts');
    assert.ok(typeof profileCommand === 'function');
  });

  // Note: Full integration tests would test each subcommand
});

