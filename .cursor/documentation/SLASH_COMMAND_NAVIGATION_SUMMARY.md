# Slash Command Navigation Feature

## Overview
Added slash commands to switch between agents and meetings seamlessly from within interactive sessions.

## New Slash Commands

### In Regular Agent Sessions (`ai run <agent>`)

#### `/agent <agent-name>`
Switch to a different agent without leaving the interactive session.

**Usage:**
```
/agent dev          # Switch to the 'dev' agent
/agent              # Show list of available agents
```

**Features:**
- Validates agent exists before switching
- Preserves current session state
- Unlocks current agent and locks the new agent
- Automatically loads the new agent's session

#### `/meeting <agent1> <agent2> [<agent3>...]`
Start a meeting with multiple agents from within an agent session.

**Usage:**
```
/meeting ceo cto cfo       # Start meeting with 3 agents
/meeting dev pm            # Start meeting with 2 agents
```

**Features:**
- Requires at least 2 agents
- Validates all agents exist
- Checks if agents are available (not locked)
- Unlocks current agent before starting meeting
- Locks all meeting participants

### In Meeting Sessions (`ai meeting <agent1> <agent2> ...`)

#### `/agent <agent-name>`
Leave the meeting and switch to a single-agent session.

**Usage:**
```
/agent cto          # Leave meeting and chat with CTO alone
/agent              # Show list of available agents
```

**Features:**
- Validates agent exists before switching
- Unlocks all meeting participants
- Locks the selected agent
- Loads the agent's individual session

## Implementation Details

### Files Modified

1. **`src/types/cli.ts`**
   - Extended `SlashCommandResult` interface with:
     - `switchToAgent?: string` - Signals agent switch
     - `switchToMeeting?: string[]` - Signals meeting start

2. **`src/lib/slash-commands.ts`**
   - Added `/agent` command handler
   - Added `/meeting` command handler
   - Updated help text

3. **`src/lib/interactive.ts`**
   - Added logic to handle `switchToAgent` flag
   - Added logic to handle `switchToMeeting` flag
   - Properly unlocks agents and unloads models before switching

4. **`src/lib/meeting-slash-commands.ts`**
   - Extended `MeetingSlashCommandResult` interface with `switchToAgent`
   - Added `/agent` command handler
   - Updated help text

5. **`src/lib/meeting-interactive.ts`**
   - Added logic to handle `switchToAgent` flag
   - Properly unlocks all meeting agents before switching

## User Experience Flow

### Switching Agents (Regular Session)
```
You: working with dev agent...
› /agent ceo

✓ Switching to agent: ceo
Loading agent session...

[Session switches to CEO agent seamlessly]
```

### Starting a Meeting (Regular Session)
```
You: working with dev agent...
› /meeting dev pm cto

✓ Starting meeting with: dev, pm, cto
Initializing meeting...

[Meeting mode starts with all three agents]
```

### Leaving Meeting for Single Agent
```
You: in meeting with ceo, cto, cfo...
› /agent cto

✓ Switching to agent: cto
Leaving meeting and loading agent session...

[One-on-one session with CTO begins]
```

## Benefits

1. **Seamless Navigation** - No need to exit and restart CLI
2. **Context Preservation** - Each agent/meeting session is preserved
3. **Proper Resource Management** - Agents are properly locked/unlocked
4. **Validation** - All commands validate agent existence before switching
5. **User Feedback** - Clear messages about what's happening

## Notes

- Agent locks are properly managed to prevent concurrent access
- Session history is automatically saved before switching
- Models are properly unloaded before switching to prevent resource conflicts
- All switches validate agent availability (not locked by another process)

