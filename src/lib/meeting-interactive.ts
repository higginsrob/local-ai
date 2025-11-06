// Interactive meeting loop with multi-agent support
import prompts from 'prompts';
import chalk, { type ChalkInstance } from 'chalk';
import type { Agent } from '../types/agent.ts';
import type { MeetingSession, MeetingMessage, BufferedResponse, TargetedMessage } from '../types/meeting.ts';
import { Storage } from './storage.ts';
import { ConfigManager } from './config.ts';
import { DockerAIClient } from './docker-ai.ts';
import { StreamHandler } from './stream-handler.ts';
import { buildSystemPrompt } from './prompt-builder.ts';
import { handleMeetingSlashCommand } from './meeting-slash-commands.ts';

// Color palette for agent names - distinct and readable colors
const AGENT_COLORS = [
  chalk.cyan,
  chalk.magenta,
  chalk.yellow,
  chalk.green,
  chalk.blue,
  chalk.red,
  chalk.rgb(255, 165, 0), // orange
  chalk.rgb(147, 112, 219), // purple
  chalk.rgb(0, 255, 255), // aqua
  chalk.rgb(255, 105, 180), // hot pink
];

// Map to store agent color assignments
const agentColorMap = new Map<string, ChalkInstance>();

/**
 * Get a consistent color for an agent name
 */
export function getAgentColor(agentName: string): ChalkInstance {
  const key = agentName.toLowerCase();
  
  if (!agentColorMap.has(key)) {
    // Assign next available color based on number of agents already colored
    const colorIndex = agentColorMap.size % AGENT_COLORS.length;
    agentColorMap.set(key, AGENT_COLORS[colorIndex]);
  }
  
  return agentColorMap.get(key)!;
}

/**
 * Create a color-aware stream handler that detects [agent-name]: prefixes
 * and applies appropriate colors
 */
export function createColorAwareStreamHandler(
  defaultAgentName: string,
  allAgents: Agent[],
  onComplete: (fullMessage: string) => void
): StreamHandler {
  let assistantMessage = '';
  let buffer = '';
  let currentColor = getAgentColor(defaultAgentName);
  let atLineStart = true;
  
  // Create map of agent names for quick lookup
  const agentNames = new Set(allAgents.map(a => a.name.toLowerCase()));
  agentNames.add('user'); // Also recognize [User]:
  
  return new StreamHandler({
    onToken: (token: string) => {
      assistantMessage += token;
      buffer += token;
      
      // Process the buffer character by character
      while (buffer.length > 0) {
        // Check if we're at line start and seeing '['
        if (atLineStart && buffer.startsWith('[')) {
          // Look for complete [agent-name]: or [@agent-name] patterns
          // Matches: [agent]:, [agent]: , [@agent], [@agent]:
          const match = buffer.match(/^\[@?([^\]]+)\]:?\s*/);
          if (match) {
            // Found complete pattern
            let capturedName = match[1]; // Preserve original case
            const fullMatch = match[0];
            
            // Remove @ prefix if present (from [@agent] format)
            if (capturedName.startsWith('@')) {
              capturedName = capturedName.slice(1);
            }
            
            // Check if this is a known agent (case-insensitive)
            const agentNameLower = capturedName.toLowerCase();
            if (agentNames.has(agentNameLower)) {
              // Switch to this agent's color
              currentColor = agentNameLower === 'user' ? chalk.blue : getAgentColor(capturedName);
            }
            
            // Output the bracketed part and consume from buffer
            process.stdout.write(currentColor(fullMatch));
            buffer = buffer.slice(fullMatch.length);
            atLineStart = false;
            continue;
          } else {
            // Incomplete pattern - check if we need more tokens
            const partialMatch = buffer.match(/^\[@?[^\]]*$/);
            if (partialMatch && buffer.length < 30) {
              // Looks like start of a pattern, wait for more tokens
              break;
            } else {
              // Not a valid pattern, output the '['
              process.stdout.write(currentColor('['));
              buffer = buffer.slice(1);
              atLineStart = false;
              continue;
            }
          }
        }
        
        // Check for newline
        if (buffer.startsWith('\n')) {
          process.stdout.write('\n');
          buffer = buffer.slice(1);
          atLineStart = true;
          continue;
        }
        
        // Output regular character
        process.stdout.write(currentColor(buffer[0]));
        buffer = buffer.slice(1);
        atLineStart = false;
      }
    },
    onDone: () => {
      // Flush any remaining buffer
      if (buffer.length > 0) {
        process.stdout.write(currentColor(buffer));
      }
      process.stdout.write('\n');
      onComplete(assistantMessage);
    },
    onMetrics: () => {},
  });
}

