# CLI Restore Command Feature

## Overview
Added `ai meeting restore <archive-name>` command to allow users to restore archived sessions directly from the command line, automatically loading and displaying the full chat history before starting the interactive session.

## Features Implemented

### 1. New CLI Command: `ai meeting restore`

**Usage:**
```bash
# List all available archives
ai meeting restore

# Restore a specific archive
ai meeting restore <archive-name>
```

### 2. List Archives (No Arguments)

When called without arguments, displays all available archived chats:

```bash
$ ai meeting restore

📦 Archived Chats

  project-planning
    Type: Meeting Room
    Messages: 45
    Updated: 2025-11-06T10:30:00.000Z

  typescript-discussion
    Type: Agent Chat
    Messages: 10
    Updated: 2025-11-06T09:15:00.000Z

  executive-meeting
    Type: Meeting Room
    Messages: 67
    Updated: 2025-11-05T14:22:00.000Z

Usage: ai meeting restore <archive-name>
```

### 3. Restore Archived Meeting Room

When restoring a meeting room archive:

1. **Loads the archived meeting session**
2. **Saves it as the current session** (overwrites current room state)
3. **Loads all participant agents** (validates they exist)
4. **Checks agent availability** (ensures no agent is locked)
5. **Displays meeting info** (room name, participants, instructions)
6. **Shows full restored history** with color-coded messages
7. **Starts interactive meeting** with all history loaded

**Example:**
```bash
$ ai meeting restore executive-meeting

📦 Restoring meeting room: executive-team
Participants: ceo, cfo, cto, cso
Messages: 45

Room: executive-team

Participants:
  ceo - llama3.2:3b-instruct-fp16
  cfo - llama3.2:3b-instruct-fp16
  cto - llama3.2:3b-instruct-fp16
  cso - llama3.2:3b-instruct-fp16

To direct your message to a specific agent:
  - Start with: <agent-name>, your message
  - Use anywhere: @<agent-name> your message
  - No targeting: all agents receive, most qualified responds

Manage participants: /add <agent>, /remove <agent>
Type /help for commands, /quit to exit, or press Ctrl+C

📜 Restored Chat History:

💬 Recent Messages (last 45)

[User]
What should we focus on this quarter?

[ceo]
I think we should prioritize growth in Q4...

[cfo]
From a budget perspective, we need to watch costs...

[cto]
Technically, we can handle the new features...

[cso]
Customer feedback suggests we should focus on...

(continues with full history...)

?  › 
```

### 4. Restore Archived Agent Chat

When restoring an agent chat archive:

1. **Loads the archived agent session**
2. **Saves it as the current session** (overwrites current agent session)
3. **Displays full restored history** with color-coded messages
4. **Switches to agent mode** using the agent from the archive
5. **Starts interactive agent chat** with all history loaded

**Example:**
```bash
$ ai meeting restore code-review

📦 Restoring agent chat: dev
Messages: 15

📜 Restored Chat History:

[User]
Can you review this TypeScript function?

[dev]
I'd be happy to review it. Let me analyze the code...

[User]
What about error handling?

[dev]
Good question. Here are some improvements...

(continues with full history...)

Switching to agent mode...

Type /help for commands, /quit to exit, or press Ctrl+C
?  › 
```

## Implementation Details

### File Modified
- `src/commands/meeting.ts`
  - Added `import type { Session }` for type checking
  - Updated help text to include restore command
  - Added check for `restore` subcommand at entry point
  - Implemented `handleRestore()` function

### handleRestore() Function

**Responsibilities:**
1. **List mode** (no args): Display all archives and exit
2. **Restore mode** (with archive name):
   - Load archive from storage
   - Detect type (meeting vs agent session)
   - For meetings:
     - Save to meetings directory
     - Load all agents
     - Validate availability
     - Display room info
     - Display full history
     - Start meeting interactive
   - For agent chats:
     - Save to sessions directory
     - Display full history
     - Import and call `runCommand` to start agent chat

### History Display

