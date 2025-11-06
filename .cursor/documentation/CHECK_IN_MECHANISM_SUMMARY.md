# Agent Check-In Mechanism

## Overview

Implemented a self-regulating check-in system where agents are instructed to pause and return control to the user after a certain amount of conversation or after major decisions, rather than relying solely on hard chain limits.

## The Problem

With the original hard chain limit (maxChainLength: 4), agents would hit the limit too quickly:
- Not enough depth for meaningful discussions
- Artificial constraint interrupting natural conversations
- Agents couldn't explore ideas fully

But removing the limit entirely risks endless loops.

## The Solution: Self-Regulating Check-Ins

Agents are now instructed via their system prompts to:
1. **Monitor conversation length** (~1024 tokens default)
2. **Recognize decision points** (major decisions made)
3. **Check in with user** by summarizing and asking for guidance
4. **Use non-@ mentions** when checking in (prevents auto-responses)

## How It Works

### 1. Added to MeetingSession Type
```typescript
export interface MeetingSession {
  // ... existing fields
  checkInTokenLimit: number; // Default: 1024 tokens
}
```

### 2. Enhanced System Prompts

Agents now see in their meeting context:

```
─────────────────────────────────────────────────────────
WHEN TO CHECK IN WITH THE USER:
─────────────────────────────────────────────────────────

• After approximately 1024 tokens of agent-to-agent conversation
• After making or discussing any major decisions
• When you need user input or approval to proceed
• When the discussion reaches a natural pause point

HOW to check in:
  - Summarize the discussion so far
  - Do NOT use @ mentions (this prevents automatic responses)
  - You can still reference other agents by name without @
  - Ask the user for guidance, input, or approval to continue

Example check-in:
  "We've discussed three approaches. The CTO favors option A for technical
   reasons, while the CFO prefers option B for cost savings. What would you
   like us to focus on?"
```

### 3. The Key Insight: @ vs No-@

**With @mention** → Triggers automatic response:
```
ceo: I think option A is best. @cto what do you think?
  ↳ [Agent-to-agent chain continues]
```

**Without @mention** → Returns control to user:
```
ceo: We've discussed options A and B. The CTO prefers A for scalability,
     while the CFO prefers B for cost. What direction should we take?

> (User can now respond)
```

### 4. New Slash Command

View settings:
```bash
> /check-in-limit

🔔 Agent Check-In Settings

  Check-In Token Limit: 1024

Agents are instructed to check in:
  • After ~1024 tokens of conversation
  • After major decisions
  • When needing user input/approval
```

Adjust limit:
```bash
> /check-in-limit 2048
✓ Check-in token limit updated: 1024 → 2048
```

## Files Modified

1. **`src/types/meeting.ts`**
   - Added `checkInTokenLimit: number`

2. **`src/commands/meeting.ts`**
   - Default `checkInTokenLimit: 1024` for new meetings
   - Auto-migration for existing meetings

3. **`src/lib/meeting-interactive.ts`**
   - Updated `buildMeetingContext()` with check-in rules
   - Added comprehensive instructions

4. **`src/lib/meeting-slash-commands.ts`**
   - New `/check-in-limit` command
   - Handler function with validation

## Example Flow

### Scenario: Product Strategy Discussion

```bash
$ ai meeting ceo cto cfo

> Should we build or buy our authentication system?

ceo: This requires input from both technical and financial perspectives.
     @cto what's your assessment?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: Building would give us control but takes 8 weeks. Buying (Auth0, Okta)
     would be 1-2 weeks integration. @cfo what's the cost comparison?

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: Building: $120K in engineering time. Buying: $24K/year. Break-even
     at 5 years. @cto which vendors have you evaluated?

      ↳ [Agent-to-agent chain, depth 3/4]

cto: I've looked at Auth0 ($24K/yr), Okta ($36K/yr), and Firebase ($18K/yr).
     Auth0 has best features but Firebase is most cost-effective. @ceo
     what's our strategic timeline?

        ↳ [Agent-to-agent chain, depth 4/4]

ceo: We need to move fast - 6 month market window. Based on our discussion:
     - Building: 8 weeks, $120K, full control
     - Buying: 1-2 weeks, $18-36K/year, faster time to market
     
     The CTO recommends Firebase for cost and integration speed. The CFO notes
     we break even in 5 years with buying. Given our tight timeline, I'm leaning
     toward buying, but wanted to check: what are your priorities? Should we
     optimize for speed, cost, or long-term control?

> (Agent checked in WITHOUT @ mentions - control returns to user)
```

### The Check-In Pattern

Notice the CEO's final message:
1. ✅ **Summarized** the discussion
2. ✅ **Named agents** (CTO, CFO) WITHOUT @ symbols
3. ✅ **Presented options** clearly
4. ✅ **Asked for user input**
5. ✅ **Didn't trigger more agent responses**

## Benefits

### 1. Natural Conversation Flow
Agents can have deeper discussions without artificial limits

### 2. Decision Points
Major decisions naturally trigger check-ins for user approval

### 3. User Stays in Control
Agents self-regulate and return control at appropriate times

### 4. Flexible
User can adjust check-in frequency based on meeting type:
- **512 tokens**: Frequent check-ins, tight control
- **1024 tokens**: Default, balanced approach
- **2048 tokens**: Longer discussions, less interruption

### 5. Prevents Runaway Conversations
Agents are instructed to monitor token count and decision points

## Configuration

### Adjust Check-In Frequency

**Frequent check-ins** (tight control):
```bash
/check-in-limit 512
```

**Standard** (balanced):
```bash
/check-in-limit 1024  # default
```

**Infrequent** (longer discussions):
```bash
/check-in-limit 2048
```

**Very long discussions**:
```bash
/check-in-limit 4096
```

### Still Have Chain Depth Limit

The `maxChainLength` still exists as a hard safety limit:
```bash
/chain-length 10  # Allow deeper chains
```

But now agents are instructed to self-regulate BEFORE hitting that limit.

## Agent Instructions Summary

Agents are told to check in when:
- ✅ ~1024 tokens of conversation
- ✅ Major decision made/discussed
- ✅ User input needed
- ✅ Natural pause point reached

How to check in:
- ✅ Summarize discussion
- ✅ Reference agents by name (not @name)
- ✅ Present options/findings clearly
- ✅ Ask for user guidance

## Why This Works Better

### Before (Hard Limit Only)
```
User → Agent A → Agent B → Agent C → Agent D
MAX REACHED - conversation cut off mid-discussion
```

### After (Self-Regulating)
```
User → Agent A → Agent B → Agent C → Agent D
      (Agents notice ~1024 tokens)
      Agent D: "We've discussed X, Y, Z. CTO favors this, CFO favors that.
                What should we prioritize?"
      (Natural check-in, control returns to user)
```

## Backward Compatibility

✅ Existing meetings auto-migrated with `checkInTokenLimit: 1024`  
✅ No breaking changes  
✅ Hard chain limit still exists as safety net

## Documentation

Created:
- **`CHECK_IN_MECHANISM_SUMMARY.md`** - This document
- Updated system prompts with check-in guidelines
- Added `/check-in-limit` command

## Summary

Instead of hard-stopping agent conversations at a fixed depth, we now:
1. **Instruct agents** to self-regulate based on:
   - Token count (~1024)
   - Decision points
   - Need for user input
2. **Give them a mechanism**: Reference agents WITHOUT @ to check in
3. **Provide guidelines**: Summarize, present options, ask for guidance
4. **Keep safety net**: Hard chain limit still exists

**Result**: More natural, productive agent discussions that intelligently return control to the user at appropriate times!

