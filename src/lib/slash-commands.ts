// Slash command handlers
import chalk from 'chalk';
import prompts from 'prompts';
import type { Session, Message } from '../types/session.ts';
import type { SlashCommandResult, InteractiveOptions } from '../types/cli.ts';
import { Storage } from './storage.ts';
import type { DockerAIClient } from './docker-ai.ts';
import type { ConfigManager } from './config.ts';
import { StreamHandler } from './stream-handler.ts';
import { buildSystemPrompt } from './prompt-builder.ts';
import type { MeetingSession } from '../types/meeting.ts';

// Helper to setup stdin control with abort support
function setupStdinAbort(): { abortController: AbortController; cleanup: () => void; isAborted: () => boolean } {
  const abortController = new AbortController();
  let aborted = false;
  
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  const onData = (key: Buffer) => {
    // Ctrl+D is ASCII 4
    if (key.length === 1 && key[0] === 4) {
      aborted = true;
      abortController.abort();
      console.log(chalk.yellow('\n\n⚠ Aborting request...'));
    }
  };

  process.stdin.on('data', onData);

  const cleanup = () => {
    process.stdin.off('data', onData);
    process.stdin.pause();
    if (wasRaw !== undefined) {
      process.stdin.setRawMode(wasRaw);
    }
  };

  return { abortController, cleanup, isAborted: () => aborted };
}

