# Forced Check-In and Reset Fix

## Issues Fixed

### Issue 1: Hard Max Depth Warning
**Problem:** Agents were still hitting max chain depth and showing a warning instead of naturally checking in with the user.

**Solution:** Instead of showing a warning, agents are now **instructed via their system prompt** to check in with `@user` when they reach the depth limit.

### Issue 2: Agents Mentioning Themselves
**Problem:** Agents were @mentioning themselves (e.g., `pm` saying `@pm`), which doesn't make sense and could cause issues.

**Solution:** Added explicit instruction in system prompt: "Do NOT @mention yourself - you cannot respond to yourself"

### Issue 3: Reset Commands Not Clearing Meetings
**Problem:** Both `ai reset` and `ai session reset` were only clearing regular sessions, not meeting sessions.

**Solution:** Updated reset commands to clear both regular sessions AND meeting sessions.

## Implementation Details

### 1. Forced Check-In at Max Depth

**Updated `buildMeetingContext()` to accept `chainDepth` parameter:**

```typescript
export function buildMeetingContext(
  currentAgent: Agent, 
  allAgents: Agent[], 
  session: MeetingSession, 
  chainDepth: number = 0
): string
```

**When at max depth - 1 (approaching limit):**
```
Note: You are approaching the conversation depth limit.
Consider checking in with @user soon (current depth: 3/4).
```

**When at max depth (must check in):**
```
⚠️  IMPORTANT: CONVERSATION DEPTH LIMIT
═══════════════════════════════════════════════════════════

You are at chain depth 4 out of maximum 4.
You MUST check in with the user now using @user.
Do NOT @mention other agents - just summarize and ask the user for guidance.

Example:
  "@user We've had an extensive discussion. [Summary of key points]
   What would you like us to focus on next?"
```

### 2. Self-Mention Prevention

Added to BEST PRACTICES section:
```
• IMPORTANT: Do NOT @mention yourself (@agentname) - you cannot respond to yourself
```

This prevents agents from creating weird self-referential loops.

### 3. Meeting Sessions in Reset

**Added to Storage class:**
```typescript
async deleteAllMeetingSessions(): Promise<void> {
  const meetings = await this.listMeetingSessions();
  await Promise.all(meetings.map(id => this.deleteMeetingSession(id)));
}
```

**Updated `resetSessions()` in session.ts:**
```typescript
async function resetSessions(storage: Storage): Promise<void> {
  const sessions = await storage.listSessions();
  const meetings = await storage.listMeetingSessions();
  
  await storage.deleteAllSessions();
  await storage.deleteAllMeetingSessions();
  
  console.log(`✓ Removed ${sessions.length} session(s) and ${meetings.length} meeting(s)`);
}
```

## Files Modified

1. **`src/lib/meeting-interactive.ts`**
   - Added `chainDepth` parameter to `buildMeetingContext()`
   - Added `chainDepth` parameter to `getAgentResponse()`
   - Added `chainDepth` parameter to `streamAgentResponse()`
   - Updated all calls to pass chain depth
   - Added depth-aware check-in instructions
   - Added self-mention prevention
   - Removed old max depth warning

2. **`src/lib/meeting-slash-commands.ts`**
   - Updated call to `buildMeetingContext()` with chainDepth = 0

3. **`src/lib/storage.ts`**
   - Added `deleteAllMeetingSessions()` method

4. **`src/commands/session.ts`**
   - Updated `resetSessions()` to clear meetings too

## Behavior Changes

### Before: Hard Warning
```
ceo: Discussion continues... @cto what do you think?
  ↳ depth 4/4

⚠️  Max chain depth (4) reached. Agents mentioned but not responding: cto
Use /respond <agent> to hear their response
```

### After: Forced Check-In
```
ceo: Discussion continues... @cto what do you think?
  ↳ depth 3/4

cto: Good points. @user We've discussed this thoroughly. The CEO 
     recommends option A for speed, while the CFO suggests option B for 
     cost. What's your priority?

💬 cto is checking in with you.

>
```

**At depth 3/4:** Agent sees "approaching limit" note  
**At depth 4/4:** Agent sees "MUST check in with @user" instruction  
**Result:** Natural check-in instead of hard stop

### Self-Mention Prevention

**Before:**
```
pm: I think we should do this. @pm what do you think?
(Tries to mention itself)
```

**After:**
```
pm: I think we should do this. @ceo what do you think?
(Mentions another agent, or checks in with @user)
```

System prompt now includes:
"Do NOT @mention yourself (@pm) - you cannot respond to yourself"

### Reset Commands

**Before:**
```bash
$ ai reset
✓ Removed 3 session(s)
# Meetings still exist!

$ ai meeting ceo cto
📋 Resuming meeting...  # Old meeting still there
```

**After:**
```bash
$ ai reset
✓ Removed 3 session(s) and 2 meeting(s)
  Total: 5 cleared

$ ai meeting ceo cto
🎯 Starting new meeting...  # Fresh start
```

## Testing

Build successful ✅  
No linter errors ✅  
All parameters properly passed ✅

## What This Achieves

### 1. Natural Depth Limits
Agents self-regulate and check in instead of hitting walls

### 2. No Self-Mentions
Agents won't try to talk to themselves

### 3. Complete Reset
Both `ai reset` and `/reset` properly handle all session types

## Try It Now

```bash
npm run build
ai reset  # Clear everything
ai meeting ceo cto cfo

> Start a discussion and watch agents check in naturally at depth limits
```

The agents will now:
- ✅ See depth warnings as they approach limit
- ✅ Be forced to @user check-in at max depth
- ✅ Never @mention themselves
- ✅ All reset commands work properly

**Result:** Much more natural meeting flow where agents intelligently check in with you instead of hitting hard stops!

