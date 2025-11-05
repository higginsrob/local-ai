import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('interactive mode', () => {
  test('should be defined', async () => {
    const { startInteractive } = await import('../../src/lib/interactive.ts');
    assert.ok(typeof startInteractive === 'function');
  });

  // Note: Full integration tests would mock prompts and test the loop
});

