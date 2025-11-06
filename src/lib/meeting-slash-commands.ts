// Slash command handlers for meeting mode
import chalk from 'chalk';
import prompts from 'prompts';
import type { Agent } from '../types/agent.ts';
import type { MeetingSession, MeetingMessage, BufferedResponse } from '../types/meeting.ts';
import type { Session } from '../types/session.ts';
import { Storage } from './storage.ts';
import { ConfigManager } from './config.ts';
import { DockerAIClient } from './docker-ai.ts';
import { StreamHandler } from './stream-handler.ts';
import { buildSystemPrompt } from './prompt-builder.ts';
import { buildMeetingContext, getAgentColor, createColorAwareStreamHandler } from './meeting-interactive.ts';

export interface MeetingSlashCommandResult {
  exit?: boolean;
  session?: MeetingSession;
  switchToAgent?: string;
}

export async function handleMeetingSlashCommand(
  input: string,
  session: MeetingSession,
  agents: Agent[],
  client: DockerAIClient,
  configManager: ConfigManager,
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  const parts = input.slice(1).split(' ');
  const command = parts[0];
  const args = parts.slice(1);

  switch (command) {
    case '':
    case 'help':
    case 'h':
      displayMeetingHelp();
      return {};

    case 'clear':
    case 'c':
      return handleReset(session, storage);

    case 'add':
      return await handleAddAgent(args[0], session, agents, storage);

    case 'remove':
      return await handleRemoveAgent(args[0], session, agents, storage);

    case 'respond':
    case 'r':
    case '/':
      return await handleRespond(args[0], session, agents, storage);

    case '@':
      return await handleDirectCall(args[0], session, agents, client, storage, configManager);

    case 'participants':
    case 'p':
      return handleParticipants(agents);

    case 'history':
      return handleHistory(session, args);

    case 'status':
    case 's':
      return handleStatus(session);

    case 'buffered':
    case 'b':
      return handleBuffered(session);

    case 'chain-length':
    case 'chain':
      return handleChainLength(session, args[0], storage);

    case 'check-in-limit':
    case 'checkin':
      return handleCheckInLimit(session, args[0], storage);

    case 'agent':
      return await handleAgentSwitch(args[0], storage);

    case 'show':
      return await handleShow(args[0], session, agents, storage);

    case 'restore':
      return await handleRestore(args[0], session, storage);

    case 'quit':
    case 'exit':
    case 'q':
    case 'e':
    case 'x':
      return { exit: true };

    default:
      console.error(chalk.red(`Unknown command: /${command}`));
      console.log('Type /help for available commands');
      return {};
  }
}

function displayMeetingHelp(): void {
  console.log(chalk.bold('\n📚 Meeting Room Commands\n'));
  console.log('  /help, /h                  - Show this help');
  console.log('  /clear, /c                 - Clear room history and screen');
  console.log('  /add <agent>               - Add an agent to the room');
  console.log('  /remove <agent>            - Remove an agent from the room');
  console.log('  /agent <name>              - Switch to single-agent mode');
  console.log('  /respond <agent>, /r       - Call on agent with raised hand (buffered)');
  console.log('  /@ <agent>                 - Ask agent to respond to current chat');
  console.log('  /participants, /p          - Show room participants');
  console.log('  /show <agent>              - Show agent config and system prompt');
  console.log('  /restore <name>            - Restore an archived chat');
  console.log('  /buffered, /b              - List all buffered responses');
  console.log('  /status, /s                - Show room statistics');
  console.log('  /history [count]           - Show recent messages');
  console.log('  /chain-length [n]          - View/set max agent-to-agent chain length');
  console.log('  /check-in-limit [n]        - View/set token limit for agent check-ins');
  console.log('  /quit, /q, /exit, /e, /x   - Exit room');
  console.log('  Ctrl+C                     - Exit room');
  console.log();
  console.log(chalk.bold('Message Targeting:'));
  console.log('  <agent>,  message          - Direct message to specific agent');
  console.log('  @<agent> message           - Mention agent in message');
  console.log('  message (no target)        - Broadcast to all (most qualified responds)');
  console.log();
  console.log(chalk.bold('Agent-to-Agent Communication:'));
  console.log('  Agents can @mention other agents in their responses');
  console.log('  Mentioned agents will automatically respond (up to chain limit)');
  console.log('  Use /chain-length to control max conversation depth');
  console.log();
}

