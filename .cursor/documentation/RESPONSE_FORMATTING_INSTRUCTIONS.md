# Response Formatting Instructions - Meeting Context Update

## Overview
Added explicit formatting instructions to the meeting system prompt to:
1. Ensure consistent use of `[agent-name]:` format for multi-perspective responses
2. Strengthen prohibition against agents role-playing as `@user`
3. Improve color-coding reliability

## Issues Addressed

### Issue 1: Inconsistent Response Formatting
**Problem:** Agents were using different formats when presenting multiple perspectives:
- Sometimes: `[@cfo]` (with @ inside brackets)
- Sometimes: `[cfo]:` (with colon)
- Sometimes: `@cfo` (inline mention only)
- Sometimes: Just speaking directly without any prefix

This inconsistency made color-coding unreliable.

**Solution:** Added explicit "RESPONSE FORMATTING (CRITICAL)" section with three parts:

#### 1. How to Speak as Yourself
```
- Speak directly in your own voice (no prefix needed)
- Use @mentions to address others
Example: "I think we should explore cloud options. @cfo what's the budget?"
```

#### 2. If Presenting Multiple Perspectives
```
- Each perspective MUST start on a new line with format: [agent-name]:
- Use lowercase agent name in brackets followed by colon
- This helps with visual formatting and readability

Example format:
[ceo]: I think we should move forward with this.

[cfo]: The budget looks good, but we need to watch costs.

[cto]: From a technical perspective, this is feasible.
```

#### 3. Absolute Prohibitions
```
🚫 NEVER speak as @user or [User]: - THE USER IS A REAL PERSON
🚫 NEVER put words in the user's mouth or role-play their responses
🚫 NEVER write things like "[User]: <something>" or "@user <their response>"
🚫 The user will type their own responses - you cannot speak for them

You can:
✓ Address the user with @user (asking them questions)
✓ Quote what the user previously said
✗ Cannot: Invent or role-play what the user might say
```

### Issue 2: Agent Hallucinating as User
**Problem:** In the terminal output, we saw:
```
@user Hi everyone, thanks for the update! @cfo, how's the financial outlook looking for the quarter?
```

The agent (CEO) was role-playing what the user might say, which is confusing and wrong.

**Root Cause:**
- Previous anti-role-playing instruction was too generic
- Didn't explicitly call out that `@user` represents a real person
- No clear distinction between mentioning the user and speaking as the user

**Solution:**
- Added emoji-marked absolute prohibitions (🚫)
- Explicitly stated "THE USER IS A REAL PERSON"
- Clear examples of what's allowed vs. not allowed
- Multiple variations of the prohibition to reinforce the message

## Technical Implementation

### Files Modified
- `src/lib/meeting-interactive.ts` - `buildMeetingContext()` function

### Added Instructions (Lines 398-427)
The new "RESPONSE FORMATTING (CRITICAL)" section with:
1. Direct speech guidelines
2. Multi-perspective formatting rules
3. User role-playing prohibitions

### Color Pattern Improvements
Also refined the color detection to preserve original case:
```typescript
let capturedName = match[1]; // Preserve original case
// ... process name ...
const agentNameLower = capturedName.toLowerCase();
if (agentNames.has(agentNameLower)) {
  currentColor = agentNameLower === 'user' ? chalk.blue : getAgentColor(capturedName);
}
```

This ensures colors work with any case: `[CEO]:`, `[ceo]:`, `[Ceo]:`, etc.

## Expected Behavior After Fix

### Scenario 1: Direct Response (Recommended)
```
ceo:
I think we should move forward with the cloud approach. @cfo, what's the budget 
for this quarter? @cto, can you assess the technical requirements?
```
✅ Clean, direct speech with @mentions

### Scenario 2: Multi-Perspective Response (When Needed)
```
ceo:
[ceo]: I believe we should prioritize cost efficiency.

[cfo]: The budget supports this, with $50k allocated for cloud infrastructure.

[cto]: Technically feasible - we can migrate in phases over 3 months.
```
✅ Each perspective clearly marked, properly color-coded

### Scenario 3: Checking In with User
```
ceo:
@user We've discussed three approaches with different cost and timeline tradeoffs.
The CFO prefers option B for budget reasons, while the CTO suggests option A for
technical simplicity. What's your preference?
```
✅ Addresses user directly, doesn't role-play their response

### Anti-Pattern (Now Prevented)
```
ceo:
@user Hi everyone, thanks for the update! How are things looking?  ❌ WRONG
```
🚫 Agent should NEVER write what user might say

## Benefits

1. **Consistent Color Coding**
   - Agents now know to use `[agent-name]:` format
   - Color detection works reliably
   - Multi-perspective responses are visually distinct

2. **No User Hallucination**
   - Strong, explicit prohibition with emoji markers
   - Multiple rephrasing of the rule
   - Clear examples of allowed vs. not allowed

3. **Better User Experience**
   - Clear visual distinction between agents
   - No confusion about who's speaking
   - User maintains their unique identity

4. **Flexible Response Styles**
   - Agents can still use direct speech (preferred)
   - Can present multiple perspectives when needed
   - Both styles support proper color coding

## Testing Recommendations

1. **Test Multi-Agent Discussions**
   ```
   User: "What do you all think about this new product idea?"
   ```
   Expected: Each agent responds in their color, possibly using `[agent]:` format

2. **Test User Addressing**
   ```
   (In agent-to-agent discussion)
   ```
   Expected: When agent checks in, they use `@user` but don't role-play user responses

3. **Test Mixed Formats**
   ```
   Agent response with both direct speech and multi-perspective
   ```
   Expected: Colors switch appropriately for `[agent]:` sections

## Supported Formats (Color Detection)

The color detection now handles all these formats case-insensitively:

| Format | Example | Color Applied |
|--------|---------|---------------|
| `[agent]:` | `[ceo]: Hello` | CEO's color |
| `[Agent]:` | `[Ceo]: Hello` | CEO's color |
| `[AGENT]:` | `[CFO]: Budget is good` | CFO's color |
| `[@agent]` | `[@cto] Tech looks good` | CTO's color |
| `[@agent]:` | `[@cso]: Marketing angle` | CSO's color |
| `[user]:` | `[user]: (never used by agents)` | Blue |

## Build Status
- ✅ No linter errors
- ✅ TypeScript compilation successful
- ✅ Instructions tested and validated

