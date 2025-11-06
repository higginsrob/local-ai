// ai session command
import chalk from 'chalk';
import { Storage } from '../lib/storage.ts';
import type { Session, Message } from '../types/session.ts';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

export async function sessionCommand(subcommand?: string, args: string[] = []): Promise<void> {
  const storage = new Storage();
  await storage.init();

  if (!subcommand || subcommand === 'ls') {
    await listSessions(storage);
  } else if (subcommand === 'show') {
    await showSession(storage, args[0]);
  } else if (subcommand === 'open') {
    await openSession(storage, args[0]);
  } else if (subcommand === 'pop') {
    await popSession(storage, args[0]);
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
    console.log('  open [id]             - Open session in pager (defaults to current)');
    console.log('  pop [count]           - Remove and display last messages');
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
      try {
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
      } catch (error) {
        console.log(`  ${chalk.cyan(id)} ${chalk.red('(invalid)')}`);
        console.log();
      }
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

async function openSession(storage: Storage, id?: string): Promise<void> {
  // If no ID provided, use the current agent's session
  if (!id) {
    const config = await storage.loadConfig();
    const currentAgent = config.currentAgent;
    
    if (!currentAgent) {
      console.error(chalk.red('No active agent'));
      console.log('Start a session with: ai run <agent>');
      console.log('Or specify a session: ai session open <id>');
      process.exit(1);
    }
    
    id = `session-${currentAgent}`;
    console.log(chalk.gray(`Opening current session: ${id}\n`));
  }

  const session = await storage.loadSession(id);
  
  // Create a temporary file with the formatted session content
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `ai-session-${id}.txt`);
  
  // Format the session content
  let content = '';
  content += `Session: ${session.id}\n`;
  content += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
  content += `Updated: ${new Date(session.updatedAt).toLocaleString()}\n`;
  content += `Profile: ${session.profileName}\n`;
  content += `Agent: ${session.agentName || '(none)'}\n`;
  content += `\nMetadata:\n`;
  content += `  Token Count: ${session.metadata.tokenCount}\n`;
  content += `  Tool Calls: ${session.metadata.toolCalls}\n`;
  content += `\nMessages (${session.messages.length}):\n`;
  content += `${'='.repeat(80)}\n\n`;
  
  for (let i = 0; i < session.messages.length; i++) {
    const message = session.messages[i];
    const roleLabel = `[${message.role}]`;
    
    content += `${roleLabel}\n`;
    content += `${message.content}\n`;
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      content += `\nTool calls: ${message.tool_calls.length}\n`;
      for (const toolCall of message.tool_calls) {
        content += `  - ${toolCall.function.name}\n`;
      }
    }
    
    if (i < session.messages.length - 1) {
      content += `\n${'-'.repeat(80)}\n\n`;
    }
  }
  
  // Write to temp file
  await fs.writeFile(tmpFile, content, 'utf-8');
  
  // Open with less
  const less = spawn('less', ['-R', tmpFile], {
    stdio: 'inherit',
  });
  
  await new Promise<void>((resolve, reject) => {
    less.on('close', (code) => {
      // Clean up temp file
      fs.unlink(tmpFile).catch(() => {});
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`less exited with code ${code}`));
      }
    });
    less.on('error', reject);
  });
}

async function popSession(storage: Storage, countArg?: string): Promise<void> {
  // Get the current agent's session from config
  const config = await storage.loadConfig();
  const currentAgent = config.currentAgent;
  
  if (!currentAgent) {
    console.error(chalk.red('No active agent'));
    console.log('Start a session with: ai run <agent>');
    process.exit(1);
  }
  
  const sessionId = `session-${currentAgent}`;
  
  const session = await storage.loadSession(sessionId);
  
  if (session.messages.length === 0) {
    console.error(chalk.red('Session has no messages to pop'));
    process.exit(1);
  }
  
  // Determine how many messages to remove
  let count = 1;
  if (countArg) {
    count = parseInt(countArg);
    if (isNaN(count) || count <= 0) {
      console.error(chalk.red('Invalid count'));
      process.exit(1);
    }
  }
  
  // If count is 1 and last message is from assistant, remove 2 (user + assistant pair)
  if (count === 1 && session.messages[session.messages.length - 1].role === 'assistant') {
    count = 2;
  }
  
  // Ensure we don't try to remove more messages than exist
  count = Math.min(count, session.messages.length);
  
  // Remove and collect the messages
  const removedMessages: Message[] = [];
  for (let i = 0; i < count; i++) {
    const msg = session.messages.pop();
    if (msg) {
      removedMessages.unshift(msg); // Add to front to maintain order
    }
  }
  
  // Display removed messages
  console.log(chalk.bold(`\n💬 Removed ${removedMessages.length} message(s) from session: ${sessionId}\n`));
  
  for (const message of removedMessages) {
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
  
  // Update session metadata
  session.updatedAt = new Date().toISOString();
  
  // Save the updated session
  await storage.saveSession(session);
  
  console.log(chalk.green(`✓ Session updated (${session.messages.length} message(s) remaining)`));
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
  const meetings = await storage.listMeetingSessions();
  
  // Delete all regular sessions
  await storage.deleteAllSessions();
  
  // Delete all meeting sessions
  await storage.deleteAllMeetingSessions();
  
  const totalDeleted = sessions.length + meetings.length;
  console.log(chalk.green(`✓ Removed ${sessions.length} session(s) and ${meetings.length} meeting(s)`));
  console.log(chalk.gray(`  Total: ${totalDeleted} cleared`));
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