async function handleAddAgent(
  agentName: string | undefined,
  session: MeetingSession,
  agents: Agent[],
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!agentName) {
    console.error(chalk.red('\nAgent name is required'));
    console.log(chalk.gray('Usage: /add <agent-name>'));
    console.log(chalk.gray('\nExample: /add cfo\n'));
    return {};
  }

  // Check if agent already in room
  if (session.agentNames.includes(agentName)) {
    console.log(chalk.yellow(`\n⚠️  ${agentName} is already in the room\n`));
    return {};
  }

  // Validate agent exists
  try {
    const agent = await storage.loadAgent(agentName);
    
    // Check if agent is locked
    const isLocked = await storage.isAgentLocked(agentName);
    if (isLocked) {
      console.log(chalk.red(`\n⚠️  ${agentName} is currently busy in another session.`));
      console.log(chalk.yellow('Please try again when they are available.\n'));
      return {};
    }

    // Add agent to session
    session.agentNames.push(agentName);
    session.metadata.activeAgents = session.agentNames;
    session.updatedAt = new Date().toISOString();
    await storage.saveMeetingSession(session);
    
    // Lock the agent
    await storage.lockAgent(agentName);

    const agentColor = getAgentColor(agentName);
    console.log(chalk.green(`\n✓ ${agentColor(agentName)} joined the room`));
    console.log(chalk.gray(`  Model: ${agent.model}`));
    console.log(chalk.gray(`  Role: ${agent.systemPrompt.substring(0, 80)}...`));
    console.log();
    console.log(chalk.gray('Note: Restart the room to apply changes or continue with current participants.'));
    console.log(chalk.gray('To restart: /quit and then run "ai meeting start ' + session.roomName + '"\n'));
    
    return { session };
  } catch (error) {
    console.error(chalk.red(`\n✗ Agent not found: ${agentName}`));
    console.log(chalk.gray('Create an agent with: ai agent new ' + agentName + '\n'));
    return {};
  }
}

async function handleRemoveAgent(
  agentName: string | undefined,
  session: MeetingSession,
  agents: Agent[],
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!agentName) {
    console.error(chalk.red('\nAgent name is required'));
    console.log(chalk.gray('Usage: /remove <agent-name>'));
    console.log(chalk.gray('\nCurrent participants:'));
    for (const name of session.agentNames) {
      const agentColor = getAgentColor(name);
      console.log(`  ${agentColor(name)}`);
    }
    console.log();
    return {};
  }

  // Check if agent is in room
  const agentIndex = session.agentNames.findIndex(
    name => name.toLowerCase() === agentName.toLowerCase()
  );
  
  if (agentIndex === -1) {
    console.log(chalk.yellow(`\n⚠️  ${agentName} is not in the room\n`));
    return {};
  }

  // Ensure at least 2 agents remain
  if (session.agentNames.length <= 2) {
    console.error(chalk.red('\n✗ Cannot remove agent - at least 2 agents must remain in the room'));
    console.log(chalk.gray('If you want to end this meeting, use /quit\n'));
    return {};
  }

  // Remove agent from session
  const removedName = session.agentNames[agentIndex];
  session.agentNames.splice(agentIndex, 1);
  session.metadata.activeAgents = session.agentNames;
  session.updatedAt = new Date().toISOString();
  await storage.saveMeetingSession(session);

  // Remove buffered responses from this agent
  session.bufferedResponses = session.bufferedResponses.filter(
    r => r.agentName.toLowerCase() !== removedName.toLowerCase()
  );

  const agentColor = getAgentColor(removedName);
  console.log(chalk.green(`\n✓ ${agentColor(removedName)} left the room`));
  console.log();
  console.log(chalk.gray('Note: Restart the room to apply changes or continue with current participants.'));
  console.log(chalk.gray('To restart: /quit and then run "ai meeting start ' + session.roomName + '"\n'));

  return { session };
}

