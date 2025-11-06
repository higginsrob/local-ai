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
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  } else if (subcommand === 'traits') {
    await manageTraits(storage, args[0]);
  } else if (subcommand === 'trait-add') {
    await addTrait(storage, args[0]);
  } else if (subcommand === 'trait-remove') {
    await removeTrait(storage, args[0]);
  } else if (subcommand === 'expertise-add') {
    await addExpertise(storage, args[0]);
  } else if (subcommand === 'expertise-remove') {
    await removeExpertise(storage, args[0]);
  } else if (subcommand === 'attribute-add') {
    await addAttribute(storage, args[0]);
  } else if (subcommand === 'attribute-remove') {
    await removeAttribute(storage, args[0]);
  } else if (subcommand === 'configure') {
    await configureAgent(storage, args[0]);
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
  } else if (subcommand === 'status') {
    await showSessionStatus(storage, configManager);
  } else {
    console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
    console.log('\nAvailable subcommands:');
    console.log('  ls                                         - List all agents');
    console.log('  show <name>                                - Show agent details');
    console.log('  new <name>                                 - Create new agent');
    console.log('  edit <name>                                - Edit agent in default editor');
    console.log('  remove <name>                              - Remove agent');
    console.log('  install                                    - Install agent executables to PATH');
    console.log('  status                                     - Show current session performance status');
    console.log('  compact <session-id>                       - Compact a session by summarizing');
    console.log('  traits <name>                              - Manage agent personality traits');
    console.log('  trait-add <name>                           - Add a personality trait');
    console.log('  trait-remove <name>                        - Remove a personality trait');
    console.log('  expertise-add <name>                       - Add an area of expertise');
    console.log('  expertise-remove <name>                    - Remove an area of expertise');
    console.log('  attribute-add <name>                       - Add a custom attribute');
    console.log('  attribute-remove <name>                    - Remove a custom attribute');
    console.log('  configure <name>                           - Configure agent settings');
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
      try {
        const agent = await storage.loadAgent(name);
        console.log(`  ${chalk.cyan(name)}`);
        console.log(`    Model: ${agent.model}`);
      } catch (error) {
        console.log(`  ${chalk.cyan(name)} ${chalk.red('(invalid)')}`);
      }
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
      initial: 'ai/llama3.2:latest',
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
    model: responses.model || 'ai/llama3.2:latest',
    systemPrompt: responses.systemPrompt || 'You are a helpful AI assistant.',
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

async function manageTraits(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent traits <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  // Load personality traits from data file
  const personalityPath = path.join(__dirname, '..', 'data', 'personality.json');
  const personalityData = JSON.parse(await fs.readFile(personalityPath, 'utf-8'));
  
  // Get currently selected traits (if any)
  const currentTraits: string[] = agent.attributes.personality || [];
  
  // Create choices grouped by category
  const choices: any[] = [];
  
  // Add positive traits
  choices.push({ title: chalk.green.bold('─── Positive Traits ───'), value: '__positive_header__', disabled: true });
  personalityData.positive.forEach((trait: string) => {
    choices.push({
      title: trait,
      value: trait,
      selected: currentTraits.includes(trait),
    });
  });
  
  // Add neutral traits
  choices.push({ title: chalk.yellow.bold('\n─── Neutral Traits ───'), value: '__neutral_header__', disabled: true });
  personalityData.neutral.forEach((trait: string) => {
    choices.push({
      title: trait,
      value: trait,
      selected: currentTraits.includes(trait),
    });
  });
  
  // Add negative traits
  choices.push({ title: chalk.red.bold('\n─── Negative Traits ───'), value: '__negative_header__', disabled: true });
  personalityData.negative.forEach((trait: string) => {
    choices.push({
      title: trait,
      value: trait,
      selected: currentTraits.includes(trait),
    });
  });
  
  console.log(chalk.bold(`\n🎭 Manage Personality Traits for ${chalk.cyan(name)}\n`));
  console.log(chalk.gray('Use ↑/↓ to navigate, space to select/deselect, enter to save\n'));
  
  // Show multi-select prompt with dynamic height
  const response = await prompts({
    type: 'multiselect',
    name: 'traits',
    message: 'Select personality traits',
    choices: choices,
    hint: '- Space to select. Return to submit',
    instructions: false,
    max: 40,
    initial: 1,
  });
  
  // If user cancelled (Ctrl+C), exit without saving
  if (response.traits === undefined) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }
  
  // Filter out header values
  const selectedTraits = response.traits.filter(
    (trait: string) => !trait.startsWith('__') && !trait.endsWith('__')
  );
  
  // Update agent's personality traits in attributes.personality
  agent.attributes.personality = selectedTraits;
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  
  console.log(chalk.green(`\n✓ Updated personality traits for ${name}`));
  console.log(chalk.gray(`  Selected ${selectedTraits.length} trait${selectedTraits.length !== 1 ? 's' : ''}`));
  
  if (selectedTraits.length > 0) {
    const positiveCount = selectedTraits.filter((t: string) => personalityData.positive.includes(t)).length;
    const neutralCount = selectedTraits.filter((t: string) => personalityData.neutral.includes(t)).length;
    const negativeCount = selectedTraits.filter((t: string) => personalityData.negative.includes(t)).length;
    
    console.log(chalk.gray(`  ${chalk.green('Positive')}: ${positiveCount} | ${chalk.yellow('Neutral')}: ${neutralCount} | ${chalk.red('Negative')}: ${negativeCount}`));
  }
  console.log();
}

