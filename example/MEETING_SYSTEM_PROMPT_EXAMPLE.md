# Meeting System Prompt Example

This document shows what the enhanced system prompts look like when agents are in a meeting. The system now automatically adds detailed meeting context to help agents understand the meeting mechanics.

## Example: CEO in a Meeting with CTO and CFO

### Original Agent System Prompt
```
You are a CEO focused on strategic growth, market positioning, and organizational leadership. 
You make high-level decisions about company direction, partnerships, and resource allocation.
```

### Enhanced System Prompt (What the Agent Actually Sees)

```
You are a CEO focused on strategic growth, market positioning, and organizational leadership. 
You make high-level decisions about company direction, partnerships, and resource allocation.

═══════════════════════════════════════════════════════════
📋 MEETING CONTEXT
═══════════════════════════════════════════════════════════

You are currently in a meeting with 2 other agents:

• @cto
  Role: You are a CTO focused on technical architecture, engineering team management, 
        and technology strategy...
  Handle: @cto

• @cfo
  Role: You are a CFO focused on financial planning, budgets, ROI analysis, and 
        ensuring fiscal responsibility...
  Handle: @cfo

─────────────────────────────────────────────────────────
HOW TO ADDRESS OTHER AGENTS:
─────────────────────────────────────────────────────────

To direct a question or comment to another agent, use their @ handle:
  Example: "I agree with that approach. @cto what do you think about the technical feasibility?"

You can address multiple agents in one response:
  Example: "Good points. @cfo what's the budget, and @cto how long would this take?"

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

## What This Enables

### 1. Agents Know Who's in the Meeting

Before:
```
ceo: We need to make a decision on this.
```

After (with context):
```
ceo: We need to make a decision on this. @cfo what's the financial impact, 
     and @cto what's the technical feasibility?
```

### 2. Agents Understand @ Mention Mechanics

Before (might try different syntaxes):
```
ceo: CTO, what do you think?
ceo: Hey CTO - thoughts?
ceo: cto:
```

After (knows the correct syntax):
```
ceo: I think we should proceed. @cto what do you think about the timeline?
```

### 3. Agents Understand Buffering

Before (wouldn't know about buffering):
```
ceo: @cto @cfo both of you please respond
(Agents might think both will respond immediately)
```

After (understands only first streams):
```
ceo: @cto @cfo I need both perspectives on this
(CEO knows CTO will stream first, CFO will buffer)
```

### 4. Agents Can See Each Other's Roles

This helps them decide who to ask:

```
User: How do we scale our infrastructure?

ceo: This is primarily a technical question. @cto this is in your domain - 
     what's your assessment? And @cfo what budget do we have available?
```

The CEO knows to defer to the CTO because the system prompt shows:
- `@cto - Role: You are a CTO focused on technical architecture...`

## Broadcast Mode

When a user sends a message without targeting anyone, agents also see:

```
NOTE: The user's message was not directed at anyone specific. Only respond 
if you believe you are the most qualified agent in this meeting to answer 
based on your role and expertise. If you don't think you should respond, 
reply with exactly: "PASS"
```

Example:

```
User: What should be our pricing strategy?

CEO thinks: "This involves multiple areas - strategy, finance, and potentially 
           technology for billing. I'm most qualified for strategy, but @cfo 
           should weigh in on pricing models."

ceo: Our pricing strategy should align with market positioning. @cfo I'd like 
     your analysis on different pricing models - what maximizes our revenue 
     while staying competitive?

  ↳ [Agent-to-agent chain, depth 1/4]

cfo: Based on our cost structure and competitor analysis, I recommend...
```

## Forced Response Mode

When user uses `/respond <agent>`, the agent sees:

```
NOTE: The user has specifically requested your response. Please provide your 
perspective on their question.
```

This tells the agent they should respond even if they might have "PASSed" otherwise.

## Dynamic Context Based on Meeting Size

### Small Meeting (2 agents)

```
You are currently in a meeting with 1 other agent:

• @cto
  Role: You are a CTO focused on...
  Handle: @cto
```

### Large Meeting (5 agents)

```
You are currently in a meeting with 4 other agents:

• @cto
  Role: You are a CTO focused on...
  Handle: @cto

• @cfo
  Role: You are a CFO focused on...
  Handle: @cfo

• @cmo
  Role: You are a CMO focused on...
  Handle: @cmo

• @coo
  Role: You are a COO focused on...
  Handle: @coo
```

## Chain Depth Awareness

The system prompt shows the current max chain length:

```
• Agent conversations can chain up to 4 levels deep
```

If the user changes it:
```bash
> /chain-length 6
```

Next responses will show:
```
• Agent conversations can chain up to 6 levels deep
```

## Benefits of Enhanced Prompts

### 1. **Better @ Mention Usage**
Agents understand the syntax and mechanics, leading to more natural usage.

### 2. **Role-Aware Delegation**
Agents can see other participants' expertise and delegate appropriately.

### 3. **Expectation Management**
Agents understand buffering and don't expect all mentioned agents to respond immediately.

### 4. **Collaborative Awareness**
Agents know they're in a collaborative environment and should build on each other's responses.

### 5. **Self-Regulation**
In broadcast mode, agents self-select based on qualification rather than all responding.

## Example Conversation with Enhanced Prompts

```bash
$ ai meeting ceo cto cfo

> We need to decide whether to build or buy our authentication system

ceo: This is a critical decision with strategic, technical, and financial 
     implications. @cto what's your technical assessment of building vs buying?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: Building would give us more control but take 8-10 weeks. Buying (Auth0, 
     Okta) would be 1-2 weeks integration. @cfo what's the cost comparison?

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: Building: $120K in engineering time. Buying: $24K/year subscription. 
     Break-even at 5 years. @ceo what's our strategic timeline?

      ↳ [Agent-to-agent chain, depth 3/4]

ceo: We need to move fast - market window is 6 months. Recommendation: Buy 
     now, potentially build custom later when we have more resources. @cto 
     can you evaluate vendors?

        ↳ [Agent-to-agent chain, depth 4/4]

cto: Agreed. I'll assess Auth0, Okta, and Firebase. Will have recommendation 
     by end of week with integration estimates.

>
```

**What happened:**
- CEO knew to ask CTO (saw technical expertise in prompt)
- CTO knew to ask CFO (saw financial expertise in prompt)
- CFO knew to loop back to CEO (strategic decision)
- CEO made final call and delegated back to CTO
- Natural collaborative flow enabled by context awareness

## Summary

The enhanced system prompts give agents:
- ✅ **Participant Awareness** - Know who's in the meeting and their roles
- ✅ **Syntax Knowledge** - Understand how to use @ mentions correctly
- ✅ **Mechanics Understanding** - Know about streaming, buffering, and chains
- ✅ **Best Practices** - Guidance on collaborative behavior
- ✅ **Self-Regulation** - Can decide when to respond vs. defer

This creates more natural, effective multi-agent collaborations!

