# Auto-Display History on Room Join

## Overview

When joining an existing meeting room, the last 10 messages are automatically displayed to provide context and continuity from previous sessions.

## Behavior

### When Creating a New Room
- No history displayed (room is new)
- Standard welcome message shown
- Ready to start fresh conversation

**Example:**
```bash
$ ai meeting executive-team ceo cfo cto

🎯 Created new room: executive-team

Room: executive-team

Participants:
  ceo - gpt-4
  cfo - gpt-4
  cto - gpt-4

...
```

### When Resuming an Existing Room
- Displays "Resuming room" message
- Shows count of total messages
- **Automatically displays last 10 messages**
- Provides context for continuing conversation

**Example:**
```bash
$ ai meeting executive-team

📋 Resuming room: executive-team
5 messages in history

Room: executive-team

Participants:
  ceo - gpt-4
  cfo - gpt-4
  cto - gpt-4

...

💬 Recent Messages (last 5)

[User]
What's our Q3 budget?

[CEO]
Good question. @CFO can you provide the details?

[CFO]
Our Q3 budget is $2.5M with 15% allocated to R&D...

[User]
Thanks! What about operational costs?

[COO]
Operational costs are running at $1.2M per quarter...

>
```

## Implementation Details

### Files Modified

1. **`src/lib/meeting-slash-commands.ts`**
   - Extracted `displayHistory()` as a standalone exported function
   - Handles both slash command `/history` and programmatic calls
   - Shows "(No message history)" when room is empty
   - Default displays 10 messages

2. **`src/commands/meeting.ts`**
   - Added `isResuming` flag to track new vs. existing rooms
   - Imports `displayHistory()` function
   - Calls `displayHistory(meetingSession, 10)` when resuming
   - Only displays if `isResuming && meetingSession.sharedMessages.length > 0`

### Key Functions

#### `displayHistory(session: MeetingSession, count: number = 10): void`

**Purpose:** Display recent messages from a meeting session

**Parameters:**
- `session` - The meeting session containing message history
- `count` - Number of recent messages to display (default: 10)

**Behavior:**
- Shows "(No message history)" if empty
- Displays last N messages with proper formatting
- User messages in blue
- Agent messages in their assigned color
- Shows target agent if message was directed

**Export:** Yes (can be called from other modules)

## Benefits

1. **Context Continuity:** Users immediately see what was discussed previously
2. **Quick Refresh:** No need to manually call `/history` when resuming
3. **Better UX:** Seamless transition into ongoing conversations
4. **Smart Display:** Only shows history when resuming, not for new rooms
5. **Consistent Format:** Uses the same formatting as `/history` command

## Configuration

The default display count is **10 messages**. This provides enough context without overwhelming the terminal.

To see more history after joining:
```
/history 20    # Show last 20 messages
/history 50    # Show last 50 messages
/history       # Show last 10 messages (default)
```

## Related Commands

- `/history [count]` - Manually display recent messages at any time
- `/status` - See total message count and room statistics
- `/clear` - Clear room history and screen

## Use Cases

### 1. Continuing Yesterday's Discussion
```bash
# Resume morning standup from yesterday
$ ai meeting daily-standup

💬 Recent Messages (last 10)
# ... shows yesterday's conversation ...
# Pick up right where you left off
```

### 2. Multi-Session Planning
```bash
# Return to long-running project planning
$ ai meeting project-alpha

💬 Recent Messages (last 10)
# ... shows previous decisions and discussions ...
# Continue planning with full context
```

### 3. Ad-Hoc Meetings
```bash
# Jump back into impromptu discussion
$ ai meeting budget-review

💬 Recent Messages (last 10)
# ... shows what was already discussed ...
# Add new information or make decisions
```

## Technical Notes

### Message Formatting

**User Messages:**
```
[User]
(to: agent-name)  # Only shown if message was targeted
Message content here
```

**Agent Messages:**
```
[AgentName]
Response content here
```

### Empty Room Handling

If a room exists but has no messages:
```
(No message history)
```

### Display Logic

```typescript
if (isResuming && meetingSession.sharedMessages.length > 0) {
  displayHistory(meetingSession, 10);
}
```

Only displays when:
1. Room is being resumed (not newly created)
2. Room has at least one message

## Future Enhancements

Potential improvements:
- Configurable default message count
- Smart truncation for very long messages
- Timestamp display in history
- Search/filter history by agent or keyword
- Export history to file

