// ai agent command
import chalk from 'chalk';
import prompts from 'prompts';
import { spawn } from 'child_process';
import { Storage } from '../lib/storage.ts';
import { ConfigManager } from '../lib/config.ts';
import { DockerAIClient } from '../lib/docker-ai.ts';
import type { Agent } from '../types/agent.ts';
import type { Session, Message } from '../types/session.ts';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function agentCommand(subcommand?: string, args: string[] = []): Promise<void> {
  const storage = new Storage();
  await storage.init();
  const configManager = new ConfigManager(storage);

  if (!subcommand || subcommand === 'ls') {
    await listAgents(storage);
  } else if (subcommand === 'show') {
    await showAgent(storage, args[0]);
  } else if (subcommand === 'new') {
    await newAgent(storage, configManager, args[0]);
  } else if (subcommand === 'remove') {
    await removeAgent(storage, args[0]);
  } else if (subcommand === 'enable-tool') {
    await enableTool(storage, configManager, args[0]);
  } else if (subcommand === 'disable-tool') {
    await disableTool(storage, configManager, args[0]);
  } else if (subcommand === 'add-attribute') {
    await addAttribute(storage, configManager, args[0], args.slice(1).join(' '));
  } else if (subcommand === 'remove-attribute') {
    await removeAttribute(storage, configManager, args[0]);
  } else if (subcommand === 'edit') {
    await editAgent(storage, args[0]);
  } else if (subcommand === 'install') {
    await installAgents(storage);
  } else if (subcommand === 'import') {
    await importAgent(storage, args[0]);
  } else if (subcommand === 'export') {
    await exportAgent(storage, args[0], args[1]);
  } else if (subcommand === 'compact') {
    await compactSession(storage, configManager, args[0]);
  } else {
    console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
    console.log('\nAvailable subcommands:');
    console.log('  ls                                         - List all agents');
    console.log('  show <name>                                - Show agent details');
    console.log('  new <name>                                 - Create new agent');
    console.log('  edit <name>                                - Edit agent in default editor');
    console.log('  remove <name>                              - Remove agent');
    console.log('  install                                    - Install agent executables to PATH');
    console.log('  compact <session-id>                       - Compact a session by summarizing');
    console.log('  enable-tool <tool-name>                    - Enable tool');
    console.log('  disable-tool <tool-name>                   - Disable tool');
    console.log('  add-attribute <name> <value>               - Add attribute');
    console.log('  remove-attribute <name>                    - Remove attribute');
    console.log('  import <file>                              - Import agent from JSON');
    console.log('  export <name> <file>                       - Export agent to JSON');
    process.exit(1);
  }
}

async function listAgents(storage: Storage): Promise<void> {
  const agents = await storage.listAgents();
  
  console.log(chalk.bold('\n🤖 Agents\n'));
  
  if (agents.length === 0) {
    console.log(chalk.gray('  (none)'));
    console.log('\nCreate an agent with: ai agent new <name>');
  } else {
    for (const name of agents) {
      const agent = await storage.loadAgent(name);
      console.log(`  ${chalk.cyan(name)}`);
      console.log(`    Model: ${agent.model}`);
      console.log(`    Tools: ${agent.tools.length > 0 ? agent.tools.join(', ') : '(none)'}`);
    }
  }
  console.log();
}

async function showAgent(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent show <name>');
    process.exit(1);
  }

  const agent = await storage.loadAgent(name);
  
  console.log(chalk.bold(`\n🤖 Agent: ${agent.name}\n`));
  console.log(chalk.gray(`Created: ${new Date(agent.createdAt).toLocaleString()}`));
  console.log(chalk.gray(`Updated: ${new Date(agent.updatedAt).toLocaleString()}`));
  
  console.log(chalk.bold('\nConfiguration:'));
  console.log(`  Model: ${chalk.cyan(agent.model)}`);
  console.log(`  System Prompt: ${agent.systemPrompt}`);
  
  console.log(chalk.bold('\nModel Parameters:'));
  console.log(`  Context Size: ${agent.modelParams.ctxSize}`);
  console.log(`  Max Tokens: ${agent.modelParams.maxTokens}`);
  console.log(`  Temperature: ${agent.modelParams.temperature}`);
  console.log(`  Top P: ${agent.modelParams.topP}`);
  console.log(`  Top N: ${agent.modelParams.topN}`);
  
  console.log(chalk.bold('\nTools:'));
  if (agent.tools.length === 0) {
    console.log(chalk.gray('  (none)'));
  } else {
    agent.tools.forEach(tool => console.log(`  - ${tool}`));
  }
  
  console.log(chalk.bold('\nMCP Servers:'));
  if (agent.mcpServers.length === 0) {
    console.log(chalk.gray('  (none)'));
  } else {
    agent.mcpServers.forEach(server => console.log(`  - ${server}`));
  }
  
  console.log(chalk.bold('\nAttributes:'));
  if (Object.keys(agent.attributes).length === 0) {
    console.log(chalk.gray('  (none)'));
  } else {
    for (const [key, value] of Object.entries(agent.attributes)) {
      console.log(`  ${chalk.cyan(key)}: ${JSON.stringify(value)}`);
    }
  }
  console.log();
}