async function handleRespond(
  agentName: string | undefined,
  session: MeetingSession,
  agents: Agent[],
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!agentName) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: /respond <agent-name>');
    console.log('\nAgents with raised hands (buffered responses):');
    if (session.bufferedResponses.length === 0) {
      console.log(chalk.gray('  (none)'));
    } else {
      for (const resp of session.bufferedResponses) {
        const agentColor = getAgentColor(resp.agentName);
        console.log(`  ${agentColor(resp.agentName)}`);
      }
    }
    console.log();
    return {};
  }

  // Find the agent
  const agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
  if (!agent) {
    console.error(chalk.red(`Agent not found in room: ${agentName}`));
    return {};
  }

  // Check if there's a buffered response
  const bufferedIndex = session.bufferedResponses.findIndex(
    r => r.agentName.toLowerCase() === agentName.toLowerCase()
  );

  if (bufferedIndex >= 0) {
    // Show buffered response
    const buffered = session.bufferedResponses[bufferedIndex];
    const agentColor = getAgentColor(buffered.agentName);
    console.log(agentColor.bold(`\n${buffered.agentName}:`));
    console.log(agentColor(buffered.content));
    console.log();

    // Move to shared messages (add to chat history)
    const message: MeetingMessage = {
      role: 'assistant',
      content: buffered.content,
      agentName: buffered.agentName,
      timestamp: buffered.timestamp,
    };
    session.sharedMessages.push(message);

    // Remove from buffered
    session.bufferedResponses.splice(bufferedIndex, 1);

    // Save session
    session.updatedAt = new Date().toISOString();
    await storage.saveMeetingSession(session);

    return { session };
  } else {
    // No buffered response for this agent
    console.log(chalk.yellow(`\n⚠️  ${agent.name} does not have a raised hand (no buffered response)`));
    console.log(chalk.gray(`To ask ${agent.name} to respond to the current chat, use: /@ ${agentName}\n`));
    return {};
  }
}

async function handleDirectCall(
  agentName: string | undefined,
  session: MeetingSession,
  agents: Agent[],
  client: DockerAIClient,
  storage: Storage,
  configManager: ConfigManager
): Promise<MeetingSlashCommandResult> {
  if (!agentName) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: /@ <agent-name>');
    console.log('\nCurrent participants:');
    for (const agent of agents) {
      const agentColor = getAgentColor(agent.name);
      console.log(`  ${agentColor(agent.name)}`);
    }
    console.log();
    return {};
  }

  // Find the agent
  const agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
  if (!agent) {
    console.error(chalk.red(`Agent not found in room: ${agentName}`));
    return {};
  }

  console.log(chalk.blue(`\nAsking ${agent.name} to respond...\n`));
  
  // Get the last user message
  const lastUserMessage = [...session.sharedMessages].reverse().find(m => m.role === 'user');
  if (!lastUserMessage) {
    console.error(chalk.red('No user message to respond to'));
    return {};
  }

  const agentColor = getAgentColor(agent.name);
  console.log(agentColor.bold(`${agent.name}:`));
  const content = await streamForcedResponse(
    agent,
    agents,
    session,
    lastUserMessage.content,
    client,
    storage,
    configManager
  );

  if (content) {
    // Add to shared messages
    const message: MeetingMessage = {
      role: 'assistant',
      content: content,
      agentName: agent.name,
      timestamp: new Date().toISOString(),
    };
    session.sharedMessages.push(message);

    // Save session
    session.updatedAt = new Date().toISOString();
    await storage.saveMeetingSession(session);

    return { session };
  }

  return {};
}