async function addTrait(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent trait-add <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  // Load personality traits from data file
  const personalityPath = path.join(__dirname, '..', 'data', 'personality.json');
  const personalityData = JSON.parse(await fs.readFile(personalityPath, 'utf-8'));
  
  // Get currently selected traits
  const currentTraits: string[] = agent.attributes.personality || [];
  
  // Build a flat list of all available traits with category labels
  const allTraits: string[] = [];
  personalityData.positive.forEach((trait: string) => allTraits.push(trait));
  personalityData.neutral.forEach((trait: string) => allTraits.push(trait));
  personalityData.negative.forEach((trait: string) => allTraits.push(trait));
  
  // Filter out traits that are already selected
  const availableTraits = allTraits.filter(trait => !currentTraits.includes(trait));
  
  if (availableTraits.length === 0) {
    console.log(chalk.yellow('\n⚠ All traits are already selected!'));
    console.log(chalk.gray('Use "ai agent trait-remove" to remove some first.\n'));
    return;
  }
  
  console.log(chalk.bold(`\n🎭 Add Personality Trait to ${chalk.cyan(name)}\n`));
  console.log(chalk.gray('Start typing to search, use ↑/↓ to navigate, enter to select\n'));
  
  // Show autocomplete prompt
  const response = await prompts({
    type: 'autocomplete',
    name: 'trait',
    message: 'Select a trait to add',
    choices: availableTraits.map(trait => ({
      title: trait,
      value: trait,
    })),
    limit: 10,
  });
  
  // If user cancelled (Ctrl+C), exit without saving
  if (!response.trait) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }
  
  // Add the trait
  currentTraits.push(response.trait);
  agent.attributes.personality = currentTraits;
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  
  // Determine category
  let category = 'trait';
  if (personalityData.positive.includes(response.trait)) {
    category = chalk.green('positive');
  } else if (personalityData.neutral.includes(response.trait)) {
    category = chalk.yellow('neutral');
  } else if (personalityData.negative.includes(response.trait)) {
    category = chalk.red('negative');
  }
  
  console.log(chalk.green(`\n✓ Added ${category} trait: ${chalk.cyan(response.trait)}`));
  console.log(chalk.gray(`  Total traits: ${currentTraits.length}`));
  console.log();
}

async function removeTrait(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent trait-remove <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  // Get currently selected traits
  const currentTraits: string[] = agent.attributes.personality || [];
  
  if (currentTraits.length === 0) {
    console.log(chalk.yellow('\n⚠ No traits to remove!'));
    console.log(chalk.gray('Use "ai agent trait-add" to add some first.\n'));
    return;
  }
  
  console.log(chalk.bold(`\n🎭 Remove Personality Trait from ${chalk.cyan(name)}\n`));
  console.log(chalk.gray('Start typing to search, use ↑/↓ to navigate, enter to select\n'));
  
  // Show autocomplete prompt with current traits
  const response = await prompts({
    type: 'autocomplete',
    name: 'trait',
    message: 'Select a trait to remove',
    choices: currentTraits.map(trait => ({
      title: trait,
      value: trait,
    })),
    limit: 10,
  });
  
  // If user cancelled (Ctrl+C), exit without saving
  if (!response.trait) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }
  
  // Remove the trait
  const updatedTraits = currentTraits.filter(t => t !== response.trait);
  agent.attributes.personality = updatedTraits;
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  
  console.log(chalk.green(`\n✓ Removed trait: ${chalk.cyan(response.trait)}`));
  console.log(chalk.gray(`  Remaining traits: ${updatedTraits.length}`));
  console.log();
}

