// Docker Model Manager - handles loading/unloading Docker AI models with proper parameters
import { exec, execSync } from 'child_process';
import chalk from 'chalk';
import type { Storage } from './storage.ts';

export interface ModelParams {
  ctxSize: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export class DockerModelManager {
  private loadedModel: string | null = null;
  private storage: Storage | null = null;

  constructor(storage?: Storage) {
    this.storage = storage || null;
  }

  /**
   * Load a Docker model
   */
  async loadModel(modelName: string, params: ModelParams): Promise<void> {
    try {
      // Check if context size has changed since last configuration
      const needsReconfiguration = await this.needsReconfiguration(modelName, params.ctxSize);
      
      // Start model in detached mode (will reuse if already running)
      const runResult = exec(`docker model run ${modelName} --detach`, { 
        encoding: 'utf-8',
      });
      if (process.env.DEBUG) {
        console.log(chalk.gray(`  Run result: ${runResult}`));
      }
      this.loadedModel = modelName;
      
      if (needsReconfiguration) {
        // Wait a moment for model to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Configure the model with context size
        await this.configureModel(modelName, params);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      console.error(chalk.red(`✗ Failed to load model: ${errorMsg}`));
      throw error;
    }
  }

  /**
   * Configure a running model's parameters
   */
  async configureModel(modelName: string, params: ModelParams): Promise<void> {
    try {
      if (params.ctxSize) {
        console.log(chalk.gray(`  Configuring context size: ${params.ctxSize}`));
        const result = execSync(`docker model configure --context-size=${params.ctxSize} ${modelName}`, { 
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        if (process.env.DEBUG) {
          console.log(chalk.gray(`  Configure result: ${result}`));
        }
        
        // Update the cache after successful configuration
        await this.updateModelCache(modelName, params.ctxSize);
      }
      
      // Note: Docker AI Models may not support configuring other parameters
      // Check documentation for available configuration options
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      console.error(chalk.yellow(`⚠ Failed to configure model: ${errorMsg}`));
      // Don't throw - model is still loaded, just not configured
    }
  }

  /**
   * Unload the currently loaded model
   */
  async unloadModel(modelName?: string): Promise<void> {
    const targetModel = modelName || this.loadedModel;
    
    if (!targetModel) {
      return; // No model to unload
    }

    console.log(chalk.gray(`\nUnloading model: ${targetModel}`));
    
    try {
      execSync(`docker model unload ${targetModel}`, { stdio: 'pipe' });
      this.loadedModel = null;
      console.log(chalk.green(`✓ Model unloaded`));
    } catch (error) {
      // Ignore errors on unload - model might already be unloaded
      if (process.env.DEBUG) {
        console.error(chalk.yellow(`⚠ Could not unload model: ${error instanceof Error ? error.message : 'unknown error'}`));
      }
    }
  }

  /**
   * Reconfigure model with new parameters (without restarting)
   */
  async reconfigureModel(modelName: string, params: ModelParams): Promise<void> {
    console.log(chalk.yellow('\n🔄 Reconfiguring model parameters...'));
    await this.configureModel(modelName, params);
    console.log(chalk.green('✓ Model reconfigured'));
  }

  /**
   * Check if a model is currently running
   */
  isModelLoaded(): boolean {
    return this.loadedModel !== null;
  }

  /**
   * Get the name of the currently loaded model
   */
  getLoadedModel(): string | null {
    return this.loadedModel;
  }

  /**
   * Check if model needs reconfiguration based on cached context size
   */
  private async needsReconfiguration(modelName: string, ctxSize: number): Promise<boolean> {
    if (!this.storage) {
      return true; // No cache available, always reconfigure
    }

    try {
      const config = await this.storage.loadConfig();
      const cache = config.modelCache || {};
      const cachedModel = cache[modelName];

      if (!cachedModel) {
        return true; // Not in cache, needs configuration
      }

      // Check if context size has changed
      return cachedModel.ctxSize !== ctxSize;
    } catch (error) {
      // If we can't read cache, assume reconfiguration is needed
      return true;
    }
  }

  /**
   * Update the model cache after successful configuration
   */
  private async updateModelCache(modelName: string, ctxSize: number): Promise<void> {
    if (!this.storage) {
      return; // No storage, can't update cache
    }

    try {
      const config = await this.storage.loadConfig();
      const cache = config.modelCache || {};
      
      cache[modelName] = {
        ctxSize,
        lastConfigured: new Date().toISOString(),
      };

      await this.storage.saveConfig({
        ...config,
        modelCache: cache,
      });

      if (process.env.DEBUG) {
        console.log(chalk.gray(`  Updated model cache for ${modelName}`));
      }
    } catch (error) {
      // Silently fail - caching is an optimization, not critical
      if (process.env.DEBUG) {
        console.error(chalk.gray(`  Failed to update model cache: ${error instanceof Error ? error.message : 'unknown error'}`));
      }
    }
  }
}

