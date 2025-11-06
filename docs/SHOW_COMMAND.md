# /show Command Documentation

## Overview

The `/show` command is a diagnostic tool that displays an agent's complete configuration and the dynamically generated system prompt that is being sent to the AI model during conversations. This is particularly useful for debugging issues where agents don't know their own identities or for understanding exactly what context is being provided to each agent.

## Availability

The `/show` command is available in both:
- **Single-agent sessions** (via `ai run <agent>`)
- **Multi-agent meetings** (via `ai meeting <agent1> <agent2> ...`)

## Usage

### In Single-Agent Sessions

```bash
/show
```

Displays the current agent's configuration and system prompt.

### In Multi-Agent Meetings

```bash
/show <agent-name>
```

Displays a specific agent's configuration and system prompt. The agent must be a participant in the current meeting.

Examples:
```bash
/show dev
/show cto
/show Gwen
```

## Output Sections

The `/show` command displays the following information:

### 1. Basic Information
- Agent name
- Model being used

### 2. Model Parameters
- Context Size (ctxSize)
- Max Tokens (maxTokens)
- Temperature
- Top P (topP)
- Top K (topN)

### 3. Agent Attributes
Displays the agent's attributes as defined in their configuration JSON file (e.g., `~/.ai/agents/dev.json`). These attributes are used to personalize the agent's behavior and are included in the system prompt.

Example attributes:
```json
{
  "name": "Developer",
  "nickname": "Dev",
  "jobTitle": "Senior Full-Stack Developer",
  "educationLevel": "Bachelor's degree in Computer Science",
  "expertise": ["docker", "ai", "sql", "javascript", "typescript"]
}
```

### 4. Raw Configuration (JSON)
The complete agent configuration as stored in the JSON file.

### 5. Dynamically Generated System Prompt
This is the **most important section** - it shows the exact system prompt that is being sent to the AI model. This includes:

- The base system prompt from the agent configuration
- Agent attributes (formatted as markdown)
- User/profile attributes (formatted as markdown)
- **In meetings only**: Meeting context including:
  - List of other participants and their roles
  - Instructions on how to use @mentions
  - Response mechanics (buffering, chaining)
  - When to check in with the user
  - Best practices for agent-to-agent communication
  - Current chain depth and limits

### 6. System Prompt Stats
- Character count
- Estimated token count (using ~4 chars/token heuristic)

## Use Cases

### Debugging Agent Identity Issues

If an agent doesn't know its own name or handle:
1. Run `/show <agent-name>` in the meeting
2. Look at the "Dynamically Generated System Prompt" section
3. Search for "Your name is" or look at the Agent Attributes section
4. Verify the agent's nickname/handle is correctly set

**Common Issue**: If an agent thinks it's the user (e.g., "Gwen thinks it is Rob Higgins"), this means the agent attributes are missing or the `nickname` field is not set in the agent's JSON configuration.

**Fix**: Add proper attributes to the agent's configuration:
```json
{
  "name": "gwen",
  "attributes": {
    "name": "Gwendolyn Smith",
    "nickname": "Gwen",
    "jobTitle": "Chief Executive Officer",
    ...
  }
}
```

### Understanding Agent Context in Meetings

To see what context an agent has about other participants:
1. Run `/show <agent-name>`
2. Look at the "MEETING CONTEXT" section
3. Verify the agent sees all other participants
4. Check that the @mention instructions are present
5. Verify the agent knows its own handle (should see "Do NOT @mention yourself (@agent-name)")

### Debugging Self-Addressing Issues

If an agent is addressing itself (e.g., "dev asks questions to @dev"):
1. Run `/show dev`
2. Search for "Do NOT @mention yourself"
3. Verify the agent's own name/handle is correctly referenced
4. Check that the agent knows its chat handle by looking at the attributes

### Verifying System Prompt Changes

When you modify:
- Agent configuration files
- User profile attributes
- Meeting mechanics (chain length, check-in limits)

Use `/show` to verify the changes are reflected in the actual system prompt being sent to the model.

## Example Output

