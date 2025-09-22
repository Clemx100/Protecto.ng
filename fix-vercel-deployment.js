// Script to fix Vercel deployment issues
const fs = require('fs')
const path = require('path')

console.log('🔧 Fixing Vercel deployment issues...')

// 1. Create .vercelignore file
const vercelIgnore = `# Vercel ignore file
node_modules
.env.local
.env.development.local
.env.test.local
.env.production.local
.next
.git
*.log
test-*.js
test-*.html
scripts/
*.md
!README.md
!DEPLOYMENT_STATUS.md
!MOBILE_TESTING_GUIDE.md
`

fs.writeFileSync('.vercelignore', vercelIgnore)
console.log('✅ Created .vercelignore file')

// 2. Update vercel.json with proper configuration
const vercelConfig = {
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key"
  },
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2))
console.log('✅ Updated vercel.json configuration')

// 3. Create deployment checklist
const deploymentChecklist = `# Vercel Deployment Checklist

## ✅ Pre-deployment Steps:
1. Environment variables are set in Vercel dashboard
2. GitHub repository is connected
3. Build command is correct: npm run build
4. Output directory is correct: .next

## 🔧 Environment Variables Required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY

## 🚀 Deployment Steps:
1. Push changes to GitHub
2. Vercel should auto-deploy
3. Check deployment logs for errors
4. Test the deployed application

## 🐛 Common Issues:
- Missing environment variables
- Build errors (TypeScript/ESLint)
- API route issues
- Database connection problems

## 📱 Testing After Deployment:
1. Test main app: https://protector-ng.vercel.app/
2. Test operator dashboard: https://protector-ng.vercel.app/operator
3. Test API endpoints: https://protector-ng.vercel.app/api/operator/bookings
4. Test mobile booking flow
`

fs.writeFileSync('VERCEL_DEPLOYMENT_CHECKLIST.md', deploymentChecklist)
console.log('✅ Created deployment checklist')

// 4. Check for potential build issues
console.log('\n🔍 Checking for potential build issues...')

// Check if all required files exist
const requiredFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/operator/page.tsx',
  'app/api/operator/bookings/route.ts',
  'app/api/operator/messages/route.ts',
  'components/protector-app.tsx',
  'components/operator-dashboard.tsx'
]

let missingFiles = []
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    missingFiles.push(file)
  }
})

if (missingFiles.length > 0) {
  console.log('❌ Missing required files:')
  missingFiles.forEach(file => console.log(`   - ${file}`))
} else {
  console.log('✅ All required files present')
}

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (!packageJson.scripts.build) {
  console.log('❌ Missing build script in package.json')
} else {
  console.log('✅ Build script present')
}

console.log('\n🎯 Vercel deployment fixes applied!')
console.log('\n📋 Next steps:')
console.log('1. Commit and push these changes to GitHub')
console.log('2. Check Vercel dashboard for deployment status')
console.log('3. Verify environment variables are set')
console.log('4. Test the deployed application')