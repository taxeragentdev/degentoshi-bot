import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏥 System Health Check\n');
console.log('═'.repeat(60));

const checks = {
  nodeVersion: false,
  dependencies: false,
  exchangeConnection: false,
  dataFetch: false
};

console.log('1️⃣  Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
checks.nodeVersion = majorVersion >= 18;
console.log(`   Node.js ${nodeVersion} ${checks.nodeVersion ? '✅' : '❌ (need v18+)'}`);

console.log('\n2️⃣  Checking dependencies...');
try {
  await import('ccxt');
  await import('dotenv');
  checks.dependencies = true;
  console.log('   Dependencies installed ✅');
} catch (error) {
  console.log('   Dependencies missing ❌');
  console.log('   Run: npm install');
}

console.log('\n3️⃣  Testing Hyperliquid connection...');
try {
  const response = await fetch('https://api.hyperliquid-testnet.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'meta' })
  });
  const data = await response.json();
  checks.exchangeConnection = data && data.universe;
  console.log('   Hyperliquid connection ✅');
} catch (error) {
  console.log('   Hyperliquid connection ❌');
  console.log(`   Error: ${error.message}`);
}

console.log('\n4️⃣  Testing data fetch from Hyperliquid...');
try {
  const response = await fetch('https://api.hyperliquid-testnet.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'allMids' })
  });
  const data = await response.json();
  checks.dataFetch = data && data.BTC;
  if (checks.dataFetch) {
    console.log(`   Data fetch ✅`);
    console.log(`   Latest BTC price: $${parseFloat(data.BTC).toFixed(2)}`);
  } else {
    console.log('   Data fetch ❌');
  }
} catch (error) {
  console.log('   Data fetch ❌');
  console.log(`   Error: ${error.message}`);
}

console.log('\n' + '═'.repeat(60));
console.log('📊 Health Check Summary\n');

const allPassed = Object.values(checks).every(v => v);

if (allPassed) {
  console.log('✅ All checks passed! System is ready.\n');
  console.log('Start the bot with: npm start\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please fix the issues above.\n');
  
  if (!checks.nodeVersion) {
    console.log('→ Upgrade Node.js to v18 or higher');
  }
  if (!checks.dependencies) {
    console.log('→ Run: npm install');
  }
  if (!checks.exchangeConnection) {
    console.log('→ Check internet connection');
    console.log('→ Verify exchange API is accessible');
  }
  if (!checks.dataFetch) {
    console.log('→ Verify exchange API is working');
  }
  
  console.log();
  process.exit(1);
}
