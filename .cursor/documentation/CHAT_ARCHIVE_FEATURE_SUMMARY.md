# Chat Archive Feature Summary

## Overview
Added a new chat archiving system that allows users to save and restore chat histories from both agent chats and meeting rooms. Users are prompted to save their chat history when running the `/clear` command, and can restore archived chats using the new `/restore` command.

## Features Implemented

### 1. Archive Storage (`storage.ts`)
- Created `.ai/archive/` directory for storing archived chats
- Added `saveArchive(name, data)` - Save a chat (agent or meeting) to archive
- Added `loadArchive(name)` - Load an archived chat
- Added `listArchives()` - List all available archives
- Added `deleteArchive(name)` - Delete an archive

### 2. Enhanced `/clear` Command
**In both agent chats and meeting rooms:**

When the user runs `/clear`:
1. If there's chat history, prompts: "Save chat history before clearing? (y/yes to save)"
2. If yes, prompts for a chat name
3. Saves the complete session (messages, metadata, etc.) to `~/.ai/archive/<chat-name>.json`
4. Then clears the screen and chat history as usual

### 3. New `/restore` Command
**In both agent chats and meeting rooms:**

#### Without arguments (`/restore`)
Lists all available archived chats with:
- Chat name
- Type (Agent Chat or Meeting Room)
- Number of messages
- Last updated timestamp

#### With archive name (`/restore <name>`)
1. Asks if user wants to save current chat before restoring
2. Loads the archived chat
3. Handles different restoration scenarios:

**For Agent Chats:**
- If restoring to same agent: Restores messages in place
- If different agent: Switches to that agent
- If restoring from meeting: Informs user and asks to restart

**For Meeting Rooms:**
- If restoring to same room: Restores messages in place
- If different room: Saves the archive and informs user to restart with the room name
- If restoring from agent chat: Switches to agent mode

### 4. Archive Format
Archives are stored as complete JSON representations of either:
- `Session` objects (for agent chats)
- `MeetingSession` objects (for meeting rooms)

This preserves all data including:
- All messages/chat history
- Metadata (token counts, stats, etc.)
- Session/room configuration
- Agent names and participants

## User Flow Examples

### Example 1: Save and restore an agent chat
```bash
# User has a conversation with an agent
User: Tell me about TypeScript

# User wants to clear but save the conversation
User: /clear
Prompt: Save chat history before clearing? (y/yes to save)
User: y
Prompt: Enter a name for this chat:
User: typescript-discussion
✓ Chat saved to archive: typescript-discussion

# Later, user wants to restore it
User: /restore typescript-discussion
✓ Restoring agent chat: dev
  Messages: 10
✓ Chat history restored
```

### Example 2: List and restore a meeting room
```bash
# In a meeting room
User: /restore

📦 Archived Chats

  project-planning
    Type: Meeting Room
    Messages: 45
    Updated: 2025-11-06T...

  typescript-discussion
    Type: Agent Chat
    Messages: 10
    Updated: 2025-11-06T...

Usage: /restore <archive-name>

User: /restore project-planning
Prompt: Save current chat before restoring? (y/yes to save)
User: n
✓ Restoring meeting room: project-planning
  Participants: ceo, cto, pm
  Messages: 45
✓ Room history restored
```

### Example 3: Cross-mode restoration
```bash
# In agent mode, restore a meeting
User: /restore executive-meeting
✓ Restoring meeting room: executive-meeting
  Participants: ceo, cfo, coo
  Messages: 30
Switching to meeting mode...

# Or in meeting mode, restore an agent chat
User: /restore code-review
✓ Restoring agent chat: dev
  Messages: 15
Switching to agent mode...
```

## Implementation Details

### File Structure
```
~/.ai/
  ├── archive/           # New directory for archived chats
  │   ├── chat1.json
  │   ├── meeting1.json
  │   └── ...
  ├── sessions/          # Current agent sessions
  ├── meetings/          # Current meeting sessions
  └── ...
```

### Modified Files
1. **src/lib/storage.ts**
   - Added archive directory creation
   - Added archive CRUD operations

2. **src/lib/slash-commands.ts** (Agent chats)
   - Updated `handleReset()` to prompt for save
   - Added `handleRestore()` for loading archives
   - Updated help text

3. **src/lib/meeting-slash-commands.ts** (Meeting rooms)
   - Updated `handleReset()` to prompt for save
   - Added `handleRestore()` for loading archives
   - Updated help text

### Help Text Updates
Both command sets now include:
```
/restore <name>            - Restore an archived chat
```

## Technical Considerations

1. **Type Detection**: Archives are detected as agent chats vs meeting rooms by checking for the `roomName` property
2. **Validation**: Archive names must be non-empty and are sanitized for filesystem safety
3. **Prompts**: Uses the `prompts` library for user input with validation
4. **Error Handling**: Graceful error messages for missing archives or save failures
5. **Cross-mode Support**: Seamlessly handles restoring different session types (agent ↔ meeting)

## Benefits

1. **Conversation Continuity**: Users can save important conversations for later reference
2. **Experimentation**: Clear the chat to try new approaches without losing context
3. **Organization**: Archive different discussion topics separately
4. **Flexibility**: Restore old conversations across different agents or meeting rooms
5. **Safety**: Always prompts before overwriting current chat when restoring

## Future Enhancements (Not Implemented)

Potential improvements for future versions:
- Archive search/filter functionality
- Archive tags or categories
- Automatic archiving based on age or size
- Archive export/import for sharing
- Archive compression for large histories
- Archive metadata (creation date, description, tags)

