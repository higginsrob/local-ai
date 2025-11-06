# Color-Coded Agent Display Feature

## Overview
Added color-coding for each participant in AI meetings to make it easier to distinguish who is speaking.

## Implementation

### Core Color System
- **Location**: `src/lib/meeting-interactive.ts`
- **Function**: `getAgentColor(agentName: string): ChalkInstance`
- **Color Palette**: 10 distinct, readable colors (cyan, magenta, yellow, green, blue, red, orange, purple, aqua, hot pink)
- **Assignment**: Colors are assigned consistently per agent name, cycling through the palette for meetings with >10 participants

### Files Modified

1. **src/lib/meeting-interactive.ts**
   - Added color palette and `getAgentColor()` function
   - Updated agent name display to use assigned colors
   - Updated streaming output to use agent's color
   - Updated buffered response notifications to show agent names in color

2. **src/lib/meeting-slash-commands.ts**
   - Imported `getAgentColor()` from meeting-interactive
   - Updated all agent name displays in slash commands:
     - `/respond <agent>` - shows agent responses in their color
     - `/participants` - lists participants in their colors
     - `/history` - displays message history with color-coded agent names
     - `/buffered` - lists buffered responses with color-coded agent names

3. **src/commands/meeting.ts**
   - Imported `getAgentColor()` 
   - Updated meeting participants list at startup to show colors

## User Experience

### Before
All agent names and responses were displayed in uniform cyan/green colors, making it hard to quickly identify who was speaking in fast-paced multi-agent conversations.

### After
- Each agent gets a consistent, unique color
- Agent names appear in their assigned color
- Agent responses stream in their assigned color
- All displays (history, buffered responses, etc.) maintain color consistency
- Easy visual scanning to follow individual agent contributions

## Example

In a meeting with `ceo`, `coo`, and `cso`:
- `ceo` might appear in cyan
- `coo` might appear in magenta  
- `cso` might appear in yellow

This color assignment remains consistent throughout the entire meeting session.

## Technical Details

- Colors are assigned on first use per agent name
- Assignment is deterministic based on order of appearance
- Color map is maintained in memory for the session
- No persistence required - colors may vary between meetings (but remain consistent within a meeting)


