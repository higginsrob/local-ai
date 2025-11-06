# @user Check-In Feature

## Overview

Implemented automatic detection of when an agent addresses the user directly using `@user` or `@profileName`. When an agent checks in with the user, any other agents mentioned in that response will automatically buffer their responses instead of continuing the conversation chain.

## The Enhancement

### Problem
Agents could check in with the user but still mention other agents with @, which would trigger those agents to respond immediately, preventing the user from actually having control.

### Solution
When an agent uses `@user` or `@profileName`:
1. **Stops the chain** - No more automatic agent responses
2. **Buffers mentioned agents** - If other agents are @mentioned, they buffer instead of responding
3. **Returns control to user** - User can then decide what to do next

## How It Works

### 1. Detection Function

Added `isAddressingUser()` function:
```typescript
function isAddressingUser(content: string, profileName: string): boolean {
  // Check for @user
  if (/@user\b/i.test(content)) {
    return true;
  }
  
  // Check for @profileName  
  if (profileName) {
    const pattern = new RegExp(`@${profileName}\\b`, 'i');
    if (pattern.test(content)) {
      return true;
    }
  }
  
  return false;
}
```

### 2. Check-In Logic

When an agent's response is detected as addressing the user:
1. Extract any agent @mentions from the response
2. Get responses from those mentioned agents
3. **Buffer** them instead of streaming
4. Show "raised hand" indicators
5. **Stop the chain** - return control to user

### 3. Updated System Prompts

Agents now see:
```
HOW to check in:
  - Use @user or @profileName to address the user directly
  - Summarize the discussion so far
  - Present options, decisions, or findings clearly
  - Ask the user for guidance, input, or approval to continue
  - If you mention other agents with @ in a check-in, they will buffer their responses

Example check-in:
  "@user We've discussed three approaches. The CTO favors option A for
   technical reasons, while the CFO prefers option B for cost savings.
   What would you like us to focus on?"

Note: When you use @user, any agents you mention will buffer their
responses so the user can review and decide what to do next.
```

## Example Scenarios

### Scenario 1: Check-In Without Other Agent Mentions

```bash
> Should we expand to Europe?

ceo: Strategic opportunity. @cfo financial feasibility?
  ↳ [Agent-to-agent chain, depth 1/4]

cfo: $2M available. @cto EU data concerns?
    ↳ [Agent-to-agent chain, depth 2/4]

cto: 4 weeks for GDPR. @user We've analyzed the Europe expansion.
     The CFO confirms $2M budget, and I estimate 4 weeks for GDPR
     compliance. Should we proceed?

💬 cto is checking in with you.

> (User has control, no agents auto-responded)
```

### Scenario 2: Check-In With Agent Mentions (Buffering)

```bash
> What's our hiring strategy?

ceo: Need to hire aggressively. @cto how many engineers?
  ↳ [Agent-to-agent chain, depth 1/4]

cto: 5 senior engineers, 3 DevOps. @cfo budget?
    ↳ [Agent-to-agent chain, depth 2/4]

cfo: @user We've discussed hiring needs. The CTO wants 8 people but
     I can only budget for 4-5 in Q1. @cto which roles are most critical?

💬 cfo is checking in with you.
   Mentioned agents (cto) will buffer responses.

✋ cto has a response (use /respond cto)

> (User can review CFO's question and decide whether to hear CTO's response)
```

### Scenario 3: Multi-Agent Check-In

```bash
ceo: @user I've discussed this with both teams. @cto thinks we need
     option A for scalability, while @cfo prefers option B for cost.
     Both have valid points. Which direction should we take?

💬 ceo is checking in with you.
   Mentioned agents (cto, cfo) will buffer responses.

✋ cto has a response (use /respond cto)
✋ cfo has a response (use /respond cfo)

> (User can review all perspectives before deciding)
```

## Benefits

### 1. **True Check-Ins**
Agents can't accidentally trigger more conversation when checking in

### 2. **User Control**
User always regains control when addressed directly

### 3. **Preserve Context**
Mentioned agents still generate responses (buffered), so user can hear all perspectives

