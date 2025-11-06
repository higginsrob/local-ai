# Agent Management Commands Summary

## Overview
Comprehensive set of commands for managing AI agents, including personality traits, expertise, custom attributes, and configuration.

## Commands

### 1. Personality Traits

#### `ai agent traits <name>`
Multi-select interface to manage all personality traits at once.
- Browse 218 curated traits (75 positive, 47 neutral, 96 negative)
- Navigate with ↑/↓, toggle with space, save with Enter
- List height adapts to terminal size

#### `ai agent trait-add <name>`
Add a single personality trait using autocomplete search.
- Type to filter available traits
- Shows only traits not already selected
- Displays trait category on success

#### `ai agent trait-remove <name>`
Remove a single personality trait using autocomplete search.
- Type to filter current traits
- Shows only selected traits
- Displays remaining count

### 2. Expertise Management

#### `ai agent expertise-add <name>`
Add an area of expertise using text input.
- Enter any custom expertise text
- Validates against duplicates
- Stores in `attributes.expertise` array

Example:
```bash
ai agent expertise-add dev

🎓 Add Expertise to dev

? Enter area of expertise: › TypeScript
✓ Added expertise: TypeScript
  Total expertise areas: 5
```

#### `ai agent expertise-remove <name>`
Remove an area of expertise using autocomplete search.
- Type to filter current expertise
- Select from existing areas
- Updates expertise array

Example:
```bash
ai agent expertise-remove dev

🎓 Remove Expertise from dev

? Select expertise to remove › TypeS...
  TypeScript
  JavaScript

✓ Removed expertise: TypeScript
  Remaining expertise areas: 4
```

### 3. Custom Attributes

#### `ai agent attribute-add <name>`
Add a custom key-value attribute.
- Prompts for attribute name
- Prompts for attribute value
- Cannot use reserved keys: `expertise`, `personality`
- Auto-parses JSON values, stores strings otherwise
- Validates against duplicate keys

Example:
```bash
ai agent attribute-add dev

⚙️  Add Custom Attribute to dev

? Attribute name: › jobTitle
? Attribute value: › Senior Developer

✓ Added attribute: jobTitle
  Value: "Senior Developer"
```

#### `ai agent attribute-remove <name>`
Remove a custom attribute using autocomplete search.
- Type to filter custom attributes
- Shows current value in selection
- Excludes `expertise` and `personality` (use dedicated commands)
- Displays removed value

Example:
```bash
ai agent attribute-remove dev

⚙️  Remove Custom Attribute from dev

? Select attribute to remove ›
  jobTitle: "Senior Developer"
  location: "Remote"

✓ Removed attribute: jobTitle
  Was: "Senior Developer"
```

### 4. Agent Configuration

#### `ai agent configure <name>`
Update agent settings without disturbing attributes.
- Pre-fills form with current values
- Updates: model, systemPrompt, ctxSize, maxTokens, temperature, topP, topN
- Preserves: all attributes (personality, expertise, custom)

Example:
```bash
ai agent configure dev

⚙️  Configure dev

? Model: › ai/llama3.2:latest
? System prompt: › You are an expert software developer...
? Context size: › 10240
? Max tokens: › 2048
? Temperature: › 0.7
? Top P: › 0.9
? Top N: › 40

✓ Updated configuration for dev
  Attributes preserved
```

## Data Structure

Agent attributes structure:
```json
{
  "name": "dev",
  "model": "ai/llama3.2:latest",
  "systemPrompt": "You are an expert...",
  "modelParams": {
    "ctxSize": 10240,
    "maxTokens": 2048,
    "temperature": 0.7,
    "topP": 0.9,
    "topN": 40
  },
  "attributes": {
    "personality": ["Intelligent", "Creative", "Focused"],
    "expertise": ["TypeScript", "React", "Node.js"],
    "jobTitle": "Senior Developer",
    "location": "Remote"
  }
}
```

## Command Categories

### Batch Operations
- `ai agent traits <name>` - Manage all traits at once

### Single Item Operations
- `ai agent trait-add <name>`
- `ai agent trait-remove <name>`
- `ai agent expertise-add <name>`
- `ai agent expertise-remove <name>`
- `ai agent attribute-add <name>`
- `ai agent attribute-remove <name>`

### Configuration
- `ai agent configure <name>` - Update settings
- `ai agent edit <name>` - Edit JSON directly

## Workflow Examples

### Setting up a new developer agent
```bash
# Create agent
ai agent new dev

# Configure basic settings
ai agent configure dev

# Add personality traits
ai agent traits dev  # Select: Intelligent, Analytical, Creative

# Add expertise
ai agent expertise-add dev  # "TypeScript"
ai agent expertise-add dev  # "React"
ai agent expertise-add dev  # "Node.js"

# Add custom attributes
ai agent attribute-add dev  # jobTitle: "Senior Full-Stack Developer"
ai agent attribute-add dev  # yearsExperience: "10"

# View final configuration
ai agent show dev
```

### Quick trait adjustment
```bash
# Add a trait
ai agent trait-add dev  # "Patient"

# Remove a trait
ai agent trait-remove dev  # "Impatient"
```

### Updating model settings
```bash
# Change model and parameters without losing attributes
ai agent configure dev
# Update model to ai/llama3.2:3B
# Adjust temperature to 0.8
# All traits, expertise, and custom attributes preserved
```

## Benefits

1. **Granular Control** - Modify specific aspects without touching others
2. **Type Safety** - Validates input and prevents conflicts
3. **Searchable** - Autocomplete for quick selection
4. **Preserved State** - Configure command preserves attributes
5. **Flexible** - Custom attributes for any additional data
6. **User-Friendly** - Interactive prompts with validation

## Files Changed
- `src/commands/agent.ts` - Added 7 new command functions
- `src/index.ts` - Added Commander.js definitions
- `README.md` - Updated with new commands
- `AGENT_MANAGEMENT_SUMMARY.md` - This file

