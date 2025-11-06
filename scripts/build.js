#!/usr/bin/env node
import { execSync } from 'child_process';
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const buildDir = join(rootDir, '.build');
const distDir = join(rootDir, 'dist');

function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

console.log('🧹 Cleaning build directories...');
rmSync(buildDir, { recursive: true, force: true });
rmSync(distDir, { recursive: true, force: true });

console.log('📋 Copying source files...');
cpSync(join(rootDir, 'src'), buildDir, { recursive: true });

console.log('🔄 Rewriting imports (.ts → .js)...');
const tsFiles = getAllTsFiles(buildDir);
for (const filePath of tsFiles) {
  let content = readFileSync(filePath, 'utf8');
  
  // Replace .ts extensions with .js in imports
  content = content.replace(/from ['"](.*)\.ts['"]/g, 'from \'$1.js\'');
  
  writeFileSync(filePath, content, 'utf8');
}

console.log('🔨 Compiling TypeScript...');
execSync('tsc -p tsconfig.build.json', {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log('📦 Copying data files...');
cpSync(join(rootDir, 'src', 'data'), join(distDir, 'data'), { recursive: true });

console.log('🧹 Cleaning up...');
rmSync(buildDir, { recursive: true, force: true });

console.log('✅ Build complete!');