async function streamForcedResponse(
  agent: Agent,
  allAgents: Agent[],
  session: MeetingSession,
  userContent: string,
  client: DockerAIClient,
  storage: Storage,
  configManager: ConfigManager
): Promise<string> {
  const profile = await storage.loadProfile(session.profileName);
  
  // Build base system prompt with user/agent attributes
  let systemPrompt = buildSystemPrompt(agent.systemPrompt, agent, profile);
  
  // Add meeting-specific context (participant info, @ mention mechanics, etc.)
  // Chain depth is 0 for forced responses - they're responding directly to user
  systemPrompt += buildMeetingContext(agent, allAgents, session, 0);
  
  systemPrompt += `\nNOTE: The user has specifically requested your response. Please provide your perspective on their question.\n`;
  
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
    const content = m.agentName ? `[${m.agentName}]: ${m.content}` : m.content;
    
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
  
  // Add the current message, ensuring it alternates
  if (lastRole === 'user') {
    // Last was user, this should be assistant - but it's a new user message
    // Append to last user message instead
    if (messages.length > 1 && messages[messages.length - 1].role === 'user') {
      messages[messages.length - 1].content += '\n\n' + userContent;
    } else {
      messages.push({ role: 'user', content: userContent });
    }
  } else {
    // Last was assistant or null, safe to add user message
    messages.push({ role: 'user', content: userContent });
  }

  // Create abort controller
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
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : 'Unknown error');
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

