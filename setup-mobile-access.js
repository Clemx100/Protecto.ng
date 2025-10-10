#!/usr/bin/env node

const os = require('os');
const { exec } = require('child_process');

console.log('\n========================================');
console.log('  📱 Protector.Ng Mobile Access Setup');
console.log('========================================\n');

// Get network interfaces
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          name: name,
          ip: iface.address
        });
      }
    }
  }

  return ips;
}

// Display instructions
function displayInstructions() {
  const ips = getLocalIPs();

  console.log('🌐 Your Network Information:\n');

  if (ips.length === 0) {
    console.log('❌ No network interfaces found.');
    console.log('   Make sure you are connected to WiFi or Ethernet.\n');
    return;
  }

  ips.forEach(({ name, ip }) => {
    console.log(`   ${name}: ${ip}`);
  });

  console.log('\n📱 Mobile Access URLs:\n');
  ips.forEach(({ ip }) => {
    console.log(`   http://${ip}:3000`);
  });

  console.log('\n========================================');
  console.log('📋 Instructions for Mobile Users:');
  console.log('========================================\n');

  console.log('1. Make sure your mobile device is on the SAME WiFi network\n');
  console.log('2. Open your mobile browser (Safari/Chrome)\n');
  console.log('3. Enter one of the URLs above\n');
  console.log('4. The Protector.Ng app should load!\n');

  console.log('========================================');
  console.log('🚀 Next Steps:');
  console.log('========================================\n');

  console.log('Run the mobile server:');
  console.log('   npm run dev -- -H 0.0.0.0\n');

  console.log('Or use the provided script:');
  console.log('   start-mobile-server.bat (Windows)');
  console.log('   ./start-mobile-server.sh (Mac/Linux)\n');

  console.log('========================================\n');
}

// Check if server is running
function checkServer() {
  const port = 3000;
  const net = require('net');
  const server = net.createServer();

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('✅ Server is already running on port 3000\n');
    }
  });

  server.once('listening', () => {
    server.close();
    console.log('⚠️  Server is not running. Start it with: npm run dev -- -H 0.0.0.0\n');
  });

  server.listen(port);
}

// Main
displayInstructions();
checkServer();

// QR Code suggestion
console.log('💡 TIP: Install "qrcode-terminal" to generate QR codes:');
console.log('   npm install -g qrcode-terminal');
console.log('   Then scan with your phone camera!\n');

