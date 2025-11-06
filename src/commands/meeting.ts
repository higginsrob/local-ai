// ai meeting command - multi-agent interactive sessions
import chalk from 'chalk';
import { Storage } from '../lib/storage.ts';
import { ConfigManager } from '../lib/config.ts';
import { startMeetingInteractive, getAgentColor } from '../lib/meeting-interactive.ts';
import type { Agent } from '../types/agent.ts';
import type { MeetingSession } from '../types/meeting.ts';

export async function meetingCommand(agentNames: string[]): Promise<void> {
  if (!agentNames || agentNames.length < 2) {
    console.error(chalk.red('At least 2 agents are required for a meeting'));
    console.log('\nUsage: ai meeting <agent1> <agent2> [<agent3>...]');
    console.log('\nExample: ai meeting ceo cto cfo');
    process.exit(1);
  }

  const storage = new Storage();
  await storage.init();
  const configManager = new ConfigManager(storage);

  // Validate all agents exist
  const agents: Agent[] = [];
  for (const agentName of agentNames) {
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
  for (const agentName of agentNames) {
    const isLocked = await storage.isAgentLocked(agentName);
    if (isLocked) {
      console.log(chalk.red(`\n⚠️  ${agentName} is currently busy in another session.`));
      console.log(chalk.yellow('Please try again when they are available.\n'));
      process.exit(1);
    }
  }

  // Create or load meeting session
  const profileName = await configManager.getCurrentProfile();
  const meetingId = `meeting-${agentNames.sort().join('-')}`;

  let meetingSession: MeetingSession;
  try {
    const existingSession = await storage.loadMeetingSession(meetingId);
    meetingSession = existingSession;
    
    // Migrate old sessions without maxChainLength or checkInTokenLimit
    let needsSave = false;
    if (meetingSession.maxChainLength === undefined) {
      meetingSession.maxChainLength = 4;
      needsSave = true;
    }
    if (meetingSession.checkInTokenLimit === undefined) {
      meetingSession.checkInTokenLimit = 1024;
      needsSave = true;
    }
    if (needsSave) {
      await storage.saveMeetingSession(meetingSession);
    }
    
    console.log(chalk.blue(`\n📋 Resuming meeting: ${agentNames.join(', ')}`));
    console.log(chalk.gray(`${meetingSession.sharedMessages.length} messages in history\n`));
  } catch {
    // Create new meeting session
    meetingSession = {
      id: meetingId,
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
    console.log(chalk.green(`\n🎯 Starting new meeting with: ${agentNames.join(', ')}\n`));
  }

  // Display meeting participants
  console.log(chalk.bold('Meeting Participants:'));
  for (const agent of agents) {
    const agentColor = getAgentColor(agent.name);
    console.log(`  ${agentColor(agent.name)} - ${chalk.gray(agent.model)}`);
  }
  console.log();
  console.log(chalk.gray('To direct your message to a specific agent:'));
  console.log(chalk.gray('  - Start with: <agent-name>, your message'));
  console.log(chalk.gray('  - Use anywhere: @<agent-name> your message'));
  console.log(chalk.gray('  - No targeting: all agents receive, most qualified responds'));
  console.log(chalk.gray('\nType /help for commands, /quit to exit, or press Ctrl+C\n'));

  // Start interactive meeting loop
  await startMeetingInteractive(agents, meetingSession, storage, configManager);
}