export async function startMeetingInteractive(
  agents: Agent[],
  meetingSession: MeetingSession,
  storage: Storage,
  configManager: ConfigManager
): Promise<void> {
  const endpoint = await configManager.getLlamaCppEndpoint();
  const client = new DockerAIClient(endpoint);

  let currentSession = meetingSession;
  let shouldExit = false;

  // Lock all agents
  for (const agent of agents) {
    await storage.lockAgent(agent.name);
  }

  // Handle Ctrl+C gracefully
  const handleSigInt = async () => {
    if (!shouldExit) {
      shouldExit = true;
      console.log(chalk.yellow('\n\n⚠ Interrupted. Unlocking agents...'));
      for (const agent of agents) {
        await storage.unlockAgent(agent.name);
      }
      console.log(chalk.gray('Goodbye!\n'));
      process.exit(0);
    }
  };

  process.on('SIGINT', handleSigInt);

  try {
    // Main loop
    while (true) {
      const response = await prompts({
        type: 'text',
        name: 'input',
        message: '',
      }, {
        onCancel: async () => {
          await handleSigInt();
        }
      });

      if (!response.input) {
        break;
      }

      const input = response.input.trim();

      // Handle slash commands
      if (input.startsWith('/')) {
        const result = await handleMeetingSlashCommand(input, currentSession, agents, client, configManager, storage);
        
        // Handle agent switching BEFORE checking exit
        if (result.switchToAgent) {
          // Unlock all meeting agents
          for (const agent of agents) {
            await storage.unlockAgent(agent.name);
          }
          process.off('SIGINT', handleSigInt);
          
          // Start single agent session - this will take over completely
          const { runCommand } = await import('../commands/run.js');
          await runCommand(result.switchToAgent);
          
          // Agent session ended, exit the program
          process.exit(0);
        }
        
        // Check other result flags (after handling switches)
        if (result.exit) {
          break;
        }
        
        if (result.session) {
          currentSession = result.session;
        }
        
        continue;
      }

      // Parse targeting and handle message
      const targetedMsg = parseTargetedMessage(input, agents);
      await handleMeetingMessage(targetedMsg, agents, currentSession, client, storage, configManager, 0);
    }

    // Normal exit - unlock agents (skip if we already cleaned up for a switch)
    if (!shouldExit && agents.length > 0) {
      for (const agent of agents) {
        await storage.unlockAgent(agent.name);
      }
      console.log(chalk.gray('Goodbye!\n'));
    }
  } finally {
    // Clean up signal handler and unlock agents (skip if already done)
    if (agents.length > 0) {
      for (const agent of agents) {
        try {
          await storage.unlockAgent(agent.name);
        } catch {
          // Already unlocked, ignore
        }
      }
    }
    try {
      process.off('SIGINT', handleSigInt);
    } catch {
      // Handler already removed, ignore
    }
  }
}

/**
 * Parse a user message to determine which agent(s) it's targeted to
 */
export function parseTargetedMessage(input: string, agents: Agent[]): TargetedMessage {
  const agentNames = agents.map(a => a.name.toLowerCase());
  const targetedAgents: string[] = [];
  let isDirectTarget = false;

  // Check for "<agent-name>," at the start
  for (const agent of agents) {
    const pattern = new RegExp(`^${agent.name}\\s*,\\s*`, 'i');
    if (pattern.test(input)) {
      targetedAgents.push(agent.name);
      isDirectTarget = true;
      // Remove the targeting prefix from the content
      input = input.replace(pattern, '');
      break; // Only one agent can be targeted this way
    }
  }

  // Check for "@<agent-name>" anywhere in the message
  if (targetedAgents.length === 0) {
    for (const agent of agents) {
      const pattern = new RegExp(`@${agent.name}\\b`, 'i');
      if (pattern.test(input)) {
        if (!targetedAgents.includes(agent.name)) {
          targetedAgents.push(agent.name);
        }
        isDirectTarget = true;
      }
    }
  }

  return {
    content: input.trim(),
    targetedAgents: targetedAgents,
    isDirectTarget: isDirectTarget,
  };
}

