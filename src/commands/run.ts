// ai run command
import chalk from 'chalk';
import { Storage } from '../lib/storage.ts';
import { ConfigManager } from '../lib/config.ts';
import { DockerAIClient } from '../lib/docker-ai.ts';
import { MCPManager } from '../lib/mcp-client.ts';
import { ToolManager } from '../lib/tool-manager.ts';
import { StreamHandler } from '../lib/stream-handler.ts';
import { startInteractive } from '../lib/interactive.ts';
import { buildSystemPrompt } from '../lib/prompt-builder.ts';
import type { RunOptions, InteractiveOptions } from '../types/cli.ts';
import type { Session, Message } from '../types/session.ts';

export async function runCommand(
  agentOrModel?: string,
  promptParts: string[] = [],
  options: RunOptions = {}
): Promise<void> {
  // Initialize storage
  const storage = new Storage();
  await storage.init();
  const configManager = new ConfigManager(storage);

  let model: string;
  let agent: any = null;
  let agentName: string | null = null;

  // If no argument specified, check for current agent
  if (!agentOrModel) {
    const currentAgent = await configManager.getCurrentAgent();
    if (currentAgent) {
      agent = await storage.loadAgent(currentAgent);
      agentName = currentAgent;
      model = agent.model;
      console.log(chalk.gray(`Using agent: ${currentAgent} (${model})`));
    } else {
      console.error(chalk.red('No agent or model specified and no agent selected'));
      console.log('Usage: ai run <agent|model> [prompt...]');
      console.log('   or: ai agent new <name>  # to create an agent');
      process.exit(1);
    }
  } else {
    // Check if argument is an agent name
    try {
      agent = await storage.loadAgent(agentOrModel);
      agentName = agentOrModel;
      model = agent.model;
      // Set this agent as current
      await configManager.setCurrentAgent(agentName);
      console.log(chalk.gray(`Using agent: ${agentName} (${model})`));
    } catch {
      // Not an agent, treat as model name
      model = agentOrModel;
    }
  }

  // Parse options - use agent config as defaults if available
  const interactiveOptions: InteractiveOptions = {
    model,
    ctxSize: parseInt(options.ctxSize || (agent?.modelParams.ctxSize.toString()) || '4096'),
    maxTokens: parseInt(options.maxTokens || (agent?.modelParams.maxTokens.toString()) || '2048'),
    temperature: parseFloat(options.temperature || (agent?.modelParams.temperature.toString()) || '0.7'),
    topP: parseFloat(options.topP || (agent?.modelParams.topP.toString()) || '0.9'),
    topN: parseInt(options.topN || (agent?.modelParams.topN.toString()) || '40'),
    mcpServers: options.mcpServers ? options.mcpServers.split(',') : (agent?.mcpServers || []),
    tools: options.tools ? options.tools.split(',') : (agent?.tools || []),
    toolChoice: options.toolChoice,
    toolCallMode: options.toolCallMode || 'native',
    thinking: options.thinking || false,
    debug: options.debug || false,
  };

  // Create or load session
  const currentProfileName = await configManager.getCurrentProfile();
  let session: Session;

  const currentSessionId = await configManager.getCurrentSession();
  if (currentSessionId) {
    try {
      session = await storage.loadSession(currentSessionId);
      if (interactiveOptions.debug) {
        console.log(chalk.gray(`Loaded session: ${currentSessionId}`));
      }
    } catch {
      session = createNewSession(currentProfileName, agentName);
    }
  } else {
    session = createNewSession(currentProfileName, agentName);
  }

  // If prompt provided, run single execution
  if (promptParts.length > 0) {
    const prompt = promptParts.join(' ');
    await runSinglePrompt(prompt, session, interactiveOptions, storage);
  } else {
    // Run interactive mode
    await startInteractive(model, interactiveOptions, session);
  }

  // Update current session
  await configManager.setCurrentSession(session.id);
}

function createNewSession(profileName: string, agentName: string | null = null): Session {
  return {
    id: `session-${Date.now()}`,
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
  const mcpManager = new MCPManager();
  const toolManager = new ToolManager(mcpManager);

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

  // Get available tools
  const tools = await toolManager.getAvailableTools();

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
    console.log(chalk.gray(`Tools: ${tools.length}`));
    console.log(chalk.gray(''));
  }

  try {
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
      model: options.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: options.toolChoice as any,
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

    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // Handle tool calls if any
    if (toolCalls.length > 0 && options.debug) {
      console.log(chalk.gray(`\n(Tool calls detected but not executed in single-prompt mode)`));
    }

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

