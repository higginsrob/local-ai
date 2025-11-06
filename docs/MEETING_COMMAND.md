# Meeting Command

The `ai meeting` command enables interactive multi-agent sessions where you can collaborate with multiple AI agents simultaneously in a single conversation.

## Overview

The meeting feature allows you to:
- Chat with multiple agents at once
- Direct messages to specific agents or broadcast to all
- Let agents self-select based on expertise (most qualified responds)
- Buffer concurrent responses and view them on demand
- Maintain shared conversation history across all agents

## Usage

### Starting a Meeting

```bash
ai meeting <agent1> <agent2> [<agent3>...]
```

**Example:**
```bash
ai meeting ceo cto cfo
```

You need at least 2 agents to start a meeting. The command will:
1. Validate that all agents exist
2. Check that no agent is currently locked by another session
3. Create or resume a meeting session
4. Display meeting participants

### Message Targeting

There are three ways to send messages in a meeting:

#### 1. Direct Message with Comma Prefix
Start your message with `<agent-name>,` to direct it to a specific agent:

```
cto, what's your opinion on our architecture?
```

#### 2. Mention with @ Symbol
Use `@<agent-name>` anywhere in your message to target an agent:

```
I think we should prioritize security @cto
```

#### 3. Broadcast (No Target)
Send a message without targeting anyone:

```
What are the main challenges we face?
```

When broadcasting, all agents receive the message with a special instruction: they should only respond if they believe they are the most qualified agent to answer. Agents who don't feel qualified will respond with "PASS" and won't participate in that exchange.

### Response Handling

#### First Responder Streams
When multiple agents want to respond to a broadcast message:
- The first agent streams their response in real-time
- Other agents' responses are buffered

#### Buffered Responses
Agents who want to respond but aren't first will "raise their hand":

```
ceo: (streams response...)

✋ cfo also has an answer (use /respond cfo)
✋ cto also has an answer (use /respond cto)
```

Use the `/respond` command to view buffered responses:

```
/respond cfo
```

This will display the CFO's buffered response and add it to the shared conversation history.

## Agent-to-Agent Communication

One of the most powerful features of meetings is that **agents can talk to each other**! When an agent mentions another agent using `@agent-name` in their response, the mentioned agent will automatically respond, creating natural multi-agent conversations.

### How It Works

1. **Agent mentions another agent**: Any agent can use `@agent-name` in their response
2. **Automatic response**: The mentioned agent automatically formulates a response
3. **Chain continues**: The conversation can continue for up to `maxChainLength` iterations (default: 4)
4. **Guard rails**: When the max depth is reached, the chain stops and returns control to the user

### Example Agent-to-Agent Chain

```
User: What's our Q1 strategy?

ceo: We need to focus on growth. @cto what's your capacity for scaling?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: We can handle 2x growth, but @cfo we'll need budget for infrastructure.

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: I can allocate $300K for Q1. @ceo does that align with revenue projections?

      ↳ [Agent-to-agent chain, depth 3/4]

ceo: Yes, that works. With that budget we can target 150% growth...

>
```

### Chain Depth Control

The `maxChainLength` setting (default: 4) controls how many times agents can respond to each other before the conversation returns to you:

- **Depth 0**: Your message to agents
- **Depth 1**: Agent A responds and mentions Agent B
- **Depth 2**: Agent B responds and mentions Agent C
- **Depth 3**: Agent C responds and mentions Agent A
- **Depth 4**: Agent A responds (max reached, chain stops)

### Managing Chain Length

View current setting:
```
> /chain-length

🔗 Agent-to-Agent Chain Settings

  Max Chain Length: 4
  
Use /chain-length <number> to change
```

Change the setting:
```
> /chain-length 6
✓ Max chain length updated: 4 → 6

> /chain-length 0
✓ Max chain length updated: 6 → 0
⚠️  Agent-to-agent chaining is now disabled.
```