### 4. **Natural Flow**
Agents can reference other agents in their check-in without breaking the pattern

### 5. **Explicit Intent**
Using `@user` is a clear signal: "I'm checking in with you"

## User Experience

### What User Sees

**When agent checks in:**
```
ceo: @user We've reached a decision point...

💬 ceo is checking in with you.

>
```

**When agent checks in and mentions others:**
```
ceo: @user Summary of discussion. @cto and @cfo have different views...

💬 ceo is checking in with you.
   Mentioned agents (cto, cfo) will buffer responses.

✋ cto has a response (use /respond cto)
✋ cfo has a response (use /respond cfo)

>
```

**User can then:**
```bash
> /respond cto          # Hear CTO's perspective
> /respond cfo          # Hear CFO's perspective
> I think we should... # Give own input
```

## Technical Implementation

### Files Modified

**`src/lib/meeting-interactive.ts`:**
1. Added `isAddressingUser()` detection function
2. Updated check-in logic in `handleMeetingMessage()`
3. Buffer mentioned agents when user is addressed
4. Updated system prompt with @user instructions

### The Logic Flow

```typescript
// After agent responds...

// Check if addressing user
const addressingUser = isAddressingUser(firstContent, session.profileName);

if (addressingUser) {
  // Get any mentioned agents
  const mentionedAgents = detectAgentMentions(firstContent, agents, ...);
  
  if (mentionedAgents.length > 0) {
    // Show check-in message
    console.log("Agent is checking in with you");
    
    // Get responses from mentioned agents
    for (const agent of mentionedAgentsList) {
      const response = await getAgentResponse(...);
      
      if (response.wantsToRespond) {
        // Buffer it instead of streaming
        session.bufferedResponses.push({
          agentName: agent.name,
          content: response.content,
          ...
        });
        
        console.log("✋ agent has a response");
      }
    }
  }
  
  // STOP - return control to user
  return;
}

// Otherwise continue with normal agent-to-agent chain...
```

## Two Ways to Check In

### Method 1: @user Without Mentioning Others
Agent doesn't need other agents' input:
```
ceo: @user Based on our discussion, I recommend option A. Proceed?
```
→ Simple check-in, user responds

### Method 2: @user With Agent Mentions  
Agent wants user to hear multiple perspectives:
```
ceo: @user We've narrowed to two options. @cto prefers A, @cfo prefers B.
     Which should we pursue?
```
→ Check-in with buffered agent responses available

## Agent Instructions

Agents are explicitly told:
- ✅ Use `@user` to check in
- ✅ Use `@profileName` to address user by name
- ✅ When you @user, mentioned agents will buffer
- ✅ This gives user time to review all perspectives
- ✅ Good for decision points and summaries

## Examples of Good Check-Ins

### Decision Point
```
cfo: @user We've analyzed three pricing models. The CTO recommends option
     A for simplicity, but I see potential revenue upside in option B. 
     What's your priority: simplicity or revenue?
```

### Summary with Perspectives
```
ceo: @user After extensive discussion between @cto, @cfo, and myself, here's
     what we've found:
     - Option A: Fast, expensive, proven
     - Option B: Slow, cheap, risky
     What matters most for this decision?
```

### Need User Input
```
cto: @user I need your guidance. @cfo says we have $100K budget, but the
     solution I recommend costs $150K. Should I find a cheaper alternative
     or can we increase the budget?
```

## Backward Compatibility

✅ Existing behavior unchanged if @user not used  
✅ Agents can still check in without @user (just don't @mention other agents)  
✅ No breaking changes

## Summary

**Before this feature:**
```
ceo: @user Summary... @cto what do you think?
  ↳ CTO responds immediately
  ↳ User loses control
```

**After this feature:**
```
ceo: @user Summary... @cto what do you think?

💬 ceo is checking in with you.
✋ cto has a response (use /respond cto)

> (User has control, can choose to hear CTO or respond directly)
```

**Result:** True check-ins where agents return control to the user, while preserving the ability to get all relevant perspectives on demand!

