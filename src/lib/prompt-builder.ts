// System prompt builder
import type { Agent } from '../types/agent.ts';
import type { Profile } from '../types/profile.ts';

export function buildSystemPrompt(
  basePrompt: string,
  agent: Agent | null,
  profile: Profile
): string {
  let systemPrompt = basePrompt;

  // Add Agent Attributes section if agent has attributes
  if (agent && Object.keys(agent.attributes).length > 0) {
    systemPrompt += '\n\n# Agent Attributes\n\n';
    systemPrompt += formatAttributes(agent.attributes);
  }

  // Add User Attributes section if profile has attributes
  if (Object.keys(profile.attributes).length > 0) {
    systemPrompt += '\n\n# User Attributes\n\n';
    systemPrompt += formatAttributes(profile.attributes);
  }

  return systemPrompt;
}

function formatAttributes(attributes: Record<string, any>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(attributes)) {
    const formattedKey = key
      .split(/(?=[A-Z])/)
      .join(' ')
      .replace(/^\w/, (c) => c.toUpperCase());

    if (Array.isArray(value)) {
      lines.push(`**${formattedKey}**: ${value.join(', ')}`);
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`**${formattedKey}**:`);
      for (const [subKey, subValue] of Object.entries(value)) {
        const formattedSubKey = subKey
          .split(/(?=[A-Z])/)
          .join(' ')
          .replace(/^\w/, (c) => c.toUpperCase());
        lines.push(`  - ${formattedSubKey}: ${subValue}`);
      }
    } else {
      lines.push(`**${formattedKey}**: ${value}`);
    }
  }

  return lines.join('\n');
}


