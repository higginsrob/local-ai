// Interactive prompt loop
import prompts from 'prompts';
import chalk from 'chalk';
import type { Session, Message } from '../types/session.ts';
import type { InteractiveOptions } from '../types/cli.ts';
import { Storage } from './storage.ts';
import { ConfigManager } from './config.ts';
import { DockerAIClient } from './docker-ai.ts';
import { MCPManager } from './mcp-client.ts';
import { ToolManager } from './tool-manager.ts';
import { StreamHandler } from './stream-handler.ts';
import { handleSlashCommand } from './slash-commands.ts';
import { buildSystemPrompt } from './prompt-builder.ts';

export async function startInteractive(
  model: string,
  options: InteractiveOptions,
  session: Session
): Promise<void> {
  console.log(chalk.bold(`\n💬 Interactive mode with ${model}`));
  console.log(chalk.bold(JSON.stringify(options, null, 2)));
  console.log(chalk.gray('Type /help for commands, /quit to exit, or press Ctrl+C\n'));

  const storage = new Storage();
  await storage.init();
  
  const configManager = new ConfigManager(storage);
  const endpoint = await configManager.getLlamaCppEndpoint();

  const client = new DockerAIClient(endpoint);
  const mcpManager = new MCPManager();
  const toolManager = new ToolManager(mcpManager);

  let settings = { ...options };
  let currentSession = session;
  let shouldExit = false;

  // Handle Ctrl+C gracefully
  const handleSigInt = async () => {
    if (!shouldExit) {
      shouldExit = true;
      console.log(chalk.yellow('\n\n⚠ Interrupted. Saving session...'));
      await storage.saveSession(currentSession);
      console.log(chalk.green('✓ Session saved'));
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
        message: chalk.blue('>'),
      }, {
        onCancel: async () => {
          // This fires when user presses Ctrl+C in prompts
          await handleSigInt();
        }
      });

      if (!response.input) {
        // User cancelled (Ctrl+C)
        break;
      }

      const input = response.input.trim();

      // Handle slash commands
      if (input.startsWith('/')) {
        const result = await handleSlashCommand(input, currentSession, settings, client, configManager);
        
        if (result.exit) {
          break;
        }
        
        if (result.settings) {
          settings = { ...settings, ...result.settings };
        }
        
        if (result.session) {
          currentSession = result.session;
        }
        
        continue;
      }

      // Handle regular user input
      await handleUserMessage(input, currentSession, settings, client, toolManager, storage, configManager);
    }

    // Normal exit - save session
    if (!shouldExit) {
      await storage.saveSession(currentSession);
      console.log(chalk.green('\n✓ Session saved'));
      console.log(chalk.gray('Goodbye!\n'));
    }
  } finally {
    // Clean up signal handler
    process.off('SIGINT', handleSigInt);
  }
}

async function handleUserMessage(
  input: string,
  session: Session,
  settings: InteractiveOptions,
  client: DockerAIClient,
  toolManager: ToolManager,
  storage: Storage,
  configManager: ConfigManager
): Promise<void> {
  // Add user message to session
  const userMessage: Message = {
    role: 'user',
    content: input,
  };
  session.messages.push(userMessage);

  // Get available tools
  const tools = await toolManager.getAvailableTools();

  // Load agent and profile for system prompt
  const currentAgentName = await configManager.getCurrentAgent();
  const currentProfileName = await configManager.getCurrentProfile();
  
  const agent = currentAgentName ? await storage.loadAgent(currentAgentName) : null;
  const profile = await configManager.getCurrentProfile();
  const profileData = await storage.loadProfile(profile);

  // Build system prompt with agent and user attributes
  const baseSystemPrompt = agent?.systemPrompt || 'You are a helpful AI assistant.';
  const systemPrompt = buildSystemPrompt(baseSystemPrompt, agent, profileData);

  // Prepare messages for API with system prompt first
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

  try {
    // Stream response
    let assistantMessage = '';
    let toolCalls: any[] = [];

    const streamHandler = new StreamHandler({
      onToken: (token: string) => {
        process.stdout.write(chalk.green(token));
        assistantMessage += token;
      },
      onDone: () => {
        process.stdout.write('\n');
      },
      onToolCalls: (calls: any[]) => {
        toolCalls = calls;
      },
    });

    const stream = client.chatCompletionStream({
      model: settings.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: settings.toolChoice as any,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      top_p: settings.topP,
      top_k: settings.topN,
      stream: true,
    });

    for await (const chunk of stream) {
      streamHandler.handleChunk(chunk);
    }

    // Add assistant message to session
    const message: Message = {
      role: 'assistant',
      content: assistantMessage,
    };

    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // Handle tool calls if any
    if (toolCalls.length > 0) {
      await handleToolCalls(toolCalls, session, settings, client, toolManager, storage, configManager);
    }

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleToolCalls(
  toolCalls: any[],
  session: Session,
  settings: InteractiveOptions,
  client: DockerAIClient,
  toolManager: ToolManager,
  storage: Storage,
  configManager: ConfigManager
): Promise<void> {
  if (settings.debug) {
    console.log(chalk.gray(`\n🔧 Executing ${toolCalls.length} tool call(s)...`));
  }

  // Execute tool calls
  const results = await toolManager.executeToolCalls(toolCalls);

  // Add tool results to session
  for (const result of results) {
    const toolMessage: Message = {
      role: 'tool',
      content: result.content,
      tool_call_id: result.tool_call_id,
    };
    session.messages.push(toolMessage);
  }

  session.metadata.toolCalls += toolCalls.length;

  if (settings.debug) {
    console.log(chalk.gray('✓ Tool calls complete\n'));
  }

  // Continue conversation with tool results
  await continueWithToolResults(session, settings, client, toolManager, storage, configManager);
}

async function continueWithToolResults(
  session: Session,
  settings: InteractiveOptions,
  client: DockerAIClient,
  toolManager: ToolManager,
  storage: Storage,
  configManager: ConfigManager
): Promise<void> {
  const tools = await toolManager.getAvailableTools();
  
  // Load agent and profile for system prompt
  const currentAgentName = await configManager.getCurrentAgent();
  const currentProfileName = await configManager.getCurrentProfile();
  
  const agent = currentAgentName ? await storage.loadAgent(currentAgentName) : null;
  const profileData = await storage.loadProfile(currentProfileName);

  // Build system prompt with agent and user attributes
  const baseSystemPrompt = agent?.systemPrompt || 'You are a helpful AI assistant.';
  const systemPrompt = buildSystemPrompt(baseSystemPrompt, agent, profileData);

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

  try {
    let assistantMessage = '';

    const streamHandler = new StreamHandler({
      onToken: (token: string) => {
        process.stdout.write(chalk.green(token));
        assistantMessage += token;
      },
      onDone: () => {
        process.stdout.write('\n');
      },
    });

    const stream = client.chatCompletionStream({
      model: settings.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      top_p: settings.topP,
      top_k: settings.topN,
      stream: true,
    });

    for await (const chunk of stream) {
      streamHandler.handleChunk(chunk);
    }

    // Add final assistant message
    session.messages.push({
      role: 'assistant',
      content: assistantMessage,
    });
    session.updatedAt = new Date().toISOString();

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : 'Unknown error');
  }
}

