# 🚀 GitHub Setup Guide for Protector.Ng

## Step 1: Install Git

### **Windows:**
1. Download Git from [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer with default settings
3. Restart your terminal/command prompt

### **macOS:**
```bash
# Install via Homebrew
brew install git

# Or download from https://git-scm.com/download/mac
```

### **Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install git

# CentOS/RHEL
sudo yum install git
```

## Step 2: Configure Git

After installing Git, configure your identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Create GitHub Repository

1. Go to [https://github.com](https://github.com)
2. Click "New repository"
3. Repository name: `protector-ng`
4. Description: `Executive Protection Services Platform`
5. Set to **Public** or **Private** (your choice)
6. **Don't** initialize with README (we already have one)
7. Click "Create repository"

## Step 4: Initialize Local Repository

Open your terminal in the project directory and run:

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Complete Protector.Ng platform"

# Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/protector-ng.git

# Push to GitHub
git push -u origin main
```

## Step 5: Verify Upload

1. Go to your GitHub repository
2. Verify all files are uploaded
3. Check that the README.md displays correctly

## 🎯 What Gets Uploaded

### **✅ Included Files:**
- Complete Next.js application
- All React components
- Database setup scripts
- Documentation files
- Configuration files
- UI components and styles

### **❌ Excluded Files (via .gitignore):**
- `node_modules/` - Dependencies
- `.env*` - Environment variables
- `.next/` - Build files
- `*.log` - Log files
- OS-specific files

## 🔧 After Upload

### **1. Set up Environment Variables**
- Copy `.env.example` to `.env.local`
- Fill in your actual values
- **Never commit** `.env.local` to Git

### **2. Deploy to Vercel**
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with custom domain

### **3. Set up Supabase**
1. Create production Supabase project
2. Run `scripts/setup_production.sql`
3. Configure authentication

### **4. Configure Stripe**
1. Create Stripe account
2. Get API keys
3. Set up webhooks

## 📁 Repository Structure

```
protector-ng/
├── 📁 app/                    # Next.js pages
├── 📁 components/            # React components
├── 📁 lib/                   # Utilities and APIs
├── 📁 scripts/               # Database scripts
├── 📁 public/                # Static assets
├── 📄 README.md              # Project documentation
├── 📄 DEPLOYMENT_GUIDE.md    # Deployment instructions
├── 📄 PRODUCTION_SETUP.md    # Production setup
├── 📄 .gitignore             # Git ignore rules
└── 📄 package.json           # Dependencies
```

## 🚀 Next Steps

1. **Install Git** and follow setup steps
2. **Create GitHub repository**
3. **Upload your code**
4. **Deploy to Vercel**
5. **Set up production database**
6. **Configure payments**
7. **Launch your platform!**

## 💡 Pro Tips

### **Git Commands You'll Need:**
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull
```

### **Branching Strategy:**
```bash
# Create feature branch
git checkout -b feature/new-feature

# Switch back to main
git checkout main

# Merge feature branch
git merge feature/new-feature
```

## 🆘 Troubleshooting

### **Git Not Found:**
- Make sure Git is installed
- Restart your terminal
- Check PATH environment variable

### **Authentication Issues:**
- Use GitHub Personal Access Token
- Or set up SSH keys

### **Push Rejected:**
- Pull latest changes first: `git pull origin main`
- Resolve any conflicts
- Push again: `git push origin main`

---

**Ready to upload your Protector.Ng platform to GitHub!** 🚀