async function handleReset(
  session: MeetingSession,
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  // Check if there's any history to save
  if (session.sharedMessages.length > 0 || session.bufferedResponses.length > 0) {
    // Ask if user wants to save
    const saveResponse = await prompts({
      type: 'text',
      name: 'save',
      message: chalk.yellow('Save chat history before clearing? (y/yes to save)'),
      initial: 'n'
    });

    if (saveResponse.save && (saveResponse.save.toLowerCase() === 'y' || saveResponse.save.toLowerCase() === 'yes')) {
      // Ask for chat name
      const nameResponse = await prompts({
        type: 'text',
        name: 'name',
        message: chalk.cyan('Enter a name for this chat:'),
        validate: (value: string) => value.trim().length > 0 ? true : 'Name cannot be empty'
      });

      if (nameResponse.name) {
        try {
          // Save to archive
          await storage.saveArchive(nameResponse.name, session);
          console.log(chalk.green(`✓ Chat saved to archive: ${nameResponse.name}`));
          console.log(chalk.gray(`  Location: ~/.ai/archive/${nameResponse.name}.json`));
        } catch (error) {
          console.error(chalk.red('✗ Failed to save chat:'), error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }
  }

  console.clear();
  
  session.sharedMessages = [];
  session.bufferedResponses = [];
  session.metadata.totalMessages = 0;
  session.updatedAt = new Date().toISOString();
  
  await storage.saveMeetingSession(session);
  
  console.log(chalk.green('✓ Cleared room history'));
  return { session };
}

function handleParticipants(agents: Agent[]): MeetingSlashCommandResult {
  console.log(chalk.bold('\n👥 Room Participants\n'));
  for (const agent of agents) {
    const agentColor = getAgentColor(agent.name);
    console.log(`  ${agentColor(agent.name)}`);
    console.log(`    Model: ${chalk.gray(agent.model)}`);
    console.log(`    Role: ${chalk.gray(agent.systemPrompt.substring(0, 80))}...`);
  }
  console.log();
  return {};
}

function handleHistory(session: MeetingSession, args: string[]): MeetingSlashCommandResult {
  const count = args[0] ? parseInt(args[0]) : 10;
  displayHistory(session, count);
  return {};
}

export function displayHistory(session: MeetingSession, count: number = 10): void {
  const recentMessages = session.sharedMessages.slice(-count);

  if (recentMessages.length === 0) {
    console.log(chalk.gray('\n(No message history)\n'));
    return;
  }

  console.log(chalk.bold(`\n💬 Recent Messages (last ${recentMessages.length})\n`));
  
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      console.log(chalk.blue('[User]'));
      if (msg.targetAgent) {
        console.log(chalk.gray(`  (to: ${msg.targetAgent})`));
      }
      console.log(msg.content);
    } else if (msg.role === 'assistant' && msg.agentName) {
      const agentColor = getAgentColor(msg.agentName);
      console.log(agentColor(`[${msg.agentName}]`));
      console.log(agentColor(msg.content));
    }
    console.log();
  }
}

function handleStatus(session: MeetingSession): MeetingSlashCommandResult {
  console.log(chalk.bold('\n📊 Room Status\n'));
  console.log(`  Room Name: ${chalk.cyan(session.roomName || session.id)}`);
  console.log(`  Participants: ${chalk.cyan(session.agentNames.join(', '))}`);
  console.log(`  Total Messages: ${chalk.cyan(session.sharedMessages.length)}`);
  console.log(`  Buffered Responses: ${chalk.cyan(session.bufferedResponses.length)}`);
  
  if (session.metadata.lastResponseStats) {
    const stats = session.metadata.lastResponseStats;
    console.log(`\n  Last Response: ${chalk.cyan(stats.agentName)}`);
    console.log(`    Tokens: ${stats.totalTokens} (${stats.promptTokens} prompt + ${stats.completionTokens} completion)`);
  }
  
  console.log();
  return {};
}

function handleBuffered(session: MeetingSession): MeetingSlashCommandResult {
  console.log(chalk.bold('\n📝 Buffered Responses\n'));
  
  if (session.bufferedResponses.length === 0) {
    console.log(chalk.gray('  (none)'));
  } else {
    for (const resp of session.bufferedResponses) {
      const agentColor = getAgentColor(resp.agentName);
      console.log(`  ${agentColor(resp.agentName)} - ${chalk.gray(resp.timestamp)}`);
      console.log(`    ${chalk.gray(resp.content.substring(0, 100))}...`);
      console.log();
    }
    console.log(chalk.gray(`Use /respond <agent-name> to show full response\n`));
  }
  
  return {};
}

async function handleChainLength(
  session: MeetingSession,
  value: string | undefined,
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!value) {
    // Show current setting
    console.log(chalk.bold('\n🔗 Agent-to-Agent Chain Settings\n'));
    console.log(`  Max Chain Length: ${chalk.cyan(session.maxChainLength)}`);
    console.log();
    console.log(chalk.gray('This controls how many times agents can respond to each other'));
    console.log(chalk.gray('before the conversation returns to the user.'));
    console.log();
    console.log(chalk.gray('Example chain (max length 3):'));
    console.log(chalk.gray('  User → Agent A (depth 0)'));
    console.log(chalk.gray('    Agent A mentions @Agent B'));
    console.log(chalk.gray('  Agent A → Agent B (depth 1)'));
    console.log(chalk.gray('    Agent B mentions @Agent C'));
    console.log(chalk.gray('  Agent B → Agent C (depth 2)'));
    console.log(chalk.gray('    Agent C mentions @Agent A'));
    console.log(chalk.gray('  Agent C → Agent A (depth 3) - MAX REACHED'));
    console.log();
    console.log(chalk.gray(`Use /chain-length <number> to change (current: ${session.maxChainLength})`));
    console.log();
    return {};
  }

  const newLength = parseInt(value);
  if (isNaN(newLength) || newLength < 0) {
    console.error(chalk.red('Invalid chain length. Must be a positive number.'));
    console.log(chalk.gray('Use 0 to disable agent-to-agent chaining.'));
    return {};
  }

  const oldLength = session.maxChainLength;
  session.maxChainLength = newLength;
  session.updatedAt = new Date().toISOString();
  await storage.saveMeetingSession(session);

  console.log(chalk.green(`\n✓ Max chain length updated: ${oldLength} → ${newLength}`));
  
  if (newLength === 0) {
    console.log(chalk.yellow('⚠️  Agent-to-agent chaining is now disabled.'));
    console.log(chalk.gray('Agents can still @mention each other, but won\'t auto-respond.'));
  } else if (newLength > 10) {
    console.log(chalk.yellow(`⚠️  Chain length of ${newLength} may result in very long conversations.`));
  }
  
  console.log();
  return { session };
}

