# Agent-to-Agent Communication Example

This example demonstrates how agents can naturally converse with each other in meetings, creating dynamic multi-agent discussions.

## Scenario: Product Launch Discussion

Meeting participants: `ceo`, `cto`, `cfo`

### Example 1: Simple Agent-to-Agent Chain

```bash
$ ai meeting start executive-team ceo cto cfo

> We need to launch the new feature next month. Thoughts?

ceo: I think we can do it, but we need to be strategic. @cto, what's the 
technical readiness status?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: The core functionality is complete, but we need 2 more weeks for 
testing and bug fixes. @cfo, do we have budget for additional QA resources 
to accelerate this?

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: We can allocate $50K for QA. However, @ceo, we should consider the 
revenue impact if we delay versus launching with potential bugs.

      ↳ [Agent-to-agent chain, depth 3/4]

ceo: Good point. Let's do a phased rollout - beta to 10% of users first, 
then full launch after 1 week of monitoring. @cto, can your team support 
this approach?

        ↳ [Agent-to-agent chain, depth 4/4]

cto: Yes, we can implement feature flags for a controlled rollout. That's
actually the safer approach given our timeline.

>
```

**What happened:**
1. User asked a question (depth 0)
2. CEO responded and asked CTO (depth 1)
3. CTO responded and asked CFO (depth 2)
4. CFO responded and asked CEO (depth 3)
5. CEO responded and asked CTO (depth 4 - max reached)
6. CTO responded, chain ended
7. Control returned to user

### Example 2: Hitting the Chain Limit

```bash
> What's our hiring strategy?

ceo: We need to hire aggressively. @cto how many engineers do you need?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: At least 5 senior engineers and 3 DevOps. @cfo what's our hiring budget?

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: $800K for Q1. @ceo that's 4-5 hires max, not 8. We need to prioritize.

      ↳ [Agent-to-agent chain, depth 3/4]

ceo: Fair point. @cto which 4-5 roles are most critical?

        ↳ [Agent-to-agent chain, depth 4/4]

cto: 3 backend engineers and 2 DevOps would unblock the most work. @cfo
can we...

⚠️  Max chain depth (4) reached. Agents mentioned but not responding: cfo
Use /respond <agent> to hear their response, or /chain-length to adjust the limit

>
```

**User can now:**
```bash
# Get CFO's response manually
> /respond cfo

cfo: Yes, that works within budget. I'd recommend hiring the DevOps first
to stabilize infrastructure, then the backend engineers.

> /chain-length 6
✓ Max chain length updated: 4 → 6

> Let's continue discussing the timeline...
```

### Example 3: Multiple Agents Want to Respond

```bash
> Should we pivot our pricing model?

ceo: This is a major decision. @cfo what's your analysis?

  ↳ [Agent-to-agent chain, depth 1/4]

cfo: Current model isn't scaling well. We're leaving money on the table.
I recommend value-based pricing. @cto what's the technical lift?

    ↳ [Agent-to-agent chain, depth 2/4]

cto: We'd need to rebuild the billing system - about 6 weeks of work.
@cfo @ceo should we do this before or after the product launch?

      ↳ [Agent-to-agent chain, depth 3/4]

ceo: Good question. The pricing change could increase revenue by 30%...

✋ cfo also has an answer (use /respond cfo)

> /respond cfo

cfo: From a financial perspective, I'd say after the launch. We need stable
revenue during the transition, and a pricing change adds risk.

> @ceo and @cto what if we did a grandfathered approach?

ceo: That could work - existing customers keep current pricing...

  ↳ [Agent-to-agent chain, depth 1/4]

cto: Technically feasible. We'd need a migration table in the database...
```

### Example 4: Disabling Agent-to-Agent Chains

```bash
> /chain-length 0
✓ Max chain length updated: 4 → 0
⚠️  Agent-to-agent chaining is now disabled.

> What's the competitive landscape?

ceo: We're facing increasing competition. @cto we need better features,
and @cfo we need better pricing.

(Agents are mentioned but don't auto-respond because chain-length is 0)

> /respond cto

cto: I agree. Here are my thoughts on features we should prioritize...

> /respond cfo

cfo: And here's my pricing analysis...

> /chain-length 4
✓ Max chain length updated: 0 → 4
(Re-enabled)
```

### Example 5: Natural Brainstorming

