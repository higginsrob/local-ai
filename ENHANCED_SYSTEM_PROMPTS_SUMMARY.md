# Enhanced System Prompts for Meetings

## Overview

Added comprehensive meeting context to agent system prompts to help them understand meeting mechanics, know who else is in the meeting, and use @ mentions effectively.

## What Was Implemented

### 1. New Function: `buildMeetingContext()`

Created a helper function in `src/lib/meeting-interactive.ts` that builds detailed meeting context including:

**Participant Information:**
- List of all other agents in the meeting
- Each agent's role/system prompt summary
- Each agent's @ handle

**@ Mention Mechanics:**
- How to use @ mentions to address other agents
- Examples of single and multiple agent mentions
- Natural language usage guidance

**Response Mechanics:**
- How agent-to-agent responses work
- Chain depth limits
- Buffering behavior when multiple agents are mentioned
- How first agent streams, others buffer

**Best Practices:**
- When to use @ mentions
- How to build collaborative discussions
- Guidelines for effective agent-to-agent communication

### 2. Integration Points

The meeting context is now automatically added to system prompts in:

**`getAgentResponse()` (meeting-interactive.ts)**
- Used when evaluating whether agents should respond to broadcasts
- Includes broadcast-specific instruction about "PASS" if not qualified

**`streamAgentResponse()` (meeting-interactive.ts)**
- Used when streaming the first agent's response
- Full meeting context for natural conversation

**`streamForcedResponse()` (meeting-slash-commands.ts)**
- Used when user explicitly requests an agent response via `/respond`
- Includes note that user specifically requested their input

### 3. Files Modified

**`src/lib/meeting-interactive.ts`:**
- Added `buildMeetingContext()` function (exported)
- Updated `getAgentResponse()` to use meeting context
- Updated `streamAgentResponse()` to use meeting context
- Added `allAgents` parameter to both functions

**`src/lib/meeting-slash-commands.ts`:**
- Imported `buildMeetingContext()` 
- Updated `streamForcedResponse()` to use meeting context
- Added `allAgents` parameter

## System Prompt Structure

### Before Enhancement
```
You are a CEO focused on strategic growth...

You are currently in a meeting with: cto, cfo.
```

### After Enhancement
```
You are a CEO focused on strategic growth...

═══════════════════════════════════════════════════════════
📋 MEETING CONTEXT
═══════════════════════════════════════════════════════════

You are currently in a meeting with 2 other agents:

• @cto
  Role: You are a CTO focused on technical architecture...
  Handle: @cto

• @cfo
  Role: You are a CFO focused on financial planning...
  Handle: @cfo

─────────────────────────────────────────────────────────
HOW TO ADDRESS OTHER AGENTS:
─────────────────────────────────────────────────────────

To direct a question or comment to another agent, use their @ handle:
  Example: "I agree with that approach. @cto what do you think..."

You can address multiple agents in one response:
  Example: "Good points. @cfo what's the budget, and @cto how long..."

─────────────────────────────────────────────────────────
RESPONSE MECHANICS:
─────────────────────────────────────────────────────────

• When you mention another agent with @agent-name, they will automatically respond
• Agent conversations can chain up to 4 levels deep
• If you mention multiple agents:
  - The first mentioned agent's response will stream immediately
  - Other mentioned agents' responses will be buffered
  - Buffered agents will "raise their hand" indicating they have a response
  - The user can use /respond <agent> to view buffered responses

─────────────────────────────────────────────────────────
BEST PRACTICES:
─────────────────────────────────────────────────────────

• Use @ mentions when you need specific expertise or input from another agent
• Be specific in your questions to other agents
• Build on other agents' responses to create collaborative discussions
• You can mention agents even if they haven't spoken yet in the conversation
• Use natural language - the @ mention can appear anywhere in your response

═══════════════════════════════════════════════════════════
```

## Key Benefits

### 1. **Agents Know Who to Ask**
With role information visible, agents can intelligently delegate:

```
ceo: This is a technical question. @cto what's your assessment?
```

Instead of:
```
ceo: We need to figure this out.
```

### 2. **Correct @ Mention Syntax**
Agents understand the standard format:

```
ceo: I agree. @cfo what's the budget impact?
```