**Settings:**
- `0` - Disables agent-to-agent chaining (agents can still mention each other, but won't auto-respond)
- `1-3` - Short chains, good for focused discussions
- `4-6` - Medium chains (default: 4), balanced
- `7+` - Long chains, can lead to extensive agent discussions

### When Max Depth Is Reached

When the chain reaches `maxChainLength`, you'll see:

```
⚠️  Max chain depth (4) reached. Agents mentioned but not responding: cto, cfo
Use /respond <agent> to hear their response, or /chain-length to adjust the limit
```

You can then:
- Use `/respond <agent>` to manually get their response
- Increase `/chain-length` if you want longer chains
- Continue the conversation with your own message

## Meeting Slash Commands

### Core Commands

- `/help` or `/h` - Show available commands
- `/clear` or `/c` - Clear terminal screen
- `/quit` or `/q` - Exit the meeting

### Response Management

- `/respond <agent>` - Show buffered response from a specific agent
- `/buffered` or `/b` - List all agents with buffered responses

### Meeting Information

- `/participants` or `/p` - Show all meeting participants
- `/status` or `/s` - Show meeting statistics
- `/history [count]` - Show recent messages (default: 10)

### Agent-to-Agent Controls

- `/chain-length` - View current max chain length setting
- `/chain-length <n>` - Set max agent-to-agent conversation depth (default: 4)

### Session Management

- `/reset` or `/r` - Clear meeting history (keeps participants)

## Meeting Session Persistence

Meeting sessions are automatically saved after each exchange. The session ID is based on the sorted list of agent names, so resuming a meeting with the same agents will restore the previous conversation:

```bash
# First meeting
ai meeting ceo cfo cto

# Later - resumes the same meeting
ai meeting ceo cto cfo  # Order doesn't matter
```

Meeting sessions are stored in `~/.ai/meetings/`

## Agent Locking

During a meeting, all participating agents are locked to prevent them from being used in other sessions simultaneously. Agents are automatically unlocked when:
- You exit the meeting normally
- You interrupt with Ctrl+C
- The process terminates

If a meeting terminates unexpectedly, the agent locks are automatically cleaned up based on process ID tracking.

## Example Workflow

```bash
# Start a strategic planning meeting
ai meeting ceo cto cfo

# Broadcast a question - most qualified agent responds
> What should be our top priority for Q1?

ceo: Based on market conditions...

# Direct follow-up to CFO
> cfo, what's the budget impact?

cfo: The financial implications are...

# Another agent had thoughts on the original question
✋ cto also has an answer (use /respond cto)

# Get the CTO's perspective
> /respond cto

cto: From a technical standpoint...

# Check who's in the meeting
> /participants

👥 Meeting Participants

  ceo
    Model: ai/llama3.2:latest
    Role: You are a CEO focused on strategy...

  cfo
    Model: ai/llama3.2:latest
    Role: You are a CFO focused on finances...

  cto
    Model: ai/llama3.2:latest
    Role: You are a CTO focused on technology...

# View conversation history
> /history 5

# Exit when done
> /quit
```

## Technical Details

### Message Flow

1. **User Input** → Parsed for targeting (`<agent>,` or `@<agent>`)
2. **Direct Target** → Only targeted agent(s) respond
3. **Broadcast** → All agents evaluate if they should respond
4. **Response Collection** → All willing agents generate responses concurrently
5. **First Response** → Streams to terminal
6. **Additional Responses** → Buffered for on-demand viewing

### Context Sharing

All agents share the same conversation history:
- User messages include targeting information
- Assistant messages are labeled with the responding agent's name
- Agents see the full conversation including other agents' responses

### System Prompts

Each agent receives their normal system prompt plus meeting context:
- List of other agents in the meeting
- For broadcasts: instruction to only respond if most qualified
- For forced responses (`/respond`): explicit request for their perspective

## Best Practices

1. **Choose Complementary Agents**: Select agents with different areas of expertise
2. **Use Broadcasts for Open Questions**: Let agents self-select based on relevance
3. **Direct When Specific**: Target agents when you need a particular perspective
4. **Review Buffered Responses**: Don't ignore agents who raised their hand
5. **Reset Long Conversations**: Use `/reset` if context becomes too long

## Troubleshooting

### Agent Already Locked
```
⚠️  ceo is currently busy in another session.
```
**Solution**: Wait for the other session to complete or find the process and terminate it.

### No Agent Responds to Broadcast
```
💭 (None of the agents felt qualified to respond)
Use /respond <agent-name> to request a specific agent to answer
```
**Solution**: Use `/respond <agent>` to force a specific agent to answer, or rephrase your question.

### Out of Context Space
If an agent runs out of context window space during a long meeting, you may need to increase their `ctxSize` parameter or start a new meeting (meeting sessions don't support `/compact` yet).

## Future Enhancements

Potential improvements for future versions:
- Meeting compaction/summarization
- Agent voting mechanisms
- Meeting templates with predefined agent roles
- Meeting recordings and playback
- Dynamic agent joining/leaving during session

