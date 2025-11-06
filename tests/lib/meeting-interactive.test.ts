import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { parseTargetedMessage, getAgentColor, buildMeetingContext } from '../../src/lib/meeting-interactive.ts';
import type { Agent } from '../../src/types/agent.ts';
import type { MeetingSession } from '../../src/types/meeting.ts';

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

describe('getAgentColor', () => {
  it('should return a color function for each agent', () => {
    const color1 = getAgentColor('agent1');
    const color2 = getAgentColor('agent2');
    
    assert.strictEqual(typeof color1, 'function');
    assert.strictEqual(typeof color2, 'function');
  });

  it('should return consistent colors for same agent', () => {
    const color1 = getAgentColor('ceo');
    const color2 = getAgentColor('ceo');
    
    // Both should produce the same output
    assert.strictEqual(color1('test'), color2('test'));
  });

  it('should handle agent names with special characters', () => {
    const color = getAgentColor('agent-name/with-special_chars');
    assert.strictEqual(typeof color, 'function');
    assert.ok(color('test'));
  });
});

describe('buildMeetingContext', () => {
  const mockAgent: Agent = {
    name: 'ceo',
    model: 'ai/llama3.2:latest',
    systemPrompt: 'You are a strategic CEO focused on business growth.',
    modelParams: {
      ctxSize: 4096,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      topN: 40,
    },
    attributes: {
      name: 'Alex Chen',
      nickname: 'CEO',
      expertise: ['strategy', 'business development'],
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const mockSession: MeetingSession = {
    id: 'room-test',
    roomName: 'test-room',
    agentNames: ['ceo', 'cto', 'cfo'],
    profileName: 'default',
    sharedMessages: [],
    bufferedResponses: [],
    maxChainLength: 5,
    checkInTokenLimit: 512,
    metadata: {
      activeAgents: ['ceo', 'cto', 'cfo'],
      totalMessages: 0,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const allAgents: Agent[] = [
    mockAgent,
    {
      name: 'cto',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CTO focused on technology.',
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {
        name: 'Jordan Smith',
        nickname: 'CTO',
      },
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      name: 'cfo',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CFO focused on finances.',
      modelParams: {
        ctxSize: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topN: 40,
      },
      attributes: {
        name: 'Sam Taylor',
        nickname: 'CFO',
      },
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  it('should include meeting context section', () => {
    const context = buildMeetingContext(mockAgent, allAgents, mockSession);

    assert.ok(context.includes('MEETING CONTEXT'));
    assert.ok(context.includes('You are currently in a meeting'));
  });

  it('should list other participants', () => {
    const context = buildMeetingContext(mockAgent, allAgents, mockSession);

    assert.ok(context.includes('@cto'));
    assert.ok(context.includes('@cfo'));
  });

  it('should include @mention instructions', () => {
    const context = buildMeetingContext(mockAgent, allAgents, mockSession);

    assert.ok(context.includes('To direct a question or comment to another agent'));
    assert.ok(context.includes('use their @ handle'));
  });

  it('should warn against self-addressing', () => {
    const context = buildMeetingContext(mockAgent, allAgents, mockSession);

    assert.ok(context.includes('Do NOT @mention yourself'));
    assert.ok(context.includes('@ceo')); // Should mention own handle
  });

  it('should include chain length setting', () => {
    const customSession = { ...mockSession, maxChainLength: 3 };
    const context = buildMeetingContext(mockAgent, allAgents, customSession);

    assert.ok(context.includes('3 levels deep') || context.includes('chain up to 3'));
  });

  it('should include check-in token limit', () => {
    const customSession = { ...mockSession, checkInTokenLimit: 256 };
    const context = buildMeetingContext(mockAgent, allAgents, customSession);

    assert.ok(context.includes('256'));
  });

  it('should include response mechanics', () => {
    const context = buildMeetingContext(mockAgent, allAgents, mockSession);

    assert.ok(context.includes('RESPONSE MECHANICS'));
  });

  it('should handle chain depth parameter', () => {
    const contextDepth0 = buildMeetingContext(mockAgent, allAgents, mockSession, 0);
    const contextDepth3 = buildMeetingContext(mockAgent, allAgents, mockSession, 3);

    // Both should generate valid context
    assert.ok(contextDepth0.includes('MEETING CONTEXT'));
    assert.ok(contextDepth3.includes('MEETING CONTEXT'));
  });

  it('should handle agent as only participant', () => {
    const singleAgentList = [mockAgent];
    const context = buildMeetingContext(mockAgent, singleAgentList, mockSession);

    // Should still generate context, even if no other agents
    assert.ok(context.includes('MEETING CONTEXT'));
  });

  it('should handle agent without attributes', () => {
    const bareAgent: Agent = {
      ...mockAgent,
      attributes: {},
    };

    const context = buildMeetingContext(bareAgent, allAgents, mockSession);

    // Should still include meeting context
    assert.ok(context.includes('MEETING CONTEXT'));
  });
});

describe('Meeting Session Flow', () => {
  let meetingSession: MeetingSession;
  let agents: Agent[];

  beforeEach(() => {
    agents = [
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
        attributes: { name: 'CEO', nickname: 'ceo' },
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
        attributes: { name: 'CTO', nickname: 'cto' },
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
        attributes: { name: 'CFO', nickname: 'cfo' },
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    meetingSession = {
      id: 'room-test',
      roomName: 'test-room',
      agentNames: ['ceo', 'cto', 'cfo'],
      profileName: 'default',
      sharedMessages: [],
      bufferedResponses: [],
      maxChainLength: 5,
      checkInTokenLimit: 512,
      metadata: {
        activeAgents: ['ceo', 'cto', 'cfo'],
        totalMessages: 0,
      },
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
  });

  it('should initialize with empty message history', () => {
    assert.strictEqual(meetingSession.sharedMessages.length, 0);
    assert.strictEqual(meetingSession.bufferedResponses.length, 0);
  });

  it('should track all participating agents', () => {
    assert.deepStrictEqual(meetingSession.agentNames, ['ceo', 'cto', 'cfo']);
    assert.strictEqual(meetingSession.agentNames.length, 3);
  });

  it('should have configurable chain length', () => {
    assert.strictEqual(meetingSession.maxChainLength, 5);
    
    // Change chain length
    meetingSession.maxChainLength = 3;
    assert.strictEqual(meetingSession.maxChainLength, 3);
  });

  it('should have configurable check-in token limit', () => {
    assert.strictEqual(meetingSession.checkInTokenLimit, 512);
    
    // Change token limit
    meetingSession.checkInTokenLimit = 256;
    assert.strictEqual(meetingSession.checkInTokenLimit, 256);
  });

  it('should accumulate messages in shared history', () => {
    // User message
    meetingSession.sharedMessages.push({
      role: 'user',
      content: 'What is our strategy?',
    });

    // CEO response
    meetingSession.sharedMessages.push({
      role: 'assistant',
      content: '[ceo] We should focus on growth. @cto what are the technical constraints?',
    });

    // CTO response
    meetingSession.sharedMessages.push({
      role: 'assistant',
      content: '[cto] We can scale to 2x users. @cfo what is the budget?',
    });

    assert.strictEqual(meetingSession.sharedMessages.length, 3);
    assert.ok(meetingSession.sharedMessages[1].content.includes('[ceo]'));
    assert.ok(meetingSession.sharedMessages[2].content.includes('[cto]'));
  });

  it('should track buffered responses', () => {
    meetingSession.bufferedResponses.push({
      agentName: 'cfo',
      content: 'We have $500K budget for Q1',
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(meetingSession.bufferedResponses.length, 1);
    assert.strictEqual(meetingSession.bufferedResponses[0].agentName, 'cfo');
  });

  it('should clear buffered responses after viewing', () => {
    meetingSession.bufferedResponses.push({
      agentName: 'cfo',
      content: 'Response 1',
      timestamp: new Date().toISOString(),
    });

    meetingSession.bufferedResponses.push({
      agentName: 'cto',
      content: 'Response 2',
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(meetingSession.bufferedResponses.length, 2);

    // Clear after viewing
    meetingSession.bufferedResponses = [];
    assert.strictEqual(meetingSession.bufferedResponses.length, 0);
  });

  it('should update metadata on message addition', () => {
    const initialTotal = meetingSession.metadata.totalMessages || 0;
    
    meetingSession.sharedMessages.push({
      role: 'user',
      content: 'Test message',
    });

    meetingSession.metadata.totalMessages = (meetingSession.metadata.totalMessages || 0) + 1;
    
    assert.strictEqual(meetingSession.metadata.totalMessages, initialTotal + 1);
  });

  it('should support adding and removing agents', () => {
    // Add new agent
    meetingSession.agentNames.push('coo');
    assert.strictEqual(meetingSession.agentNames.length, 4);
    assert.ok(meetingSession.agentNames.includes('coo'));

    // Remove agent
    meetingSession.agentNames = meetingSession.agentNames.filter(name => name !== 'coo');
    assert.strictEqual(meetingSession.agentNames.length, 3);
    assert.ok(!meetingSession.agentNames.includes('coo'));
  });

  it('should preserve room name across updates', () => {
    assert.strictEqual(meetingSession.roomName, 'test-room');
    
    meetingSession.sharedMessages.push({
      role: 'user',
      content: 'Message',
    });

    assert.strictEqual(meetingSession.roomName, 'test-room');
  });
});

describe('Agent-to-Agent Communication Patterns', () => {
  const agents: Agent[] = [
    {
      name: 'ceo',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CEO',
      modelParams: { ctxSize: 4096, maxTokens: 2048, temperature: 0.7, topP: 0.9, topN: 40 },
      attributes: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      name: 'cto',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CTO',
      modelParams: { ctxSize: 4096, maxTokens: 2048, temperature: 0.7, topP: 0.9, topN: 40 },
      attributes: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      name: 'cfo',
      model: 'ai/llama3.2:latest',
      systemPrompt: 'You are a CFO',
      modelParams: { ctxSize: 4096, maxTokens: 2048, temperature: 0.7, topP: 0.9, topN: 40 },
      attributes: {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  it('should detect single @mention in response', () => {
    const response = 'I agree with that approach. @cto what do you think about the timeline?';
    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(response.matchAll(mentionRegex), m => m[1]);
    
    assert.deepStrictEqual(mentions, ['cto']);
  });

  it('should detect multiple @mentions in response', () => {
    const response = 'Good points. @cto what is the timeline, and @cfo what is the cost?';
    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(response.matchAll(mentionRegex), m => m[1]);
    
    assert.ok(mentions.includes('cto'));
    assert.ok(mentions.includes('cfo'));
    assert.strictEqual(mentions.length, 2);
  });

  it('should filter mentions to only valid agents', () => {
    const response = '@cto and @nonexistent, what do you think?';
    const mentionRegex = /@(\w+)/g;
    const allMentions = Array.from(response.matchAll(mentionRegex), m => m[1]);
    const validMentions = allMentions.filter(name => 
      agents.some(agent => agent.name === name)
    );
    
    assert.deepStrictEqual(validMentions, ['cto']);
  });

  it('should handle chain depth tracking', () => {
    let chainDepth = 0;
    const maxChainLength = 5;

    // User asks CEO
    chainDepth = 0;
    assert.ok(chainDepth < maxChainLength);

    // CEO mentions CTO (depth 1)
    chainDepth = 1;
    assert.ok(chainDepth < maxChainLength);

    // CTO mentions CFO (depth 2)
    chainDepth = 2;
    assert.ok(chainDepth < maxChainLength);

    // Continue chain
    for (let i = 3; i < 10; i++) {
      chainDepth = i;
      if (chainDepth >= maxChainLength) {
        break;
      }
    }

    assert.strictEqual(chainDepth, maxChainLength);
  });

  it('should stop chain at max depth', () => {
    const maxChainLength = 3;
    let chainDepth = 0;
    const responses = [];

    // Simulate agent chain
    responses.push({ depth: 0, agent: 'user' });
    chainDepth = 0;

    responses.push({ depth: 1, agent: 'ceo' });
    chainDepth = 1;

    responses.push({ depth: 2, agent: 'cto' });
    chainDepth = 2;

    responses.push({ depth: 3, agent: 'cfo' });
    chainDepth = 3;

    // Should stop here
    const shouldContinue = chainDepth < maxChainLength;
    assert.strictEqual(shouldContinue, false);
    assert.strictEqual(responses.length, 4); // user + 3 agents
  });

  it('should identify self-mentions', () => {
    const currentAgent = 'ceo';
    const response = 'As @ceo, I think we should...';
    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(response.matchAll(mentionRegex), m => m[1]);
    const selfMention = mentions.includes(currentAgent);
    
    assert.strictEqual(selfMention, true);
  });

  it('should extract clean mentions without @ symbol', () => {
    const response = 'Let me ask @cto and @cfo about this';
    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(response.matchAll(mentionRegex), m => m[1]);
    
    // Should not include @ symbol
    assert.ok(!mentions[0].includes('@'));
    assert.ok(!mentions[1].includes('@'));
    assert.strictEqual(mentions[0], 'cto');
    assert.strictEqual(mentions[1], 'cfo');
  });
});

