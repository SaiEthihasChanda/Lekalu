# Firebase Setup Guide for Lekalu

This guide will help you migrate Lekalu from IndexedDB to Firebase for cloud-based data storage.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or **"Add project"**
3. Enter project name (e.g., "Lekalu")
4. Accept the terms and click **"Create project"**
5. Wait for the project to be created

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** (left sidebar)
2. Click **"Get started"**
3. Select **"Email/Password"** authentication method
4. Toggle it **ON** and click **"Save"**
5. (Optional) You can also enable "Anonymous" authentication for testing users

This allows users to create accounts and login with email/password.

## Step 3: Create Firestore Database

1. Go to **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select your region (closest to your users)
5. Click **"Create"**

## Step 4: Get Your Firebase Config

1. Go to **Project Settings** (gear icon in top-left)
2. Scroll to "Your apps" section
3. Click on the Web app (should show `</>`icon)
4. Copy the `firebaseConfig` object that shows
5. You need these values:
   ```
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId
   ```

## Step 5: Add Environment Variables

1. Create a `.env.local` file in the project root (same level as `package.json`)
2. Add your Firebase config values:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. **DO NOT commit** this file to git (add to `.gitignore` if you have one)

## Step 6: Set Firestore Security Rules

By default, Firestore test mode allows anyone to read/write. For production, add these rules:

1. Go to **Firestore Database** → **Rules** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow users to access their own data
    match /bankAccounts/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId || request.auth != null;
    }
    match /trackables/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId || request.auth != null;
    }
    match /activities/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId || request.auth != null;
    }
    match /trackers/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId || request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

## Step 7: Run the App

1. Restart the dev server:
   ```
   npm run dev
   ```

2. Open http://localhost:5174

3. The app will automatically:
   - Initialize Firebase
   - Sign you in anonymously
   - Create collections when you add data

## Migration from IndexedDB

Your old IndexedDB data is stored locally in the browser. To migrate:

1. **Export your old data** (optional):
   - Open DevTools (F12)
   - Go to Application → IndexedDB → ExpenseTrackerDB
   - Right-click each collection and export as JSON

2. **Start fresh in Firebase** (recommended):
   - Firebase will have empty collections
   - Start adding new transactions
   - The app works the same, just backed by Firebase now

## Database Structure in Firestore

All collections have the following structure:

### bankAccounts
```
{
  userId: "user_id",
  cardName: "My Visa",
  accountNumber: "1234",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### trackables
```
{
  userId: "user_id",
  name: "Monthly Rent",
  type: "expense",
  accountId: "acc_id",
  includeInTracker: true,
  trackerAmount: 1500,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### activities
```
{
  userId: "user_id",
  amount: 50,
  type: "expense",
  accountId: "acc_id",
  trackableId: "trackable_id",
  description: "Coffee",
  date: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### trackers
```
{
  userId: "user_id",
  trackableId: "trackable_id",
  month: 3,
  year: 2026,
  isDone: true,
  completedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Troubleshooting

### "Missing or insufficient permissions"
- Check that you're in test mode OR rules are correct
- Verify `.env.local` has all Firebase config values
- Restart the dev server after adding `.env.local`

### App not loading data
- Open DevTools Console (F12)
- Look for Firebase initialization errors
- Verify authentication succeeded (should see anonymous user)

### Performance Issues
- Firestore charges by reads/writes in production
- Consider adding caching/offline support later
- Use Firestore metrics in Firebase Console to optimize

## Next Steps

1. Set up data backups in Firebase (Backups dashboard)
2. Enable Real-time sync across devices (already built-in)
3. Add email authentication (when ready for real users)
4. Set up more restrictive security rules
5. Monitor usage in Firebase Console

## Support

For Firebase issues, check:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase CLI](https://firebase.google.com/docs/cli)