async function newAgent(
  storage: Storage,
  configManager: ConfigManager,
  name?: string
): Promise<void> {
  // Prompt for agent configuration
  const responses = await prompts([
    {
      type: name ? null : 'text',
      name: 'name',
      message: 'Agent name:',
      initial: name,
      validate: (value) => value.length > 0 || 'Name cannot be empty',
    },
    {
      type: 'text',
      name: 'model',
      message: 'Model:',
      initial: 'llama3',
    },
    {
      type: 'text',
      name: 'systemPrompt',
      message: 'System prompt:',
      initial: 'You are a helpful AI assistant.',
    },
    {
      type: 'number',
      name: 'ctxSize',
      message: 'Context size:',
      initial: 4096,
    },
    {
      type: 'number',
      name: 'maxTokens',
      message: 'Max tokens:',
      initial: 2048,
    },
    {
      type: 'number',
      name: 'temperature',
      message: 'Temperature:',
      initial: 0.7,
    },
  ]);

  if (!responses.name && !name) {
    console.error(chalk.red('Agent name is required'));
    process.exit(1);
  }

  const agentName = name || responses.name;

  const agent: Agent = {
    name: agentName,
    model: responses.model || 'llama3',
    systemPrompt: responses.systemPrompt || 'You are a helpful AI assistant.',
    tools: [],
    mcpServers: [],
    modelParams: {
      ctxSize: responses.ctxSize || 4096,
      maxTokens: responses.maxTokens || 2048,
      temperature: responses.temperature || 0.7,
      topP: 0.9,
      topN: 40,
    },
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storage.saveAgent(agent);
  console.log(chalk.green(`✓ Created agent: ${agentName}`));
}

async function removeAgent(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent remove <name>');
    process.exit(1);
  }

  await storage.deleteAgent(name);
  console.log(chalk.green(`✓ Removed agent: ${name}`));
}

async function enableTool(
  storage: Storage,
  configManager: ConfigManager,
  toolName?: string
): Promise<void> {
  if (!toolName) {
    console.error(chalk.red('Tool name is required'));
    console.log('Usage: ai agent enable-tool <tool-name>');
    process.exit(1);
  }

  const currentAgent = await configManager.getCurrentAgent();
  if (!currentAgent) {
    console.error(chalk.red('No agent selected. Use: ai agent new <name>'));
    process.exit(1);
  }

  const agent = await storage.loadAgent(currentAgent);
  
  if (!agent.tools.includes(toolName)) {
    agent.tools.push(toolName);
    agent.updatedAt = new Date().toISOString();
    await storage.saveAgent(agent);
    console.log(chalk.green(`✓ Enabled tool ${toolName} for agent ${agent.name}`));
  } else {
    console.log(chalk.yellow(`Tool ${toolName} already enabled`));
  }
}

async function disableTool(
  storage: Storage,
  configManager: ConfigManager,
  toolName?: string
): Promise<void> {
  if (!toolName) {
    console.error(chalk.red('Tool name is required'));
    console.log('Usage: ai agent disable-tool <tool-name>');
    process.exit(1);
  }

  const currentAgent = await configManager.getCurrentAgent();
  if (!currentAgent) {
    console.error(chalk.red('No agent selected. Use: ai agent new <name>'));
    process.exit(1);
  }

  const agent = await storage.loadAgent(currentAgent);
  
  const index = agent.tools.indexOf(toolName);
  if (index !== -1) {
    agent.tools.splice(index, 1);
    agent.updatedAt = new Date().toISOString();
    await storage.saveAgent(agent);
    console.log(chalk.green(`✓ Disabled tool ${toolName} for agent ${agent.name}`));
  } else {
    console.log(chalk.yellow(`Tool ${toolName} not found`));
  }
}