```bash
> Let's brainstorm ideas for improving user retention

ceo: I think we need better onboarding. @cto what data do we have on 
where users drop off?

  ↳ [Agent-to-agent chain, depth 1/4]

cto: Analytics show 40% abandon during the setup wizard. Too many steps.
We could reduce from 7 steps to 3. @cfo what's the impact if we simplify
but lose some data collection?

    ↳ [Agent-to-agent chain, depth 2/4]

cfo: We use that data for segmentation, which drives 25% of our marketing 
ROI. @ceo could we collect it post-signup instead?

      ↳ [Agent-to-agent chain, depth 3/4]

ceo: Yes! Progressive profiling. Start with minimal signup, collect more
over time. @cto is that architecturally sound?

        ↳ [Agent-to-agent chain, depth 4/4]

cto: Absolutely. We could even gamify it - "Complete your profile for
premium features". That's a better UX anyway.

> Great collaboration! Let's document this and create tickets.
```

## Best Practices for Agent-to-Agent Conversations

### 1. Let Agents Drive When Appropriate

Don't interrupt natural agent discussions:
```bash
# Good: Let them discuss
> What are the risks with this approach?
(Agents discuss back and forth)
(You observe and intervene when needed)

# Less effective: Micromanaging
> What are the risks?
ceo: I see several...
> Hold on, let me ask CFO
```

### 2. Use Chain Length Strategically

**Short chains (1-2)**: Quick clarifications
```bash
> /chain-length 2
> Quick question: is the server stable?
```

**Medium chains (3-5)**: Normal discussions (default)
```bash
> /chain-length 4  # default
> Let's discuss the roadmap
```

**Long chains (6+)**: Deep brainstorming
```bash
> /chain-length 8
> Brainstorm: how do we increase revenue 10x?
```

### 3. Monitor Chain Depth

Watch the depth indicators:
```bash
  ↳ [Agent-to-agent chain, depth 1/4]  # Just started
    ↳ [Agent-to-agent chain, depth 3/4]  # Getting deeper
        ↳ [Agent-to-agent chain, depth 4/4]  # About to stop
```

### 4. Intervene When Needed

Jump in to redirect:
```bash
ceo: @cto what do you think?
  ↳ [Agent-to-agent chain, depth 1/4]
cto: I think we should...

> Actually, before CTO answers, I want to add context: we only have 2 weeks
```

### 5. Review Buffered Responses

Don't forget other perspectives:
```bash
ceo: Here's my view...
✋ cfo also has an answer
✋ cto also has an answer

> /respond cfo
> /respond cto
(Get all perspectives before deciding)
```

## Common Patterns

### The Debate Pattern
```
User asks question → Agent A responds → Agent B disagrees → 
Agent A counters → Agent C mediates → Resolution
```

### The Consultation Pattern
```
User asks Agent A → Agent A asks Agent B for expertise →
Agent B provides info → Agent A synthesizes → Back to user
```

### The Collaboration Pattern
```
User poses problem → Agents collaborate in chain →
Each adds their expertise → Converge on solution
```

### The Escalation Pattern
```
User asks Agent A → Agent A unsure, asks Agent B →
Agent B also unsure, asks Agent C → Agent C has authority, decides
```

## Troubleshooting

### Chains Too Long
```bash
> /chain-length
Max Chain Length: 10

(Agents talk forever)

> /chain-length 3  # Reduce
```

### Chains Too Short
```bash
> What's our strategy?
ceo: We should...
⚠️  Max chain depth (1) reached.

> /chain-length 5  # Increase
```

### Agents Not Mentioning Each Other
This is normal! Agents only mention each other when it makes sense.
You can use direct targeting if you want specific agent input:
```bash
> ceo, what do you think, and please get input from @cto and @cfo
```

### Too Many Buffered Responses
```bash
✋ agent1 also has an answer
✋ agent2 also has an answer
✋ agent3 also has an answer

> /buffered  # See all
> /respond agent1
> /respond agent2
> /respond agent3
```

## Summary

Agent-to-agent communication makes meetings feel natural and dynamic:
- ✅ Agents can @mention each other to continue discussions
- ✅ Conversations chain up to `maxChainLength` (default: 4)
- ✅ Visual indicators show chain depth
- ✅ Control returns to user when max depth reached
- ✅ Adjustable with `/chain-length` command
- ✅ Can be disabled with `/chain-length 0`

This creates collaborative AI discussions where agents build on each other's insights!