```
══════════════════════════════════════════════════════════════════════
🤖 Agent Configuration: dev
══════════════════════════════════════════════════════════════════════

📋 Basic Information:
  Name:          dev
  Model:         ai/llama3.2:latest

⚙️  Model Parameters:
  Context Size:  10240
  Max Tokens:    2048
  Temperature:   0.7
  Top P:         0.9
  Top K:         40

🏷️  Agent Attributes:
  {
    "name": "Developer",
    "nickname": "Dev",
    "jobTitle": "Senior Full-Stack Developer",
    "educationLevel": "Bachelor's degree in Computer Science",
    "expertise": [
      "docker",
      "ai",
      "sql",
      "nosql",
      "javascript",
      "typescript",
      "react",
      "python",
      "go",
      "rust"
    ]
  }

📄 Raw Configuration (JSON):
──────────────────────────────────────────────────────────────────────
{
  "name": "dev",
  "model": "ai/llama3.2:latest",
  "systemPrompt": "You are an expert software developer who writes clean, efficient code.",
  "modelParams": {
    "ctxSize": 10240,
    "maxTokens": 2048,
    "temperature": 0.7,
    "topP": 0.9,
    "topN": 40
  },
  "attributes": {
    "name": "Developer",
    "nickname": "Dev",
    "jobTitle": "Senior Full-Stack Developer",
    "educationLevel": "Bachelor's degree in Computer Science",
    "expertise": [
      "docker",
      "ai",
      "sql",
      "nosql",
      "javascript",
      "typescript",
      "react",
      "python",
      "go",
      "rust"
    ]
  }
}
──────────────────────────────────────────────────────────────────────

🧠 Dynamically Generated System Prompt:
──────────────────────────────────────────────────────────────────────
(This is the actual prompt being sent to the model during this meeting)
──────────────────────────────────────────────────────────────────────
You are an expert software developer who writes clean, efficient code.

# Agent Attributes

**Name**: Developer
**Nickname**: Dev
**Job Title**: Senior Full-Stack Developer
**Education Level**: Bachelor's degree in Computer Science
**Expertise**: docker, ai, sql, nosql, javascript, typescript, react, python, go, rust

# User Attributes

**Name**: Rob Higgins
**Email**: rob@example.com

═══════════════════════════════════════════════════════════════════════════════════
📋 MEETING CONTEXT
═══════════════════════════════════════════════════════════════════════════════════

You are currently in a meeting with 2 other agents:

• @cto
  Role: You are a Chief Technology Officer with deep expertise in system architecture...
  Handle: @cto

• @cfo
  Role: You are a Chief Financial Officer responsible for budgeting and financial planning...
  Handle: @cfo

─────────────────────────────────────────────────────────────
HOW TO ADDRESS OTHER AGENTS:
─────────────────────────────────────────────────────────────

To direct a question or comment to another agent, use their @ handle:
  Example: "I agree with that approach. @cto what do you think about the technical feasibility?"

You can address multiple agents in one response:
  Example: "Good points. @cfo what's the budget, and @cto how long would this take?"

─────────────────────────────────────────────────────────────
RESPONSE MECHANICS:
─────────────────────────────────────────────────────────────

• When you mention another agent with @agent-name, they will automatically respond
• Agent conversations can chain up to 3 levels deep
• If you mention multiple agents:
  - The first mentioned agent's response will stream immediately
  - Other mentioned agents' responses will be buffered
  - Buffered agents will "raise their hand" indicating they have a response
  - The user can use /respond <agent> to view buffered responses

[... rest of meeting context ...]
──────────────────────────────────────────────────────────────────────

📊 System Prompt Stats:
  Characters:    5234
  Est. Tokens:   1309 (~4 chars/token)

══════════════════════════════════════════════════════════════════════
```

## Tips

1. **Before fixing agent identity issues**: Always run `/show <agent>` first to understand what the agent actually sees
2. **When agents don't respond correctly**: Check if the meeting context is present in their system prompt
3. **When modifying configurations**: Run `/show` after to verify changes are applied
4. **Token optimization**: Use the stats section to understand how much of the context window is used by the system prompt alone

## Related Commands

- `/participants` - Quick list of meeting participants (less detailed)
- `/info` - Show current agent settings (model parameters only, no system prompt)
- `/status` - Show performance and context usage statistics


