# Lekalu - Testing Guide

## Quick Start

### Running Manual Tests
1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Use [TEST_SCENARIOS.md](TEST_SCENARIOS.md) for step-by-step scenarios
4. Complete each test and check the boxes

### Running Automated Tests (Coming Soon)
```bash
npm test
```

---

## Test Environment Setup

### Prerequisites
- Node.js 16+
- Firebase project configured (see FIREBASE_SETUP.md)
- Two browser windows/devices for cross-platform testing

### Setup Steps

1. **Clone and Install**
   ```bash
   cd c:\Users\saiet\Lekalu
   npm install
   ```

2. **Start Dev Server**
   ```bash
   npm run dev
   ```

3. **Create Test Users**
   - Register Test User 1: `test1@lekalu.dev` / `TestPass123!`
   - Register Test User 2: `test2@lekalu.dev` / `TestPass123!`

4. **Prepare Test Data**
   - Create 2-3 bank accounts per user
   - Create 3-4 trackables (monthly/yearly mix)
   - Create sample groups

---

## Manual Testing Checklist

Create a file `TEST_RESULTS.md` and track completed tests:

```markdown
# Test Results - [Date]

## Authentication
- [ ] Test 1.1: User Registration
- [ ] Test 1.2: User Login
- [ ] Test 1.3: Invalid Login
- [ ] Test 1.4: Logout
- [ ] Test 1.5: Session Persistence

## Personal Mode
- [ ] Test 2.1: Add Income Activity
- [ ] Test 2.2: Add Expense Activity
- [ ] Test 2.3: Add Transfer Activity
- [ ] Test 2.4: Edit Activity
- [ ] Test 2.5: Delete Non-Trackable Activity
- [ ] Test 2.6: Cannot Delete Trackable Activity
- [ ] Test 2.7-2.11: Date Filters
- [ ] Test 2.12: Account Filter

## Group Mode
- [ ] Test 3.1: Create Group
- [ ] Test 3.2: Switch to Group
- [ ] Test 3.3: Add Group Activity
- [ ] Test 3.4: Edit Group Activity
- [ ] Test 3.5: Delete Group Activity
- [ ] Test 3.6: Group/Personal Isolation
- [ ] Test 3.7: Cross-Device Sync
- [ ] Test 3.8: Group Encryption

...
```

---

## Test Cases by Priority

### Critical (Must Pass)
1. Test 1.1 - Registration
2. Test 1.2 - Login
3. Test 2.1 - Add Income
4. Test 2.2 - Add Expense
5. Test 2.3 - Add Transfer
6. Test 2.4 - Edit Activity
7. Test 2.5 - Delete Activity
8. Test 3.1-3.5 - Group Basic Operations
9. Test 9.1-9.3 - Core Encryption
10. Test 10.1 - Cross-device sync

### High Priority (Should Pass)
- Test 5.1-5.7 - Trackable Operations
- Test 6.1-6.6 - Bank Account Operations
- Test 7.1-7.9 - Tracker Operations
- Test 8.1-8.8 - Analytics
- Responsive design tests

### Medium Priority (Nice to Have)
- Test 11.1-11.8 - Edge cases
- Performance tests
- Browser compatibility

---

## Automated Testing Setup

### 1. Install Testing Dependencies
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 2. Create `vitest.config.js`
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
```

### 3. Create Test Setup File: `src/test/setup.js`
```javascript
import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('../fb/index.js', () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  addUserMetadata: jest.fn(),
  getUserEmail: jest.fn(),
}));

// Mock encryption
jest.mock('../utils/encryption.js', () => ({
  generateEncryptionKey: jest.fn(),
  encryptData: jest.fn((data) => ({ ...data, _encrypted: true })),
  decryptData: jest.fn((data) => ({ ...data, _encrypted: false })),
}));
```

### 4. Add Test Script to `package.json`
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:report": "vitest --reporter=verbose"
  }
}
```

### 5. Run Tests
```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Watch mode
npm test -- --watch

# Specific file
npm test -- ActivityCard.test.jsx

# With coverage
npm test -- --coverage
```

---

## Example Unit Test

Create `src/components/ActivityCard.test.jsx`:

