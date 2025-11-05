import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildSystemPrompt } from '../../src/lib/prompt-builder.ts';
import type { Agent } from '../../src/types/agent.ts';
import type { Profile } from '../../src/types/profile.ts';

describe('buildSystemPrompt', () => {
  test('should return base prompt when no attributes', () => {
    const agent: Agent = {
      name: 'test',
      model: 'llama3',
      systemPrompt: 'You are a helpful assistant',
      tools: [],
      mcpServers: [],
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const profile: Profile = {
      name: 'default',
      attributes: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = buildSystemPrompt('You are a helpful assistant', agent, profile);
    assert.strictEqual(result, 'You are a helpful assistant');
  });

  test('should include agent attributes', () => {
    const agent: Agent = {
      name: 'test',
      model: 'llama3',
      systemPrompt: 'You are a helpful assistant',
      tools: [],
      mcpServers: [],
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {
        specialty: 'coding',
        languages: ['typescript', 'python'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const profile: Profile = {
      name: 'default',
      attributes: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = buildSystemPrompt('You are a helpful assistant', agent, profile);
    
    assert.ok(result.includes('# Agent Attributes'));
    assert.ok(result.includes('**Specialty**: coding'));
    assert.ok(result.includes('**Languages**: typescript, python'));
  });

  test('should include user attributes', () => {
    const agent = null;

    const profile: Profile = {
      name: 'developer',
      attributes: {
        role: 'Senior Developer',
        expertise: ['docker', 'kubernetes'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = buildSystemPrompt('You are a helpful assistant', agent, profile);
    
    assert.ok(result.includes('# User Attributes'));
    assert.ok(result.includes('**Role**: Senior Developer'));
    assert.ok(result.includes('**Expertise**: docker, kubernetes'));
  });

  test('should include both agent and user attributes', () => {
    const agent: Agent = {
      name: 'test',
      model: 'llama3',
      systemPrompt: 'You are a helpful assistant',
      tools: [],
      mcpServers: [],
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {
        specialty: 'coding',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const profile: Profile = {
      name: 'developer',
      attributes: {
        role: 'Senior Developer',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = buildSystemPrompt('You are a helpful assistant', agent, profile);
    
    assert.ok(result.includes('You are a helpful assistant'));
    assert.ok(result.includes('# Agent Attributes'));
    assert.ok(result.includes('**Specialty**: coding'));
    assert.ok(result.includes('# User Attributes'));
    assert.ok(result.includes('**Role**: Senior Developer'));
  });

  test('should format nested objects', () => {
    const agent = null;

    const profile: Profile = {
      name: 'developer',
      attributes: {
        preferences: {
          editor: 'vim',
          theme: 'dark',
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = buildSystemPrompt('You are a helpful assistant', agent, profile);
    
    assert.ok(result.includes('**Preferences**:'));
    assert.ok(result.includes('- Editor: vim'));
    assert.ok(result.includes('- Theme: dark'));
  });
});