/**
 * Detect if an agent's response contains @ mentions of other agents
 */
function detectAgentMentions(content: string, agents: Agent[], excludeAgent?: string): string[] {
  const mentions: string[] = [];
  
  for (const agent of agents) {
    // Skip the agent who sent the message
    if (excludeAgent && agent.name.toLowerCase() === excludeAgent.toLowerCase()) {
      continue;
    }
    
    const pattern = new RegExp(`@${agent.name}\\b`, 'i');
    if (pattern.test(content)) {
      mentions.push(agent.name);
    }
  }
  
  return mentions;
}

/**
 * Detect if an agent's response is addressing the user (check-in)
 */
function isAddressingUser(content: string, profileName: string): boolean {
  // Check for @user
  if (/@user\b/i.test(content)) {
    return true;
  }
  
  // Check for @profileName
  if (profileName) {
    const pattern = new RegExp(`@${profileName}\\b`, 'i');
    if (pattern.test(content)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Build meeting-specific context to add to agent system prompts
 */
export function buildMeetingContext(currentAgent: Agent, allAgents: Agent[], session: MeetingSession, chainDepth: number = 0): string {
  const otherAgents = allAgents.filter(a => a.name !== currentAgent.name);
  
  let context = '\n\n═══════════════════════════════════════════════════════════\n';
  context += '📋 MEETING CONTEXT\n';
  context += '═══════════════════════════════════════════════════════════\n\n';
  
  context += `You are currently in a meeting with ${otherAgents.length} other agent${otherAgents.length > 1 ? 's' : ''}:\n\n`;
  
  // List other participants with their roles
  for (const agent of otherAgents) {
    context += `• @${agent.name}\n`;
    context += `  Role: ${agent.systemPrompt.split('\n')[0].substring(0, 200)}${agent.systemPrompt.length > 200 ? '...' : ''}\n`;
    context += `  Handle: @${agent.name}\n\n`;
  }
  
  context += '─────────────────────────────────────────────────────────\n';
  context += 'HOW TO ADDRESS OTHER AGENTS:\n';
  context += '─────────────────────────────────────────────────────────\n\n';
  
  context += 'To direct a question or comment to another agent, use their @ handle:\n';
  context += '  Example: "I agree with that approach. @cto what do you think about the technical feasibility?"\n\n';
  
  context += 'You can address multiple agents in one response:\n';
  context += '  Example: "Good points. @cfo what\'s the budget, and @cto how long would this take?"\n\n';
  
  context += '─────────────────────────────────────────────────────────\n';
  context += 'RESPONSE MECHANICS:\n';
  context += '─────────────────────────────────────────────────────────\n\n';
  
  context += '• When you mention another agent with @agent-name, they will automatically respond\n';
  context += `• Agent conversations can chain up to ${session.maxChainLength} levels deep\n`;
  context += '• If you mention multiple agents:\n';
  context += '  - The first mentioned agent\'s response will stream immediately\n';
  context += '  - Other mentioned agents\' responses will be buffered\n';
  context += '  - Buffered agents will "raise their hand" indicating they have a response\n';
  context += '  - The user can use /respond <agent> to view buffered responses\n\n';
  
  context += '─────────────────────────────────────────────────────────\n';
  context += 'WHEN TO CHECK IN WITH THE USER:\n';
  context += '─────────────────────────────────────────────────────────\n\n';
  
  context += `• After approximately ${session.checkInTokenLimit} tokens of agent-to-agent conversation\n`;
  context += '• After making or discussing any major decisions\n';
  context += '• When you need user input or approval to proceed\n';
  context += '• When the discussion reaches a natural pause point\n\n';
  
  context += 'HOW to check in:\n';
  context += '  - Use @user or @' + session.profileName + ' to address the user directly\n';
  context += '  - Summarize the discussion so far\n';
  context += '  - Present options, decisions, or findings clearly\n';
  context += '  - Ask the user for guidance, input, or approval to continue\n';
  context += '  - If you mention other agents with @ in a check-in, they will buffer their responses\n\n';
  
  context += 'Example check-in:\n';
  context += '  "@user We\'ve discussed three approaches. The CTO favors option A for\n';
  context += '   technical reasons, while the CFO prefers option B for cost savings.\n';
  context += '   What would you like us to focus on?"\n\n';
  
  context += 'Note: When you use @user, any agents you mention will buffer their\n';
  context += 'responses so the user can review and decide what to do next.\n\n';
  
  context += '─────────────────────────────────────────────────────────\n';
  context += 'RESPONSE FORMATTING (CRITICAL):\n';
  context += '─────────────────────────────────────────────────────────\n\n';
  
  context += '1. HOW TO SPEAK AS YOURSELF:\n';
  context += '   - Speak directly in your own voice (no prefix needed)\n';
  context += '   - Use @mentions to address others\n';
  context += '   Example: "I think we should explore cloud options. @cfo what\'s the budget?"\n\n';
  
  context += '2. IF YOU WANT TO PRESENT MULTIPLE PERSPECTIVES:\n';
  context += '   - Each perspective MUST start on a new line with format: [agent-name]:\n';
  context += '   - Use lowercase agent name in brackets followed by colon\n';
  context += '   - This helps with visual formatting and readability\n\n';
  
  context += '   Example format:\n';
  context += '   [ceo]: I think we should move forward with this.\n\n';
  context += '   [cfo]: The budget looks good, but we need to watch costs.\n\n';
  context += '   [cto]: From a technical perspective, this is feasible.\n\n';
  
  context += '3. ABSOLUTE PROHIBITIONS:\n';
  context += '   🚫 NEVER speak as @user or [User]: - THE USER IS A REAL PERSON\n';
  context += '   🚫 NEVER put words in the user\'s mouth or role-play their responses\n';
  context += '   🚫 NEVER write things like "[User]: <something>" or "@user <their response>"\n';
  context += '   🚫 The user will type their own responses - you cannot speak for them\n\n';
  
  context += '   You can:\n';
  context += '   ✓ Address the user with @user (asking them questions)\n';
  context += '   ✓ Quote what the user previously said\n';
  context += '   ✗ Cannot: Invent or role-play what the user might say\n\n';
  
  context += '─────────────────────────────────────────────────────────\n';
  context += 'BEST PRACTICES:\n';
  context += '─────────────────────────────────────────────────────────\n\n';
  
  context += '• Use @ mentions when you need specific expertise or input from another agent\n';
  context += '• Be specific in your questions to other agents\n';
  context += '• Build on other agents\' responses to create collaborative discussions\n';
  context += '• You can mention agents even if they haven\'t spoken yet in the conversation\n';
  context += '• Use natural language - the @ mention can appear anywhere in your response\n';
  context += '• IMPORTANT: Do NOT @mention yourself (@' + currentAgent.name + ') - you cannot respond to yourself\n\n';
  
  context += '═══════════════════════════════════════════════════════════\n\n';
  
  // Add chain depth awareness
  if (chainDepth >= session.maxChainLength - 1) {
    context += '⚠️  IMPORTANT: CONVERSATION DEPTH LIMIT\n';
    context += '═══════════════════════════════════════════════════════════\n\n';
    context += `You are at chain depth ${chainDepth} out of maximum ${session.maxChainLength}.\n`;
    context += 'You MUST check in with the user now using @user.\n';
    context += 'Do NOT @mention other agents - just summarize and ask the user for guidance.\n\n';
    context += 'Example:\n';
    context += '  "@user We\'ve had an extensive discussion. [Summary of key points]\n';
    context += '   What would you like us to focus on next?"\n\n';
    context += '═══════════════════════════════════════════════════════════\n\n';
  } else if (chainDepth >= session.maxChainLength - 2) {
    context += 'Note: You are approaching the conversation depth limit.\n';
    context += `Consider checking in with @user soon (current depth: ${chainDepth}/${session.maxChainLength}).\n\n`;
  }
  
  return context;
}

async function handleMeetingMessage(
  targetedMsg: TargetedMessage,
  agents: Agent[],
  session: MeetingSession,
  client: DockerAIClient,
  storage: Storage,
  configManager: ConfigManager,
  chainDepth: number = 0
): Promise<void> {
  // Clear buffered responses when user makes a new prompt (only at depth 0)
  if (chainDepth === 0 && session.bufferedResponses.length > 0) {
    console.log(chalk.gray(`\n(Clearing ${session.bufferedResponses.length} buffered response${session.bufferedResponses.length > 1 ? 's' : ''})\n`));
    session.bufferedResponses = [];
  }

  // Add user message to session
  const userMessage: MeetingMessage = {
    role: 'user',
    content: targetedMsg.content,
    targetAgent: targetedMsg.targetedAgents.length > 0 ? targetedMsg.targetedAgents.join(', ') : undefined,
    chainDepth: chainDepth,
    timestamp: new Date().toISOString(),
  };
  session.sharedMessages.push(userMessage);

  // Determine which agents should respond
  let respondingAgents: Agent[];
  
  if (targetedMsg.isDirectTarget) {
    // Direct targeting - only these agents respond
    respondingAgents = agents.filter(a => 
      targetedMsg.targetedAgents.some(name => name.toLowerCase() === a.name.toLowerCase())
    );
  } else {
    // Broadcast - all agents consider responding, but told to only respond if most qualified
    respondingAgents = agents;
  }

  if (respondingAgents.length === 0) {
    console.log(chalk.yellow('⚠ No matching agents found for that target'));
    return;
  }

  // Get responses from all agents (with special prompt for broadcast)
  const responses = await Promise.all(
    respondingAgents.map(agent => 
      getAgentResponse(agent, agents, session, targetedMsg, client, storage, configManager, chainDepth)
    )
  );

  // Filter out agents that declined to respond
  const activeResponses = responses.filter(r => r.wantsToRespond);

  if (activeResponses.length === 0) {
    console.log(chalk.yellow('\n💭 (None of the agents felt qualified to respond)'));
    console.log(chalk.gray('Use /respond <agent-name> to request a specific agent to answer\n'));
    return;
  }

  // First agent streams their response
  const firstResponse = activeResponses[0];
  const agentColor = getAgentColor(firstResponse.agentName);
  console.log(agentColor.bold(`\n${firstResponse.agentName}:`));
  
  // Stream the first response
  const firstContent = await streamAgentResponse(
    firstResponse.agent,
    agents,
    session,
    targetedMsg.content,
    client,
    storage,
    configManager,
    chainDepth
  );

  // Add first agent's message to session
  const firstMessage: MeetingMessage = {
    role: 'assistant',
    content: firstContent,
    agentName: firstResponse.agentName,
    chainDepth: chainDepth,
    timestamp: new Date().toISOString(),
  };
  session.sharedMessages.push(firstMessage);

  // Buffer remaining responses
  if (activeResponses.length > 1) {
    console.log();
    for (let i = 1; i < activeResponses.length; i++) {
      const resp = activeResponses[i];
      
      // Add to buffered responses
      const buffered: BufferedResponse = {
        agentName: resp.agentName,
        content: resp.content,
        timestamp: new Date().toISOString(),
      };
      session.bufferedResponses.push(buffered);

      // Show that they have a response ready
      const bufferedColor = getAgentColor(resp.agentName);
      console.log(chalk.gray('✋ ') + bufferedColor(resp.agentName) + chalk.gray(` also has an answer (use /respond ${resp.agentName})`));
    }
    console.log();
  }

  // Save session
  session.updatedAt = new Date().toISOString();
  session.metadata.totalMessages = session.sharedMessages.length;
  await storage.saveMeetingSession(session);

  // Check if the agent is addressing the user (check-in)
  const addressingUser = isAddressingUser(firstContent, session.profileName);
  
  if (addressingUser) {
    // Agent is checking in with user - any other mentioned agents should buffer
    const mentionedAgents = detectAgentMentions(firstContent, agents, firstResponse.agentName);
    
    if (mentionedAgents.length > 0) {
      console.log(chalk.gray(`\n💬 ${firstResponse.agentName} is checking in with you.`));
      console.log(chalk.gray(`   Mentioned agents (${mentionedAgents.join(', ')}) will buffer responses.\n`));
      
      // Get responses from mentioned agents and buffer them
      const mentionedAgentsList = agents.filter(a => 
        mentionedAgents.some(name => name.toLowerCase() === a.name.toLowerCase())
      );
      
      for (const agent of mentionedAgentsList) {
        try {
          const response = await getAgentResponse(
            agent,
            agents,
            session,
            { content: firstContent, targetedAgents: [agent.name], isDirectTarget: true },
            client,
            storage,
            configManager,
            chainDepth
          );
          
          if (response.wantsToRespond && response.content) {
            // Buffer this response
            const buffered: BufferedResponse = {
              agentName: agent.name,
              content: response.content,
              timestamp: new Date().toISOString(),
            };
            session.bufferedResponses.push(buffered);
            const bufferedColor = getAgentColor(agent.name);
            console.log(chalk.gray('✋ ') + bufferedColor(agent.name) + chalk.gray(` has a response (use /respond ${agent.name})`));
          }
        } catch (error) {
          // Silently skip if agent fails
        }
      }
      
      if (mentionedAgents.length > 0) {
        console.log();
      }
      
      await storage.saveMeetingSession(session);
    }
    
    // Don't continue the chain - return control to user
    return;
  }

  // Check if the agent mentioned another agent (agent-to-agent conversation)
  // Only proceed if the response has meaningful content (not just a mention)
  const mentionedAgents = detectAgentMentions(firstContent, agents, firstResponse.agentName);
  const hasSubstantialContent = firstContent.trim().length > 20; // More than just "@agent"
  
  if (mentionedAgents.length > 0 && hasSubstantialContent && chainDepth < session.maxChainLength) {
    // Agent mentioned another agent - trigger agent-to-agent response
    const nextDepth = chainDepth + 1;
    
    // Show chain indicator
    console.log(chalk.gray(`\n${'  '.repeat(nextDepth)}↳ [Agent-to-agent chain, depth ${nextDepth}/${session.maxChainLength}]`));
    
    // Create targeted message for the mentioned agent(s)
    const agentToAgentMsg: TargetedMessage = {
      content: firstContent,
      targetedAgents: mentionedAgents,
      isDirectTarget: true,
    };
    
    // Recursively handle agent-to-agent message
    await handleMeetingMessage(agentToAgentMsg, agents, session, client, storage, configManager, nextDepth);
  }
  // Note: No explicit warning at max depth - agents are instructed to check in via system prompt
}

interface AgentResponseIntent {
  agent: Agent;
  agentName: string;
  wantsToRespond: boolean;
  content: string;
}

async function getAgentResponse(
  agent: Agent,
  allAgents: Agent[],
  session: MeetingSession,
  targetedMsg: TargetedMessage,
  client: DockerAIClient,
  storage: Storage,
  configManager: ConfigManager,
  chainDepth: number = 0
): Promise<AgentResponseIntent> {
  const profile = await storage.loadProfile(session.profileName);
  
  // Build base system prompt with user/agent attributes
  let systemPrompt = buildSystemPrompt(agent.systemPrompt, agent, profile);
  
  // Add meeting-specific context (participant info, @ mention mechanics, etc.)
  systemPrompt += buildMeetingContext(agent, allAgents, session, chainDepth);
  
  if (!targetedMsg.isDirectTarget) {
    // Broadcast mode - add instruction to only respond if qualified
    systemPrompt += `\nNOTE: The user's message was not directed at anyone specific. Only respond if you believe you are the most qualified agent in this meeting to answer based on your role and expertise. If you don't think you should respond, reply with exactly: "PASS"\n`;
  }

  // Prepare messages - ensure roles alternate properly
  const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
  ];
  
  // Build conversation ensuring alternating roles
  let lastRole: 'user' | 'assistant' | null = null;
  let accumulatedContent = '';
  
  for (const m of session.sharedMessages) {
    const currentRole = m.role === 'user' ? 'user' : 'assistant';
    const content = m.agentName ? `[${m.agentName}]: ${m.content}` : `[User]: ${m.content}`;
    
    if (lastRole === currentRole) {
      // Same role as previous - accumulate
      accumulatedContent += '\n\n' + content;
    } else {
      // Different role - flush accumulated and start new
      if (lastRole !== null && accumulatedContent) {
        messages.push({ role: lastRole, content: accumulatedContent });
      }
      lastRole = currentRole;
      accumulatedContent = content;
    }
  }
  
  // Flush remaining accumulated content
  if (lastRole !== null && accumulatedContent) {
    messages.push({ role: lastRole, content: accumulatedContent });
  }
  
  // Note: No need to add targetedMsg.content here - it's already in session.sharedMessages
  // which was processed in the loop above

  try {
    // Get non-streaming response to check intent
    const response = await client.chatCompletion({
      model: agent.model,
      messages,
      max_tokens: agent.modelParams.maxTokens,
      temperature: agent.modelParams.temperature,
      top_p: agent.modelParams.topP,
      top_k: agent.modelParams.topN,
    });

    const content = response.choices[0]?.message?.content || '';
    const wantsToRespond = content.trim().toUpperCase() !== 'PASS';

    return {
      agent,
      agentName: agent.name,
      wantsToRespond,
      content,
    };
  } catch (error) {
    // Log error but don't crash the meeting
    let errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Extract more details from axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.status) {
        errorMsg = `HTTP ${axiosError.response.status}: ${errorMsg}`;
      }
      if (axiosError.response?.data?.error) {
        errorMsg += ` - ${JSON.stringify(axiosError.response.data.error)}`;
      }
    }
    
    console.error(chalk.red(`\n✗ Error getting response from ${agent.name}: ${errorMsg}`));
    console.log(chalk.yellow(`  Agent ${agent.name} will be skipped for this response.`));
    console.log(chalk.gray(`  (This may be a model or configuration issue)\n`));
    
    return {
      agent,
      agentName: agent.name,
      wantsToRespond: false,
      content: '',
    };
  }
}

