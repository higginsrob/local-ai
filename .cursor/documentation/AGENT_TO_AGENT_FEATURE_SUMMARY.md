# Agent-to-Agent Communication Feature

## Overview

Enhanced the `ai meeting` command with **agent-to-agent communication** capabilities! Agents can now naturally converse with each other by mentioning other agents with `@agent-name`, creating dynamic multi-agent discussions with configurable guard rails to prevent infinite loops.

## What Was Implemented

### 1. Core Functionality

**Agent Mention Detection**
- Agents can use `@agent-name` in their responses to trigger other agents
- Automatic detection and parsing of @ mentions in assistant messages
- Excludes self-mentions (agent can't mention themselves)

**Recursive Chain Handling**
- When an agent mentions another agent, the mentioned agent automatically responds
- Conversations chain recursively up to `maxChainLength` (default: 4)
- Visual depth indicators show chain progress
- Graceful termination when max depth reached

**Chain Depth Tracking**
- Each message tracks its `chainDepth` (0 = user message, 1+ = agent-to-agent)
- Prevents infinite loops with configurable maximum
- Clear visual feedback showing current depth and limit

### 2. Files Modified

#### Type Definitions (`src/types/meeting.ts`)
```typescript
export interface MeetingSession {
  // ... existing fields
  maxChainLength: number; // New: Default 4
}

export interface MeetingMessage {
  // ... existing fields
  chainDepth?: number; // New: Track depth in chain
}
```

#### Meeting Command (`src/commands/meeting.ts`)
- Sets default `maxChainLength: 4` for new meetings
- Migrates old sessions without the field
- Ensures backward compatibility

#### Interactive Loop (`src/lib/meeting-interactive.ts`)
- Added `detectAgentMentions()` function
- Enhanced `handleMeetingMessage()` with chain depth parameter
- Recursive handling of agent-to-agent messages
- Visual chain indicators with indentation
- Max depth warnings and guidance

#### Slash Commands (`src/lib/meeting-slash-commands.ts`)
- New `/chain-length` command to view current setting
- New `/chain-length <n>` to set max chain depth
- Updated help text with agent-to-agent section
- Detailed visual examples in help output

### 3. New Slash Command

#### `/chain-length` - View Current Setting
```bash
> /chain-length

🔗 Agent-to-Agent Chain Settings

  Max Chain Length: 4
  
(Shows helpful examples and explanation)
```

#### `/chain-length <n>` - Set Max Depth
```bash
> /chain-length 6
✓ Max chain length updated: 4 → 6

> /chain-length 0
✓ Max chain length updated: 6 → 0
⚠️  Agent-to-agent chaining is now disabled.
```

**Supported Values:**
- `0` - Disables agent-to-agent chaining
- `1-3` - Short chains
- `4-6` - Medium chains (4 is default)
- `7+` - Long chains (warning shown if > 10)

### 4. Visual Indicators

**Chain Depth Visualization**
```
User: Question?

ceo: Answer. @cto what do you think?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: Response. @cfo budget?

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: Details. @ceo does this work?

      ↳ [Agent-to-agent chain, depth 3/4]
```

**Max Depth Warning**
```
⚠️  Max chain depth (4) reached. Agents mentioned but not responding: cfo, cto
Use /respond <agent> to hear their response, or /chain-length to adjust the limit
```

### 5. Documentation

**Updated Files:**
- `docs/MEETING_COMMAND.md` - Added agent-to-agent section with examples
- `example/AGENT_TO_AGENT_EXAMPLE.md` - Comprehensive examples and patterns
- Help command in-app - Shows agent-to-agent communication info

**New Documentation Includes:**
- How agent-to-agent communication works
- Chain depth control explanation
- Managing chain length settings
- When max depth is reached
- Best practices and common patterns
- Troubleshooting guide

## Key Features

### 1. Natural Conversations

Agents converse naturally without user intervention:
```
User: "What's our strategy?"
CEO → asks CTO about technical capacity
CTO → asks CFO about budget
CFO → asks CEO about timeline
CEO → synthesizes and responds
```

### 2. Configurable Guard Rails

**Default Protection (maxChainLength: 4)**
- Prevents runaway conversations
- Returns control to user
- Suggested agents can still respond via `/respond`

**Flexible Settings**
- Set to `0` to disable chaining
- Increase for deeper discussions
- Decrease for focused conversations

### 3. Visual Feedback

**Clear Indicators:**
- Indented chain indicators show depth visually
- Current/max depth displayed: `depth 2/4`
- Warnings when approaching or hitting limit

### 4. Manual Override

**User Control:**
- `/respond <agent>` works even when max depth reached
- Can continue agent-mentioned discussions manually
- Can adjust `/chain-length` mid-meeting

## Usage Examples

### Example 1: Product Discussion
```bash
$ ai meeting ceo cto cfo

> Should we launch next month?

ceo: Depends on readiness. @cto status update?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: 90% ready, need QA. @cfo budget for contractors?

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: $50K available. @ceo revenue impact of delay?

      ↳ [Agent-to-agent chain, depth 3/4]

ceo: $200K revenue risk. Let's spend the $50K.
```

### Example 2: Hitting the Limit
```bash
> What's our hiring plan?

(Agents discuss back and forth)

⚠️  Max chain depth (4) reached. Agents mentioned but not responding: cto

> /respond cto
(Get CTO's perspective)

> /chain-length 6
(Increase for longer discussions)
```

### Example 3: Disable Chaining
```bash
> /chain-length 0
⚠️  Agent-to-agent chaining is now disabled.

> Your question here
(Only direct responses, no auto-chaining)

> /chain-length 4
(Re-enable)
```

## Technical Implementation

### Message Flow
1. Agent responds with content containing `@other-agent`
2. `detectAgentMentions()` parses the response
3. If mentions found AND `chainDepth < maxChainLength`:
   - Create targeted message for mentioned agent(s)
   - Recursively call `handleMeetingMessage()` with `chainDepth + 1`
   - Show visual indicator
4. If max depth reached:
   - Show warning
   - Suggest `/respond` or `/chain-length` commands
   - Return control to user

### Recursion Safety
- **Base case**: `chainDepth >= maxChainLength`
- **Progress**: Each call increments depth by 1
- **Termination**: Guaranteed to stop at max depth
- **Default limit**: 4 (prevents deep recursion)

### Chain Depth Tracking
```typescript
interface MeetingMessage {
  chainDepth?: number; // 0 = user, 1+ = agent-to-agent
}
```

Each message records its depth for:
- History tracking
- Visual display in `/history`
- Analytics and debugging

## Testing

Build successful ✅  
No linter errors ✅  
Backward compatible ✅

**Manual Testing Checklist:**
- [ ] Agent mentions trigger responses
- [ ] Chain depth increments correctly
- [ ] Max depth stops chain
- [ ] Visual indicators display properly
- [ ] `/chain-length` command works
- [ ] Setting persists across sessions
- [ ] Warnings show when limit reached
- [ ] `/respond` still works with chained agents

## Benefits

### For Users
1. **More natural meetings** - Agents collaborate like real team members
2. **Less micromanagement** - Let agents discuss among themselves
3. **Richer insights** - Multi-perspective discussions automatically
4. **Full control** - Adjust chain length or disable as needed

### For Agent Interactions
1. **Contextual collaboration** - Agents seek each other's expertise
2. **Progressive refinement** - Ideas build through discussion
3. **Natural delegation** - Agents ask domain experts
4. **Realistic simulation** - Mimics real team dynamics

## Configuration

### Default Settings
```typescript
{
  maxChainLength: 4  // 4 levels of agent-to-agent conversation
}
```

### Recommended Settings by Use Case

**Quick Q&A** (1-2):
```bash
/chain-length 2
```

**Normal Discussion** (3-5):
```bash
/chain-length 4  # default
```

**Brainstorming** (6-8):
```bash
/chain-length 8
```

**No Chaining** (0):
```bash
/chain-length 0
```

## Future Enhancements

Potential improvements:
- [ ] Per-agent chain limits
- [ ] Chain branching (multiple agents respond simultaneously)
- [ ] Chain visualization in `/history`
- [ ] Analytics on chain patterns
- [ ] Smart chain suggestions based on context
- [ ] Configurable chain termination strategies
- [ ] Chain templates for common patterns

## Breaking Changes

None! Fully backward compatible:
- Old sessions get default `maxChainLength: 4`
- Existing commands unchanged
- New feature is additive only

## Migration

### Existing Meetings
When loading an old meeting session:
```typescript
if (meetingSession.maxChainLength === undefined) {
  meetingSession.maxChainLength = 4; // Auto-migrate
  await storage.saveMeetingSession(meetingSession);
}
```

### New Meetings
Automatically created with `maxChainLength: 4`

## Documentation Files

1. **`docs/MEETING_COMMAND.md`**
   - Agent-to-agent communication section
   - Chain depth control
   - Managing chain length
   - When max depth reached

2. **`example/AGENT_TO_AGENT_EXAMPLE.md`**
   - 5 detailed examples
   - Best practices
   - Common patterns
   - Troubleshooting guide

3. **In-app help**
   - `/help` shows agent-to-agent section
   - `/chain-length` shows detailed explanation

## Summary

✅ **Implemented**: Agent-to-agent communication with configurable chain limits  
✅ **Default**: 4-level chains (user → agent → agent → agent → agent)  
✅ **Configurable**: `/chain-length 0-∞` adjusts max depth  
✅ **Safe**: Recursive chain handling with guaranteed termination  
✅ **Visual**: Clear depth indicators and warnings  
✅ **Compatible**: Backward compatible with existing meetings  
✅ **Documented**: Comprehensive guides and examples  

**Result**: Meetings now feel like real team discussions where agents naturally collaborate and build on each other's insights!