async function addAttribute(
  storage: Storage,
  configManager: ConfigManager,
  attributeName?: string,
  attributeValue?: string
): Promise<void> {
  if (!attributeName || !attributeValue) {
    console.error(chalk.red('Both attribute name and value are required'));
    console.log('Usage: ai agent add-attribute <attribute-name> <attribute-value>');
    process.exit(1);
  }

  const currentAgent = await configManager.getCurrentAgent();
  if (!currentAgent) {
    console.error(chalk.red('No agent selected'));
    process.exit(1);
  }

  const agent = await storage.loadAgent(currentAgent);
  
  let parsedValue: any = attributeValue;
  try {
    parsedValue = JSON.parse(attributeValue);
  } catch {
    // Keep as string
  }
  
  agent.attributes[attributeName] = parsedValue;
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  console.log(chalk.green(`✓ Added attribute ${attributeName} to agent ${agent.name}`));
}

async function removeAttribute(
  storage: Storage,
  configManager: ConfigManager,
  attributeName?: string
): Promise<void> {
  if (!attributeName) {
    console.error(chalk.red('Attribute name is required'));
    console.log('Usage: ai agent remove-attribute <attribute-name>');
    process.exit(1);
  }

  const currentAgent = await configManager.getCurrentAgent();
  if (!currentAgent) {
    console.error(chalk.red('No agent selected'));
    process.exit(1);
  }

  const agent = await storage.loadAgent(currentAgent);
  
  if (!(attributeName in agent.attributes)) {
    console.error(chalk.red(`Attribute ${attributeName} not found`));
    process.exit(1);
  }
  
  delete agent.attributes[attributeName];
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  console.log(chalk.green(`✓ Removed attribute ${attributeName} from agent ${agent.name}`));
}

async function importAgent(storage: Storage, filePath?: string): Promise<void> {
  if (!filePath) {
    console.error(chalk.red('File path is required'));
    console.log('Usage: ai agent import <file>');
    process.exit(1);
  }

  const data = await fs.readFile(filePath, 'utf-8');
  const agent: Agent = JSON.parse(data);
  
  await storage.saveAgent(agent);
  console.log(chalk.green(`✓ Imported agent: ${agent.name}`));
}

async function editAgent(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent edit <name>');
    process.exit(1);
  }

  // Verify agent exists
  try {
    await storage.loadAgent(name);
  } catch {
    console.error(chalk.red(`Agent not found: ${name}`));
    process.exit(1);
  }

  const agentPath = path.join(storage.getBaseDir(), 'agents', `${name}.json`);
  await openInEditor(agentPath);
  
  // Validate the JSON after editing
  try {
    const content = await fs.readFile(agentPath, 'utf-8');
    JSON.parse(content);
    console.log(chalk.green(`✓ Agent ${name} updated`));
  } catch (error) {
    console.error(chalk.red('✗ Invalid JSON in agent file'));
    console.error(chalk.gray('The file was not saved or contains invalid JSON'));
    process.exit(1);
  }
}

async function exportAgent(storage: Storage, name?: string, filePath?: string): Promise<void> {
  if (!name || !filePath) {
    console.error(chalk.red('Agent name and file path are required'));
    console.log('Usage: ai agent export <name> <file>');
    process.exit(1);
  }

  const agent = await storage.loadAgent(name);
  
  await fs.writeFile(filePath, JSON.stringify(agent, null, 2));
  console.log(chalk.green(`✓ Exported agent ${agent.name} to ${filePath}`));
}

