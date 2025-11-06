# System Prompts with Dynamic Attributes

## Overview

The AI CLI automatically builds rich, context-aware system prompts by combining:
1. **Base System Prompt** - From agent configuration
2. **Agent Attributes** - Capabilities and specializations
3. **User Attributes** - Your profile, preferences, and context

## Architecture

### Prompt Builder (`src/lib/prompt-builder.ts`)

The `buildSystemPrompt()` function constructs the final prompt:

```typescript
function buildSystemPrompt(
  basePrompt: string,
  agent: Agent | null,
  profile: Profile
): string
```

**Flow:**
1. Start with base prompt
2. If agent has attributes → add `# Agent Attributes` section
3. If profile has attributes → add `# User Attributes` section
4. Return complete prompt

### Integration Points

1. **Single Execution** (`src/commands/run.ts`)
   - Loads agent and profile
   - Builds system prompt
   - Prepends to message array

2. **Interactive Mode** (`src/lib/interactive.ts`)
   - Builds prompt for each message
   - Includes in tool call continuations
   - Maintains consistency across conversation

## Formatting Rules

### Simple Values

**Input:**
```json
{
  "specialty": "code-review"
}
```

**Output:**
```
**Specialty**: code-review
```

### Arrays

**Input:**
```json
{
  "languages": ["typescript", "python", "rust"]
}
```

**Output:**
```
**Languages**: typescript, python, rust
```

### Nested Objects

**Input:**
```json
{
  "preferences": {
    "codeStyle": "functional",
    "testing": "jest"
  }
}
```

**Output:**
```
**Preferences**:
  - Code Style: functional
  - Testing: jest
```

### CamelCase Conversion

Automatically converts camelCase keys to readable format:
- `codeStyle` → `Code Style`
- `testingApproach` → `Testing Approach`
- `currentProject` → `Current Project`

## Example Configurations

### Developer Profile

```json
{
  "name": "developer",
  "attributes": {
    "role": "Senior Full-Stack Developer",
    "expertise": ["typescript", "react", "node.js", "docker"],
    "preferences": {
      "codeStyle": "functional",
      "testing": "jest with 100% coverage",
      "linting": "strict TypeScript, ESLint"
    },
    "context": {
      "company": "Tech Startup",
      "team": "Platform Engineering",
      "timezone": "PST",
      "workingHours": "9 AM - 6 PM"
    }
  }
}
```

### Coding Agent

```json
{
  "name": "coder",
  "systemPrompt": "You are an expert coding assistant specialized in modern web development.",
  "attributes": {
    "specialty": "code-review and refactoring",
    "languages": ["typescript", "python", "rust"],
    "frameworks": ["react", "next.js", "fastapi"],
    "testingApproach": "TDD with comprehensive unit and integration tests",
    "codeStandards": {
      "formatting": "prettier",
      "linting": "eslint with strict rules",
      "documentation": "JSDoc for all public APIs"
    }
  }
}
```

### Generated System Prompt

```
You are an expert coding assistant specialized in modern web development.

# Agent Attributes

**Specialty**: code-review and refactoring
**Languages**: typescript, python, rust
**Frameworks**: react, next.js, fastapi
**Testing Approach**: TDD with comprehensive unit and integration tests
**Code Standards**:
  - Formatting: prettier
  - Linting: eslint with strict rules
  - Documentation: JSDoc for all public APIs

# User Attributes

**Role**: Senior Full-Stack Developer
**Expertise**: typescript, react, node.js, docker
**Preferences**:
  - Code Style: functional
  - Testing: jest with 100% coverage
  - Linting: strict TypeScript, ESLint
**Context**:
  - Company: Tech Startup
  - Team: Platform Engineering
  - Timezone: PST
  - Working Hours: 9 AM - 6 PM
```

## Use Cases

### 1. Role-Based Assistance

**Configuration:**
```json
{
  "attributes": {
    "role": "Tech Lead",
    "responsibilities": ["architecture", "code-review", "mentoring"],
    "decisionAuthority": "technical-stack-choices",
    "teamSize": 8
  }
}
```

**Benefit:** AI understands you make architectural decisions and provides guidance accordingly.

### 2. Project Context