async function handleCheckInLimit(
  session: MeetingSession,
  value: string | undefined,
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!value) {
    // Show current setting
    console.log(chalk.bold('\n🔔 Agent Check-In Settings\n'));
    console.log(`  Check-In Token Limit: ${chalk.cyan(session.checkInTokenLimit)}`);
    console.log();
    console.log(chalk.gray('This controls when agents should pause and check in with you'));
    console.log(chalk.gray('during agent-to-agent conversations.'));
    console.log();
    console.log(chalk.gray('Agents are instructed to check in:'));
    console.log(chalk.gray(`  • After ~${session.checkInTokenLimit} tokens of conversation`));
    console.log(chalk.gray('  • After major decisions'));
    console.log(chalk.gray('  • When needing user input/approval'));
    console.log();
    console.log(chalk.gray('When checking in, agents will:'));
    console.log(chalk.gray('  • Summarize the discussion'));
    console.log(chalk.gray('  • NOT use @ mentions (preventing auto-responses)'));
    console.log(chalk.gray('  • Ask for your guidance to continue'));
    console.log();
    console.log(chalk.gray(`Use /check-in-limit <number> to change (current: ${session.checkInTokenLimit})`));
    console.log();
    return {};
  }

  const newLimit = parseInt(value);
  if (isNaN(newLimit) || newLimit < 0) {
    console.error(chalk.red('Invalid check-in limit. Must be a positive number.'));
    console.log(chalk.gray('Typical values: 512 (frequent), 1024 (default), 2048 (infrequent)'));
    return {};
  }

  const oldLimit = session.checkInTokenLimit;
  session.checkInTokenLimit = newLimit;
  session.updatedAt = new Date().toISOString();
  await storage.saveMeetingSession(session);

  console.log(chalk.green(`\n✓ Check-in token limit updated: ${oldLimit} → ${newLimit}`));
  
  if (newLimit < 512) {
    console.log(chalk.yellow('⚠️  Very low limit - agents will check in frequently.'));
  } else if (newLimit > 3000) {
    console.log(chalk.yellow(`⚠️  High limit - agents may have very long discussions before checking in.`));
  }
  
  console.log();
  return { session };
}

