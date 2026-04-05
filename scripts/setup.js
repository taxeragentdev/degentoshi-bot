#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up Crypto Signal Bot...\n');

const directories = [
  'signals',
  'logs',
  'data'
];

console.log('📁 Creating directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`   ✅ Created: ${dir}/`);
  } else {
    console.log(`   ⏭️  Exists: ${dir}/`);
  }
});

console.log('\n📄 Checking configuration files...');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✅ Created .env from .env.example');
  } else {
    console.log('   ⚠️  Warning: .env.example not found');
  }
} else {
  console.log('   ⏭️  .env already exists');
}

console.log('\n📦 Installation complete!\n');
console.log('Next steps:');
console.log('1. Edit .env file with your settings');
console.log('2. Run: npm start');
console.log('\nFor more info, see: docs/QUICKSTART.md\n');
