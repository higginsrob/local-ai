// ai session command
import chalk from 'chalk';
import { Storage } from '../lib/storage.ts';
import type { Session } from '../types/session.ts';
import fs from 'fs/promises';

export async function sessionCommand(subcommand?: string, args: string[] = []): Promise<void> {
  const storage = new Storage();
  await storage.init();

  if (!subcommand || subcommand === 'ls') {
    await listSessions(storage);
  } else if (subcommand === 'show') {
    await showSession(storage, args[0]);
  } else if (subcommand === 'new') {
    await newSession(storage, args[0]);
  } else if (subcommand === 'remove') {
    await removeSession(storage, args[0]);
  } else if (subcommand === 'reset') {
    await resetSessions(storage);
  } else if (subcommand === 'import') {
    await importSession(storage, args[0]);
  } else if (subcommand === 'export') {
    await exportSession(storage, args[0], args[1]);
  } else {
    console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
    console.log('\nAvailable subcommands:');
    console.log('  ls                    - List all sessions');
    console.log('  show <id>             - Show session details');
    console.log('  new <id>              - Create new session');
    console.log('  remove <id>           - Remove session');
    console.log('  reset                 - Remove all sessions');
    console.log('  import <file>         - Import session from JSON');
    console.log('  export <id> <file>    - Export session to JSON');
    process.exit(1);
  }
}

async function listSessions(storage: Storage): Promise<void> {
  const sessions = await storage.listSessions();
  
  console.log(chalk.bold('\n💬 Sessions\n'));
  
  if (sessions.length === 0) {
    console.log(chalk.gray('  (none)'));
    console.log('\nSessions are created automatically when you run: ai run <model>');
  } else {
    for (const id of sessions) {
      const session = await storage.loadSession(id);
      const messageCount = session.messages.length;
      const lastMessage = session.messages[session.messages.length - 1];
      const preview = lastMessage
        ? lastMessage.content.slice(0, 60) + (lastMessage.content.length > 60 ? '...' : '')
        : '(empty)';
      
      console.log(`  ${chalk.cyan(id)}`);
      console.log(`    Messages: ${messageCount}`);
      console.log(`    Agent: ${session.agentName || '(none)'}`);
      console.log(`    Last: ${chalk.gray(preview)}`);
      console.log(`    Updated: ${chalk.gray(new Date(session.updatedAt).toLocaleString())}`);
      console.log();
    }
  }
}

async function showSession(storage: Storage, id?: string): Promise<void> {
  if (!id) {
    console.error(chalk.red('Session ID is required'));
    console.log('Usage: ai session show <id>');
    process.exit(1);
  }

  const session = await storage.loadSession(id);
  
  console.log(chalk.bold(`\n💬 Session: ${session.id}\n`));
  console.log(chalk.gray(`Created: ${new Date(session.createdAt).toLocaleString()}`));
  console.log(chalk.gray(`Updated: ${new Date(session.updatedAt).toLocaleString()}`));
  console.log(`Profile: ${session.profileName}`);
  console.log(`Agent: ${session.agentName || '(none)'}`);
  
  console.log(chalk.bold('\nMetadata:'));
  console.log(`  Token Count: ${session.metadata.tokenCount}`);
  console.log(`  Tool Calls: ${session.metadata.toolCalls}`);
  
  console.log(chalk.bold(`\nMessages (${session.messages.length}):\n`));
  
  for (const message of session.messages) {
    const roleColor = message.role === 'user' ? chalk.blue : 
                     message.role === 'assistant' ? chalk.green : 
                     chalk.gray;
    
    console.log(roleColor(`[${message.role}]`));
    console.log(message.content);
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(chalk.gray(`  Tool calls: ${message.tool_calls.length}`));
      for (const toolCall of message.tool_calls) {
        console.log(chalk.gray(`    - ${toolCall.function.name}`));
      }
    }
    console.log();
  }
}

async function newSession(storage: Storage, id?: string): Promise<void> {
  if (!id) {
    // Generate a simple ID
    id = `session-${Date.now()}`;
  }

  const session: Session = {
    id,
    agentName: null,
    profileName: 'default',
    messages: [],
    metadata: {
      tokenCount: 0,
      toolCalls: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storage.saveSession(session);
  console.log(chalk.green(`✓ Created session: ${id}`));
}

async function removeSession(storage: Storage, id?: string): Promise<void> {
  if (!id) {
    console.error(chalk.red('Session ID is required'));
    console.log('Usage: ai session remove <id>');
    process.exit(1);
  }

  await storage.deleteSession(id);
  console.log(chalk.green(`✓ Removed session: ${id}`));
}

async function resetSessions(storage: Storage): Promise<void> {
  const sessions = await storage.listSessions();
  await storage.deleteAllSessions();
  console.log(chalk.green(`✓ Removed ${sessions.length} session(s)`));
}

async function importSession(storage: Storage, filePath?: string): Promise<void> {
  if (!filePath) {
    console.error(chalk.red('File path is required'));
    console.log('Usage: ai session import <file>');
    process.exit(1);
  }

  const data = await fs.readFile(filePath, 'utf-8');
  const session: Session = JSON.parse(data);
  
  await storage.saveSession(session);
  console.log(chalk.green(`✓ Imported session: ${session.id}`));
}

async function exportSession(storage: Storage, id?: string, filePath?: string): Promise<void> {
  if (!id || !filePath) {
    console.error(chalk.red('Session ID and file path are required'));
    console.log('Usage: ai session export <id> <file>');
    process.exit(1);
  }

  const session = await storage.loadSession(id);
  
  await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  console.log(chalk.green(`✓ Exported session ${session.id} to ${filePath}`));
}

