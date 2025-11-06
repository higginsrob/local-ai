# Buffered Responses & Direct Call Update

## Overview

Separated the dual functionality of `/respond` into two distinct commands to clarify when you're calling on an agent with a raised hand (buffered response) versus asking an agent to respond to the current chat.

## Key Changes

### 1. **Separated Response Commands**

**Before:**
- `/respond <agent>` handled both buffered responses AND forced agent responses
- Confusing dual behavior

**After:**
- `/respond <agent>` or `/r <agent>` - ONLY calls on agents with raised hands (buffered responses)
- `/@ <agent>` - NEW command to ask any agent to respond to current chat state

### 2. **Buffered Responses Go to Chat History**

When you call on an agent with a raised hand using `/respond <agent>`:
- Their buffered response is displayed
- The response is **automatically added to the chat history**
- The response is removed from the buffered queue
- You can call `/respond` multiple times to hear from different agents

### 3. **Auto-Clear Buffered Responses**

Buffered responses are automatically cleared when:
- User makes a new prompt to the room
- User sends a message to any agent
- **Note:** Agent-to-agent messages (chainDepth > 0) do NOT clear buffered responses

When cleared, you'll see a notification:
```
(Clearing 2 buffered responses)
```

## Command Reference

### `/respond <agent>` (or `/r <agent>`, `/`)

**Purpose:** Call on an agent who has raised their hand (buffered response)

**Usage:**
```
/respond cfo
/r cfo
/ cfo
```

**Behavior:**
- Shows the agent's buffered response
- Adds response to chat history
- Removes from buffered queue
- Can be called multiple times for different agents

**When no buffered response:**
```
⚠️  cfo does not have a raised hand (no buffered response)
To ask cfo to respond to the current chat, use: /@ cfo
```

### `/@ <agent>`

**Purpose:** Ask a specific agent to respond to the current chat state

**Usage:**
```
/@ cfo
/@ cto
```

**Behavior:**
- Requests fresh response from the agent
- Agent responds based on current conversation context
- Response is added to chat history
- Works whether or not the agent has a buffered response

## Workflow Examples

### Example 1: Multiple Buffered Responses

```
User: What's our Q3 budget looking like?

CEO: Great question. @CFO what are the numbers? @COO how are operations?

✋ CFO also has an answer (use /respond CFO)
✋ COO also has an answer (use /respond COO)

User: /respond CFO
CFO: Our Q3 budget is $2.5M with 15% allocated to R&D...

User: /respond COO
COO: Operations are running smoothly. We're on track for...

User: Thanks! What about Q4 planning?

(Clearing 0 buffered responses)

CEO: For Q4, we should focus on...
```

### Example 2: Direct Call

```
User: We need to discuss the new API architecture

CTO: I think we should go with microservices. What do you think?

User: /@ senior-dev
Asking senior-dev to respond...

senior-dev: I agree with the CTO. Microservices would give us...
```

### Example 3: Buffered Responses Cleared on New Prompt

```
User: Should we invest in this new technology?

CTO: I'm in favor. @CFO and @VP-Sales, thoughts?

✋ CFO also has an answer (use /respond CFO)
✋ VP-Sales also has an answer (use /respond VP-Sales)

User: Actually, let's table that. What about the quarterly review?

(Clearing 2 buffered responses)

CEO: For the quarterly review, I suggest...
```

## Implementation Details

### Files Modified

1. **`src/lib/meeting-slash-commands.ts`**
   - Split `handleRespond()` to only handle buffered responses
   - Added new `handleDirectCall()` for `/@ <agent>` command
   - Updated help text
   - Improved error messages

2. **`src/lib/meeting-interactive.ts`**
   - Added auto-clear logic for buffered responses
   - Clears when user makes new prompt (chainDepth === 0)
   - Shows notification when clearing

### Key Functions

#### `handleRespond(agentName, session, agents, storage)`
- Validates agent exists in room
- Checks for buffered response
- If found: displays it, adds to history, removes from buffer
- If not found: suggests using `/@ <agent>` instead

#### `handleDirectCall(agentName, session, agents, client, storage, configManager)`
- Validates agent exists in room
- Requests fresh response from agent
- Streams response in real-time
- Adds response to chat history

#### Auto-clear in `handleMeetingMessage()`
```typescript
if (chainDepth === 0 && session.bufferedResponses.length > 0) {
  console.log(chalk.gray(`\n(Clearing ${session.bufferedResponses.length} buffered response(s))\n`));
  session.bufferedResponses = [];
}
```

## Benefits

1. **Clarity:** Clear distinction between buffered responses and forced responses
2. **Control:** Users can choose when to hear buffered responses
3. **History Management:** Buffered responses properly integrate into chat history
4. **Clean State:** Automatic clearing prevents stale buffered responses
5. **Flexibility:** Call multiple buffered responses or skip them entirely

## Backward Compatibility

- `/respond` still works but with more focused behavior
- `/r` shortcut retained
- `/` shortcut retained
- All buffered response functionality preserved
- Only adds new `/@ <agent>` command

## Usage Tips

1. **Use `/respond` when:** You see "✋ agent also has an answer"
2. **Use `/@ agent` when:** You want a specific agent's perspective on current chat
3. **Check buffered responses:** Use `/buffered` or `/b` to see who has raised hands
4. **Clear understanding:** Buffered responses auto-clear on new prompts

