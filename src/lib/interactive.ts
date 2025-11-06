// Interactive prompt loop
import prompts from 'prompts';
import chalk from 'chalk';
import type { Session, Message } from '../types/session.ts';
import type { InteractiveOptions } from '../types/cli.ts';
import { Storage } from './storage.ts';
import { ConfigManager } from './config.ts';
import { DockerAIClient } from './docker-ai.ts';
import { StreamHandler } from './stream-handler.ts';
import { handleSlashCommand } from './slash-commands.ts';
import { buildSystemPrompt } from './prompt-builder.ts';
import { DockerModelManager } from './docker-model-manager.ts';

// Override prompts rendering to show only '›' in cyan
// We need to patch the internal style module
try {
  const promptsStyle = require('prompts/lib/util/style');
  promptsStyle.symbol = () => ''; // Remove the '?' symbol
  // promptsStyle.delimiter = '›'; // Set delimiter to cyan '›'
} catch {
  // Fallback if internal structure changes
}

export async function startInteractive(
  model: string,
  options: InteractiveOptions,
  session: Session
): Promise<void> {
  if (options.debug) {
    console.log(chalk.bold(JSON.stringify(options, null, 2)));
  }
  console.log(chalk.gray('Type /help for commands, /quit to exit, or press Ctrl+C'));

  const storage = new Storage();
  await storage.init();
  
  const configManager = new ConfigManager(storage);
  const endpoint = await configManager.getLlamaCppEndpoint();

  const client = new DockerAIClient(endpoint);
  const modelManager = new DockerModelManager(storage);

  let settings = { ...options };
  let currentSession = session;
  let shouldExit = false;

  // Check if agent is already locked by another terminal
  if (!session.agentName) {
    console.error(chalk.red('Session must have an agent name'));
    process.exit(1);
  }

  const isLocked = await storage.isAgentLocked(session.agentName);
  if (isLocked) {
    // Agent is busy in another terminal - return error
    console.log(chalk.red(`\n⚠️  ${session.agentName} is currently busy helping another user.`));
    console.log(chalk.yellow('Please try again in a few moments.\n'));
    process.exit(1);
  }

  // Lock the agent (not the session)
  await storage.lockAgent(session.agentName);

  // Load model with initial parameters
  try {
    await modelManager.loadModel(model, {
      ctxSize: settings.ctxSize,
      temperature: settings.temperature,
      topP: settings.topP,
      topK: settings.topN,
    });
  } catch (error) {
    console.error(chalk.red('Failed to load model. Continuing anyway...'));
  }

  // Handle Ctrl+C gracefully
  const handleSigInt = async () => {
    if (!shouldExit) {
      shouldExit = true;
      console.log(chalk.yellow('\n\n⚠ Interrupted.'));
      if (currentSession.agentName) {
        await storage.unlockAgent(currentSession.agentName);
      }
      await modelManager.unloadModel(model);
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
        
        // Handle agent switching BEFORE checking exit
        // (because agent switching stays in the same loop)
        if (result.switchToAgent) {
          // Unlock current agent
          if (currentSession.agentName) {
            await storage.unlockAgent(currentSession.agentName);
          }
          
          // Unload current model
          await modelManager.unloadModel(model);
          
          // Load new agent
          try {
            const newAgent = await storage.loadAgent(result.switchToAgent);
            const newModel = newAgent.model;
            
            // Check if new agent is already locked
            const isLocked = await storage.isAgentLocked(result.switchToAgent);
            if (isLocked) {
              console.log(chalk.red(`\n⚠️  ${result.switchToAgent} is currently busy in another session.`));
              console.log(chalk.yellow('Returning to previous agent...\n'));
              
              // Re-lock and reload previous agent (if we had one)
              if (currentSession.agentName) {
                await storage.lockAgent(currentSession.agentName);
                await modelManager.loadModel(model, {
                  ctxSize: settings.ctxSize,
                  temperature: settings.temperature,
                  topP: settings.topP,
                  topK: settings.topN,
                });
              }
              continue;
            }
            
            // Lock new agent
            await storage.lockAgent(result.switchToAgent);
            
            // Update current agent setting
            await configManager.setCurrentAgent(result.switchToAgent);
            console.log(chalk.gray(`\nSwitched to agent: ${result.switchToAgent} (${newModel})`));
            
            // Load or create session for new agent
            const sessionId = `session-${result.switchToAgent}`;
            try {
              currentSession = await storage.loadSession(sessionId);
              const messageCount = currentSession.messages.length;
              if (messageCount > 0) {
                console.log(chalk.gray(`Continuing session with ${messageCount} message(s)`));
              }
            } catch {
              // Create new session
              const currentProfileName = await configManager.getCurrentProfile();
              currentSession = {
                id: sessionId,
                agentName: result.switchToAgent,
                profileName: currentProfileName,
                messages: [],
                metadata: {
                  tokenCount: 0,
                  toolCalls: 0,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }
            
            // Update settings with new agent's model parameters
            model = newModel;
            settings = {
              ...settings,
              model: newModel,
              ctxSize: newAgent.modelParams?.ctxSize || settings.ctxSize,
              maxTokens: newAgent.modelParams?.maxTokens || settings.maxTokens,
              temperature: newAgent.modelParams?.temperature || settings.temperature,
              topP: newAgent.modelParams?.topP || settings.topP,
              topN: newAgent.modelParams?.topN || settings.topN,
            };
            
            // Load new model
            await modelManager.loadModel(model, {
              ctxSize: settings.ctxSize,
              temperature: settings.temperature,
              topP: settings.topP,
              topK: settings.topN,
            });
            
            console.log(chalk.gray('Type /help for commands, /quit to exit, or press Ctrl+C\n'));
            
          } catch (error) {
            console.error(chalk.red(`\n✗ Failed to switch to agent: ${result.switchToAgent}`));
            console.log(chalk.yellow('Returning to previous agent...\n'));
            
            // Re-lock and reload previous agent (if we had one)
            if (currentSession.agentName) {
              await storage.lockAgent(currentSession.agentName);
              await modelManager.loadModel(model, {
                ctxSize: settings.ctxSize,
                temperature: settings.temperature,
                topP: settings.topP,
                topK: settings.topN,
              });
            }
          }
          
          continue;
        }
        
        // Handle meeting switching
        if (result.switchToMeeting) {
          // Unlock current agent and unload model
          if (currentSession.agentName) {
            await storage.unlockAgent(currentSession.agentName);
          }
          await modelManager.unloadModel(model);
          process.off('SIGINT', handleSigInt);
          
          // Start meeting - this will take over completely
          const { meetingCommand } = await import('../commands/meeting.js');
          await meetingCommand('start', result.switchToMeeting);
          
          // Meeting ended, exit the program
          process.exit(0);
        }
        
        // Check other result flags (after handling switches)
        if (result.exit) {
          break;
        }
        
        if (result.settings) {
          settings = { ...settings, ...result.settings };
        }
        
        if (result.session) {
          currentSession = result.session;
        }
        
        // Reconfigure model if parameters changed
        if (result.modelReloadRequired) {
          try {
            await modelManager.reconfigureModel(model, {
              ctxSize: settings.ctxSize,
              temperature: settings.temperature,
              topP: settings.topP,
              topK: settings.topN,
            });
          } catch (error) {
            console.error(chalk.red('Failed to reconfigure model. Continuing with current settings...'));
          }
        }
        
        continue;
      }

      // Handle regular user input
      await handleUserMessage(input, currentSession, settings, client, storage, configManager);
    }

    // Normal exit - unlock agent (skip if we already cleaned up for a switch)
    if (!shouldExit && currentSession.agentName) {
      await storage.unlockAgent(currentSession.agentName);
      await modelManager.unloadModel(model);
      console.log(chalk.gray('Goodbye!\n'));
    }
  } finally {
    // Clean up signal handler and unlock agent (skip unlock if already done)
    if (currentSession.agentName) {
      try {
        await storage.unlockAgent(currentSession.agentName);
      } catch {
        // Already unlocked, ignore
      }
    }
    try {
      process.off('SIGINT', handleSigInt);
    } catch {
      // Handler already removed, ignore
    }
  }
}

async function handleUserMessage(
  input: string,
  session: Session,
  settings: InteractiveOptions,
  client: DockerAIClient,
  storage: Storage,
  configManager: ConfigManager
): Promise<void> {
  // Add user message to session
  const userMessage: Message = {
    role: 'user',
    content: input,
  };
  session.messages.push(userMessage);

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

  // Create abort controller for Ctrl+D handling
  const abortController = new AbortController();
  let aborted = false;

  // Disable stdin and set up Ctrl+D handler
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

  try {
    // Stream response
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

    // Only save message if not aborted
    if (!aborted && assistantMessage) {
      // Add assistant message to session
      const message: Message = {
        role: 'assistant',
        content: assistantMessage,
      };

      session.messages.push(message);
      session.updatedAt = new Date().toISOString();

      // Store performance metrics
      if (lastMetrics?.timings || lastMetrics?.usage) {
        // Calculate token counts from timings if usage isn't available (streaming mode)
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

      // Auto-save session after every response
      await storage.saveSession(session);
    }

  } catch (error) {
    // Don't show error if user aborted
    if (aborted) {
      // Remove the user message since we're aborting
      session.messages.pop();
      return;
    }

    let errorMsg = 'Unknown error';
    if (error instanceof Error) {
      errorMsg = error.message;
    }
    // Show full error details if available (axios errors)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.data) {
        let errorData = axiosError.response.data;
        
        // Handle IncomingMessage with buffer inside _readableState
        if (errorData._readableState?.buffer && errorData._readableState.buffer.length > 0) {
          const buffers = errorData._readableState.buffer;
          errorData = Buffer.concat(buffers).toString('utf-8');
        } else if (Buffer.isBuffer(errorData)) {
          errorData = errorData.toString('utf-8');
        }
        
        if (typeof errorData === 'string') {
          try {
            errorData = JSON.parse(errorData);
            
            // Special handling for context size errors
            if (errorData.error?.type === 'exceed_context_size_error') {
              const nPromptTokens = errorData.error.n_prompt_tokens;
              const nCtx = errorData.error.n_ctx;
              const recommendedSize = Math.ceil((nPromptTokens + 500) / 100) * 100; // Round up to nearest 100, add buffer
              
              console.error(chalk.red('\n⚠️  Context Window Exceeded!\n'));
              console.log(`Your request needs ${chalk.cyan(nPromptTokens)} tokens, but your context window is only ${chalk.cyan(nCtx)} tokens.`);
              console.log(chalk.yellow('\nOptions to fix this:\n'));
              console.log(chalk.bold('1. Increase context window size:'));
              console.log(chalk.cyan(`   /ctx-size ${recommendedSize}`));
              console.log(`   (This will give you ~${recommendedSize - nPromptTokens} tokens for the response)\n`);
              console.log(chalk.bold('2. Compact your conversation history:'));
              console.log(chalk.cyan('   /compact'));
              console.log('   (This will summarize past messages to reduce token usage)\n');
            } else {
              // Other errors - show full JSON
              console.error(chalk.red('\n✗ Error:'), JSON.stringify(errorData, null, 2));
            }
          } catch {
            // Not valid JSON, just display as string
            console.error(chalk.red('\n✗ Error:'), errorData);
          }
        } else {
          // Object but not string or buffer - just show status
          console.error(chalk.red('\n✗ Error:'), `HTTP ${axiosError.response?.status || '?'}: ${errorMsg}`);
        }
        return;
      }
    }
    console.error(chalk.red('\n✗ Error:'), errorMsg);
  } finally {
    // Always clean up stdin listener and restore state
    process.stdin.off('data', onData);
    process.stdin.pause();
    if (wasRaw !== undefined) {
      process.stdin.setRawMode(wasRaw);
    }
  }
}


