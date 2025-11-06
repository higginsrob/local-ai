// ai status command
import { execSync } from 'child_process';
import chalk from 'chalk';
import { Storage } from '../lib/storage.ts';
import { DockerAIClient } from '../lib/docker-ai.ts';
import { ConfigManager } from '../lib/config.ts';

export async function statusCommand(): Promise<void> {
  console.log(chalk.bold('\n🔍 AI Assistant Manager Status\n'));

  // Check Node.js version
  const nodeVersion = process.version;
  const [major, minor] = nodeVersion.slice(1).split('.').map(Number);
  const isNodeValid = major > 23 || (major === 23 && minor >= 6);
  
  console.log(chalk.bold('Node.js:'));
  console.log(`  Version: ${nodeVersion} ${isNodeValid ? chalk.green('✓') : chalk.red('✗ (requires >= v23.6.0)')}`);

  // Check Docker
  console.log(chalk.bold('\nDocker:'));
  try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim();
    console.log(`  ${chalk.green('✓')} ${dockerVersion}`);
    
    // Check Docker running
    try {
      execSync('docker ps', { encoding: 'utf-8', stdio: 'pipe' });
      console.log(`  ${chalk.green('✓')} Docker daemon is running`);
    } catch {
      console.log(`  ${chalk.red('✗')} Docker daemon is not running`);
    }
  } catch {
    console.log(`  ${chalk.red('✗')} Docker is not installed`);
  }

  // Check Docker AI Models
  console.log(chalk.bold('\nDocker AI Models:'));
  try {
    // Use 'docker model ls --json' to get AI models
    const modelsOutput = execSync('docker model ls --json 2>/dev/null || echo "[]"', { 
      encoding: 'utf-8' 
    }).trim();
    
    let models = [];
    try {
      models = JSON.parse(modelsOutput || '[]');
    } catch {
      models = [];
    }
    
    if (models.length > 0) {
      console.log(`  ${chalk.green('✓')} Found ${models.length} AI model(s)`);
      models.slice(0, 5).forEach((model: any) => {
        const name = model.tags && model.tags.length > 0 
          ? model.tags[0] 
          : (model.name || model.Name || model.model || 'unknown');
        const size = model.config?.size || model.size || model.Size || '';
        console.log(`    - ${name}${size ? ` (${size})` : ''}`);
      });
      if (models.length > 5) {
        console.log(`    ... and ${models.length - 5} more`);
      }
    } else {
      console.log(`  ${chalk.yellow('⚠')} No AI models found`);
      console.log(`    Run: docker model pull ai/llama3.2:latest`);
    }

    // Check running models
    const running = execSync('docker model ps', { 
      encoding: 'utf-8' 
    }).trim().split('\n').filter(Boolean);
    
    if (running.length > 1) {
      console.log(`  ${chalk.green('✓')} ${running.length} container(s) running`);
    } else {
      console.log(`  ${chalk.yellow('⚠')} No containers running`);
    }
  } catch (e) {
    console.log(`  ${chalk.red('✗')} Unable to check Docker models`);
  }

  // Check MCP Servers
  console.log(chalk.bold('\nMCP Servers:'));
  try {
    // Note: docker mcp might not be available yet, so we'll handle gracefully
    const mcpOutput = execSync('docker mcp ls 2>/dev/null || echo "not-available"', { 
      encoding: 'utf-8' 
    }).trim();
    
    if (mcpOutput === 'not-available' || mcpOutput.includes('unknown')) {
      console.log(`  ${chalk.yellow('⚠')} Docker MCP not available (feature may not be released yet)`);
    } else {
      console.log(`  ${chalk.green('✓')} Docker MCP available`);
    }
  } catch {
    console.log(`  ${chalk.yellow('⚠')} Docker MCP not available`);
  }

  // Check Storage
  console.log(chalk.bold('\nStorage:'));
  try {
    const storage = new Storage();
    await storage.init();
    const baseDir = storage.getBaseDir();
    console.log(`  ${chalk.green('✓')} Storage directory: ${baseDir}`);
    
    const profiles = await storage.listProfiles();
    console.log(`  ${chalk.green('✓')} Profiles: ${profiles.length}`);
    
    const agents = await storage.listAgents();
    console.log(`  ${chalk.green('✓')} Agents: ${agents.length}`);
    
    const sessions = await storage.listSessions();
    console.log(`  ${chalk.green('✓')} Sessions: ${sessions.length}`);
  } catch (e) {
    console.log(`  ${chalk.red('✗')} Storage error: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  // Check llama.cpp endpoint
  console.log(chalk.bold('\nLLama.cpp Endpoint:'));
  try {
    const storage = new Storage();
    await storage.init();
    const configManager = new ConfigManager(storage);
    const endpoint = await configManager.getLlamaCppEndpoint();
    
    const client = new DockerAIClient(endpoint);
    const isHealthy = await client.healthCheck();
    
    if (isHealthy) {
      console.log(`  ${chalk.green('✓')} ${endpoint} is responding`);
    } else {
      console.log(`  ${chalk.yellow('⚠')} ${endpoint} is not responding`);
      console.log(`    Make sure a model is running with: docker run -p 8080:8080 <model>`);
    }
  } catch (e) {
    console.log(`  ${chalk.yellow('⚠')} Unable to connect to llama.cpp endpoint`);
  }

  console.log();
}

