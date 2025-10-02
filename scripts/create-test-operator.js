// Simple script to create test operator accounts
// This will create accounts in localStorage for testing

console.log('🔧 Creating test operator accounts for local testing...')

// Create test operator data
const testOperator = {
  id: 'test-operator-123',
  email: 'operator@protector.ng',
  password: 'operator123',
  first_name: 'Test',
  last_name: 'Operator',
  role: 'operator',
  phone: '+2348000000000',
  created_at: new Date().toISOString()
}

const testAdmin = {
  id: 'test-admin-123',
  email: 'admin@protector.ng',
  password: 'admin123',
  first_name: 'Test',
  last_name: 'Admin',
  role: 'admin',
  phone: '+2348000000001',
  created_at: new Date().toISOString()
}

// Store in localStorage for testing
if (typeof window !== 'undefined') {
  localStorage.setItem('test_operator', JSON.stringify(testOperator))
  localStorage.setItem('test_admin', JSON.stringify(testAdmin))
  localStorage.setItem('test_users', JSON.stringify([testOperator, testAdmin]))
  
  console.log('✅ Test accounts created in localStorage:')
  console.log('Operator: operator@protector.ng / operator123')
  console.log('Admin: admin@protector.ng / admin123')
  console.log('\n🌐 Access URLs:')
  console.log('Test Page: http://192.168.1.142:3000/test-operator')
  console.log('Operator Dashboard: http://192.168.1.142:3000/operator')
  console.log('Mobile App: http://192.168.1.142:3000/app')
} else {
  console.log('⚠️ This script needs to run in a browser environment')
  console.log('Please open the test page and run this script there')
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testOperator, testAdmin }
}







