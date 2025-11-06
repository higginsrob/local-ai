// ai run command
import chalk from 'chalk';
import prompts from 'prompts';
import { Storage } from '../lib/storage.ts';
import { ConfigManager } from '../lib/config.ts';
import { DockerAIClient } from '../lib/docker-ai.ts';
import { StreamHandler } from '../lib/stream-handler.ts';
import { startInteractive } from '../lib/interactive.ts';
import { buildSystemPrompt } from '../lib/prompt-builder.ts';
import type { RunOptions, InteractiveOptions } from '../types/cli.ts';
import type { Session, Message } from '../types/session.ts';

export async function runCommand(
  agentName?: string,
  promptParts: string[] = [],
  options: RunOptions = {}
): Promise<void> {
  // Initialize storage
  const storage = new Storage();
  await storage.init();
  const configManager = new ConfigManager(storage);

  let model: string;
  let agent: any = null;

  // If no argument specified, show interactive agent selector
  if (!agentName) {
    const agents = await storage.listAgents();
    
    if (agents.length === 0) {
      console.error(chalk.red('No agents configured'));
      console.log('\nCreate an agent with: ai agent new <name>');
      process.exit(1);
    }

    // Load agent details for the selection menu
    const agentChoices = [];
    for (const name of agents) {
      try {
        const agentData = await storage.loadAgent(name);
        agentChoices.push({
          title: `${name} (${agentData.model})`,
          value: name,
          description: agentData.systemPrompt.slice(0, 80) + (agentData.systemPrompt.length > 80 ? '...' : ''),
        });
      } catch {
        // Skip invalid agents
        continue;
      }
    }

    if (agentChoices.length === 0) {
      console.error(chalk.red('No valid agents found'));
      console.log('\nCreate an agent with: ai agent new <name>');
      process.exit(1);
    }

    // Show interactive selection menu
    const response = await prompts({
      type: 'select',
      name: 'agent',
      message: 'Select an agent:',
      choices: agentChoices,
      initial: 0,
    });

    if (!response.agent) {
      console.log(chalk.yellow('\nCancelled'));
      process.exit(0);
    }

    agentName = response.agent;
  }

  // At this point, agentName should always be defined
  if (!agentName) {
    console.error(chalk.red('No agent specified'));
    process.exit(1);
  }

  // Load the agent
  try {
    agent = await storage.loadAgent(agentName);
    model = agent.model;
    // Set this agent as current
    await configManager.setCurrentAgent(agentName);
    console.log(chalk.gray(`Using agent: ${agentName} (${model})`));
  } catch (error) {
    console.error(chalk.red(`Agent '${agentName}' not found`));
    console.log('\nCreate an agent with: ai agent new <name>');
    console.log('List agents with: ai agent ls');
    process.exit(1);
  }

  // Parse options - use agent config as defaults if available
  const interactiveOptions: InteractiveOptions = {
    model,
    ctxSize: parseInt(options.ctxSize ?? agent?.modelParams?.ctxSize?.toString() ?? '4096'),
    maxTokens: parseInt(options.maxTokens ?? agent?.modelParams?.maxTokens?.toString() ?? '2048'),
    temperature: parseFloat(options.temperature ?? agent?.modelParams?.temperature?.toString() ?? '0.7'),
    topP: parseFloat(options.topP ?? agent?.modelParams?.topP?.toString() ?? '0.9'),
    topN: parseInt(options.topN ?? agent?.modelParams?.topN?.toString() ?? '40'),
    debug: options.debug || false,
  };

  // Load or create session for this agent
  const currentProfileName = await configManager.getCurrentProfile();
  let session: Session;

  // Session ID is now deterministic based on agent name
  const sessionId = `session-${agentName}`;
  
  try {
    session = await storage.loadSession(sessionId);
    const messageCount = session.messages.length;
    if (messageCount > 0) {
      console.log(chalk.gray(`Continuing session with ${messageCount} message(s)`));
    }
    if (interactiveOptions.debug) {
      console.log(chalk.gray(`Session ID: ${sessionId}`));
    }
  } catch {
    // Session doesn't exist, create new one for this agent
    session = createAgentSession(agentName, currentProfileName);
    if (interactiveOptions.debug) {
      console.log(chalk.gray(`Created new session: ${sessionId}`));
    }
  }

  // If prompt provided, run single execution
  if (promptParts.length > 0) {
    const prompt = promptParts.join(' ');
    await runSinglePrompt(prompt, session, interactiveOptions, storage);
  } else {
    // Run interactive mode
    await startInteractive(model, interactiveOptions, session);
  }
}

function createAgentSession(agentName: string, profileName: string): Session {
  return {
    id: `session-${agentName}`,
    agentName,
    profileName,
    messages: [],
    metadata: {
      tokenCount: 0,
      toolCalls: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function runSinglePrompt(
  prompt: string,
  session: Session,
  options: InteractiveOptions,
  storage: Storage
): Promise<void> {
  const storage2 = new Storage();
  await storage2.init();
  const configManager2 = new ConfigManager(storage2);
  const endpoint = await configManager2.getLlamaCppEndpoint();
  
  const client = new DockerAIClient(endpoint);

  // Load agent and profile for system prompt
  const currentAgentName = await configManager2.getCurrentAgent();
  const currentProfileName = await configManager2.getCurrentProfile();
  
  const agent = currentAgentName ? await storage2.loadAgent(currentAgentName) : null;
  const profile = await storage2.loadProfile(currentProfileName);

  // Add user message
  const userMessage: Message = {
    role: 'user',
    content: prompt,
  };
  session.messages.push(userMessage);

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

  if (options.debug) {
    console.log(chalk.gray(`Model: ${options.model}`));
    console.log(chalk.gray(`Endpoint: ${endpoint}`));
    console.log(chalk.gray(''));
  }

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
      model: options.model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      top_k: options.topN,
      stream: true,
    });

    for await (const chunk of stream) {
      streamHandler.handleChunk(chunk);
    }

    // Add assistant message
    const message: Message = {
      role: 'assistant',
      content: assistantMessage,
    };

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // Save session
    await storage.saveSession(session);

    if (options.debug) {
      console.log(chalk.gray(`\nSession saved: ${session.id}`));
    }

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : 'Unknown error');
    
    if (options.debug && error instanceof Error) {
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

