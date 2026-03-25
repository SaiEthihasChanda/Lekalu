# GitHub & Firebase Hosting Setup Guide

This guide walks you through setting up CI/CD to automatically deploy your Lekalu app to Firebase Hosting whenever you push changes to GitHub.

## Prerequisites

- Firebase project already set up (see FIREBASE_SETUP.md)
- GitHub account (create one at https://github.com if needed)
- Git installed on your computer

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `Lekalu` (or your preferred name)
3. Description: "Personal Expense Tracker"
4. Choose **Private** (recommended to keep credentials safe)
5. Do NOT initialize with README (we'll push existing code)
6. Click **"Create repository"**
7. Copy the repository URL (e.g., `https://github.com/your-username/Lekalu.git`)

## Step 2: Push Code to GitHub

In your Lekalu project folder, run these commands:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Lekalu with Firebase authentication and Hosting setup"

# Add remote repository
git remote add origin https://github.com/your-username/Lekalu.git

# Push to main branch
git branch -M main
git push -u origin main
```

**Note:** If git asks for credentials, create a Personal Access Token:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select `repo` scope
4. Copy the token and use it as your password when git prompts

## Step 3: Enable Firebase Hosting

1. Go to your Firebase Console
2. Navigate to **Hosting** (left sidebar)
3. Click **"Get started"**
4. Follow the prompts (you don't need to install CLI immediately)
5. Note your hosting URL (e.g., `lekalu.web.app`)

## Step 4: Create Firebase Service Account

This credentials file allows GitHub Actions to deploy to Firebase on your behalf:

1. Go to **Project Settings** (gear icon, top-left)
2. Go to **Service Accounts** tab
3. Click **"Generate new private key"**
4. A JSON file will download - **keep this safe!**
5. Copy the entire contents of this JSON file

## Step 5: Add GitHub Secrets

GitHub Actions needs these secrets to authenticate with Firebase. Add them one by one:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

Add these 7 secrets:

### Secret 1: FIREBASE_SERVICE_ACCOUNT_LEKALU
- **Name:** `FIREBASE_SERVICE_ACCOUNT_LEKALU`
- **Value:** Paste the entire JSON content from the service account key file you downloaded
- Click **"Add secret"**

### Secrets 2-7: Firebase Configuration

Go back to Firebase Console → Project Settings and find your Web app configuration. Add these 6 secrets:

**Secret 2:**
- **Name:** `FIREBASE_API_KEY`
- **Value:** Copy the `apiKey` value from your Firebase config
- Click **"Add secret"**

**Secret 3:**
- **Name:** `FIREBASE_AUTH_DOMAIN`
- **Value:** Copy the `authDomain` value (e.g., `lekalu.firebaseapp.com`)
- Click **"Add secret"**

**Secret 4:**
- **Name:** `FIREBASE_PROJECT_ID`
- **Value:** Copy the `projectId` (e.g., `lekalu`)
- Click **"Add secret"**

**Secret 5:**
- **Name:** `FIREBASE_STORAGE_BUCKET`
- **Value:** Copy the `storageBucket` (e.g., `lekalu.appspot.com`)
- Click **"Add secret"**

**Secret 6:**
- **Name:** `FIREBASE_MESSAGING_SENDER_ID`
- **Value:** Copy the `messagingSenderId`
- Click **"Add secret"**

**Secret 7:**
- **Name:** `FIREBASE_APP_ID`
- **Value:** Copy the `appId`
- Click **"Add secret"**

## Step 6: Verify Workflow Setup

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see a workflow file called "deploy.yml"
4. The workflow is ready to run

## Step 7: Test the CI/CD Pipeline

Make a small change to test the deployment:

1. Edit `src/pages/LoginPage.jsx` - change a subtitle text
2. In terminal, run:
   ```bash
   git add .
   git commit -m "Test: Update login page"
   git push origin main
   ```

3. Go to GitHub repository → **Actions** tab
4. You'll see your workflow running
5. Wait for the build to complete (usually 2-3 minutes)
6. When it shows a green checkmark, deployment is done!
7. Visit your Firebase hosting URL to see the changes live

## Automatic Deployment

From now on, every time you:
1. Make changes locally
2. Commit and push to `main` branch
3. GitHub Actions automatically:
   - Builds the app
   - Runs tests
   - Deploys to Firebase Hosting

Within 2-3 minutes, your changes are live!

## Environment Variables Notes

The workflow file automatically passes Firebase credentials from GitHub Secrets as environment variables during the build. This is why we added them as GitHub Secrets - they stay secure and aren't exposed in the code.

## Troubleshooting

### Deployment fails with "Firebase credentials not found"
- Check that all 7 secrets are added correctly in GitHub
- Go to Settings → Secrets → verify all secret names match exactly
- Right secret names: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc.

### Build fails
- Check the GitHub Actions log (click on the failed workflow)
- Look for error messages in the logs
- Common issues: missing environment variables, outdated dependencies

### Changes not showing on Firebase Hosting
- Wait 5+ minutes after successful deployment
- Clear your browser cache (Ctrl+Shift+Delete)
- Check that deployment shows green checkmark in GitHub Actions

### Service account issue
- Make sure you're using the full JSON content, not just parts of it
- The secret value should start with `{` and end with `}`

## Useful Links

- **Firebase Hosting Console:** https://console.firebase.google.com/project/lekalu/hosting/main
- **GitHub Repository:** https://github.com/your-username/Lekalu
- **Firebase Docs:** https://firebase.google.com/docs/hosting
- **GitHub Actions Docs:** https://docs.github.com/en/actions

## Next Steps

1. Continue developing features locally
2. Commit and push to GitHub
3. Watch automatic deployments happen
4. Celebrate! Your app is now in the cloud

## Security Best Practices

1. ✅ Keep `.env.local` file local (never push it)
2. ✅ Use GitHub Secrets for credentials (never commit sensitive data)
3. ✅ Keep your service account key file safe (don't share it)
4. ✅ Make your GitHub repository Private
5. ✅ Rotate credentials periodically in Firebase Console

Enjoy automatic deployments! 🚀
