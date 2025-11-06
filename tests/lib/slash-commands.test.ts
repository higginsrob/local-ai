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
});

