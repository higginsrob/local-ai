// ai profile command
import chalk from 'chalk';
import prompts from 'prompts';
import { spawn } from 'child_process';
import { Storage } from '../lib/storage.ts';
import { ConfigManager } from '../lib/config.ts';
import type { Profile } from '../types/profile.ts';
import fs from 'fs/promises';
import path from 'path';

export async function profileCommand(subcommand?: string, args: string[] = []): Promise<void> {
  const storage = new Storage();
  await storage.init();
  const configManager = new ConfigManager(storage);

  if (!subcommand || subcommand === 'show') {
    await showProfile(storage, configManager);
  } else if (subcommand === 'new') {
    await newProfile(storage, configManager, args[0]);
  } else if (subcommand === 'select') {
    await selectProfile(storage, configManager, args[0]);
  } else if (subcommand === 'add') {
    await addAttribute(storage, configManager, args[0], args.slice(1).join(' '));
  } else if (subcommand === 'remove') {
    await removeAttribute(storage, configManager, args[0]);
  } else if (subcommand === 'edit') {
    await editProfile(storage, configManager, args[0]);
  } else if (subcommand === 'import') {
    await importProfile(storage, args[0]);
  } else if (subcommand === 'export') {
    await exportProfile(storage, configManager, args[0]);
  } else {
    console.error(chalk.red(`Unknown subcommand: ${subcommand}`));
    console.log('\nAvailable subcommands:');
    console.log('  show                                    - Show current profile');
    console.log('  new <name>                              - Create new profile');
    console.log('  select <name>                           - Select profile');
    console.log('  edit [name]                             - Edit profile in default editor');
    console.log('  add <attribute-name> <attribute-value>  - Add attribute');
    console.log('  remove <attribute-name>                 - Remove attribute');
    console.log('  import <file>                           - Import profile from JSON');
    console.log('  export <file>                           - Export profile to JSON');
    process.exit(1);
  }
}

async function showProfile(storage: Storage, configManager: ConfigManager): Promise<void> {
  const currentProfileName = await configManager.getCurrentProfile();
  const profile = await storage.loadProfile(currentProfileName);
  
  console.log(chalk.bold(`\n📋 Profile: ${profile.name}\n`));
  console.log(chalk.gray(`Created: ${new Date(profile.createdAt).toLocaleString()}`));
  console.log(chalk.gray(`Updated: ${new Date(profile.updatedAt).toLocaleString()}`));
  
  console.log(chalk.bold('\nAttributes:'));
  if (Object.keys(profile.attributes).length === 0) {
    console.log(chalk.gray('  (none)'));
  } else {
    for (const [key, value] of Object.entries(profile.attributes)) {
      console.log(`  ${chalk.cyan(key)}: ${JSON.stringify(value)}`);
    }
  }
  
  // Show all available profiles
  const profiles = await storage.listProfiles();
  console.log(chalk.bold('\nAvailable Profiles:'));
  for (const name of profiles) {
    const marker = name === currentProfileName ? chalk.green('→') : ' ';
    console.log(`  ${marker} ${name}`);
  }
  console.log();
}