async function addExpertise(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent expertise-add <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  // Get current expertise
  const currentExpertise: string[] = agent.attributes.expertise || [];
  
  console.log(chalk.bold(`\n🎓 Add Expertise to ${chalk.cyan(name)}\n`));
  
  // Prompt for expertise text
  const response = await prompts({
    type: 'text',
    name: 'expertise',
    message: 'Enter area of expertise:',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Expertise cannot be empty';
      }
      if (currentExpertise.includes(value.trim())) {
        return 'This expertise already exists';
      }
      return true;
    },
  });
  
  // If user cancelled (Ctrl+C), exit without saving
  if (!response.expertise) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }
  
  // Add the expertise
  currentExpertise.push(response.expertise.trim());
  agent.attributes.expertise = currentExpertise;
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  
  console.log(chalk.green(`\n✓ Added expertise: ${chalk.cyan(response.expertise.trim())}`));
  console.log(chalk.gray(`  Total expertise areas: ${currentExpertise.length}`));
  console.log();
}

async function removeExpertise(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent expertise-remove <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  // Get current expertise
  const currentExpertise: string[] = agent.attributes.expertise || [];
  
  if (currentExpertise.length === 0) {
    console.log(chalk.yellow('\n⚠ No expertise areas to remove!'));
    console.log(chalk.gray('Use "ai agent expertise-add" to add some first.\n'));
    return;
  }
  
  console.log(chalk.bold(`\n🎓 Remove Expertise from ${chalk.cyan(name)}\n`));
  console.log(chalk.gray('Start typing to search, use ↑/↓ to navigate, enter to select\n'));
  
  // Show autocomplete prompt with current expertise
  const response = await prompts({
    type: 'autocomplete',
    name: 'expertise',
    message: 'Select expertise to remove',
    choices: currentExpertise.map(exp => ({
      title: exp,
      value: exp,
    })),
    limit: 10,
  });
  
  // If user cancelled (Ctrl+C), exit without saving
  if (!response.expertise) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }
  
  // Remove the expertise
  const updatedExpertise = currentExpertise.filter(e => e !== response.expertise);
  agent.attributes.expertise = updatedExpertise;
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  
  console.log(chalk.green(`\n✓ Removed expertise: ${chalk.cyan(response.expertise)}`));
  console.log(chalk.gray(`  Remaining expertise areas: ${updatedExpertise.length}`));
  console.log();
}

async function addAttribute(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent attribute-add <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  console.log(chalk.bold(`\n⚙️  Add Custom Attribute to ${chalk.cyan(name)}\n`));
  
  // Prompt for attribute key and value
  const response = await prompts([
    {
      type: 'text',
      name: 'key',
      message: 'Attribute name:',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Attribute name cannot be empty';
        }
        if (value === 'expertise' || value === 'personality') {
          return 'Use expertise-add or trait-add for these attributes';
        }
        if (value in agent.attributes) {
          return `Attribute "${value}" already exists. Use attribute-remove first.`;
        }
        return true;
      },
    },
    {
      type: 'text',
      name: 'value',
      message: 'Attribute value:',
      validate: (value) => value !== undefined && value.trim().length > 0 || 'Value cannot be empty',
    },
  ]);
  
  // If user cancelled (Ctrl+C), exit without saving
  if (!response.key || !response.value) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }
  
  // Try to parse as JSON, otherwise store as string
  let parsedValue: any = response.value.trim();
  try {
    parsedValue = JSON.parse(response.value);
  } catch {
    // Keep as string
  }
  
  // Add the attribute
  agent.attributes[response.key.trim()] = parsedValue;
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  
  console.log(chalk.green(`\n✓ Added attribute: ${chalk.cyan(response.key.trim())}`));
  console.log(chalk.gray(`  Value: ${JSON.stringify(parsedValue)}`));
  console.log();
}

async function removeAttribute(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent attribute-remove <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  // Get custom attributes (excluding expertise and personality)
  const customAttributes = Object.keys(agent.attributes).filter(
    key => key !== 'expertise' && key !== 'personality'
  );
  
  if (customAttributes.length === 0) {
    console.log(chalk.yellow('\n⚠ No custom attributes to remove!'));
    console.log(chalk.gray('Use "ai agent attribute-add" to add some first.\n'));
    return;
  }
  
  console.log(chalk.bold(`\n⚙️  Remove Custom Attribute from ${chalk.cyan(name)}\n`));
  console.log(chalk.gray('Start typing to search, use ↑/↓ to navigate, enter to select\n'));
  
  // Show autocomplete prompt with custom attributes
  const response = await prompts({
    type: 'autocomplete',
    name: 'key',
    message: 'Select attribute to remove',
    choices: customAttributes.map(key => ({
      title: `${key}: ${JSON.stringify(agent.attributes[key])}`,
      value: key,
    })),
    limit: 10,
  });
  
  // If user cancelled (Ctrl+C), exit without saving
  if (!response.key) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }
  
  // Remove the attribute
  const removedValue = agent.attributes[response.key];
  delete agent.attributes[response.key];
  agent.updatedAt = new Date().toISOString();
  
  await storage.saveAgent(agent);
  
  console.log(chalk.green(`\n✓ Removed attribute: ${chalk.cyan(response.key)}`));
  console.log(chalk.gray(`  Was: ${JSON.stringify(removedValue)}`));
  console.log();
}