**Configuration:**
```json
{
  "attributes": {
    "currentProject": "payment-processing-service",
    "stack": ["node.js", "postgresql", "redis", "kubernetes"],
    "constraints": ["PCI-DSS compliance", "99.99% uptime SLA"],
    "phase": "production-optimization"
  }
}
```

**Benefit:** AI considers compliance requirements and production constraints in suggestions.

### 3. Learning Context

**Configuration:**
```json
{
  "attributes": {
    "learningGoals": ["rust", "system-programming", "performance-optimization"],
    "experienceLevel": "intermediate-backend-expert-frontend",
    "preferredLearningStyle": "hands-on with detailed explanations"
  }
}
```

**Benefit:** AI tailors explanations to your experience level and learning preferences.

### 4. Code Style Preferences

**Configuration:**
```json
{
  "attributes": {
    "codeStyle": {
      "paradigm": "functional-first",
      "errorHandling": "Result types over exceptions",
      "naming": "descriptive over concise",
      "comments": "why not what"
    }
  }
}
```

**Benefit:** AI generates code matching your established patterns.

## Best Practices

### 1. Keep Attributes Current

```bash
# Update as your role changes
ai profile edit

# Update agent specializations
ai agent edit coder
```

### 2. Use Specific Agents for Different Tasks

```bash
# Code review agent
ai agent new code-reviewer
# Set specialty to "thorough code review"

# Quick scripting agent  
ai agent new scripter
# Set specialty to "fast prototyping"

# Documentation agent
ai agent new doc-writer
# Set specialty to "clear technical documentation"
```

### 3. Leverage Nested Objects

Group related attributes for clarity:

```json
{
  "attributes": {
    "development": {
      "languages": ["typescript", "python"],
      "frameworks": ["react", "django"]
    },
    "infrastructure": {
      "cloud": "AWS",
      "orchestration": "kubernetes",
      "cicd": "GitHub Actions"
    }
  }
}
```

### 4. Include Temporal Context

```json
{
  "attributes": {
    "currentFocus": "microservices migration Q4 2025",
    "upcomingDeadline": "beta launch Dec 15",
    "recentlyLearned": ["kafka", "event-driven-architecture"]
  }
}
```

## Performance Considerations

### Prompt Size

- System prompts are sent with every message
- Keep attributes relevant and concise
- Remove outdated attributes regularly

### Token Usage

Example sizes:
- Base prompt: ~20-50 tokens
- Agent attributes: ~50-200 tokens
- User attributes: ~50-200 tokens
- **Total**: ~120-450 tokens per message

### Optimization Tips

1. **Use arrays for lists** (more compact than multiple keys)
2. **Avoid redundancy** between agent and user attributes
3. **Remove empty or unused attributes**

## Testing

Run the test suite:

```bash
npm test -- tests/lib/prompt-builder.test.ts
```

Tests cover:
- Empty attributes
- Agent-only attributes
- User-only attributes  
- Combined attributes
- Nested objects
- Array formatting
- CamelCase conversion

## Debugging

Enable debug mode to see the system prompt:

```bash
ai run ai/llama3.2:latest "test" --debug
```

This shows:
- Model name
- Endpoint
- Tool count
- **Full system prompt** (coming soon)

## Future Enhancements

Planned features:
- Attribute templates for common roles
- Attribute inheritance (team → individual)
- Conditional attributes (if timezone=PST, include...)
- Attribute validation and suggestions
- Prompt size optimization

## Migration Guide

### Updating Existing Configurations

Old approach (manual context in prompt):

```json
{
  "systemPrompt": "You are a helpful assistant. I'm a senior developer working with TypeScript and React."
}
```

New approach (structured attributes):

```json
{
  "systemPrompt": "You are a helpful coding assistant.",
  "attributes": {
    "languages": ["typescript"],
    "frameworks": ["react"]
  }
}
```

Profile:
```json
{
  "attributes": {
    "role": "Senior Developer"
  }
}
```

### Benefits of Migration

- ✅ Reusable across agents
- ✅ Easier to update
- ✅ Better formatting
- ✅ Shareable configurations
- ✅ Version controllable

## See Also

- `example/demo-system-prompt.md` - Full examples
- `src/lib/prompt-builder.ts` - Implementation
- `tests/lib/prompt-builder.test.ts` - Test suite
- `docs/EDIT_COMMAND.md` - Editing configurations



