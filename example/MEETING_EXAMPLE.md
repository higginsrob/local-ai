# AI Meeting Example

This is an example of how the `ai meeting` command works in practice.

## Starting a Meeting

```bash
$ ai meeting start executive-team ceo cto cfo

🎯 Starting new meeting with: ceo, cto, cfo

Meeting Participants:
  ceo - ai/llama3.2:latest
  cto - ai/llama3.2:latest
  cfo - ai/llama3.2:latest

To direct your message to a specific agent:
  - Start with: <agent-name>, your message
  - Use anywhere: @<agent-name> your message
  - No targeting: all agents receive, most qualified responds

Type /help for commands, /quit to exit, or press Ctrl+C

>
```

## Example Conversation

### Broadcast Question (All Agents Evaluate)

```
> What should be our top priority for the next quarter?

ceo: Based on current market conditions and our strategic goals, I believe
our top priority should be customer acquisition. We need to expand our
market share before competitors catch up...

✋ cfo also has an answer (use /respond cfo)
✋ cto also has an answer (use /respond cto)

>
```

**What happened?**
- All three agents received the question
- All three felt qualified to respond
- CEO responded first (streamed in real-time)
- CFO and CTO's responses were buffered

### Viewing Buffered Responses

```
> /respond cfo

cfo: From a financial perspective, I'd add that we need to prioritize
sustainable growth. While customer acquisition is important, we should
focus on customers with strong lifetime value potential. Our burn rate
suggests we need to be strategic about where we invest...

> /respond cto

cto: I agree with both perspectives. From a technical standpoint, to support
accelerated customer acquisition, we need to first stabilize our
infrastructure. The recent incidents show we're at capacity. I'd suggest
we prioritize scaling our backend systems and improving reliability
before aggressive growth initiatives...

>
```

### Direct Question to Specific Agent

```
> cto, what's your estimate for the infrastructure work?

cto: Based on our current technical debt and scaling requirements, I estimate
we'll need about 8-10 weeks for the core infrastructure work:
- Weeks 1-3: Database optimization and sharding
- Weeks 4-6: API performance improvements
- Weeks 7-8: Load balancing and redundancy
- Weeks 9-10: Testing and deployment

This assumes we dedicate 2 senior engineers full-time to the effort...

>
```

**What happened?**
- Only CTO received and responded to this question
- Response was direct, no buffering needed

### Using @ Mentions

```
> I think we need to balance both priorities. @cfo can you model out the
costs for both scenarios?

cfo: Certainly. Let me break down the financial implications of both
approaches:

Scenario A (Growth First):
- Customer acquisition: $500K/quarter
- Infrastructure strain costs: ~$100K/quarter in lost revenue
- ROI timeline: 6-8 months

Scenario B (Infrastructure First):
- Infrastructure investment: $300K upfront
- Delayed revenue: ~$200K/quarter
- ROI timeline: 12-14 months but more sustainable...

>
```

### Multiple Agents Discussion

```
> What do @ceo and @cfo think about the CTO's timeline?

ceo: The 8-10 week timeline seems reasonable, but I'm concerned about
opportunity cost. That's nearly a full quarter without new customer
acquisition momentum...

✋ cfo also has an answer (use /respond cfo)

> /respond cfo

cfo: I share the CEO's concern about timing. However, the infrastructure
investment is necessary. Perhaps we could explore a phased approach?
Minimal infrastructure in weeks 1-4, limited customer acquisition in
weeks 5-8, then scale both in weeks 9-10...

>
```

## Meeting Commands

### Check Who's in the Meeting

```
> /participants

👥 Meeting Participants

  ceo
    Model: ai/llama3.2:latest
    Role: You are a CEO focused on strategic growth, market positioning...

  cfo
    Model: ai/llama3.2:latest
    Role: You are a CFO focused on financial planning, budgets, and ROI...

  cto
    Model: ai/llama3.2:latest
    Role: You are a CTO focused on technical architecture, engineering...

>
```

### View Recent History

```
> /history 3

💬 Recent Messages (last 3)

[User]
  (to: cto)
what's your estimate for the infrastructure work?

[cto]
Based on our current technical debt and scaling requirements, I estimate
we'll need about 8-10 weeks...

[User]
I think we need to balance both priorities. @cfo can you model...

>
```

### Check Buffered Responses

```
> /buffered

📝 Buffered Responses

  cfo - 2025-11-06T10:23:45.123Z
    I share the CEO's concern about timing. However, the infrastructure...

Use /respond <agent-name> to show full response

>
```

### View Meeting Status

```
> /status

📊 Meeting Status

  Participants: ceo, cto, cfo
  Total Messages: 12
  Buffered Responses: 1

  Last Response: cfo
    Tokens: 1523 (1021 prompt + 502 completion)

>
```

### Reset Meeting (Keep Participants)

```
> /reset

✓ Reset meeting history

>
```

### Exit Meeting

```
> /quit
Goodbye!

$ 
```

## Tips for Effective Meetings

1. **Use broadcasts for open-ended questions** - Let agents self-select based on expertise
2. **Direct questions when you need specific input** - Use `agent,` or `@agent`
3. **Review all buffered responses** - Multiple perspectives add value
4. **Check history periodically** - Use `/history` to review the conversation
5. **Reset long conversations** - Use `/reset` if the context gets too long

## When Agents Pass

Sometimes agents will choose not to respond to broadcasts:

```
> What's the best JavaScript framework?

💭 (None of the agents felt qualified to respond)
Use /respond <agent-name> to request a specific agent to answer

> /respond cto

cto: While this is outside my core expertise as focused on infrastructure,
I can share that our engineering team has had good success with React
for its component reusability and ecosystem...

>
```

This happens when:
- Question is outside their defined role
- Another agent is clearly more qualified
- Agent's system prompt doesn't cover the topic

Use `/respond <agent>` to force a response anyway.

