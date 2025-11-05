#!/usr/bin/env node
// Main CLI entry point
import { Command } from 'commander';
import { runCommand } from './commands/run.ts';
import { statusCommand } from './commands/status.ts';
import { profileCommand } from './commands/profile.ts';
import { agentCommand } from './commands/agent.ts';
import { sessionCommand } from './commands/session.ts';
import type { RunOptions } from './types/cli.ts';

const program = new Command();

program
  .name('ai')
  .description('Local AI Agent Assistants Manager')
  .version('1.0.0');

program
  .command('run')
  .description('Run interactive chat with agent or model')
  .argument('[agent-or-model]', 'Agent name or model (e.g., coder, llama3, mistral)')
  .argument('[prompt...]', 'Prompt text for single execution')
  .option('--ctx-size <size>', 'Context window size', '4096')
  .option('--max-tokens <tokens>', 'Maximum response tokens', '2048')
  .option('--temperature <temp>', 'Temperature (0-2)', '0.7')
  .option('--top-p <p>', 'Top P (0-1)', '0.9')
  .option('--top-n <n>', 'Top N', '40')
  .option('--mcp-servers <servers>', 'Enabled MCP servers (comma-separated)')
  .option('--tools <tools>', 'Enabled tools (comma-separated)')
  .option('--tool-choice <choice>', 'Tool choice mode (auto, none, or specific)')
  .option('--tool-call-mode <mode>', 'Tool call mode (native|prompt)', 'native')
  .option('--thinking', 'Show thinking stream')
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
  .command('profile')
  .description('Configure user profile')
  .argument('[subcommand]', 'Subcommand (show, new, select, add, remove, import, export)')
  .argument('[args...]', 'Subcommand arguments')
  .action(async (subcommand: string | undefined, args: string[]) => {
    await profileCommand(subcommand, args);
  });

program
  .command('agent')
  .description('Manage agent configurations')
  .argument('[subcommand]', 'Subcommand (ls, show, new, remove, enable-tool, disable-tool, etc.)')
  .argument('[args...]', 'Subcommand arguments')
  .action(async (subcommand: string | undefined, args: string[]) => {
    await agentCommand(subcommand, args);
  });

program
  .command('session')
  .description('Manage chat sessions')
  .argument('[subcommand]', 'Subcommand (ls, show, new, remove, reset, import, export)')
  .argument('[args...]', 'Subcommand arguments')
  .action(async (subcommand: string | undefined, args: string[]) => {
    await sessionCommand(subcommand, args);
  });

// Parse and handle errors
try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