async function streamAgentResponse(
  agent: Agent,
  allAgents: Agent[],
  session: MeetingSession,
  userContent: string,
  client: DockerAIClient,
  storage: Storage,
  configManager: ConfigManager,
  chainDepth: number = 0
): Promise<string> {
  const profile = await storage.loadProfile(session.profileName);
  
  // Build base system prompt with user/agent attributes
  let systemPrompt = buildSystemPrompt(agent.systemPrompt, agent, profile);
  
  // Add meeting-specific context (participant info, @ mention mechanics, etc.)
  systemPrompt += buildMeetingContext(agent, allAgents, session, chainDepth);
  
  // Get agent's color for streaming output
  const agentColor = getAgentColor(agent.name);

  // Prepare messages - ensure roles alternate properly
  const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
  ];
  
  // Build conversation ensuring alternating roles
  let lastRole: 'user' | 'assistant' | null = null;
  let accumulatedContent = '';
  
  for (const m of session.sharedMessages) {
    const currentRole = m.role === 'user' ? 'user' : 'assistant';
    const content = m.agentName ? `[${m.agentName}]: ${m.content}` : `[User]: ${m.content}`;
    
    if (lastRole === currentRole) {
      // Same role as previous - accumulate
      accumulatedContent += '\n\n' + content;
    } else {
      // Different role - flush accumulated and start new
      if (lastRole !== null && accumulatedContent) {
        messages.push({ role: lastRole, content: accumulatedContent });
      }
      lastRole = currentRole;
      accumulatedContent = content;
    }
  }
  
  // Flush remaining accumulated content
  if (lastRole !== null && accumulatedContent) {
    messages.push({ role: lastRole, content: accumulatedContent });
  }
  
  // Note: No need to add userContent here - it's already in session.sharedMessages
  // which was processed in the loop above

  // Create abort controller for Ctrl+D handling
  const abortController = new AbortController();
  let aborted = false;

  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  const onData = (key: Buffer) => {
    if (key.length === 1 && key[0] === 4) {
      aborted = true;
      abortController.abort();
      console.log(chalk.yellow('\n\n⚠ Aborting...'));
    }
  };

  process.stdin.on('data', onData);

  try {
    let assistantMessage = '';

    const streamHandler = createColorAwareStreamHandler(
      agent.name,
      allAgents,
      (fullMessage) => {
        assistantMessage = fullMessage;
      }
    );

    const stream = client.chatCompletionStream({
      model: agent.model,
      messages,
      max_tokens: agent.modelParams.maxTokens,
      temperature: agent.modelParams.temperature,
      top_p: agent.modelParams.topP,
      top_k: agent.modelParams.topN,
      stream: true,
    }, abortController.signal);

    for await (const chunk of stream) {
      streamHandler.handleChunk(chunk);
    }

    return aborted ? '' : assistantMessage;
  } catch (error) {
    if (!aborted) {
      let errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Extract more details from axios errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status) {
          errorMsg = `HTTP ${axiosError.response.status}: ${errorMsg}`;
        }
      }
      
      console.error(chalk.red(`\n✗ Error streaming response from ${agent.name}: ${errorMsg}`));
      console.log(chalk.yellow(`  This agent may have a model or configuration issue.\n`));
    }
    return '';
  } finally {
    process.stdin.off('data', onData);
    process.stdin.pause();
    if (wasRaw !== undefined) {
      process.stdin.setRawMode(wasRaw);
    }
  }
}