async function handleShow(
  agentName: string | undefined,
  session: MeetingSession,
  agents: Agent[],
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!agentName) {
    console.log(chalk.yellow('\n⚠ Please specify an agent name'));
    console.log(chalk.gray('Usage: /show <agent-name>'));
    console.log();
    console.log(chalk.bold('Available agents in this meeting:'));
    for (const agent of agents) {
      console.log(`  ${chalk.cyan(agent.name)}`);
    }
    console.log();
    return {};
  }

  // Find the agent in the current meeting
  const agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
  if (!agent) {
    console.error(chalk.red(`\n✗ Agent not found in meeting: ${agentName}`));
    console.log(chalk.gray('Use /participants to see meeting participants\n'));
    return {};
  }

  // Load the full agent configuration from storage
  let fullAgentConfig: Agent;
  try {
    fullAgentConfig = await storage.loadAgent(agent.name);
  } catch {
    fullAgentConfig = agent; // Fallback to in-memory agent
  }

  // Load the profile to build the complete system prompt
  const profile = await storage.loadProfile(session.profileName);

  // Build the base system prompt with agent and user attributes
  const baseSystemPrompt = buildSystemPrompt(agent.systemPrompt, agent, profile);
  
  // Build the complete system prompt with meeting context
  const fullSystemPrompt = baseSystemPrompt + buildMeetingContext(agent, agents, session, 0);

  // Display the agent configuration
  console.log(chalk.bold('\n' + '═'.repeat(70)));
  console.log(chalk.bold.cyan(`🤖 Agent Configuration: ${agent.name}`));
  console.log(chalk.bold('═'.repeat(70) + '\n'));

  // Show basic info
  console.log(chalk.bold('📋 Basic Information:'));
  console.log(`  ${chalk.gray('Name:')}          ${chalk.cyan(agent.name)}`);
  console.log(`  ${chalk.gray('Model:')}         ${chalk.cyan(agent.model)}`);
  console.log();

  // Show model parameters
  console.log(chalk.bold('⚙️  Model Parameters:'));
  console.log(`  ${chalk.gray('Context Size:')}  ${chalk.cyan(agent.modelParams.ctxSize)}`);
  console.log(`  ${chalk.gray('Max Tokens:')}    ${chalk.cyan(agent.modelParams.maxTokens)}`);
  console.log(`  ${chalk.gray('Temperature:')}   ${chalk.cyan(agent.modelParams.temperature)}`);
  console.log(`  ${chalk.gray('Top P:')}         ${chalk.cyan(agent.modelParams.topP)}`);
  console.log(`  ${chalk.gray('Top K:')}         ${chalk.cyan(agent.modelParams.topN)}`);
  console.log();

  // Show attributes if they exist
  if (fullAgentConfig.attributes && Object.keys(fullAgentConfig.attributes).length > 0) {
    console.log(chalk.bold('🏷️  Agent Attributes:'));
    const attrStr = JSON.stringify(fullAgentConfig.attributes, null, 2);
    attrStr.split('\n').forEach(line => {
      console.log(`  ${chalk.gray(line)}`);
    });
    console.log();
  }

  // Show raw configuration
  console.log(chalk.bold('📄 Raw Configuration (JSON):'));
  console.log(chalk.gray('─'.repeat(70)));
  const configStr = JSON.stringify(fullAgentConfig, null, 2);
  configStr.split('\n').forEach(line => {
    console.log(chalk.gray(line));
  });
  console.log(chalk.gray('─'.repeat(70)));
  console.log();

  // Show the dynamically generated system prompt
  console.log(chalk.bold('🧠 Dynamically Generated System Prompt:'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(chalk.yellow('(This is the actual prompt being sent to the model during this meeting)'));
  console.log(chalk.gray('─'.repeat(70)));
  
  // Display the system prompt with line wrapping
  const lines = fullSystemPrompt.split('\n');
  for (const line of lines) {
    console.log(chalk.white(line));
  }
  
  console.log(chalk.gray('─'.repeat(70)));
  console.log();
  
  // Show token count estimate
  const estimatedTokens = Math.ceil(fullSystemPrompt.length / 4); // Rough estimate
  console.log(chalk.bold('📊 System Prompt Stats:'));
  console.log(`  ${chalk.gray('Characters:')}    ${chalk.cyan(fullSystemPrompt.length)}`);
  console.log(`  ${chalk.gray('Est. Tokens:')}   ${chalk.cyan(estimatedTokens)} ${chalk.gray('(~4 chars/token)')}`);
  console.log();
  
  console.log(chalk.bold('═'.repeat(70)));
  console.log();

  return {};
}

async function handleAgentSwitch(
  agentName: string | undefined,
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!agentName) {
    // Show available agents
    const agents = await storage.listAgents();
    if (agents.length === 0) {
      console.error(chalk.red('No agents available'));
      return {};
    }
    
    console.log(chalk.bold('\n🤖 Available Agents\n'));
    for (const name of agents) {
      try {
        const agent = await storage.loadAgent(name);
        console.log(`  ${chalk.cyan(name)} - ${chalk.gray(agent.model)}`);
        console.log(`    ${chalk.gray(agent.systemPrompt.substring(0, 80))}...`);
      } catch {
        console.log(`  ${chalk.cyan(name)}`);
      }
    }
    console.log();
    console.log(chalk.gray('Usage: /agent <agent-name>'));
    console.log();
    return {};
  }

  // Validate agent exists
  try {
    await storage.loadAgent(agentName);
    console.log(chalk.green(`\n✓ Switching to agent: ${agentName}`));
    console.log(chalk.gray('Leaving meeting and loading agent session...\n'));
    return { switchToAgent: agentName }; // No exit needed - we call process.exit explicitly
  } catch {
    console.error(chalk.red(`\n✗ Agent not found: ${agentName}`));
    console.log(chalk.gray('Use /agent to see available agents\n'));
    return {};
  }
}