async function installAgents(storage: Storage): Promise<void> {
  console.log(chalk.bold('\n📦 Installing Agent Executables\n'));

  // Get list of agents
  const agents = await storage.listAgents();
  
  if (agents.length === 0) {
    console.log(chalk.yellow('⚠ No agents found'));
    console.log('\nCreate an agent with: ai agent new <name>');
    return;
  }

  // Determine install location
  let installDir: string;
  const localBin = path.join(os.homedir(), '.local', 'bin');
  
  try {
    await fs.mkdir(localBin, { recursive: true });
    installDir = localBin;
  } catch {
    installDir = '/usr/local/bin';
  }

  console.log(`Install location: ${chalk.cyan(installDir)}\n`);

  // Create bin directory in ~/.ai
  const binDir = path.join(storage.getBaseDir(), 'bin');
  await fs.mkdir(binDir, { recursive: true });

  let installed = 0;
  let failed = 0;

  for (const agentName of agents) {
    const executablePath = path.join(binDir, agentName);
    const targetPath = path.join(installDir, agentName);

    try {
      // Create wrapper executable
      const wrapperScript = `#!/bin/bash
# AI Agent: ${agentName}
# Auto-generated executable wrapper

# Get the directory where ai is installed
AI_CMD="ai"

# Run the ai command with the agent name
exec $AI_CMD run ${agentName} "$@"
`;

      await fs.writeFile(executablePath, wrapperScript, { mode: 0o755 });

      // Check if target already exists
      try {
        await fs.access(targetPath);
        // Remove existing
        await fs.unlink(targetPath);
      } catch {
        // Doesn't exist, continue
      }

      // Create symlink
      await fs.symlink(executablePath, targetPath);
      
      console.log(`  ${chalk.green('✓')} ${agentName}`);
      installed++;
    } catch (error) {
      console.log(`  ${chalk.red('✗')} ${agentName} (${error instanceof Error ? error.message : 'unknown error'})`);
      failed++;
    }
  }

  console.log();
  console.log(chalk.bold('Summary:'));
  console.log(`  Installed: ${chalk.green(installed)}`);
  if (failed > 0) {
    console.log(`  Failed: ${chalk.red(failed)}`);
    console.log(`\n${chalk.yellow('Note:')} You may need to run with sudo for system directories`);
  }

  // Check if install dir is in PATH
  const pathDirs = (process.env.PATH || '').split(':');
  if (!pathDirs.includes(installDir)) {
    console.log(`\n${chalk.yellow('⚠')} ${installDir} is not in your PATH`);
    console.log(`Add it by adding this to your shell profile (~/.bashrc, ~/.zshrc, etc.):`);
    console.log(chalk.cyan(`  export PATH="${installDir}:$PATH"`));
  } else {
    console.log(`\n${chalk.green('✓')} You can now run agents directly:`);
    agents.slice(0, 3).forEach(name => {
      console.log(chalk.cyan(`  ${name} "your prompt here"`));
    });
  }

  console.log();
}

async function openInEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
  
  return new Promise((resolve, reject) => {
    const editorProcess = spawn(editor, [filePath], {
      stdio: 'inherit',
      shell: true,
    });

    editorProcess.on('exit', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    editorProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function compactSession(
  storage: Storage,
  configManager: ConfigManager,
  sessionId?: string
): Promise<void> {
  if (!sessionId) {
    console.error(chalk.red('Session ID is required'));
    console.log('Usage: ai agent compact <session-id>');
    process.exit(1);
  }

  console.log(chalk.bold(`\n🔄 Compacting Session: ${sessionId}\n`));

  try {
    // Load the session
    const session = await storage.loadSession(sessionId);
    
    if (session.messages.length === 0) {
      console.log(chalk.yellow('⚠ No messages to compact'));
      return;
    }

    console.log(chalk.gray(`Current message count: ${session.messages.length}`));

    // Get endpoint and create client
    const endpoint = await configManager.getLlamaCppEndpoint();
    const client = new DockerAIClient(endpoint);

    // Load agent for model info
    const currentAgentName = await configManager.getCurrentAgent();
    const agent = currentAgentName ? await storage.loadAgent(currentAgentName) : null;
    
    const model = agent?.model || 'llama3';

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

    console.log(chalk.blue('Generating summary...'));

    // Get summary from AI
    const response = await client.chatCompletion({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.3, // Lower temperature for more focused summary
    });

    const summary = response.choices[0]?.message?.content || '';

    if (!summary) {
      console.error(chalk.red('✗ Failed to generate summary'));
      process.exit(1);
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

    // Save the compacted session
    await storage.saveSession(session);

    console.log(chalk.green(`\n✓ Session compacted successfully`));
    const finalCount = session.messages.length;
    console.log(chalk.gray(`  ${originalMessageCount} messages → ${finalCount} message${finalCount > 1 ? 's' : ''}`));
    if (systemMessages.length > 0) {
      console.log(chalk.gray(`  Preserved ${systemMessages.length} system message${systemMessages.length > 1 ? 's' : ''}`));
    }
    console.log(chalk.gray(`  Summary length: ${summary.length} characters`));
    console.log();

  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      console.error(chalk.red(`✗ Session not found: ${sessionId}`));
    } else {
      console.error(chalk.red('✗ Error compacting session:'), error instanceof Error ? error.message : 'Unknown error');
    }
    process.exit(1);
  }
}

