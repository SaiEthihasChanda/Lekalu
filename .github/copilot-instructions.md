<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Lekalu - Expense Tracker Project

## Project Overview

Lekalu is a modern React + Vite application for personal expense tracking with a trading app-like UI. The app features a sidebar navigation with four main sections: Activity, Trackables, Tracker, and Analytics.

## Technology Stack

- React 18 with JavaScript (JSDoc for type documentation)
- Vite for build and dev tools
- Tailwind CSS for styling
- React Router for navigation
- Firebase (Firestore + Authentication) for cloud data persistence
- date-fns for date utilities
- Lucide React and Recharts for UI and data visualization

## Project Structure

### Components (`src/components/`)
- **Modal.jsx** - Reusable modal dialog component
- **Sidebar.jsx** - Main navigation sidebar (updated with logout button and user email display)
- **ActivityCard.jsx** - Display individual activity items
- **AddActivityForm.jsx** - Form to add new activities
- **BankAccountForm.jsx** & **BankAccountCard.jsx** - Bank account management UI
- **TrackableForm.jsx** & **TrackableCard.jsx** - Trackable management UI

### Pages (`src/pages/`)
- **LoginPage.jsx** (NEW) - User login with email/password
- **RegisterPage.jsx** (NEW) - User registration with email/password
- **ActivityPage.jsx** - Main dashboard showing today's transactions
- **TrackablesPage.jsx** - Manage recurring expenses and bank accounts
- **TrackerPage.jsx** - Track monthly recurring items
- **AnalyticsPage.jsx** - Analytics and reporting dashboard

### Authentication (`src/contexts/`)
- **AuthContext.jsx** (NEW) - React Context for managing auth state across entire app
- Provides `useAuth()` hook for components
- Handles loading state during auth check
- Listens to Firebase Auth state changes

### Database (`src/fb/`)
- **index.js** - Firebase configuration, authentication, Firestore helpers, and auth functions
  - `registerUser(email, password)` - Create new user account
  - `loginUser(email, password)` - Login existing user
  - `logoutUser()` - Logout current user
  - `getUserId()` - Get current user's UID
  - `addUserMetadata(data)` - Add userId and timestamps to data

### Hooks (`src/hooks/`)
- Custom hooks for database CRUD operations: `useBankAccounts`, `useTrackables`, `useActivities`, `useTrackers`

### Utils (`src/utils/`)
- **analytics.js** - Analytics calculations, date range helpers, formatting utilities
- **encryption.js** - End-to-end encryption (AES-256) for sensitive data
  - `generateEncryptionKey(userId)` - Generate user-specific encryption key
  - `encryptData(data, key)` - Encrypt sensitive fields
  - `decryptData(data, key)` - Decrypt sensitive fields
  - **Note**: All user data encrypted before Firebase storage, transparent to components

### Types (`src/types/`)
- **index.js** - JSDoc type documentation for all data models

## Key Features

1. **Activity Tracking** - Record daily income and expenses with real-time totals
2. **Trackables** - Define recurring monthly/yearly transactions
3. **Smart Tracker** - Mark trackables as complete to automatically create activities
4. **Advanced Analytics** - Filter by time range, account, and trackable with detailed breakdowns
5. **Cloud Storage** - All data persisted in Firebase Firestore with real-time sync across devices
6. **End-to-End Encryption** - Data encrypted on client before Firebase storage (zero-knowledge backend)
7. **User Authentication** - Email/password registration and login with Firebase Auth
8. **Trading App UI** - Dark theme with modern card-based layout
9. **Automatic Deployment** - GitHub Actions CI/CD automatically deploys to Firebase Hosting on every commit

## Development Guidelines

### Running the App
- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Preview:** `npm run preview`

### Code Style
- Use JavaScript with JSDoc for type documentation
- Components use functional components with hooks
- Props are documented with JSDoc `@param` annotations
- Type definitions use JSDoc `@typedef` syntax

### Data Management
- All database operations go through custom hooks with Firebase integration
- Hooks use Firestore real-time listeners (onSnapshot) for live updates
- User data is isolated by userId in Firestore collections
- Anonymous authentication enabled for easy access
- Server timestamps used for createdAt/updatedAt fields
- Maps are used for efficient data lookups (e.g., `trackablesMap`)
- Firestore auto-generates document IDs (e.g., userId-driven queries)

### Color Scheme
- Primary: #0F172A
- Secondary: #1E293B
- Accent: #3B82F6
- Success: #10B981
- Danger: #EF4444
- Warning: #F59E0B

## Data Models

- **BankAccount** - Bank account with card name and account number
- **Trackable** - Recurring transaction template linked to an account
- **Activity** - Individual transaction (income, expense, or transfer)
- **Tracker** - Monthly/yearly tracking status for trackables

## Important Notes

- Credit card bills are handled as "transfer" type and not counted in income/expense totals
- Custom colors are defined in tailwind.config.js
- Date handling uses date-fns library
- All timestamps are in milliseconds (or Firestore server timestamps)
- Firebase credentials stored in `.env.local` (not committed to git)
- See FIREBASE_SETUP.md for Firebase project configuration
- See GITHUB_FIREBASE_SETUP.md for CI/CD and Firebase Hosting setup
- See ENCRYPTION_GUIDE.md for end-to-end encryption architecture
- Analytics page includes pie charts, bar charts, and line graphs using Recharts
- Authentication: Users must register/login before accessing the app
- Automatic deployments via GitHub Actions when pushing to main branch
- Firebase Hosting URL: https://lekalu.web.app
- All sensitive data encrypted with AES-256 before cloud storage
- Firebase backend cannot access user data (zero-knowledge architecture)
