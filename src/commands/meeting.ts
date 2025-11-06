// ai meeting command - multi-agent interactive sessions
import chalk from 'chalk';
import { Storage } from '../lib/storage.ts';
import { ConfigManager } from '../lib/config.ts';
import { startMeetingInteractive, getAgentColor } from '../lib/meeting-interactive.ts';
import { displayHistory } from '../lib/meeting-slash-commands.ts';
import type { Agent } from '../types/agent.ts';
import type { MeetingSession } from '../types/meeting.ts';
import type { Session } from '../types/session.ts';

export async function meetingCommand(roomNameOrAgents: string[]): Promise<void> {
  if (!roomNameOrAgents || roomNameOrAgents.length === 0) {
    console.error(chalk.red('Room name is required'));
    console.log('\nUsage: ai meeting <room-name> [<agent1> <agent2> ...]');
    console.log('       ai meeting restore <archive-name>');
    console.log('\nExamples:');
    console.log('  ai meeting executive-team ceo cto cfo  # Create new room with agents');
    console.log('  ai meeting executive-team               # Resume existing room');
    console.log('  ai meeting restore project-planning     # Restore archived session');
    process.exit(1);
  }

  // Handle 'restore' subcommand
  if (roomNameOrAgents[0] === 'restore') {
    await handleRestore(roomNameOrAgents.slice(1));
    return;
  }

  const storage = new Storage();
  await storage.init();
  const configManager = new ConfigManager(storage);

  // First argument is the room name
  const roomName = roomNameOrAgents[0];
  const initialAgentNames = roomNameOrAgents.slice(1);
  
  // Create or load meeting session
  const profileName = await configManager.getCurrentProfile();
  const meetingId = `room-${roomName}`;

  let meetingSession: MeetingSession;
  let agentNames: string[];
  let isResuming = false;
  
  try {
    // Try to load existing room
    const existingSession = await storage.loadMeetingSession(meetingId);
    meetingSession = existingSession;
    agentNames = meetingSession.agentNames;
    isResuming = true;
    
    // If agents were provided, add them to the room
    if (initialAgentNames.length > 0) {
      for (const agentName of initialAgentNames) {
        if (!agentNames.includes(agentName)) {
          agentNames.push(agentName);
        }
      }
      meetingSession.agentNames = agentNames;
    }
    
    // Migrate old sessions without roomName, maxChainLength or checkInTokenLimit
    let needsSave = false;
    if (!meetingSession.roomName) {
      meetingSession.roomName = roomName;
      needsSave = true;
    }
    if (meetingSession.maxChainLength === undefined) {
      meetingSession.maxChainLength = 5;
      needsSave = true;
    }
    if (meetingSession.checkInTokenLimit === undefined) {
      meetingSession.checkInTokenLimit = 512;
      needsSave = true;
    }
    if (needsSave || initialAgentNames.length > 0) {
      meetingSession.updatedAt = new Date().toISOString();
      await storage.saveMeetingSession(meetingSession);
    }
    
    console.log(chalk.blue(`\n📋 Resuming room: ${chalk.bold(roomName)}`));
    console.log(chalk.gray(`${meetingSession.sharedMessages.length} messages in history`));
  } catch {
    // Create new meeting room
    if (initialAgentNames.length < 2) {
      console.error(chalk.red('At least 2 agents are required for a new meeting room'));
      console.log('\nUsage: ai meeting <room-name> <agent1> <agent2> [<agent3>...]');
      console.log('\nExample: ai meeting executive-team ceo cto cfo');
      process.exit(1);
    }
    
    agentNames = initialAgentNames;
    meetingSession = {
      id: meetingId,
      roomName: roomName,
      agentNames: agentNames,
      profileName: profileName,
      sharedMessages: [],
      bufferedResponses: [],
      maxChainLength: 5, // Default: agents can chain up to 5 messages
      checkInTokenLimit: 512, // Default: check in after ~512 tokens
      metadata: {
        activeAgents: agentNames,
        totalMessages: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.saveMeetingSession(meetingSession);
    console.log(chalk.green(`\n🎯 Created new room: ${chalk.bold(roomName)}\n`));
  }

  // Validate all agents exist
  const agents: Agent[] = [];
  for (const agentName of agentNames) {
    try {
      const agent = await storage.loadAgent(agentName);
      agents.push(agent);
    } catch (error) {
      console.error(chalk.red(`Agent not found: ${agentName}`));
      console.log(`\nCreate an agent with: ai agent new ${agentName}`);
      console.log(`Or remove from room with: /remove ${agentName} (once in the meeting)`);
      process.exit(1);
    }
  }

  // Check if any agents are already locked
  for (const agentName of agentNames) {
    const isLocked = await storage.isAgentLocked(agentName);
    if (isLocked) {
      console.log(chalk.red(`\n⚠️  ${agentName} is currently busy in another session.`));
      console.log(chalk.yellow('Please try again when they are available.\n'));
      process.exit(1);
    }
  }

  // Display meeting room info
  console.log(chalk.bold(`Room: ${chalk.cyan(roomName)}`));
  console.log(chalk.bold('\nParticipants:'));
  for (const agent of agents) {
    const agentColor = getAgentColor(agent.name);
    console.log(`  ${agentColor(agent.name)} - ${chalk.gray(agent.model)}`);
  }
  console.log();
  console.log(chalk.gray('To direct your message to a specific agent:'));
  console.log(chalk.gray('  - Start with: <agent-name>, your message'));
  console.log(chalk.gray('  - Use anywhere: @<agent-name> your message'));
  console.log(chalk.gray('  - No targeting: all agents receive, most qualified responds'));
  console.log(chalk.gray('\nManage participants: /add <agent>, /remove <agent>'));
  console.log(chalk.gray('Type /help for commands, /quit to exit, or press Ctrl+C'));

  // Display history if resuming an existing room
  if (isResuming && meetingSession.sharedMessages.length > 0) {
    displayHistory(meetingSession, 10);
  } else if (!isResuming) {
    console.log();
  }

  // Start interactive meeting loop
  await startMeetingInteractive(agents, meetingSession, storage, configManager);
}

async function handleRestore(args: string[]): Promise<void> {
  if (args.length === 0) {
    // List available archives
    const storage = new Storage();
    await storage.init();
    
    const archives = await storage.listArchives();
    if (archives.length === 0) {
      console.log(chalk.yellow('\n⚠ No archived chats found'));
      console.log(chalk.gray('Use /clear in a meeting or agent chat to save to archive\n'));
      process.exit(1);
    }

    console.log(chalk.bold('\n📦 Archived Chats\n'));
    for (const name of archives) {
      try {
        const archived = await storage.loadArchive(name);
        const isMeeting = 'roomName' in archived;
        const messageCount = isMeeting 
          ? (archived as MeetingSession).sharedMessages.length
          : (archived as Session).messages.length;
        
        console.log(`  ${chalk.cyan(name)}`);
        console.log(`    ${chalk.gray(`Type: ${isMeeting ? 'Meeting Room' : 'Agent Chat'}`)}`);
        console.log(`    ${chalk.gray(`Messages: ${messageCount}`)}`);
        console.log(`    ${chalk.gray(`Updated: ${archived.updatedAt}`)}`);
      } catch {
        console.log(`  ${chalk.cyan(name)}`);
      }
    }
    console.log();
    console.log(chalk.gray('Usage: ai meeting restore <archive-name>'));
    console.log();
    process.exit(0);
  }

  const archiveName = args[0];
  const storage = new Storage();
  await storage.init();
  const configManager = new ConfigManager(storage);

  try {
    // Load the archive
    const archived = await storage.loadArchive(archiveName);
    const isMeeting = 'roomName' in archived;

    if (isMeeting) {
      // It's a meeting room - restore and start meeting
      const meetingSession = archived as MeetingSession;
      
      console.log(chalk.green(`\n📦 Restoring meeting room: ${chalk.bold(meetingSession.roomName || meetingSession.id)}`));
      console.log(chalk.gray(`Participants: ${meetingSession.agentNames.join(', ')}`));
      console.log(chalk.gray(`Messages: ${meetingSession.sharedMessages.length}`));
      
      // Save the restored meeting session
      await storage.saveMeetingSession(meetingSession);
      
      // Load all agents
      const agents: Agent[] = [];
      for (const agentName of meetingSession.agentNames) {
        try {
          const agent = await storage.loadAgent(agentName);
          agents.push(agent);
        } catch (error) {
          console.error(chalk.red(`Agent not found: ${agentName}`));
          console.log(`\nCreate an agent with: ai agent new ${agentName}`);
          process.exit(1);
        }
      }

      // Check if any agents are already locked
      for (const agentName of meetingSession.agentNames) {
        const isLocked = await storage.isAgentLocked(agentName);
        if (isLocked) {
          console.log(chalk.red(`\n⚠️  ${agentName} is currently busy in another session.`));
          console.log(chalk.yellow('Please try again when they are available.\n'));
          process.exit(1);
        }
      }

      // Display meeting room info
      console.log(chalk.bold(`\nRoom: ${chalk.cyan(meetingSession.roomName || meetingSession.id)}`));
      console.log(chalk.bold('\nParticipants:'));
      for (const agent of agents) {
        const agentColor = getAgentColor(agent.name);
        console.log(`  ${agentColor(agent.name)} - ${chalk.gray(agent.model)}`);
      }
      console.log();
      console.log(chalk.gray('To direct your message to a specific agent:'));
      console.log(chalk.gray('  - Start with: <agent-name>, your message'));
      console.log(chalk.gray('  - Use anywhere: @<agent-name> your message'));
      console.log(chalk.gray('  - No targeting: all agents receive, most qualified responds'));
      console.log(chalk.gray('\nManage participants: /add <agent>, /remove <agent>'));
      console.log(chalk.gray('Type /help for commands, /quit to exit, or press Ctrl+C'));

      // Display full history
      if (meetingSession.sharedMessages.length > 0) {
        console.log(chalk.bold.yellow('\n📜 Restored Chat History:\n'));
        displayHistory(meetingSession, meetingSession.sharedMessages.length);
      }

      // Start interactive meeting loop
      await startMeetingInteractive(agents, meetingSession, storage, configManager);
    } else {
      // It's an agent chat - switch to agent mode
      const agentSession = archived as Session;
      
      if (!agentSession.agentName) {
        console.error(chalk.red('\n✗ Archived session has no agent name'));
        process.exit(1);
      }

      console.log(chalk.green(`\n📦 Restoring agent chat: ${chalk.bold(agentSession.agentName)}`));
      console.log(chalk.gray(`Messages: ${agentSession.messages.length}`));
      
      // Save the restored agent session
      await storage.saveSession(agentSession);
      
      // Display full history
      if (agentSession.messages.length > 0) {
        console.log(chalk.bold.yellow('\n📜 Restored Chat History:\n'));
        
        // Display all messages
        for (const msg of agentSession.messages) {
          if (msg.role === 'user') {
            console.log(chalk.blue('[User]'));
            console.log(msg.content);
          } else if (msg.role === 'assistant') {
            console.log(chalk.green(`[${agentSession.agentName}]`));
            console.log(msg.content);
          }
          console.log();
        }
      }
      
      console.log(chalk.gray('\nSwitching to agent mode...\n'));
      
      // Import and call runCommand
      const { runCommand } = await import('./run.js');
      await runCommand(agentSession.agentName);
    }
  } catch (error) {
    console.error(chalk.red(`\n✗ Archive not found: ${archiveName}`));
    console.log(chalk.gray('Use: ai meeting restore (without name) to see available archives\n'));
    process.exit(1);
  }
}

