import { describe, test, mock } from 'node:test';
import assert from 'node:assert';
import { StreamHandler } from '../../src/lib/stream-handler.ts';

describe('StreamHandler', () => {
  test('should handle token chunks', () => {
    let receivedTokens = '';
    let doneCalled = false;
    
    const handler = new StreamHandler({
      onToken: (token: string) => {
        receivedTokens += token;
      },
      onDone: () => {
        doneCalled = true;
      },
    });

    // Simulate streaming chunks
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: { content: 'Hello' },
        finish_reason: null,
      }],
    });

    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: { content: ' world' },
        finish_reason: null,
      }],
    });

    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    });

    assert.strictEqual(receivedTokens, 'Hello world');
    assert.strictEqual(doneCalled, true);
  });

  test('should handle chunks with no delta content', () => {
    let receivedTokens = '';
    
    const handler = new StreamHandler({
      onToken: (token: string) => {
        receivedTokens += token;
      },
      onDone: () => {},
    });

    // Chunk with no content
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: {},
        finish_reason: null,
      }],
    });

    assert.strictEqual(receivedTokens, '');
  });

  test('should call onDone when finish_reason is present', () => {
    let doneCalled = false;
    
    const handler = new StreamHandler({
      onToken: () => {},
      onDone: () => {
        doneCalled = true;
      },
    });

    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: { content: 'test' },
        finish_reason: 'stop',
      }],
    });

    assert.strictEqual(doneCalled, true);
  });

  test('should handle multiple finish reasons', () => {
    let doneCount = 0;
    
    const handler = new StreamHandler({
      onToken: () => {},
      onDone: () => {
        doneCount++;
      },
    });

    // First finish
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    });

    // Second finish (should call onDone again)
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'length',
      }],
    });

    assert.strictEqual(doneCount, 2);
  });

  test('should accumulate tokens correctly', () => {
    const tokens: string[] = [];
    
    const handler = new StreamHandler({
      onToken: (token: string) => {
        tokens.push(token);
      },
      onDone: () => {},
    });

    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{ index: 0, delta: { content: 'T' }, finish_reason: null }],
    });
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{ index: 0, delta: { content: 'e' }, finish_reason: null }],
    });
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{ index: 0, delta: { content: 's' }, finish_reason: null }],
    });
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{ index: 0, delta: { content: 't' }, finish_reason: null }],
    });

    assert.deepStrictEqual(tokens, ['T', 'e', 's', 't']);
  });

  test('should handle empty choices array', () => {
    let tokenCalled = false;
    let doneCalled = false;
    
    const handler = new StreamHandler({
      onToken: () => {
        tokenCalled = true;
      },
      onDone: () => {
        doneCalled = true;
      },
    });

    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [],
    });

    assert.strictEqual(tokenCalled, false);
    assert.strictEqual(doneCalled, false);
  });

  test('should handle tool calls in delta', () => {
    let receivedTokens = '';
    
    const handler = new StreamHandler({
      onToken: (token: string) => {
        receivedTokens += token;
      },
      onDone: () => {},
    });

    // Chunk with tool_calls instead of content
    handler.handleChunk({
      id: 'test',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        delta: {
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'test', arguments: '{}' }
          }]
        },
        finish_reason: null,
      }],
    });

    // Should not add anything for tool calls
    assert.strictEqual(receivedTokens, '');
  });
});