export async function handleSlashCommand(
  input: string,
  session: Session,
  settings: InteractiveOptions,
  client?: DockerAIClient,
  configManager?: ConfigManager
): Promise<SlashCommandResult> {
  const parts = input.slice(1).split(' ');
  const command = parts[0];
  const args = parts.slice(1);

  switch (command) {
    case '':
    case 'help':
    case 'h':
      displayHelp();
      return {};

    case 'clear':
    case 'c':
      return await handleReset(session, settings, client, configManager);

    case 'load':
    case 'l':
      return await handleLoad(args[0]);

    case 'restore':
      return await handleRestore(args[0], session, settings, client, configManager);

    case 'compact':
      return await handleCompact(session, settings, client, configManager);

    case 'ctx-size':
    case 'ctx':
      return handleCtxSize(settings, args[0]);

    case 'max-size':
    case 'max':
      return handleMaxSize(settings, args[0]);

    case 'temperature':
    case 't':
      return handleTemperature(settings, args[0]);

    case 'top_p':
    case 'tp':
      return handleTopP(settings, args[0]);

    case 'top_n':
    case 'tn':
      return handleTopN(settings, args[0]);

    case 'debug':
      return handleDebug(settings, args[0]);

    case 'status':
    case 's':
      return handleStatus(session, settings);

    case 'history':
      return await handleHistory(session, args);

    case 'pop':
      return handleHistoryPop(session, args[0]);

    case 'info':
    case 'i':
      return handleInfo(settings);

    case 'show':
      return await handleShow(settings, configManager);

    case 'agent':
      return await handleAgentSwitch(args[0]);

    case 'meeting':
      return handleMeetingSwitch(args);

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

function displayHelp(): void {
  console.log(chalk.bold('\n📚 Available Slash Commands\n'));
  console.log('  /help, /h                  - Show this help');
  console.log('  /clear, /c                 - Clear chat history and screen');
  console.log('  /info, /i                  - Show current agent settings');
  console.log('  /show                      - Show agent config and system prompt');
  console.log('  /status, /s                - Show performance and context usage');
  console.log('  /agent <name>              - Switch to a different agent');
  console.log('  /meeting <room> [agents]   - Join/create a meeting room');
  console.log('  /load <name>               - Load a session');
  console.log('  /restore <name>            - Restore an archived chat');
  console.log('  /compact                   - Summarize and compact session');
  console.log('  /history pop [count]       - Remove and display last messages');
  console.log('  /ctx-size <size>           - Set context window size');
  console.log('  /max-size <size>           - Set max response size');
  console.log('  /temperature <t>           - Set temperature');
  console.log('  /top_p <p>                 - Set top_p');
  console.log('  /top_n <n>                 - Set top_n');
  console.log('  /debug <bool>, /d <bool>   - Enable/disable debug');
  console.log('  /quit, /q, /exit, /e, /x   - Exit interactive mode');
  console.log('  Ctrl+C                     - Exit session');
  console.log();
  console.log(chalk.gray('Note: Sessions are automatically saved after every response.'));
  console.log();
}

async function handleLoad(name?: string): Promise<SlashCommandResult> {
  if (!name) {
    console.error(chalk.red('Session name is required'));
    console.log('Usage: /load <name>');
    return {};
  }

  const storage = new Storage();
  await storage.init();
  
  try {
    await storage.loadSession(name);
    console.log(chalk.green(`✓ Loaded session: ${name}`));
    console.log(chalk.yellow('Note: Session loaded but current conversation continues.'));
    console.log(chalk.yellow('Restart with "ai run" to use the loaded session.'));
  } catch {
    console.error(chalk.red(`Session not found: ${name}`));
  }
  
  return {};
}

async function handleRestore(
  archiveName: string | undefined,
  session: Session,
  settings: InteractiveOptions,
  client?: DockerAIClient,
  configManager?: ConfigManager
): Promise<SlashCommandResult> {
  const storage = new Storage();
  await storage.init();

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
    if (session.messages.length > 0) {
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
      // It's a meeting room - switch to meeting mode
      const meetingSession = archived as MeetingSession;
      console.log(chalk.green(`\n✓ Restoring meeting room: ${meetingSession.roomName || meetingSession.id}`));
      console.log(chalk.gray(`  Participants: ${meetingSession.agentNames.join(', ')}`));
      console.log(chalk.gray(`  Messages: ${meetingSession.sharedMessages.length}`));
      console.log(chalk.gray('\nSwitching to meeting mode...\n'));
      
      // Save the restored meeting session
      await storage.saveMeetingSession(meetingSession);
      
      // Return switch to meeting
      return { switchToMeeting: [meetingSession.roomName || meetingSession.id] };
    } else {
      // It's an agent chat - restore in current session
      const agentSession = archived as Session;
      console.log(chalk.green(`\n✓ Restoring agent chat: ${agentSession.agentName || 'default'}`));
      console.log(chalk.gray(`  Messages: ${agentSession.messages.length}`));
      
      // If agent is different, switch to that agent
      if (agentSession.agentName && agentSession.agentName !== session.agentName) {
        console.log(chalk.gray(`  Switching to agent: ${agentSession.agentName}\n`));
        return { switchToAgent: agentSession.agentName };
      } else {
        // Same agent, just restore messages
        session.messages = agentSession.messages;
        session.metadata = agentSession.metadata;
        session.updatedAt = new Date().toISOString();
        await storage.saveSession(session);
        
        console.log(chalk.green('\n✓ Chat history restored'));
        console.log();
        return { session };
      }
    }
  } catch (error) {
    console.error(chalk.red(`\n✗ Archive not found: ${archiveName}`));
    console.log(chalk.gray('Use /restore to see available archives\n'));
    return {};
  }
}

async function handleCompact(
  session: Session,
  settings: InteractiveOptions,
  client?: DockerAIClient,
  configManager?: ConfigManager
): Promise<SlashCommandResult> {
  if (!client || !configManager) {
    console.error(chalk.red('✗ Compact is only available in interactive mode'));
    console.log('Use: ai run <agent> and then /compact');
    return {};
  }

  if (session.messages.length === 0) {
    console.log(chalk.yellow('⚠ No messages to compact'));
    return {};
  }

  console.log(chalk.blue('🔄 Compacting session...'));
  console.log(chalk.gray(`Current message count: ${session.messages.length}`));

  const storage = new Storage();
  await storage.init();

  try {

    // Load agent and profile for context
    const currentAgentName = await configManager.getCurrentAgent();
    const currentProfileName = await configManager.getCurrentProfile();
    
    const agent = currentAgentName ? await storage.loadAgent(currentAgentName) : null;
    const profile = await storage.loadProfile(currentProfileName);

    // Create a summarization prompt
    const summaryPrompt = `Please provide a concise summary of the conversation so far. Include:
1. The main topics discussed
2. Key decisions or conclusions reached
3. Any important context that should be preserved
4. Outstanding questions or tasks

Keep the summary detailed enough to maintain context for future conversation, but compact enough to reduce token usage.`;

    // Prepare messages for summarization
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant that summarizes conversations accurately and concisely.',
      },
      ...session.messages,
      {
        role: 'user' as const,
        content: summaryPrompt,
      }
    ];

    // Get summary from AI
    const response = await client.chatCompletion({
      model: settings.model,
      messages,
      max_tokens: Math.min(settings.maxTokens, 2048),
      temperature: 0.3, // Lower temperature for more focused summary
    });

    const summary = response.choices[0]?.message?.content || '';

    if (!summary) {
      console.error(chalk.red('✗ Failed to generate summary'));
      return {};
    }

    // Create new compact session with summary
    const originalMessageCount = session.messages.length;
    
    // Preserve system messages, replace everything else with summary
    const systemMessages = session.messages.filter(m => m.role === 'system');
    const nonSystemCount = session.messages.length - systemMessages.length;
    
    session.messages = [
      ...systemMessages,
      {
        role: 'assistant',
        content: `[Session Summary - Original: ${nonSystemCount} messages]\n\n${summary}`,
      }
    ];

    session.updatedAt = new Date().toISOString();

    const finalCount = session.messages.length;
    console.log(chalk.green(`✓ Session compacted: ${originalMessageCount} messages → ${finalCount} message${finalCount > 1 ? 's' : ''}`));
    if (systemMessages.length > 0) {
      console.log(chalk.gray(`  Preserved ${systemMessages.length} system message${systemMessages.length > 1 ? 's' : ''}`));
    }
    console.log(chalk.gray(`  Summary length: ${summary.length} characters`));
    console.log();

    // Send notification message to the model
    await sendCompactNotification(session, settings, client, configManager);

    // Auto-save the compacted session
    await storage.saveSession(session);

    return { session };
  } catch (error) {
    console.error(chalk.red('✗ Error compacting session:'), error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

async function handleReset(
  session: Session,
  settings: InteractiveOptions,
  client?: DockerAIClient,
  configManager?: ConfigManager
): Promise<SlashCommandResult> {
  // Check if there's any history to save
  if (session.messages.length > 0) {
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
        const storage = new Storage();
        await storage.init();
        
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

  // Clear the screen
  console.clear();
  
  // Clear session
  session.messages = [];
  session.metadata.tokenCount = 0;
  session.metadata.toolCalls = 0;
  session.metadata.lastRequestStats = undefined;
  
  console.log(chalk.green('✓ Cleared chat history'));
  
  // Auto-save the reset session
  const storage = new Storage();
  await storage.init();
  await storage.saveSession(session);
  
  return { session };
}

async function sendCompactNotification(
  session: Session,
  settings: InteractiveOptions,
  client: DockerAIClient,
  configManager: ConfigManager
): Promise<void> {
  const storage = new Storage();
  await storage.init();
  
  // Add notification message silently (user doesn't see this message)
  const userMessage: Message = {
    role: 'user',
    content: 'I have just summarized our conversation in an attempt to free up some of your context window.',
  };
  session.messages.push(userMessage);

  // Load agent and profile for system prompt
  const currentAgentName = await configManager.getCurrentAgent();
  const currentProfileName = await configManager.getCurrentProfile();
  
  const agent = currentAgentName ? await storage.loadAgent(currentAgentName) : null;
  const profile = await storage.loadProfile(currentProfileName);

  // Build system prompt with agent and user attributes
  const baseSystemPrompt = agent?.systemPrompt || 'You are a helpful AI assistant.';
  const systemPrompt = buildSystemPrompt(baseSystemPrompt, agent, profile);

  // Prepare messages with system prompt first
  const messages = [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
    ...session.messages.map(m => ({
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
    }))
  ];

  const { abortController, cleanup, isAborted } = setupStdinAbort();

  try {
    let assistantMessage = '';
    let lastMetrics: { usage?: any; timings?: any } | undefined;

    const streamHandler = new StreamHandler({
      onToken: (token: string) => {
        process.stdout.write(chalk.green(token));
        assistantMessage += token;
      },
      onDone: () => {
        process.stdout.write('\n');
      },
      onMetrics: (metrics: { usage?: any; timings?: any }) => {
        lastMetrics = metrics;
      },
    });

    const stream = client.chatCompletionStream({
      model: settings.model,
      messages,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      top_p: settings.topP,
      top_k: settings.topN,
      stream: true,
    }, abortController.signal);

    for await (const chunk of stream) {
      streamHandler.handleChunk(chunk);
    }

    // Only save if not aborted
    if (!isAborted() && assistantMessage) {
      // Add assistant message to session
      const message: Message = {
        role: 'assistant',
        content: assistantMessage,
      };

      session.messages.push(message);
      session.updatedAt = new Date().toISOString();

      // Store performance metrics
      if (lastMetrics?.timings || lastMetrics?.usage) {
        const promptTokens = lastMetrics.usage?.prompt_tokens || lastMetrics.timings?.prompt_n || 0;
        const completionTokens = lastMetrics.usage?.completion_tokens || lastMetrics.timings?.predicted_n || 0;
        const totalTokens = lastMetrics.usage?.total_tokens || (promptTokens + completionTokens);

        session.metadata.lastRequestStats = {
          promptTokens,
          completionTokens,
          totalTokens,
          contextWindowSize: settings.ctxSize,
          timings: lastMetrics.timings,
        };
      }
    }

  } catch (error) {
    if (!isAborted()) {
      console.error(chalk.red('\n✗ Error sending compact notification:'), error instanceof Error ? error.message : 'Unknown error');
    }
  } finally {
    cleanup();
  }
}

function handleCtxSize(settings: InteractiveOptions, value?: string): SlashCommandResult {
  if (!value) {
    console.log(`Current context size: ${settings.ctxSize}`);
    return {};
  }

  const size = parseInt(value);
  if (isNaN(size) || size <= 0) {
    console.error(chalk.red('Invalid context size'));
    return {};
  }

  console.log(chalk.green(`✓ Context size set to ${size}`));
  console.log(chalk.yellow('⚠ Model will be reconfigured...'));
  return { settings: { ...settings, ctxSize: size }, modelReloadRequired: true };
}

function handleMaxSize(settings: InteractiveOptions, value?: string): SlashCommandResult {
  if (!value) {
    console.log(`Current max tokens: ${settings.maxTokens}`);
    return {};
  }

  const size = parseInt(value);
  if (isNaN(size) || size <= 0) {
    console.error(chalk.red('Invalid max tokens'));
    return {};
  }

  console.log(chalk.green(`✓ Max tokens set to ${size}`));
  return { settings: { ...settings, maxTokens: size } };
}

function handleTemperature(settings: InteractiveOptions, value?: string): SlashCommandResult {
  if (!value) {
    console.log(`Current temperature: ${settings.temperature}`);
    return {};
  }

  const temp = parseFloat(value);
  if (isNaN(temp) || temp < 0 || temp > 2) {
    console.error(chalk.red('Invalid temperature (must be 0-2)'));
    return {};
  }

  console.log(chalk.green(`✓ Temperature set to ${temp}`));
  console.log(chalk.yellow('⚠ Model will be reconfigured...'));
  return { settings: { ...settings, temperature: temp }, modelReloadRequired: true };
}

function handleTopP(settings: InteractiveOptions, value?: string): SlashCommandResult {
  if (!value) {
    console.log(`Current top_p: ${settings.topP}`);
    return {};
  }

  const topP = parseFloat(value);
  if (isNaN(topP) || topP < 0 || topP > 1) {
    console.error(chalk.red('Invalid top_p (must be 0-1)'));
    return {};
  }

  console.log(chalk.green(`✓ Top_p set to ${topP}`));
  console.log(chalk.yellow('⚠ Model will be reconfigured...'));
  return { settings: { ...settings, topP }, modelReloadRequired: true };
}

function handleTopN(settings: InteractiveOptions, value?: string): SlashCommandResult {
  if (!value) {
    console.log(`Current top_n: ${settings.topN}`);
    return {};
  }

  const topN = parseInt(value);
  if (isNaN(topN) || topN <= 0) {
    console.error(chalk.red('Invalid top_n'));
    return {};
  }

  console.log(chalk.green(`✓ Top_n set to ${topN}`));
  console.log(chalk.yellow('⚠ Model will be reconfigured...'));
  return { settings: { ...settings, topN }, modelReloadRequired: true };
}

function handleDebug(settings: InteractiveOptions, value?: string): SlashCommandResult {
  if (!value) {
    console.log(`Debug mode: ${settings.debug ? 'enabled' : 'disabled'}`);
    return {};
  }

  const enabled = value.toLowerCase() === 'true' || value === '1';
  console.log(chalk.green(`✓ Debug mode ${enabled ? 'enabled' : 'disabled'}`));
  return { settings: { ...settings, debug: enabled } };
}

function handleInfo(settings: InteractiveOptions): SlashCommandResult {
  console.log(chalk.bold('\n⚙️  Current Agent Settings\n'));
  
  console.log(chalk.bold('Model Configuration:'));
  console.log(`  Model:          ${chalk.cyan(settings.model)}`);
  console.log(`  Context Size:   ${chalk.cyan(settings.ctxSize)}`);
  console.log(`  Max Tokens:     ${chalk.cyan(settings.maxTokens)}`);
  console.log();
  
  console.log(chalk.bold('Sampling Parameters:'));
  console.log(`  Temperature:    ${chalk.cyan(settings.temperature)}`);
  console.log(`  Top P:          ${chalk.cyan(settings.topP)}`);
  console.log(`  Top N:          ${chalk.cyan(settings.topN)}`);
  console.log();
  
  console.log(chalk.bold('Modes:'));
  console.log(`  Debug:          ${settings.debug ? chalk.green('enabled') : chalk.gray('disabled')}`);
  console.log();
  
  return {};
}

async function handleShow(
  settings: InteractiveOptions,
  configManager?: ConfigManager
): Promise<SlashCommandResult> {
  const storage = new Storage();
  await storage.init();

  // Get current agent name
  const currentAgentName = configManager ? await configManager.getCurrentAgent() : null;
  
  if (!currentAgentName) {
    console.log(chalk.yellow('\n⚠ No agent currently loaded'));
    console.log(chalk.gray('Use /agent <name> to load an agent\n'));
    return {};
  }

  // Load the agent configuration
  let agent;
  try {
    agent = await storage.loadAgent(currentAgentName);
  } catch {
    console.error(chalk.red(`\n✗ Failed to load agent: ${currentAgentName}\n`));
    return {};
  }

  // Load the profile
  const currentProfileName = configManager ? await configManager.getCurrentProfile() : 'default';
  const profile = await storage.loadProfile(currentProfileName);

  // Build the complete system prompt
  const fullSystemPrompt = buildSystemPrompt(agent.systemPrompt, agent, profile);

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
  if (agent.attributes && Object.keys(agent.attributes).length > 0) {
    console.log(chalk.bold('🏷️  Agent Attributes:'));
    const attrStr = JSON.stringify(agent.attributes, null, 2);
    attrStr.split('\n').forEach(line => {
      console.log(`  ${chalk.gray(line)}`);
    });
    console.log();
  }

  // Show raw configuration
  console.log(chalk.bold('📄 Raw Configuration (JSON):'));
  console.log(chalk.gray('─'.repeat(70)));
  const configStr = JSON.stringify(agent, null, 2);
  configStr.split('\n').forEach(line => {
    console.log(chalk.gray(line));
  });
  console.log(chalk.gray('─'.repeat(70)));
  console.log();

  // Show the dynamically generated system prompt
  console.log(chalk.bold('🧠 Dynamically Generated System Prompt:'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(chalk.yellow('(This is the actual prompt being sent to the model)'));
  console.log(chalk.gray('─'.repeat(70)));
  
  // Display the system prompt
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

function handleStatus(session: Session, settings: InteractiveOptions): SlashCommandResult {
  const stats = session.metadata.lastRequestStats;

  if (!stats) {
    console.log(chalk.yellow('⚠ No performance data available yet.'));
    console.log(chalk.gray('  Make at least one request to see stats.'));
    return {};
  }

  // Display performance metrics (timings)
  if (stats.timings) {
    console.log(chalk.bold('\nPerformance Metrics:'));
    
    if (stats.timings.predicted_per_second !== undefined) {
      console.log(`  Generation Speed: ${chalk.cyan(stats.timings.predicted_per_second.toFixed(2))} tokens/sec`);
    }
    
    if (stats.timings.prompt_per_second !== undefined) {
      console.log(`  Prompt Processing: ${chalk.cyan(stats.timings.prompt_per_second.toFixed(2))} tokens/sec`);
    }
    
    if (stats.timings.predicted_ms !== undefined) {
      console.log(`  Generation Time: ${chalk.cyan((stats.timings.predicted_ms / 1000).toFixed(2))}s`);
    }
    
    if (stats.timings.prompt_ms !== undefined) {
      console.log(`  Prompt Time: ${chalk.cyan((stats.timings.prompt_ms / 1000).toFixed(2))}s`);
    }
    
    console.log();
  }

  // Display token breakdown
  console.log(chalk.bold('Token Usage:'));
  console.log(`  Prompt Tokens: ${chalk.cyan(stats.promptTokens)}`);
  if (stats.timings?.cache_n !== undefined) {
    console.log(`  Cached Tokens: ${chalk.cyan(stats.timings.cache_n)}`);
  }
  console.log(`  Completion Tokens: ${chalk.cyan(stats.completionTokens)}`);
  console.log(`  Total Tokens: ${chalk.cyan(stats.totalTokens)}\n`);

  // Calculate context usage percentage
  const usagePercent = (stats.totalTokens / stats.contextWindowSize) * 100;

  // Display context window usage
  console.log(`(used ${chalk.cyan(stats.totalTokens)} of ${chalk.cyan(stats.contextWindowSize)} context window)`);
  
  // Check if context window is exceeded
  if (stats.totalTokens > stats.contextWindowSize) {
    const overage = stats.totalTokens - stats.contextWindowSize;
    console.log(chalk.red(`\n⚠️  Context window exceeded by ${overage} tokens!\n`));
    console.log(chalk.yellow('You have exceeded the context window size. Here are your options:\n'));
    
    // Suggest new context size (add 50% buffer for future messages)
    const suggestedSize = Math.ceil(stats.totalTokens * 1.5);
    console.log(chalk.bold('Option 1: Increase context window size'));
    console.log(chalk.gray(`  /ctx-size ${suggestedSize}`));
    console.log(chalk.gray(`  This will allow ${suggestedSize - stats.totalTokens} more tokens for future messages.\n`));
    
    console.log(chalk.bold('Option 2: Compact conversation history'));
    console.log(chalk.gray('  /compact'));
    console.log(chalk.gray('  This will summarize the conversation to reduce token usage.\n'));
    
    return {};
  }
  
  // Create progress bar
  const terminalWidth = process.stdout.columns || 80;
  const barWidth = Math.min(60, terminalWidth - 10); // Reserve space for padding
  const filledWidth = Math.round((usagePercent / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  // Choose color based on percentage
  let barColor: typeof chalk.yellow;
  if (usagePercent <= 50) {
    barColor = chalk.yellow;
  } else if (usagePercent <= 75) {
    barColor = chalk.hex('#FFA500'); // Orange
  } else {
    barColor = chalk.red;
  }

  // Build progress bar
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  const progressBar = barColor(filled) + chalk.gray(empty);
  
  console.log(progressBar);
  console.log(chalk.gray(`${usagePercent.toFixed(1)}% of context window used\n`));

  return {};
}

async function handleHistory(session: Session, args: string[]): Promise<SlashCommandResult> {
  const subcommand = args[0];
  
  if (!subcommand) {
    console.error(chalk.red('Subcommand required'));
    console.log('Usage: /history pop [count]');
    return {};
  }
  
  if (subcommand === 'pop') {
    return await handleHistoryPop(session, args[1]);
  } else {
    console.error(chalk.red(`Unknown history subcommand: ${subcommand}`));
    console.log('Usage: /history pop [count]');
    return {};
  }
}

async function handleHistoryPop(session: Session, countArg?: string): Promise<SlashCommandResult> {
  if (session.messages.length === 0) {
    console.log(chalk.yellow('⚠ Session has no messages to pop'));
    return {};
  }
  
  // Determine how many messages to remove
  let count = 1;
  if (countArg) {
    count = parseInt(countArg);
    if (isNaN(count) || count <= 0) {
      console.error(chalk.red('Invalid count'));
      return {};
    }
  }
  
  // If count is 1 and last message is from assistant, remove 2 (user + assistant pair)
  if (count === 1 && session.messages[session.messages.length - 1].role === 'assistant') {
    count = 2;
  }
  
  // Ensure we don't try to remove more messages than exist
  count = Math.min(count, session.messages.length);
  
  // Remove and collect the messages
  const removedMessages: Message[] = [];
  for (let i = 0; i < count; i++) {
    const msg = session.messages.pop();
    if (msg) {
      removedMessages.unshift(msg); // Add to front to maintain order
    }
  }
  
  // Display removed messages
  console.log(chalk.bold(`\n💬 Removed ${removedMessages.length} message(s)\n`));
  
  for (const message of removedMessages) {
    const roleColor = message.role === 'user' ? chalk.blue : 
                     message.role === 'assistant' ? chalk.green : 
                     chalk.gray;
    
    console.log(roleColor(`[${message.role}]`));
    console.log(message.content);
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(chalk.gray(`  Tool calls: ${message.tool_calls.length}`));
      for (const toolCall of message.tool_calls) {
        console.log(chalk.gray(`    - ${toolCall.function.name}`));
      }
    }
    console.log();
  }
  
  // Update session metadata
  session.updatedAt = new Date().toISOString();
  
  console.log(chalk.green(`✓ ${session.messages.length} message(s) remaining\n`));
  
  // Auto-save the session after popping
  const storage = new Storage();
  await storage.init();
  await storage.saveSession(session);
  
  return { session };
}

async function handleAgentSwitch(agentName?: string): Promise<SlashCommandResult> {
  if (!agentName) {
    // Show available agents
    const storage = new Storage();
    await storage.init();
    
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
  const storage = new Storage();
  await storage.init();
  
  try {
    await storage.loadAgent(agentName);
    console.log(chalk.green(`\n✓ Switching to agent: ${agentName}`));
    console.log(chalk.gray('Loading agent session...\n'));
    return { switchToAgent: agentName }; // No exit - we handle switch in-place
  } catch {
    console.error(chalk.red(`\n✗ Agent not found: ${agentName}`));
    console.log(chalk.gray('Use /agent to see available agents\n'));
    return {};
  }
}

function handleMeetingSwitch(args: string[]): SlashCommandResult {
  if (!args || args.length === 0) {
    console.error(chalk.red('\nRoom name is required'));
    console.log(chalk.gray('Usage: /meeting <room-name> [<agent1> <agent2> ...]'));
    console.log(chalk.gray('\nExamples:'));
    console.log(chalk.gray('  /meeting executive-team ceo cto cfo  # Create new room'));
    console.log(chalk.gray('  /meeting executive-team              # Resume existing room\n'));
    return {};
  }

  const roomName = args[0];
  const agentNames = args.slice(1);
  
  if (agentNames.length > 0) {
    console.log(chalk.green(`\n✓ Joining room: ${roomName} with agents: ${agentNames.join(', ')}`));
  } else {
    console.log(chalk.green(`\n✓ Joining room: ${roomName}`));
  }
  console.log(chalk.gray('Initializing room...\n'));
  return { switchToMeeting: args }; // Pass all args (room name + agents)
}