async function handleRestore(
  archiveName: string | undefined,
  session: MeetingSession,
  storage: Storage
): Promise<MeetingSlashCommandResult> {
  if (!archiveName) {
    // List available archives
    const archives = await storage.listArchives();
    if (archives.length === 0) {
      console.log(chalk.yellow('\n⚠ No archived chats found'));
      console.log(chalk.gray('Use /clear to save your current chat to the archive\n'));
      return {};
    }

    console.log(chalk.bold('\n📦 Archived Chats\n'));
    for (const name of archives) {
      try {
        const archived = await storage.loadArchive(name);
        const isMeeting = 'roomName' in archived;
        const messageCount = isMeeting 
          ? (archived as MeetingSession).sharedMessages.length
          : (archived as Session).messages.length;
        
        console.log(`  ${chalk.cyan(name)}`);
        console.log(`    ${chalk.gray(`Type: ${isMeeting ? 'Meeting Room' : 'Agent Chat'}`)}`);
        console.log(`    ${chalk.gray(`Messages: ${messageCount}`)}`);
        console.log(`    ${chalk.gray(`Updated: ${archived.updatedAt}`)}`);
      } catch {
        console.log(`  ${chalk.cyan(name)}`);
      }
    }
    console.log();
    console.log(chalk.gray('Usage: /restore <archive-name>'));
    console.log();
    return {};
  }

  try {
    // Load the archive
    const archived = await storage.loadArchive(archiveName);
    const isMeeting = 'roomName' in archived;

    // Ask if user wants to save current chat
    if (session.sharedMessages.length > 0 || session.bufferedResponses.length > 0) {
      const saveResponse = await prompts({
        type: 'text',
        name: 'save',
        message: chalk.yellow('Save current chat before restoring? (y/yes to save)'),
        initial: 'n'
      });

      if (saveResponse.save && (saveResponse.save.toLowerCase() === 'y' || saveResponse.save.toLowerCase() === 'yes')) {
        const nameResponse = await prompts({
          type: 'text',
          name: 'name',
          message: chalk.cyan('Enter a name for current chat:'),
          validate: (value: string) => value.trim().length > 0 ? true : 'Name cannot be empty'
        });

        if (nameResponse.name) {
          try {
            await storage.saveArchive(nameResponse.name, session);
            console.log(chalk.green(`✓ Current chat saved to archive: ${nameResponse.name}`));
          } catch (error) {
            console.error(chalk.red('✗ Failed to save current chat:'), error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }
    }

    if (isMeeting) {
      // It's a meeting room - restore it
      const meetingSession = archived as MeetingSession;
      console.log(chalk.green(`\n✓ Restoring meeting room: ${meetingSession.roomName || meetingSession.id}`));
      console.log(chalk.gray(`  Participants: ${meetingSession.agentNames.join(', ')}`));
      console.log(chalk.gray(`  Messages: ${meetingSession.sharedMessages.length}`));
      
      // If it's the same room, just restore messages
      if (meetingSession.roomName === session.roomName) {
        session.sharedMessages = meetingSession.sharedMessages;
        session.bufferedResponses = meetingSession.bufferedResponses;
        session.metadata = meetingSession.metadata;
        session.updatedAt = new Date().toISOString();
        await storage.saveMeetingSession(session);
        
        console.log(chalk.green('\n✓ Room history restored, use /history to show the previous conversation'));
        console.log();
        return { session };
      } else {
        // Different room - need to switch
        console.log(chalk.gray(`  Switching to room: ${meetingSession.roomName}\n`));
        
        // Save the restored meeting session
        await storage.saveMeetingSession(meetingSession);
        
        // Note: The meeting-interactive.ts will need to handle this switch
        // For now, inform the user they need to restart
        console.log(chalk.yellow('⚠ To restore a different room, please exit and run:'));
        console.log(chalk.gray(`  ai meeting start ${meetingSession.roomName}\n`));
        return {};
      }
    } else {
      // It's an agent chat - switch to agent mode
      const agentSession = archived as Session;
      console.log(chalk.green(`\n✓ Restoring agent chat: ${agentSession.agentName || 'default'}`));
      console.log(chalk.gray(`  Messages: ${agentSession.messages.length}`));
      console.log(chalk.gray('\nSwitching to agent mode...\n'));
      
      // Switch to agent
      if (agentSession.agentName) {
        return { switchToAgent: agentSession.agentName };
      } else {
        console.error(chalk.red('✗ Archived session has no agent name'));
        return {};
      }
    }
  } catch (error) {
    console.error(chalk.red(`\n✗ Archive not found: ${archiveName}`));
    console.log(chalk.gray('Use /restore to see available archives\n'));
    return {};
  }
}

