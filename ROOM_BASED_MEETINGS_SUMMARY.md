# Room-Based Meeting System

## Overview

The meeting feature has been transformed into a **room-based system** that allows dynamic agent management. Instead of meetings being tied to a specific set of agents, they are now organized by room name, and agents can join or leave rooms dynamically.

## Key Changes

### 1. **Room Names Replace Agent Lists**

**Before:**
```bash
ai meeting ceo cto cfo  # Created meeting-ceo-cfo-cto
```

**After:**
```bash
ai meeting executive-team ceo cto cfo  # Creates room 'executive-team'
ai meeting executive-team              # Resume 'executive-team' room
```

### 2. **Dynamic Agent Management**

Agents can now be added or removed from a room during the meeting:

- `/add <agent>` - Add an agent to the current room
- `/remove <agent>` - Remove an agent from the current room

### 3. **Room-Based Chat History**

Chat history is now saved per room, not per agent combination:

- **Storage location:** `~/.ai/meetings/`
- **File naming:** `room-<room-name>.json`
- **Benefits:**
  - Agents can join/leave without losing conversation context
  - Multiple rooms can exist with different agent configurations
  - Easy to switch between different meeting contexts

## Usage Examples

### Creating a New Room

```bash
# Create a new room with initial agents
ai meeting executive-team ceo cto cfo

# Create a different room
ai meeting product-planning pm dev designer
```

### Resuming an Existing Room

```bash
# Resume with current participants
ai meeting executive-team

# Resume and add additional agents
ai meeting executive-team cmo marketing-director
```

### Managing Participants During a Meeting

```bash
# Add an agent to the room
/add cfo

# Remove an agent from the room
/remove cto

# View current participants
/participants

# Note: Changes take effect on next room restart
# To apply immediately: /quit and then rejoin the room
```

## New Slash Commands

### `/add <agent>`

Adds an agent to the current room.

**Example:**
```
/add cfo
```

**Output:**
```
✓ cfo joined the room
  Model: gpt-4
  Role: You are a Chief Financial Officer...

Note: Restart the room to apply changes or continue with current participants.
To restart: /quit and then run "ai meeting executive-team"
```

**Validation:**
- Agent must exist
- Agent cannot already be in the room
- Agent cannot be locked (busy in another session)

### `/remove <agent>`

Removes an agent from the current room.

**Example:**
```
/remove cto
```

**Output:**
```
✓ cto left the room

Note: Restart the room to apply changes or continue with current participants.
To restart: /quit and then run "ai meeting executive-team"
```

**Validation:**
- Agent must be in the room
- At least 2 agents must remain
- Buffered responses from removed agent are cleared

## Updated MeetingSession Type

```typescript
export interface MeetingSession {
  id: string;
  roomName: string;              // NEW: Name of the meeting room
  agentNames: string[];          // UPDATED: Can now change dynamically
  profileName: string;
  sharedMessages: MeetingMessage[];
  bufferedResponses: BufferedResponse[];
  metadata: MeetingMetadata;
  maxChainLength: number;
  checkInTokenLimit: number;
  createdAt: string;
  updatedAt: string;
}
```

## System Prompt Updates

The meeting context (system prompt) automatically reflects the current participants:

- Lists all other agents in the room
- Shows their roles and handles (@agent-name)
- Updates dynamically when agents join/leave
- Built fresh for each agent response

## Migration from Old Meeting Format

Old meetings (saved as `meeting-agent1-agent2-agent3.json`) are automatically migrated when loaded:

1. The `roomName` field is added based on the meeting ID
2. Default values for `maxChainLength` (5) and `checkInTokenLimit` (512) are set
3. The session is saved with the new format

## Use Cases

### 1. Executive Team Meeting

```bash
# Start with core team
ai meeting executive-team ceo cfo cto

# Add COO when needed
/add coo

# Remove CTO when they leave
/remove cto
```

### 2. Project Planning

```bash
# Initial planning session
ai meeting project-alpha pm dev designer

# Add QA for testing discussion
/add qa-lead

# Add client representative
/add client-rep
```

### 3. Multiple Concurrent Rooms

```bash
# Different rooms for different purposes
ai meeting daily-standup dev1 dev2 pm
ai meeting architecture-review senior-dev architect cto
ai meeting budget-review cfo finance-manager
```

## Benefits

1. **Flexibility:** Agents can join/leave without losing context
2. **Organization:** Rooms have meaningful names instead of agent-based IDs
3. **Scalability:** Multiple rooms can exist independently
4. **Persistence:** Room history persists across sessions
5. **Context Preservation:** Chat history stays with the room, not agent combinations

## Command Reference

### Main Command
- `ai meeting <room-name> [agent1] [agent2] ...` - Create or join a room

### Room Management
- `/add <agent>` - Add agent to room
- `/remove <agent>` - Remove agent from room
- `/participants` - List current participants
- `/status` - Show room status (includes room name)

### General Commands
- `/help` - Show all commands
- `/reset` - Clear room history
- `/quit` - Exit room
- All other meeting commands remain the same

## Technical Implementation

### Files Modified
1. `src/types/meeting.ts` - Added `roomName` field
2. `src/commands/meeting.ts` - Updated to accept room name + agents
3. `src/lib/meeting-slash-commands.ts` - Added `/add` and `/remove` handlers
4. `src/lib/slash-commands.ts` - Updated `/meeting` command syntax
5. Help text updated throughout

### Key Functions
- `handleAddAgent()` - Validates and adds agent to session
- `handleRemoveAgent()` - Validates and removes agent from session
- `buildMeetingContext()` - Dynamically reflects current participants

## Backward Compatibility

The system maintains backward compatibility:
- Old meeting sessions are automatically migrated
- The meeting ID format changed from `meeting-<agents>` to `room-<name>`
- All existing functionality remains intact

