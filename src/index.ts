#!/usr/bin/env node
// Main CLI entry point
import { Command } from 'commander';
import { runCommand } from './commands/run.ts';
import { statusCommand } from './commands/status.ts';
import { profileCommand } from './commands/profile.ts';
import { agentCommand } from './commands/agent.ts';
import { sessionCommand } from './commands/session.ts';
import { meetingCommand } from './commands/meeting.ts';
import type { RunOptions } from './types/cli.ts';
import pkg from '../package.json' with { type: 'json' };

const program = new Command();

program
  .name('ai')
  .description('Local AI Agent Assistants Manager')
  .version(pkg.version);

program
  .command('run')
  .description('Run interactive chat with agent or model')
  .argument('[agent-or-model]', 'Agent name or model (e.g., coder, ai/llama3.2:latest, ai/mistral:latest)')
  .argument('[prompt...]', 'Prompt text for single execution')
  .option('--ctx-size <size>', 'Context window size')
  .option('--max-tokens <tokens>', 'Maximum response tokens')
  .option('--temperature <temp>', 'Temperature (0-2)')
  .option('--top-p <p>', 'Top P (0-1)')
  .option('--top-n <n>', 'Top N')
  .option('--debug', 'Show debug information')
  .action(async (model: string | undefined, prompt: string[], options: RunOptions) => {
    await runCommand(model, prompt, options);
  });

program
  .command('status')
  .description('Check installation and validate dependencies')
  .action(async () => {
    await statusCommand();
  });

program
  .command('reset')
  .description('Remove all sessions (alias for "ai session reset")')
  .action(async () => {
    await sessionCommand('reset', []);
  });

program
  .command('meeting')
  .description('Start an interactive meeting with multiple agents')
  .argument('<agents...>', 'Agent names to include in the meeting')
  .action(async (agents: string[]) => {
    await meetingCommand(agents);
  });

// Profile command with subcommands
const profile = program
  .command('profile')
  .description('Configure user profile');

profile
  .command('show')
  .description('Show current profile')
  .action(async () => {
    await profileCommand('show', []);
  });

profile
  .command('new [name]')
  .description('Create new profile')
  .action(async (name?: string) => {
    await profileCommand('new', name ? [name] : []);
  });

profile
  .command('select [name]')
  .description('Select profile')
  .action(async (name?: string) => {
    await profileCommand('select', name ? [name] : []);
  });

profile
  .command('edit [name]')
  .description('Edit profile in default editor')
  .action(async (name?: string) => {
    await profileCommand('edit', name ? [name] : []);
  });

profile
  .command('add <name> <value...>')
  .description('Add attribute to current profile')
  .action(async (name: string, value: string[]) => {
    await profileCommand('add', [name, value.join(' ')]);
  });

profile
  .command('remove <name>')
  .description('Remove attribute from current profile')
  .action(async (name: string) => {
    await profileCommand('remove', [name]);
  });

profile
  .command('import <file>')
  .description('Import profile from JSON')
  .action(async (file: string) => {
    await profileCommand('import', [file]);
  });

profile
  .command('export <file>')
  .description('Export current profile to JSON')
  .action(async (file: string) => {
    await profileCommand('export', [file]);
  });

// Agent command with subcommands
const agent = program
  .command('agent')
  .description('Manage agent configurations');

agent
  .command('ls')
  .description('List all agents')
  .action(async () => {
    await agentCommand('ls', []);
  });

agent
  .command('show <name>')
  .description('Show agent details')
  .action(async (name: string) => {
    await agentCommand('show', [name]);
  });

agent
  .command('new [name]')
  .description('Create new agent')
  .action(async (name?: string) => {
    await agentCommand('new', name ? [name] : []);
  });

agent
  .command('edit <name>')
  .description('Edit agent in default editor')
  .action(async (name: string) => {
    await agentCommand('edit', [name]);
  });

agent
  .command('remove <name>')
  .description('Remove agent')
  .action(async (name: string) => {
    await agentCommand('remove', [name]);
  });

agent
  .command('install')
  .description('Install agent executables to PATH')
  .action(async () => {
    await agentCommand('install', []);
  });

agent
  .command('status')
  .description('Show current session performance status')
  .action(async () => {
    await agentCommand('status', []);
  });

agent
  .command('compact <session-id>')
  .description('Compact a session by summarizing')
  .action(async (sessionId: string) => {
    await agentCommand('compact', [sessionId]);
  });

agent
  .command('enable-tool <tool-name>')
  .description('Enable tool for current agent')
  .action(async (toolName: string) => {
    await agentCommand('enable-tool', [toolName]);
  });

agent
  .command('disable-tool <tool-name>')
  .description('Disable tool for current agent')
  .action(async (toolName: string) => {
    await agentCommand('disable-tool', [toolName]);
  });

agent
  .command('add-attribute <name> <value...>')
  .description('Add attribute to current agent')
  .action(async (name: string, value: string[]) => {
    await agentCommand('add-attribute', [name, value.join(' ')]);
  });

agent
  .command('remove-attribute <name>')
  .description('Remove attribute from current agent')
  .action(async (name: string) => {
    await agentCommand('remove-attribute', [name]);
  });

agent
  .command('import <file>')
  .description('Import agent from JSON')
  .action(async (file: string) => {
    await agentCommand('import', [file]);
  });

agent
  .command('export <name> <file>')
  .description('Export agent to JSON')
  .action(async (name: string, file: string) => {
    await agentCommand('export', [name, file]);
  });

// Session command with subcommands
const session = program
  .command('session')
  .description('Manage chat sessions');

session
  .command('ls')
  .description('List all sessions')
  .action(async () => {
    await sessionCommand('ls', []);
  });

session
  .command('show <id>')
  .description('Show session details')
  .action(async (id: string) => {
    await sessionCommand('show', [id]);
  });

session
  .command('new [id]')
  .description('Create new session')
  .action(async (id?: string) => {
    await sessionCommand('new', id ? [id] : []);
  });

session
  .command('remove <id>')
  .description('Remove session')
  .action(async (id: string) => {
    await sessionCommand('remove', [id]);
  });

session
  .command('reset')
  .description('Remove all sessions')
  .action(async () => {
    await sessionCommand('reset', []);
  });

session
  .command('import <file>')
  .description('Import session from JSON')
  .action(async (file: string) => {
    await sessionCommand('import', [file]);
  });

session
  .command('export <id> <file>')
  .description('Export session to JSON')
  .action(async (id: string, file: string) => {
    await sessionCommand('export', [id, file]);
  });

session
  .command('open [id]')
  .description('Open session in pager (defaults to current session)')
  .action(async (id?: string) => {
    await sessionCommand('open', id ? [id] : []);
  });

session
  .command('pop [count]')
  .description('Remove and display last messages')
  .action(async (count?: string) => {
    await sessionCommand('pop', count ? [count] : []);
  });

// Parse and handle errors
try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

