#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Protector.Ng Mobile Development Server...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('❌ Error: package.json not found. Please run this script from the project root directory.');
    process.exit(1);
}

// Start the Next.js development server
const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
});

devServer.on('error', (error) => {
    console.error('❌ Failed to start development server:', error.message);
    process.exit(1);
});

devServer.on('close', (code) => {
    console.log(`\n🛑 Development server stopped with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development server...');
    devServer.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development server...');
    devServer.kill('SIGTERM');
    process.exit(0);
});

console.log('📱 Mobile Access Instructions:');
console.log('1. Open mobile-access.html in your browser');
console.log('2. Scan the QR code with your phone');
console.log('3. Or manually type the URL on your phone');
console.log('4. Make sure your phone is on the same WiFi network');
console.log('\n🌐 Server will be available at: http://localhost:3000');
console.log('📱 Mobile access page: file://' + path.resolve('mobile-access.html'));
console.log('\nPress Ctrl+C to stop the server\n');







