import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('run command', () => {
  test('should be defined', async () => {
    const { runCommand } = await import('../../src/commands/run.ts');
    assert.ok(typeof runCommand === 'function');
  });

  // Note: Full integration tests would test both single and interactive modes
});

