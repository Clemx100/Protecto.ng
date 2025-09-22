# Vercel Deployment Checklist

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
