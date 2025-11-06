import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseTargetedMessage } from '../../src/lib/meeting-interactive.ts';
import type { Agent } from '../../src/types/agent.ts';

describe('parseTargetedMessage', () => {
  const mockAgents: Agent[] = [
    {
      name: 'ceo',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CEO',
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      name: 'cto',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CTO',
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      name: 'cfo',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CFO',
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  describe('comma prefix targeting', () => {
    it('should parse agent name at start with comma', () => {
      const result = parseTargetedMessage('ceo, what should we do?', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, ['ceo']);
      assert.strictEqual(result.isDirectTarget, true);
      assert.strictEqual(result.content, 'what should we do?');
    });

    it('should handle case insensitive matching', () => {
      const result = parseTargetedMessage('CEO, what should we do?', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, ['ceo']);
      assert.strictEqual(result.isDirectTarget, true);
    });

    it('should trim whitespace after comma', () => {
      const result = parseTargetedMessage('cto,    how is the tech stack?', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, ['cto']);
      assert.strictEqual(result.content, 'how is the tech stack?');
    });
  });

  describe('@ mention targeting', () => {
    it('should parse @mention in the middle of message', () => {
      const result = parseTargetedMessage('I think we should ask @cto about this', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, ['cto']);
      assert.strictEqual(result.isDirectTarget, true);
      assert.strictEqual(result.content, 'I think we should ask @cto about this');
    });

    it('should parse multiple @mentions', () => {
      const result = parseTargetedMessage('What do @ceo and @cfo think?', mockAgents);
      
      assert.ok(result.targetedAgents.includes('ceo'));
      assert.ok(result.targetedAgents.includes('cfo'));
      assert.strictEqual(result.isDirectTarget, true);
    });

    it('should handle @mention at start', () => {
      const result = parseTargetedMessage('@cfo what is the budget?', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, ['cfo']);
      assert.strictEqual(result.isDirectTarget, true);
    });

    it('should handle @mention at end', () => {
      const result = parseTargetedMessage('What do you think @cto', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, ['cto']);
      assert.strictEqual(result.isDirectTarget, true);
    });
  });

  describe('broadcast (no targeting)', () => {
    it('should handle message with no targeting', () => {
      const result = parseTargetedMessage('What should we prioritize?', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, []);
      assert.strictEqual(result.isDirectTarget, false);
      assert.strictEqual(result.content, 'What should we prioritize?');
    });

    it('should not match partial agent names', () => {
      const result = parseTargetedMessage('The CEO position is important', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, []);
      assert.strictEqual(result.isDirectTarget, false);
    });
  });

  describe('edge cases', () => {
    it('should prioritize comma prefix over @mention', () => {
      const result = parseTargetedMessage('ceo, what about @cto?', mockAgents);
      
      // Comma prefix is found first, so only ceo is targeted
      assert.deepStrictEqual(result.targetedAgents, ['ceo']);
      assert.strictEqual(result.content, 'what about @cto?');
    });

    it('should handle empty message', () => {
      const result = parseTargetedMessage('', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, []);
      assert.strictEqual(result.isDirectTarget, false);
      assert.strictEqual(result.content, '');
    });

    it('should not match non-existent agent', () => {
      const result = parseTargetedMessage('@pm what do you think?', mockAgents);
      
      assert.deepStrictEqual(result.targetedAgents, []);
      assert.strictEqual(result.isDirectTarget, false);
    });
  });
});