async function newProfile(
  storage: Storage,
  configManager: ConfigManager,
  name?: string
): Promise<void> {
  if (!name) {
    const response = await prompts({
      type: 'text',
      name: 'name',
      message: 'Profile name:',
      validate: (value) => value.length > 0 || 'Name cannot be empty',
    });
    name = response.name;
  }

  if (!name) {
    console.error(chalk.red('Profile name is required'));
    process.exit(1);
  }

  const profile: Profile = {
    name,
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storage.saveProfile(profile);
  await configManager.setCurrentProfile(name);
  console.log(chalk.green(`✓ Created and selected profile: ${name}`));
}

async function selectProfile(
  storage: Storage,
  configManager: ConfigManager,
  name?: string
): Promise<void> {
  if (!name) {
    const profiles = await storage.listProfiles();
    const response = await prompts({
      type: 'select',
      name: 'name',
      message: 'Select profile:',
      choices: profiles.map(p => ({ title: p, value: p })),
    });
    name = response.name;
  }

  if (!name) {
    console.error(chalk.red('Profile name is required'));
    process.exit(1);
  }

  // Verify profile exists
  await storage.loadProfile(name);
  await configManager.setCurrentProfile(name);
  console.log(chalk.green(`✓ Selected profile: ${name}`));
}

async function addAttribute(
  storage: Storage,
  configManager: ConfigManager,
  attributeName?: string,
  attributeValue?: string
): Promise<void> {
  if (!attributeName || !attributeValue) {
    console.error(chalk.red('Both attribute name and value are required'));
    console.log('Usage: ai profile add <attribute-name> <attribute-value>');
    process.exit(1);
  }

  const currentProfileName = await configManager.getCurrentProfile();
  const profile = await storage.loadProfile(currentProfileName);
  
  // Try to parse as JSON, otherwise use as string
  let parsedValue: any = attributeValue;
  try {
    parsedValue = JSON.parse(attributeValue);
  } catch {
    // Keep as string
  }
  
  profile.attributes[attributeName] = parsedValue;
  profile.updatedAt = new Date().toISOString();
  
  await storage.saveProfile(profile);
  console.log(chalk.green(`✓ Added attribute ${attributeName} to profile ${profile.name}`));
}

async function removeAttribute(
  storage: Storage,
  configManager: ConfigManager,
  attributeName?: string
): Promise<void> {
  if (!attributeName) {
    console.error(chalk.red('Attribute name is required'));
    console.log('Usage: ai profile remove <attribute-name>');
    process.exit(1);
  }

  const currentProfileName = await configManager.getCurrentProfile();
  const profile = await storage.loadProfile(currentProfileName);
  
  if (!(attributeName in profile.attributes)) {
    console.error(chalk.red(`Attribute ${attributeName} not found in profile`));
    process.exit(1);
  }
  
  delete profile.attributes[attributeName];
  profile.updatedAt = new Date().toISOString();
  
  await storage.saveProfile(profile);
  console.log(chalk.green(`✓ Removed attribute ${attributeName} from profile ${profile.name}`));
}

async function importProfile(storage: Storage, filePath?: string): Promise<void> {
  if (!filePath) {
    console.error(chalk.red('File path is required'));
    console.log('Usage: ai profile import <file>');
    process.exit(1);
  }

  const data = await fs.readFile(filePath, 'utf-8');
  const profile: Profile = JSON.parse(data);
  
  await storage.saveProfile(profile);
  console.log(chalk.green(`✓ Imported profile: ${profile.name}`));
}

async function editProfile(
  storage: Storage,
  configManager: ConfigManager,
  name?: string
): Promise<void> {
  // If no name provided, use current profile
  const profileName = name || await configManager.getCurrentProfile();

  // Verify profile exists
  try {
    await storage.loadProfile(profileName);
  } catch {
    console.error(chalk.red(`Profile not found: ${profileName}`));
    process.exit(1);
  }

  const profilePath = path.join(storage.getBaseDir(), 'profiles', `${profileName}.json`);
  await openInEditor(profilePath);
  
  // Validate the JSON after editing
  try {
    const content = await fs.readFile(profilePath, 'utf-8');
    JSON.parse(content);
    console.log(chalk.green(`✓ Profile ${profileName} updated`));
  } catch (error) {
    console.error(chalk.red('✗ Invalid JSON in profile file'));
    console.error(chalk.gray('The file was not saved or contains invalid JSON'));
    process.exit(1);
  }
}

async function exportProfile(
  storage: Storage,
  configManager: ConfigManager,
  filePath?: string
): Promise<void> {
  if (!filePath) {
    console.error(chalk.red('File path is required'));
    console.log('Usage: ai profile export <file>');
    process.exit(1);
  }

  const currentProfileName = await configManager.getCurrentProfile();
  const profile = await storage.loadProfile(currentProfileName);
  
  await fs.writeFile(filePath, JSON.stringify(profile, null, 2));
  console.log(chalk.green(`✓ Exported profile ${profile.name} to ${filePath}`));
}

async function openInEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
  
  return new Promise((resolve, reject) => {
    const editorProcess = spawn(editor, [filePath], {
      stdio: 'inherit',
      shell: true,
    });

    editorProcess.on('exit', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    editorProcess.on('error', (error) => {
      reject(error);
    });
  });
}