Instead of trying various formats:
```
ceo: CTO, thoughts?
ceo: Hey cfo:
ceo: cto - what do you think
```

### 3. **Buffering Awareness**
Agents understand response mechanics:

```
ceo: @cto @cfo both of you weigh in on this
(Knows CTO will stream first, CFO will buffer)
```

### 4. **Natural Collaboration**
With full context, agents create more natural conversations:

```
User: Should we expand to Europe?

ceo: Major strategic decision. @cfo what's the financial feasibility?
  ↳ [Agent-to-agent chain, depth 1/4]

cfo: We have $2M budget. @cto can our infrastructure handle EU data residency?
    ↳ [Agent-to-agent chain, depth 2/4]

cto: Yes, with 4 weeks for GDPR compliance. @ceo is that timeline acceptable?
      ↳ [Agent-to-agent chain, depth 3/4]

ceo: Perfect. Let's proceed with the expansion plan.
```

### 5. **Self-Regulation in Broadcasts**
In broadcast mode, agents can self-select based on visible expertise:

```
User: What's our technical debt?

(CTO sees this is their domain, responds)
(CEO and CFO see CTO is more qualified, PASS)
```

## Technical Implementation

### Function Signature
```typescript
export function buildMeetingContext(
  currentAgent: Agent,
  allAgents: Agent[],
  session: MeetingSession
): string
```

### Parameters
- `currentAgent` - The agent receiving this system prompt
- `allAgents` - All agents in the meeting (including current)
- `session` - Meeting session with metadata (e.g., maxChainLength)

### Returns
Formatted string with meeting context to append to system prompt

### Integration Pattern
```typescript
// Build base prompt
let systemPrompt = buildSystemPrompt(agent.systemPrompt, agent, profile);

// Add meeting context
systemPrompt += buildMeetingContext(agent, allAgents, session);

// Add mode-specific notes
if (isBroadcast) {
  systemPrompt += "\nNOTE: Only respond if most qualified...";
}
```

## Dynamic Context

### Adapts to Meeting Size
- **2 agents**: "You are in a meeting with 1 other agent"
- **5 agents**: "You are in a meeting with 4 other agents"

### Adapts to Chain Length
```
• Agent conversations can chain up to 4 levels deep
```

Changes when user adjusts `/chain-length`

### Mode-Specific Additions

**Broadcast Mode:**
```
NOTE: The user's message was not directed at anyone specific. 
Only respond if you believe you are the most qualified...
```

**Forced Response Mode:**
```
NOTE: The user has specifically requested your response. 
Please provide your perspective on their question.
```

## Example Outputs

### CEO's View in Meeting with CTO and CFO
```
[CEO's base system prompt]
+ Meeting context (sees CTO and CFO roles)
+ @ mention syntax guide
+ Response mechanics
+ Best practices
```

### CTO's View in Same Meeting
```
[CTO's base system prompt]
+ Meeting context (sees CEO and CFO roles)
+ @ mention syntax guide
+ Response mechanics
+ Best practices
```

Each agent sees the same format but with different "other participants"

## Testing

Build successful ✅  
No linter errors ✅  
All functions updated ✅  
Export properly configured ✅

## Documentation

Created:
- **`example/MEETING_SYSTEM_PROMPT_EXAMPLE.md`** - Shows what agents actually see
- **`ENHANCED_SYSTEM_PROMPTS_SUMMARY.md`** - This document

## Backward Compatibility

✅ Fully backward compatible
- Only affects meeting mode
- Regular single-agent sessions unchanged
- No breaking changes to existing APIs

## Future Enhancements

Potential improvements:
- [ ] Customizable meeting context templates
- [ ] Per-agent context visibility controls
- [ ] Meeting role assignments (moderator, scribe, etc.)
- [ ] Context compression for large meetings
- [ ] Agent expertise tags for better self-selection

## Summary

✅ **Implemented**: Rich meeting context in agent system prompts  
✅ **Includes**: Participant info, @ mechanics, buffering rules, best practices  
✅ **Benefits**: Better @ usage, role-aware delegation, natural collaboration  
✅ **Dynamic**: Adapts to meeting size, chain length, and mode  
✅ **Exported**: `buildMeetingContext()` available for reuse  

**Result**: Agents now have full context about meeting mechanics and participants, enabling more intelligent and natural multi-agent conversations!

