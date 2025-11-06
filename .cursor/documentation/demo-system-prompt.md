# System Prompt with Attributes - Demo

## Overview

The system now dynamically builds a complete system prompt by combining:
1. Base system prompt (from agent configuration)
2. Agent attributes (from agent JSON)
3. User attributes (from profile JSON)

## Example Configuration

### Agent Configuration (`~/.ai/agents/coder.json`)

```json
{
  "name": "coder",
  "model": "ai/llama3.2:latest",
  "systemPrompt": "You are an expert coding assistant specialized in modern web development.",
  "modelParams": {
    "ctxSize": 8192,
    "maxTokens": 4096,
    "temperature": 0.7,
    "topP": 0.9,
    "topN": 40
  },
  "attributes": {
    "specialty": "code-review",
    "languages": ["typescript", "python", "rust"],
    "frameworks": ["react", "fastapi", "axum"],
    "testingApproach": "TDD with comprehensive coverage"
  }
}
```

### User Profile (`~/.ai/profiles/developer.json`)

```json
{
  "name": "developer",
  "attributes": {
    "role": "Senior Full-Stack Developer",
    "expertise": ["typescript", "docker", "kubernetes", "ai"],
    "preferences": {
      "codeStyle": "functional",
      "testing": "jest",
      "linting": "strict"
    },
    "context": {
      "company": "Tech Startup",
      "team": "Platform Engineering",
      "timezone": "PST"
    }
  }
}
```

## Generated System Prompt

When you run `ai run coder "Help me write a React component"`, the system prompt sent to the model will be:

```
You are an expert coding assistant specialized in modern web development.

# Agent Attributes

**Specialty**: code-review
**Languages**: typescript, python, rust
**Frameworks**: react, fastapi, axum
**Testing Approach**: TDD with comprehensive coverage

# User Attributes

**Role**: Senior Full-Stack Developer
**Expertise**: typescript, docker, kubernetes, ai
**Preferences**:
  - Code Style: functional
  - Testing: jest
  - Linting: strict
**Context**:
  - Company: Tech Startup
  - Team: Platform Engineering
  - Timezone: PST
```

## Benefits

### 1. **Context-Aware Responses**

The AI knows:
- Your role and expertise level
- Your code style preferences
- Your team context
- The agent's specialized capabilities

### 2. **Consistent Interactions**

The system prompt is automatically built from your saved profiles, ensuring:
- Consistent responses across sessions
- No need to repeat context
- Easy profile switching

### 3. **Dynamic Customization**

Change attributes anytime with:

```bash
# Add new user attribute
ai profile add currentProject "microservices-migration"

# Add agent attribute
ai agent add-attribute codeReviewFocus "performance,security,maintainability"

# Or edit directly
ai profile edit
ai agent edit coder
```

## Example Interactions

### Before (Without Attributes)

**User**: "Help me write a React component"

**AI** (with basic prompt): "Sure! Here's a basic React component..."

### After (With Attributes)

**User**: "Help me write a React component"

**AI** (with full context): "Based on your functional programming preference and strict linting setup, here's a React component using TypeScript with comprehensive Jest tests..."

## Use Cases

### 1. Role-Based Context

```json
"attributes": {
  "role": "Tech Lead",
  "responsibilities": ["architecture", "code-review", "mentoring"],
  "decisionAuthority": "technical-stack"
}
```

### 2. Project-Specific Context

```json
"attributes": {
  "currentProject": "payment-service",
  "stack": ["node.js", "postgresql", "redis"],
  "constraints": ["PCI-DSS compliance", "99.99% uptime"]
}
```

### 3. Learning Context

```json
"attributes": {
  "learningGoals": ["rust", "system-programming"],
  "experienceLevel": "intermediate",
  "preferredStyle": "hands-on with explanations"
}
```

## Tips

1. **Keep attributes up-to-date**: Use `ai profile edit` regularly
2. **Use specific agent attributes**: Different agents for different tasks
3. **Leverage nested objects**: For complex preferences
4. **Switch profiles**: Different profiles for different roles/projects

## Technical Details

### Formatting Rules

- **Simple values**: `"key": "value"` → `**Key**: value`
- **Arrays**: `"key": ["a", "b"]` → `**Key**: a, b`
- **Objects**: Nested with indentation
- **CamelCase**: Automatically splits to "Camel Case"

### System Prompt Construction

```
[Base System Prompt]

# Agent Attributes
[formatted agent.attributes]

# User Attributes
[formatted profile.attributes]
```

See `src/lib/prompt-builder.ts` for implementation details.


