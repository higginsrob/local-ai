// Slash command handlers
import chalk from 'chalk';
import type { Session, Message } from '../types/session.ts';
import type { SlashCommandResult, InteractiveOptions } from '../types/cli.ts';
import { Storage } from './storage.ts';
import type { DockerAIClient } from './docker-ai.ts';
import type { ConfigManager } from './config.ts';

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
    case 'help':
      displayHelp();
      return {};

    case 'clear':
      console.clear();
      return {};

    case 'save':
      return await handleSave(session, args[0]);

    case 'load':
      return await handleLoad(args[0]);

    case 'compact':
      return await handleCompact(session, settings, client, configManager);

    case 'reset':
      return await handleReset(session);

    case 'ctx-size':
      return handleCtxSize(settings, args[0]);

    case 'max-size':
      return handleMaxSize(settings, args[0]);

    case 'temperature':
      return handleTemperature(settings, args[0]);

    case 'top_p':
      return handleTopP(settings, args[0]);

    case 'top_n':
      return handleTopN(settings, args[0]);

    case 'thinking':
      return handleThinking(settings, args[0]);

    case 'debug':
      return handleDebug(settings, args[0]);

    case 'quit':
    case 'q':
    case 'exit':
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
  console.log('  /help             - Show this help');
  console.log('  /clear            - Clear terminal screen');
  console.log('  /save [name]      - Save current session');
  console.log('  /load <name>      - Load a session');
  console.log('  /compact          - Summarize and compact session');
  console.log('  /reset            - Reset chat history');
  console.log('  /ctx-size <size>  - Set context window size');
  console.log('  /max-size <size>  - Set max response size');
  console.log('  /temperature <t>  - Set temperature');
  console.log('  /top_p <p>        - Set top_p');
  console.log('  /top_n <n>        - Set top_n');
  console.log('  /thinking <bool>  - Enable/disable thinking');
  console.log('  /debug <bool>     - Enable/disable debug');
  console.log('  /quit, /q, /exit, /e, /x - Exit interactive mode');
  console.log('  Ctrl+C            - Exit and save session');
  console.log();
}

async function handleSave(session: Session, name?: string): Promise<SlashCommandResult> {
  const storage = new Storage();
  await storage.init();
  
  if (name) {
    session.id = name;
  }
  
  await storage.saveSession(session);
  console.log(chalk.green(`✓ Saved session: ${session.id}`));
  return {};
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

  try {
    const storage = new Storage();
    await storage.init();

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

    return { session };
  } catch (error) {
    console.error(chalk.red('✗ Error compacting session:'), error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

async function handleReset(session: Session): Promise<SlashCommandResult> {
  session.messages = [];
  session.metadata.tokenCount = 0;
  session.metadata.toolCalls = 0;
  console.log(chalk.green('✓ Reset chat history'));
  return {};
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
  return { settings: { ...settings, ctxSize: size } };
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
  return { settings: { ...settings, temperature: temp } };
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
  return { settings: { ...settings, topP } };
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
  return { settings: { ...settings, topN } };
}

function handleThinking(settings: InteractiveOptions, value?: string): SlashCommandResult {
  if (!value) {
    console.log(`Thinking mode: ${settings.thinking ? 'enabled' : 'disabled'}`);
    return {};
  }

  const enabled = value.toLowerCase() === 'true' || value === '1';
  console.log(chalk.green(`✓ Thinking mode ${enabled ? 'enabled' : 'disabled'}`));
  return { settings: { ...settings, thinking: enabled } };
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