```javascript
import { render, screen } from '@testing-library/react';
import { ActivityCard } from './ActivityCard';

describe('ActivityCard', () => {
  const mockActivity = {
    id: '123',
    amount: 5000,
    type: 'expense',
    description: 'Test expense',
    date: new Date(),
    accountId: 'acc-1',
  };

  it('renders activity with amount and description', () => {
    render(
      <ActivityCard 
        activity={mockActivity}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.getByText('Test expense')).toBeInTheDocument();
  });

  it('shows edit and delete buttons for non-trackable activity', () => {
    render(
      <ActivityCard 
        activity={mockActivity}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('hides delete button for trackable activity', () => {
    const trackableActivity = { ...mockActivity, trackableId: 'trk-1' };

    render(
      <ActivityCard 
        activity={trackableActivity}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('displays income in green and expense in red', () => {
    const incomeActivity = { ...mockActivity, type: 'income', amount: 50000 };

    const { rerender } = render(
      <ActivityCard 
        activity={incomeActivity}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('₹50,000')).toHaveClass('text-green-500');

    rerender(
      <ActivityCard 
        activity={mockActivity}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('₹5,000')).toHaveClass('text-red-500');
  });
});
```

---

## Test Data Runner

Create `scripts/test-data.js` to populate test data:

```javascript
import { 
  addBankAccount, 
  addTrackable, 
  addActivity 
} from '../src/fb/index.js';

async function setupTestData(userId, groupId = null) {
  console.log('Setting up test data...');

  // Create bank accounts
  const accounts = await Promise.all([
    addBankAccount({ name: 'ICICI Savings', accountNumber: '****1234' }, userId, groupId),
    addBankAccount({ name: 'HDFC Current', accountNumber: '****5678' }, userId, groupId),
  ]);

  // Create trackables
  const trackables = await Promise.all([
    addTrackable(
      { name: 'Rent', type: 'Monthly', trackerAmount: 15000, includeInTracker: true },
      userId,
      groupId
    ),
    addTrackable(
      { name: 'Insurance', type: 'Yearly', trackerAmount: 80000, includeInTracker: true },
      userId,
      groupId
    ),
  ]);

  // Create activities
  const activities = await Promise.all([
    addActivity(
      { amount: 50000, type: 'income', description: 'Salary', accountId: accounts[0] },
      userId,
      groupId
    ),
    addActivity(
      { amount: 5000, type: 'expense', description: 'Groceries', accountId: accounts[0] },
      userId,
      groupId
    ),
  ]);

  console.log('Test data created!');
  console.log('Accounts:', accounts);
  console.log('Trackables:', trackables);
  console.log('Activities:', activities);
}

export { setupTestData };
```

Run with:
```bash
node scripts/test-data.js
```

---

## Continuous Testing

### GitHub Actions (CI/CD)
Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test
```

---

## Test Coverage

Run coverage report:
```bash
npm test -- --coverage
```

Target coverage:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

---

## Debugging Tests

### Debug Single Test
```bash
npm test -- ActivityCard.test.jsx --reporter=verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/.bin/vitest",
  "args": ["run"],
  "console": "integratedTerminal"
}
```

### UI Test Runner
```bash
npm run test:ui
```

Opens interactive UI at `http://localhost:51204`

---

## Performance Testing

### Lighthouse
```bash
npm run build
npm install -g lighthouse
lighthouse http://localhost:5173 --view
```

### Bundle Analysis
```bash
npm install --save-dev rollup-plugin-visualizer
# Update vite.config.js to include visualizer
npm run build
# Check dist/stats.html
```

---

## Security Testing

### OWASP Testing
1. **Encryption**: Verify data encrypted before Firestore storage
2. **XSS**: Test with `<script>alert('xss')</script>` in description
3. **CSRF**: Verify Firebase Auth tokens
4. **Auth**: Test unauthorized access attempts

### Manual Security Checklist
- [ ] Cannot access other user's personal data
- [ ] Group data only visible to group members
- [ ] Encryption keys derived correctly
- [ ] Decryption fails gracefully
- [ ] No sensitive data in console logs
- [ ] Session tokens secure (httpOnly cookies in production)

---

## Test Results Template

```markdown
# Test Run: [Date] [Time]

## Summary
- Total Tests: 150
- Passed: 145
- Failed: 5
- Skipped: 0
- Success Rate: 96.7%

## Failed Tests
1. Test 4.1: Large Amount - Expected 10Cr formatting
2. Test 11.2: Special characters - 🎉 emoji issue
...

## Performance Metrics
- Average Activity Load: 250ms
- Average Analytics Render: 400ms
- Average Group Switch: 150ms

## Browser Compatibility
- Chrome 120: ✅ Pass
- Firefox 121: ✅ Pass
- Safari 17: ✅ Pass
- Edge 120: ✅ Pass

## Notes
- Mobile responsive needs adjustment on iPhone SE
- Date picker UX could be improved
- Overall app is stable and secure
```

---

## Next Steps

1. **Create test automation** - Build GitHub Actions CI/CD
2. **Add unit tests** - Start with core utilities
3. **Add integration tests** - Test full user workflows
4. **Add E2E tests** - Consider Playwright/Cypress
5. **Performance monitoring** - Track metrics over time
6. **User feedback** - Beta test with real users

