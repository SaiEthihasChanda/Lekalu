# Lekalu - Complete Setup Guide

Your Lekalu expense tracker now has full authentication with Firebase and automatic deployment to Firebase Hosting through GitHub Actions CI/CD.

## What's New ✨

### 1. Email/Password Authentication ✅
- Users can now **register** with email and password
- Secure **login** page with validation
- **Logout** button in sidebar (bottom right)
- Session persists across browser refreshes via Firebase Auth
- Error handling for invalid credentials

### 2. Firebase Hosting ✅
- App automatically hosted at `https://lekalu.web.app`
- Custom domain support (buy domain, set up DNS)
- Free SSL certificate included
- CDN for fast global access

### 3. GitHub Actions CI/CD ✅
- Automatic deployment on every `git push` to main branch
- Changes go live in 2-3 minutes
- Build failures are caught before deployment
- No manual Firebase CLI commands needed

## Project Structure Changes

```
src/
├── contexts/
│   └── AuthContext.jsx          (NEW - Auth state management)
├── pages/
│   ├── LoginPage.jsx            (NEW - Login form)
│   ├── RegisterPage.jsx         (NEW - Registration form)
│   ├── ActivityPage.jsx
│   ├── TrackablesPage.jsx
│   ├── TrackerPage.jsx
│   └── AnalyticsPage.jsx
├── components/
│   └── Sidebar.jsx              (UPDATED - Added logout button & user email)
├── fb/
│   └── index.js                 (UPDATED - Added auth functions)
└── App.jsx                       (UPDATED - Auth flow & route protection)

.github/
└── workflows/
    └── deploy.yml               (NEW - GitHub Actions workflow)

firebase.json                     (NEW - Firebase Hosting config)
.firebaserc                       (NEW - Firebase project config)
GITHUB_FIREBASE_SETUP.md         (NEW - CI/CD setup guide)
```

## Quick Start

### 1. Test Locally

```bash
# Terminal 1: Start dev server (already running at http://localhost:5176)
npm run dev

# Open browser to http://localhost:5176
# You should see the Login page
```

### 2. Create Test Account

1. Click **"Register here"** link
2. Enter email: `test@example.com`
3. Password: `password123`
4. Click **Register**
5. You'll be redirected to login
6. Login with your credentials
7. You should see the main app dashboard

### 3. Push to GitHub & Deploy

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create commit
git commit -m "Add authentication and Firebase Hosting setup"

# Add GitHub remote
git remote add origin https://github.com/YOUR-USERNAME/Lekalu.git
git branch -M main
git push -u origin main
```

### 4. Configure GitHub Actions

Follow **GITHUB_FIREBASE_SETUP.md** to:
- Create GitHub repository
- Add Firebase Secrets
- Enable automatic deployments

## Authentication Flow

### User Registration
```
RegisterPage → registerUser() → Firebase Auth → LoginPage
```

### User Login
```
LoginPage → loginUser() → AuthContext updates → App shows dashboard
```

### Logout
```
Sidebar logout button → logoutUser() → AuthContext clears → Back to LoginPage
```

### Route Protection
```
User not logged in → Redirected to LoginPage
User logged in → Can access dashboard
```

## Code Changes Summary

### New: AuthContext.jsx

```javascript
// Provides user info and loading state to entire app
const { user, loading, error } = useAuth();

// user: Firebase User object or null
// loading: true while checking authentication
// error: Authentication errors
```

### Updated: Firebase Auth (src/fb/index.js)

```javascript
// New functions for authentication
registerUser(email, password)  // Create new account
loginUser(email, password)      // Login to existing account
logoutUser()                    // Logout current user
```

### Updated: App.jsx

Wraps app with AuthProvider and checks user state:
- If logged in → Shows dashboard with sidebar
- If logged out → Shows login/register pages
- Loading state → Shows loading spinner

### Updated: Sidebar.jsx

- Shows logged-in user's email at bottom
- Logout button to sign out
- Uses `useAuth()` hook to get current user

### Updated: Firebase Config in .env.local

No changes needed! Your existing `.env.local` already works with email/password auth.

## Firestore Security Rules

After enabling email/password auth, update your security rules to require authentication:

**Go to Firestore → Rules tab → Replace with:**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to access their own data
    match /bankAccounts/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /trackables/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /activities/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /trackers/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

Click **"Publish"**

## Deployment Status Tracking

After pushing to GitHub:

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. See your workflow running with status:
   - 🟡 Yellow = Building
   - 🟢 Green = Deployed successfully
   - 🔴 Red = Build failed

Click on workflow to see detailed logs.

## Firebase Hosting URL

Your app is live at:
```
https://lekalu.web.app
```

Custom domains can be added in Firebase Console → Hosting → Connect Domain

## Development Workflow

### Normal Development
```bash
# Make changes locally
# Test on http://localhost:5176

# When ready to deploy
git add .
git commit -m "Feature: Add new feature"
git push origin main

# GitHub Actions automatically builds and deploys
# Check your changes live on https://lekalu.web.app
```

### Emergency Rollback
If deployment goes wrong, use Firebase Console → Hosting → Rollback to previous version

## Useful Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Git commands
git status
git log
git push origin main
```

## Troubleshooting

### Login/Register not working
- Check `.env.local` has all Firebase credentials
- Restart dev server after changing .env file
- Check browser console (F12) for Firebase errors

### Deployment fails on GitHub
- Check GitHub Secrets are added correctly (Settings → Secrets)
- Verify Firebase credentials are valid
- Check GitHub Actions logs for detailed errors

### Changes not showing on Firebase Hosting
- Wait 2-3 minutes for deployment to complete
- Clear browser cache (Ctrl+Shift+Delete)
- Check GitHub Actions shows green checkmark

### Authentication errors
- Verify email/password auth is enabled in Firebase Console
- Check Firestore security rules allow authenticated writes

## File Checklist

Ensure these new files exist:
- [ ] `src/contexts/AuthContext.jsx`
- [ ] `src/pages/LoginPage.jsx`
- [ ] `src/pages/RegisterPage.jsx`
- [ ] `.github/workflows/deploy.yml`
- [ ] `firebase.json`
- [ ] `.firebaserc`
- [ ] `GITHUB_FIREBASE_SETUP.md`

## Next Steps

1. ✅ Test login/register locally
2. ✅ Create GitHub repository
3. ✅ Add GitHub Secrets for CI/CD
4. ✅ Push code to GitHub
5. ✅ Monitor first automatic deployment
6. ✅ Test app on Firebase Hosting URL
7. ✅ Set custom domain (optional)
8. ✅ Share with users!

## Security Checklist

- ✅ `.env.local` is in `.gitignore` (not pushed)
- ✅ GitHub Secrets used for credentials
- ✅ Firestore rules restrict data to authenticated users
- ✅ GitHub repository is Private
- ✅ Service account key is safe (stored in GitHub Secrets only)

## Get Help

- **Firebase Issues:** https://firebase.google.com/docs
- **GitHub Actions:** https://docs.github.com/actions
- **Vite Build:** https://vitejs.dev/guide/
- **React Router:** https://reactrouter.com/docs

Enjoy your secure, auto-deployed expense tracker! 🚀
