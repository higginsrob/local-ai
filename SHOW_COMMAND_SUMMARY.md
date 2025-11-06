# Show Command Feature Summary

## Overview

Added a new `/show` command that displays an agent's complete configuration and the dynamically generated system prompt that is being sent to the AI model during conversations. This helps debug issues where agents don't know their own identities or handles.

## Problem Statement

Agents in meetings were experiencing identity confusion:
- Gwen thought it was "Rob Higgins" (the user)
- Dev was addressing itself (@dev asking questions to @dev)

This was happening because there was no easy way to inspect what the agent was actually seeing in its system prompt.

## Solution

Implemented `/show <agent>` command that displays:
1. Agent configuration (name, model, parameters)
2. Agent attributes (nickname, job title, expertise, etc.)
3. Raw JSON configuration
4. **Most importantly**: The complete, dynamically generated system prompt including:
   - Base system prompt
   - Agent attributes (formatted)
   - User/profile attributes (formatted)
   - Meeting context (participant list, @mention mechanics, response rules)
   - Chain depth awareness
   - Check-in instructions

## Files Modified

### `/src/lib/meeting-slash-commands.ts`
- Added `handleShow()` function for meeting mode
- Added `/show <agent>` case to command switch
- Updated help text to include new command

### `/src/lib/slash-commands.ts`
- Added `handleShow()` function for single-agent session mode
- Added `/show` case to command switch
- Updated help text to include new command

### Documentation
- Created `/docs/SHOW_COMMAND.md` - comprehensive documentation with examples and use cases

## Usage

### Single-Agent Sessions
```bash
ai run dev
> /show
```

### Multi-Agent Meetings
```bash
ai meeting dev cto cfo
> /show dev
> /show cto
```

## Key Features

1. **Identity Debugging**: Quickly see if an agent knows its own name/handle
2. **Meeting Context Inspection**: Verify what other agents the current agent can see
3. **System Prompt Visibility**: See exactly what's being sent to the model
4. **Token Estimation**: Shows character count and estimated token usage
5. **Configuration Verification**: Confirms agent attributes are properly loaded

## Output Sections

The command displays:
- 📋 Basic Information (name, model)
- ⚙️  Model Parameters (ctxSize, maxTokens, temperature, topP, topK)
- 🏷️  Agent Attributes (nickname, jobTitle, expertise, etc.)
- 📄 Raw Configuration (full JSON)
- 🧠 Dynamically Generated System Prompt (the actual prompt sent to the model)
- 📊 System Prompt Stats (character count, estimated tokens)

## Benefits

1. **Transparency**: Users can see exactly what context their agents have
2. **Debugging**: Easily diagnose identity and context issues
3. **Verification**: Confirm configuration changes are applied
4. **Education**: Helps users understand how the system constructs prompts
5. **Optimization**: See token usage of system prompts

## Next Steps to Fix Agent Identity Issues

Now that we have the `/show` command, users can:
1. Run `/show <agent>` to inspect the system prompt
2. Verify the agent's attributes include proper `nickname` field
3. Check that the agent doesn't @mention itself in meeting context
4. Ensure the agent's handle is correctly referenced in the instructions

For the specific issues mentioned:
- **Gwen thinking it's Rob Higgins**: Check if `gwen.json` has proper `attributes.nickname: "Gwen"`
- **Dev addressing itself**: Verify the meeting context shows "Do NOT @mention yourself (@dev)"

## Testing

Build successful - all TypeScript compiled without errors:
```bash
npm run build
✅ Build complete!
```

No linter errors introduced.

## Related Commands

- `/participants` - Quick participant list (less detailed)
- `/info` - Model settings only (no system prompt)
- `/status` - Performance and context usage stats

