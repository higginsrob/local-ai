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
  .command('traits <name>')
  .description('Manage agent personality traits')
  .action(async (name: string) => {
    await agentCommand('traits', [name]);
  });

agent
  .command('trait-add <name>')
  .description('Add a personality trait')
  .action(async (name: string) => {
    await agentCommand('trait-add', [name]);
  });

agent
  .command('trait-remove <name>')
  .description('Remove a personality trait')
  .action(async (name: string) => {
    await agentCommand('trait-remove', [name]);
  });

agent
  .command('expertise-add <name>')
  .description('Add an area of expertise')
  .action(async (name: string) => {
    await agentCommand('expertise-add', [name]);
  });

agent
  .command('expertise-remove <name>')
  .description('Remove an area of expertise')
  .action(async (name: string) => {
    await agentCommand('expertise-remove', [name]);
  });

agent
  .command('attribute-add <name>')
  .description('Add a custom attribute')
  .action(async (name: string) => {
    await agentCommand('attribute-add', [name]);
  });

agent
  .command('attribute-remove <name>')
  .description('Remove a custom attribute')
  .action(async (name: string) => {
    await agentCommand('attribute-remove', [name]);
  });

agent
  .command('configure <name>')
  .description('Configure agent settings')
  .action(async (name: string) => {
    await agentCommand('configure', [name]);
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

// Meeting command with subcommands
const meeting = program
  .command('meeting')
  .description('Manage multi-agent meeting rooms');

meeting
  .command('start <room-name> [agents...]')
  .description('Create or resume a meeting room')
  .action(async (roomName: string, agents: string[]) => {
    await meetingCommand('start', [roomName, ...agents]);
  });

meeting
  .command('restore [archive-name]')
  .description('Restore archived meeting session')
  .action(async (archiveName?: string) => {
    await meetingCommand('restore', archiveName ? [archiveName] : []);
  });

meeting
  .command('ls')
  .description('List all meeting rooms')
  .action(async () => {
    await meetingCommand('ls', []);
  });

meeting
  .command('show <room-name>')
  .description('Show meeting room details')
  .action(async (roomName: string) => {
    await meetingCommand('show', [roomName]);
  });

// Parse and handle errors
try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