async function configureAgent(storage: Storage, name?: string): Promise<void> {
  if (!name) {
    console.error(chalk.red('Agent name is required'));
    console.log('Usage: ai agent configure <name>');
    process.exit(1);
  }

  // Load the agent
  const agent = await storage.loadAgent(name);
  
  console.log(chalk.bold(`\n⚙️  Configure ${chalk.cyan(name)}\n`));
  
  // Prompt for agent configuration with current values as defaults
  const responses = await prompts([
    {
      type: 'text',
      name: 'model',
      message: 'Model:',
      initial: agent.model,
    },
    {
      type: 'text',
      name: 'systemPrompt',
      message: 'System prompt:',
      initial: agent.systemPrompt,
    },
    {
      type: 'number',
      name: 'ctxSize',
      message: 'Context size:',
      initial: agent.modelParams.ctxSize,
    },
    {
      type: 'number',
      name: 'maxTokens',
      message: 'Max tokens:',
      initial: agent.modelParams.maxTokens,
    },
    {
      type: 'number',
      name: 'temperature',
      message: 'Temperature:',
      initial: agent.modelParams.temperature,
    },
    {
      type: 'number',
      name: 'topP',
      message: 'Top P:',
      initial: agent.modelParams.topP,
    },
    {
      type: 'number',
      name: 'topN',
      message: 'Top N:',
      initial: agent.modelParams.topN,
    },
  ]);

  // If user cancelled (Ctrl+C), exit without saving
  if (Object.keys(responses).length === 0) {
    console.log(chalk.yellow('\n✗ Cancelled'));
    process.exit(0);
  }

  // Update agent configuration (preserving attributes)
  agent.model = responses.model || agent.model;
  agent.systemPrompt = responses.systemPrompt || agent.systemPrompt;
  agent.modelParams.ctxSize = responses.ctxSize || agent.modelParams.ctxSize;
  agent.modelParams.maxTokens = responses.maxTokens || agent.modelParams.maxTokens;
  agent.modelParams.temperature = responses.temperature !== undefined ? responses.temperature : agent.modelParams.temperature;
  agent.modelParams.topP = responses.topP !== undefined ? responses.topP : agent.modelParams.topP;
  agent.modelParams.topN = responses.topN || agent.modelParams.topN;
  agent.updatedAt = new Date().toISOString();

  await storage.saveAgent(agent);
  
  console.log(chalk.green(`\n✓ Updated configuration for ${name}`));
  console.log(chalk.gray('  Attributes preserved'));
  console.log();
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

  // Sanitize the name for file path (replace slashes with double underscores)
  const sanitizedName = name.replace(/\//g, '__');
  const agentPath = path.join(storage.getBaseDir(), 'agents', `${sanitizedName}.json`);
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

async function showSessionStatus(
  storage: Storage,
  configManager: ConfigManager
): Promise<void> {
  // Get current agent's session
  const currentAgent = await configManager.getCurrentAgent();
  
  if (!currentAgent) {
    console.error(chalk.red('No active agent'));
    console.log('\nStart an interactive session with: ai run <agent>');
    process.exit(1);
  }
  
  const sessionId = `session-${currentAgent}`;

  try {
    const session = await storage.loadSession(sessionId);
    const stats = session.metadata.lastRequestStats;

    if (!stats) {
      console.log(chalk.yellow('⚠ No performance data available yet.'));
      console.log(chalk.gray('  Make at least one request to see stats.'));
      return;
    }

    console.log(chalk.bold('\nPerformance Metrics:'));
    
    if (stats.timings?.predicted_per_second !== undefined) {
      console.log(`  Generation Speed: ${chalk.cyan(stats.timings.predicted_per_second.toFixed(2))} tokens/sec`);
    }
    
    if (stats.timings?.prompt_per_second !== undefined) {
      console.log(`  Prompt Processing: ${chalk.cyan(stats.timings.prompt_per_second.toFixed(2))} tokens/sec`);
    }
    
    if (stats.timings?.predicted_ms !== undefined) {
      console.log(`  Generation Time: ${chalk.cyan((stats.timings.predicted_ms / 1000).toFixed(2))}s`);
    }
    
    if (stats.timings?.prompt_ms !== undefined) {
      console.log(`  Prompt Time: ${chalk.cyan((stats.timings.prompt_ms / 1000).toFixed(2))}s`);
    }
    
    console.log();

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

  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      console.error(chalk.red(`✗ Session not found: ${sessionId}`));
    } else {
      console.error(chalk.red('✗ Error loading session:'), error instanceof Error ? error.message : 'Unknown error');
    }
    process.exit(1);
  }
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
    
    const model = agent?.model || 'ai/llama3.2:latest';

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

