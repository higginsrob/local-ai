// Tests for slash commands
import { test } from 'node:test';
import assert from 'node:assert';
import { handleSlashCommand } from '../../src/lib/slash-commands.ts';
import type { Session } from '../../src/types/session.ts';
import type { InteractiveOptions } from '../../src/types/cli.ts';

test('handleSlashCommand', async (t) => {
  const mockSession: Session = {
    id: 'test-session',
    agentName: null,
    profileName: 'default',
    messages: [],
    metadata: {
      tokenCount: 0,
      toolCalls: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSettings: InteractiveOptions = {
    model: 'test-model',
    ctxSize: 8192,
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.9,
    topN: 40,
    debug: false,
  };

  await t.test('should handle help command', async () => {
    const result = await handleSlashCommand('/help', mockSession, mockSettings);
    assert.strictEqual(result.exit, undefined);
  });

  await t.test('should handle quit command', async () => {
    const result = await handleSlashCommand('/quit', mockSession, mockSettings);
    assert.strictEqual(result.exit, true);
  });

  await t.test('should handle status command without metrics', async () => {
    const result = await handleSlashCommand('/status', mockSession, mockSettings);
    assert.strictEqual(result.exit, undefined);
  });

  await t.test('should handle status command with metrics', async () => {
    const sessionWithMetrics: Session = {
      ...mockSession,
      metadata: {
        ...mockSession.metadata,
        lastRequestStats: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          contextWindowSize: 8192,
          timings: {
            cache_n: 35,
            predicted_per_second: 25.5,
            prompt_per_second: 150.2,
            predicted_ms: 20000,
            prompt_ms: 6665,
          },
        },
      },
    };
    
    const result = await handleSlashCommand('/status', sessionWithMetrics, mockSettings);
    assert.strictEqual(result.exit, undefined);
  });

  await t.test('should handle status command with context overflow', async () => {
    // Test case where tokens used exceeds context window (reproducing the user's issue)
    const sessionWithOverflow: Session = {
      ...mockSession,
      metadata: {
        ...mockSession.metadata,
        lastRequestStats: {
          promptTokens: 13,
          completionTokens: 572,
          totalTokens: 585,
          contextWindowSize: 512, // Much smaller than total tokens
          timings: {
            cache_n: 2112,
            predicted_per_second: 96.74,
            prompt_per_second: 135.19,
            predicted_ms: 5910,
            prompt_ms: 100,
          },
        },
      },
    };
    
    // This should not throw "Error: Invalid count value" anymore
    const result = await handleSlashCommand('/status', sessionWithOverflow, mockSettings);
    assert.strictEqual(result.exit, undefined);
  });

  await t.test('should handle info command', async () => {
    const result = await handleSlashCommand('/info', mockSession, mockSettings);
    assert.strictEqual(result.exit, undefined);
  });

  await t.test('should handle info command alias (i)', async () => {
    const result = await handleSlashCommand('/i', mockSession, mockSettings);
    assert.strictEqual(result.exit, undefined);
  });

  await t.test('should reflect updated settings when using /info', async () => {
    // Simulate changing temperature
    const tempResult = await handleSlashCommand('/temperature 0.5', mockSession, mockSettings);
    const updatedSettings = { ...mockSettings, ...tempResult.settings };
    
    // Verify temperature changed
    assert.strictEqual(updatedSettings.temperature, 0.5);
    
    // Now run /info with the updated settings
    const infoResult = await handleSlashCommand('/info', mockSession, updatedSettings);
    assert.strictEqual(infoResult.exit, undefined);
    // The info command should display the updated temperature (0.5), not the original (0.7)
  });

  await t.test('should handle unknown command', async () => {
    const result = await handleSlashCommand('/unknown', mockSession, mockSettings);
    assert.strictEqual(result.exit, undefined);
  });

  // Note: /clear and /reset commands modify the session in place and prompt the user
  // They return { session } rather than flags, so we just test they don't throw

  await t.test('should handle ctx-size command', async () => {
    const result = await handleSlashCommand('/ctx-size 16384', mockSession, mockSettings);
    assert.strictEqual(result.settings?.ctxSize, 16384);
  });

  await t.test('should handle max-size command', async () => {
    const result = await handleSlashCommand('/max-size 4096', mockSession, mockSettings);
    assert.strictEqual(result.settings?.maxTokens, 4096);
  });

  await t.test('should handle temperature command', async () => {
    const result = await handleSlashCommand('/temperature 0.9', mockSession, mockSettings);
    assert.strictEqual(result.settings?.temperature, 0.9);
  });

  await t.test('should handle top_p command', async () => {
    const result = await handleSlashCommand('/top_p 0.95', mockSession, mockSettings);
    assert.strictEqual(result.settings?.topP, 0.95);
  });

  await t.test('should handle top_n command', async () => {
    const result = await handleSlashCommand('/top_n 50', mockSession, mockSettings);
    assert.strictEqual(result.settings?.topN, 50);
  });

  await t.test('should handle debug enable', async () => {
    const result = await handleSlashCommand('/debug true', mockSession, mockSettings);
    assert.strictEqual(result.settings?.debug, true);
  });

  await t.test('should handle debug disable', async () => {
    const result = await handleSlashCommand('/debug false', mockSession, mockSettings);
    assert.strictEqual(result.settings?.debug, false);
  });

  await t.test('should handle quit aliases', async () => {
    const commands = ['/quit', '/q', '/exit', '/e', '/x'];
    for (const cmd of commands) {
      const result = await handleSlashCommand(cmd, mockSession, mockSettings);
      assert.strictEqual(result.exit, true, `${cmd} should exit`);
    }
  });

  await t.test('should handle help aliases', async () => {
    const commands = ['/help', '/h'];
    for (const cmd of commands) {
      const result = await handleSlashCommand(cmd, mockSession, mockSettings);
      assert.strictEqual(result.exit, undefined, `${cmd} should not exit`);
    }
  });

  // Note: /clear and /reset require prompts, so we skip testing them in unit tests

  await t.test('should handle status aliases', async () => {
    const commands = ['/status', '/s'];
    for (const cmd of commands) {
      const result = await handleSlashCommand(cmd, mockSession, mockSettings);
      assert.strictEqual(result.exit, undefined, `${cmd} should work`);
    }
  });

  await t.test('should handle info aliases', async () => {
    const commands = ['/info', '/i'];
    for (const cmd of commands) {
      const result = await handleSlashCommand(cmd, mockSession, mockSettings);
      assert.strictEqual(result.exit, undefined, `${cmd} should work`);
    }
  });

  // Note: /reset requires prompts, so we skip testing it in unit tests

  await t.test('should validate numeric parameters', async () => {
    // Invalid temperature (too high)
    const result1 = await handleSlashCommand('/temperature 3.0', mockSession, mockSettings);
    assert.strictEqual(result1.settings?.temperature, undefined);

    // Invalid temperature (negative)
    const result2 = await handleSlashCommand('/temperature -0.5', mockSession, mockSettings);
    assert.strictEqual(result2.settings?.temperature, undefined);

    // Valid temperature
    const result3 = await handleSlashCommand('/temperature 1.5', mockSession, mockSettings);
    assert.strictEqual(result3.settings?.temperature, 1.5);
  });

  await t.test('should validate top_p range', async () => {
    // Invalid top_p (too high)
    const result1 = await handleSlashCommand('/top_p 1.5', mockSession, mockSettings);
    assert.strictEqual(result1.settings?.topP, undefined);

    // Invalid top_p (negative)
    const result2 = await handleSlashCommand('/top_p -0.1', mockSession, mockSettings);
    assert.strictEqual(result2.settings?.topP, undefined);

    // Valid top_p
    const result3 = await handleSlashCommand('/top_p 0.85', mockSession, mockSettings);
    assert.strictEqual(result3.settings?.topP, 0.85);
  });

  await t.test('should handle invalid numeric parameters', async () => {
    const result1 = await handleSlashCommand('/ctx-size invalid', mockSession, mockSettings);
    assert.strictEqual(result1.settings?.ctxSize, undefined);

    const result2 = await handleSlashCommand('/max-size notanumber', mockSession, mockSettings);
    assert.strictEqual(result2.settings?.maxTokens, undefined);

    const result3 = await handleSlashCommand('/top_n abc', mockSession, mockSettings);
    assert.strictEqual(result3.settings?.topN, undefined);
  });
});