**Meeting History:**
- Uses existing `displayHistory()` function from `meeting-slash-commands.ts`
- Passes full message count to show entire history
- Color-coded by agent using `getAgentColor()`

**Agent Chat History:**
- Custom display loop
- Shows `[User]` in blue
- Shows `[agent-name]` in green
- Displays full conversation history

### Cross-Mode Support

The restore command intelligently handles cross-mode restoration:
- Archive is a **meeting** → Starts meeting mode with that room
- Archive is an **agent chat** → Starts agent mode with that agent

This allows flexible restoration regardless of current context.

## Usage Examples

### Example 1: List Available Archives
```bash
$ ai meeting restore
# Shows all archived chats with type and message count
```

### Example 2: Restore Meeting Room
```bash
$ ai meeting restore executive-meeting
# Loads meeting, shows full history, starts meeting interactive
```

### Example 3: Restore Agent Chat
```bash
$ ai meeting restore typescript-discussion
# Loads agent chat, shows full history, starts agent interactive
```

### Example 4: Archive Not Found
```bash
$ ai meeting restore nonexistent

✗ Archive not found: nonexistent
Use: ai meeting restore (without name) to see available archives
```

## Benefits

1. **Quick Access to Archives**
   - No need to enter interactive mode first
   - Direct command-line access to any archive
   - Fast navigation between archived conversations

2. **Full History Display**
   - See entire conversation history before interacting
   - Review context before continuing discussion
   - Color-coded messages for easy reading

3. **Seamless Continuation**
   - History is loaded into the session
   - Agents have full context from archived conversation
   - Continue exactly where you left off

4. **Cross-Mode Flexibility**
   - Restore meetings from anywhere
   - Restore agent chats from anywhere
   - Automatic mode switching

5. **Safety Checks**
   - Validates all agents exist before starting
   - Checks agent availability (lock status)
   - Clear error messages if something is missing

## Integration with Existing Features

### Works With `/clear` Save Prompt
1. User runs `/clear` in a session
2. Prompted to save chat history
3. Names it and saves to archive
4. Later runs `ai meeting restore <name>`
5. Full history restored and displayed

### Works With `/restore` Command
- CLI command: `ai meeting restore <name>` - Starts from scratch
- Slash command: `/restore <name>` - Within existing session
- Both access same archive storage
- Both support cross-mode restoration

### Complements Regular Meeting Command
```bash
# Traditional way - resume current room
ai meeting executive-team

# New way - restore from archive
ai meeting restore executive-meeting-archived

# Both start interactive mode with history
```

## Error Handling

1. **No archives available**: Clear message, instructs how to create archives
2. **Archive not found**: Suggests using list command to see available
3. **Agent not found**: Indicates which agent is missing, how to create
4. **Agent locked**: Shows which agent is busy, suggests trying later
5. **No agent name in archive**: Error for corrupted agent archives

## Technical Notes

### Storage Integration
- Uses existing `Storage.loadArchive()` method
- Archives stored in `~/.ai/archive/` directory
- Type detection via `'roomName' in archived` check
- Session saved to appropriate directory (meetings or sessions)

### Import Strategy
For agent chat restoration, dynamically imports run command:
```typescript
const { runCommand } = await import('./run.js');
await runCommand(agentSession.agentName);
```

This avoids circular dependencies and allows seamless handoff.

### Color Coding
- Meeting history: Uses per-agent colors via `getAgentColor()`
- Agent history: User in blue, agent in green
- Matches colors used in interactive mode

## Future Enhancements

Potential improvements:
- Add date/time filtering: `ai meeting restore --since yesterday`
- Add archive search: `ai meeting restore --search "cloud discussion"`
- Add preview mode: `ai meeting restore <name> --preview` (show history only, don't start)
- Add restore with merge: Combine current session with archived
- Add auto-restore last session: `ai meeting restore --last`

## Build Status
- ✅ No linter errors
- ✅ TypeScript compilation successful
- ✅ All features tested and working

