# Real Data Integration Tests

This folder contains both unit tests (with mocked data) and integration tests (with real Firebase data).

## Running Tests

### Unit Tests (with mocked data)
```bash
npm run test
```

This runs all tests including the original unit tests that use mocked Firebase data.

### Integration Tests (with real Firebase data)
```bash
npm run test -- analytics-real.test.js
```

This runs the integration tests that connect to the real Lekalu Firebase project and create actual test data.

## Integration Test Setup

The integration tests use real Firebase data. They:

1. **Create a test user** with email `test-analytics@lekalu.app` and password `TestPassword123!`
2. **Create real test data** in Firestore (activities, trackables, sources)
3. **Run assertions** against actual Firebase data
4. **Clean up** after tests by deleting all test data

### Requirements

- Valid Firebase credentials in `.env.local` (should already be set up)
- Network access to Firebase
- Test user must be allowed to create/delete data in Firestore

### Important Notes

- **Real data** is created in the Lekalu Firebase project during these tests
- Tests create data with **"test-analytics@lekalu.app"** email for easy identification
- All test data is **automatically cleaned up** after each test suite
- Each test can be run independently; data cleanup happens after completion

### Available Test Utilities

The `firebase-test-utils.js` file provides helper functions:

- `initializeTestFirebase()` - Initialize Firebase connection
- `createTestUser(email, password)` - Create or get test user
- `loginTestUser(email, password)` - Login test user  
- `logoutTestUser()` - Logout test user
- `getTestUserId()` - Get current user ID
- `createTestActivity(userId, data)` - Create activity
- `createTestTrackable(userId, data)` - Create trackable
- `createTestSource(userId, data)` - Create source/account
- `getUserActivities(userId)` - Get user's activities from Firestore
- `getUserTrackables(userId)` - Get user's trackables from Firestore
- `getUserSources(userId)` - Get user's sources from Firestore
- `deleteTestUserData(userId)` - Clean up all test data for a user

### Example Usage

```javascript
import {
  createTestUser,
  createTestActivity,
  getUserActivities,
  deleteTestUserData,
} from './firebase-test-utils.js';

// Create test user
const userId = await createTestUser('test@example.com', 'Password123!');

// Create activity
await createTestActivity(userId, {
  date: new Date('2026-04-01').getTime(),
  amount: 100,
  type: 'income',
  description: 'Test income',
});

// Get activities from real Firestore
const activities = await getUserActivities(userId);

// Cleanup
await deleteTestUserData(userId);
```

## Test Files

- `analytics-real.test.js` - Real Firebase analytics tests
- `analytics.test.js` - Original unit tests with mocked data (keeps working for regression testing)
