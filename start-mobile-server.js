#!/usr/bin/env node

/**
 * Mobile Server Setup for PROTECTOR.NG
 * This script starts the development server with mobile access
 */

const { spawn } = require('child_process');
const os = require('os');

// Get network interfaces
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const port = 3000;

console.log('🚀 Starting PROTECTOR.NG Mobile Server...');
console.log('📱 Mobile Access Setup:');
console.log(`   Computer IP: ${localIP}`);
console.log(`   Port: ${port}`);
console.log('');
console.log('📱 To access from your phone:');
console.log(`   1. Connect your phone to the same WiFi network`);
console.log(`   2. Open your phone's browser`);
console.log(`   3. Go to: http://${localIP}:${port}`);
console.log(`   4. Or scan the QR code below:`);
console.log('');

// Generate QR code URL
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://${localIP}:${port}`;
console.log(`📱 QR Code: ${qrUrl}`);
console.log('');

// Start the development server with host binding
const child = spawn('npm', ['run', 'dev', '--', '--hostname', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

child.on('error', (error) => {
  console.error('❌ Error starting server:', error);
});

child.on('close', (code) => {
  console.log(`\n🛑 Server stopped with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mobile server...');
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down mobile server...');
  child.kill('SIGTERM');
  process.exit(0);
});

console.log('🔄 Starting development server...');
console.log('   Press Ctrl+C to stop the server');
console.log('');
