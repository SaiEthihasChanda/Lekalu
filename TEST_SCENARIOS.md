# Lekalu - Comprehensive Test Scenarios

## Table of Contents
1. [Authentication Tests](#authentication-tests)
2. [Personal Mode Tests](#personal-mode-tests)
3. [Group Mode Tests](#group-mode-tests)
4. [Activity Management Tests](#activity-management-tests)
5. [Trackable Management Tests](#trackable-management-tests)
6. [Bank Account Tests](#bank-account-tests)
7. [Tracker Tests](#tracker-tests)
8. [Analytics Tests](#analytics-tests)
9. [Encryption Tests](#encryption-tests)
10. [Cross-Platform Tests](#cross-platform-tests)

---

## Authentication Tests

### Test 1.1: User Registration
- **Scenario**: New user registers with email and password
- **Steps**:
  1. Navigate to Register page
  2. Enter valid email (e.g., test@example.com)
  3. Enter password (e.g., TestPass123!)
  4. Click Register
- **Expected**: User is created, redirected to Activity page, can see empty state
- **Verify**: Firebase Auth user created, user metadata in Firestore

### Test 1.2: User Login
- **Scenario**: Existing user logs in
- **Steps**:
  1. Navigate to Login page
  2. Enter registered email
  3. Enter correct password
  4. Click Login
- **Expected**: Redirected to Activity page, sidebar shows email
- **Verify**: Session persists on refresh

### Test 1.3: Invalid Login
- **Scenario**: User enters wrong password
- **Steps**:
  1. Enter email and wrong password
  2. Click Login
- **Expected**: Error message displayed, not redirected

### Test 1.4: Logout
- **Scenario**: User logs out
- **Steps**:
  1. Click logout button in sidebar
  2. Confirm logout
- **Expected**: Redirected to Login page, session cleared
- **Verify**: Local/session storage cleared

### Test 1.5: Session Persistence
- **Scenario**: User logs in, refreshes page
- **Steps**:
  1. Log in successfully
  2. Press F5 to refresh
- **Expected**: Still logged in, data loads

---

## Personal Mode Tests

### Test 2.1: Add Personal Activity (Income)
- **Scenario**: Add income activity in personal mode
- **Steps**:
  1. Click "Add Activity"
  2. Amount: 50000, Type: Income
  3. Select bank account
  4. Description: "Monthly Salary"
  5. Submit
- **Expected**: Activity appears in Activity list, totals updated
- **Verify**: Date uses server timestamp, encrypted in Firestore

### Test 2.2: Add Personal Activity (Expense)
- **Scenario**: Add expense activity
- **Steps**:
  1. Click "Add Activity"
  2. Amount: 5000, Type: Expense
  3. Select account, add description
  4. Submit
- **Expected**: Activity appears, subtracted from total

### Test 2.3: Add Personal Activity (Transfer)
- **Scenario**: Add transfer between accounts
- **Steps**:
  1. Click "Add Activity"
  2. Amount: 10000, Type: Transfer
  3. Select from/to accounts
  4. Submit
- **Expected**: Activity recorded, NOT counted in income/expense totals

### Test 2.4: Edit Personal Activity
- **Scenario**: Edit existing activity
- **Steps**:
  1. Click edit icon on activity
  2. Change amount to 6000
  3. Submit
- **Expected**: Activity updated, totals recalculated
- **Verify**: Original date preserved, encryption still valid

### Test 2.5: Delete Personal Activity (Not Trackable)
- **Scenario**: Delete activity without trackable
- **Steps**:
  1. Click delete on non-trackable activity
  2. Confirm delete
- **Expected**: Activity removed, totals updated
- **Verify**: Data removed from Firestore

### Test 2.6: Cannot Delete Activity with Trackable
- **Scenario**: Try to delete activity linked to trackable
- **Steps**:
  1. Find activity with trackable link
  2. Look for delete button
- **Expected**: No delete button visible

### Test 2.7: Filter by Date - Daily
- **Scenario**: View daily activities
- **Steps**:
  1. Select Daily filter
  2. Add activities on different days
- **Expected**: Only today's activities shown

### Test 2.8: Filter by Date - Weekly
- **Scenario**: View weekly activities
- **Expected**: Activities from past 7 days shown

### Test 2.9: Filter by Date - Monthly
- **Scenario**: View monthly activities
- **Expected**: Activities from past 30 days shown

### Test 2.10: Filter by Date - Yearly
- **Scenario**: View yearly activities
- **Expected**: Activities from past 365 days shown

### Test 2.11: Filter by Date - Year to Date
- **Scenario**: View year-to-date activities
- **Expected**: Activities from Jan 1 to today shown

### Test 2.12: Filter by Bank Account
- **Scenario**: Create 2 accounts, add activities to each
- **Steps**:
  1. Create Account A and Account B
  2. Add activity to Account A
  3. Add activity to Account B
  4. Filter by Account A
- **Expected**: Only Account A activity shown

---

## Group Mode Tests

### Test 3.1: Create Group
- **Scenario**: User creates a new group
- **Steps**:
  1. Navigate to Trackables page
  2. Click "Create Group" button
  3. Enter group name "Test Group"
  4. Submit
- **Expected**: Group created, can see group selector
- **Verify**: Group ID generated, group metadata in Firestore

### Test 3.2: Switch to Group Mode
- **Scenario**: Switch from personal to group mode
- **Steps**:
  1. Select group from dropdown/sidebar
  2. Navigate to Activity page
- **Expected**: Activity page shows "Group Mode" label
- **Verify**: Data is group-specific

### Test 3.3: Add Group Activity
- **Scenario**: Add activity while in group mode
- **Steps**:
  1. Switch to group
  2. Click "Add Activity"
  3. Add income: 30000
  4. Submit
- **Expected**: Activity appears in group view
- **Verify**: Activity encrypted with group key in Firestore

### Test 3.4: Edit Group Activity
- **Scenario**: Edit activity in group mode
- **Steps**:
  1. Click edit on group activity
  2. Change amount
  3. Submit
- **Expected**: Activity updated, visible in group
- **Verify**: Still encrypted with correct group key

### Test 3.5: Delete Group Activity (Not Trackable)
- **Scenario**: Delete group activity without trackable
- **Expected**: Activity deleted from group

### Test 3.6: Group Activity Not Visible in Personal
- **Scenario**: Switch back to personal mode after adding group activity
- **Expected**: Group activity NOT visible in personal mode

### Test 3.7: Personal Activity Not Visible in Group
- **Scenario**: Add personal activity, start group, check
- **Expected**: Personal activity NOT visible in group

### Test 3.8: Group Isolation
- **Scenario**: Create 2 groups, add different activities
- **Steps**:
  1. Create Group A, add activity: 5000
  2. Create Group B, add activity: 8000
  3. Switch to Group A
- **Expected**: Only Group A activity visible (5000)

### Test 3.9: Cross-Device Group Sync
- **Scenario**: Add group activity on Phone A, check on Phone B (simulated with 2 browsers)
- **Expected**: Activity appears on Phone B within seconds

### Test 3.10: Group Member Encryption Key Sharing
- **Scenario**: Two users in same group, one edits activity
- **Expected**: Other user can decrypt and read activity

---

## Activity Management Tests

### Test 4.1: Large Amount Confirmation
- **Scenario**: Add very large amount (> ₹99 lakhs)
- **Steps**:
  1. Amount: 10000000 (1 Crore)
  2. Should show confirmation
- **Expected**: Confirmation dialog appears, can proceed

### Test 4.2: Edit Activity During Daily View
- **Scenario**: Edit activity, filter changes to show edited item
- **Steps**:
  1. Add activity for today
  2. Switch to Weekly
  3. Edit activity to change date to tomorrow
  4. Change back to Daily
- **Expected**: Activity moved to different filter result

### Test 4.3: Activity with Trackable - Cannot Delete
- **Scenario**: Tracker creates activity, try to delete
- **Expected**: No delete button, cannot delete

### Test 4.4: Activity Without Trackable - Can Delete
- **Scenario**: Manual activity, try to delete
- **Expected**: Delete button visible, can delete

### Test 4.5: Edit Activity Preserves Trackable Link
- **Scenario**: Edit trackable activity amount only
- **Expected**: Trackable link remains intact

### Test 4.6: Display Formats
- **Scenario**: Add activities with different amounts
- **Tests**:
  - 100 (₹100)
  - 1000 (₹1K)
  - 100000 (₹1L)
  - 10000000 (₹1Cr)
- **Expected**: Proper formatting with Indian numbering system

### Test 4.7: Time Display
- **Scenario**: Add multiple activities on same day
- **Expected**: Shows time in 12-hour format with AM/PM
- **Verify**: Uses server time, not device time

---

## Trackable Management Tests

### Test 5.1: Create Monthly Trackable
- **Scenario**: Create recurring monthly expense
- **Steps**:
  1. Go to Trackables page
  2. Click "Add Trackable"
  3. Name: "Rent", Type: Monthly, Amount: 15000
  4. Check "Include in Tracker"
  5. Submit
- **Expected**: Trackable created, appears in list
- **Verify**: Encrypted in Firestore

### Test 5.2: Create Yearly Trackable
- **Scenario**: Create yearly recurring item
- **Steps**:
  1. Name: "Car Insurance", Type: Yearly, Amount: 80000
  2. Submit
- **Expected**: Trackable created with yearly frequency

### Test 5.3: Edit Trackable (Allowed Fields)
- **Scenario**: Edit trackable name and amount
- **Steps**:
  1. Click edit on trackable
  2. Change name to "Rent + Maintenance"
  3. Change amount to 16000
  4. Submit
- **Expected**: Trackable updated

### Test 5.4: Cannot Change Tracked Status on Edit
- **Scenario**: Try to change "Include in Tracker" checkbox
- **Expected**: Checkbox disabled with "(cannot change)" label

### Test 5.5: Delete Trackable Cascades to Activities
- **Scenario**: Create trackable, create activities, delete trackable
- **Steps**:
  1. Create trackable "Gym"
  2. Complete tracker (creates activity)
  3. Add manual activity with this trackable
  4. Delete trackable
- **Expected**: Trackable deleted, ALL related activities deleted
- **Verify**: All related trackers also deleted

### Test 5.6: Delete Trackable Cascades to Trackers
- **Scenario**: Create trackable, complete several months, delete
- **Expected**: All tracker records for this trackable deleted

### Test 5.7: Trackable Not Linked to Bank Accounts
- **Scenario**: Create trackable, don't require account selection
- **Expected**: Trackable doesn't store accountId
- **Verify**: Can choose different account when completing

### Test 5.8: Group Trackables
- **Scenario**: Create trackable in group mode
- **Expected**: Trackable encrypted with group key
- **Verify**: Personal tracables don't appear in group

---

## Bank Account Tests

### Test 6.1: Create Bank Account with Number
- **Scenario**: Create account with card number
- **Steps**:
  1. Go to Trackables page
  2. Click "Add Bank Account"
  3. Name: "ICICI Savings", Account: "****1234"
  4. Submit
- **Expected**: Account created, number displayed as mask
- **Verify**: Encrypted in Firestore

### Test 6.2: Create Bank Account without Number (Optional)
- **Scenario**: Create account without account number
- **Steps**:
  1. Name: "Cash Wallet"
  2. Leave Account Number blank
  3. Submit
- **Expected**: Account created successfully
- **Verify**: No account number field shown if empty

### Test 6.3: Edit Bank Account
- **Scenario**: Edit account details
- **Steps**:
  1. Click edit on account
  2. Change name to "ICICI Savings - Primary"
  3. Submit
- **Expected**: Account updated

### Test 6.4: Delete Bank Account (No Cascade)
- **Scenario**: Delete account with activities
- **Expected**: Account deleted, activities remain
- **Verify**: Activities still exist, account field becomes null/blank

### Test 6.5: Bank Account Appears in Activity Form
- **Scenario**: Create 3 accounts, add activity
- **Expected**: All 3 accounts available in dropdown

### Test 6.6: Transfer Between Accounts
- **Scenario**: Create 2 accounts, transfer between them
- **Steps**:
  1. Account A, Account B
  2. Add activity: Type=Transfer, Amount=5000, From A To B
- **Expected**: Transfer recorded, not in income/expense totals
- **Verify**: Both accounts show in transfer activity

---

## Tracker Tests

### Test 7.1: View Trackers for Current Month
- **Scenario**: Navigate to Tracker page during month
- **Expected**: Shows all trackables for current month
- **Display**: Checkboxes, amounts, mark complete options

### Test 7.2: Complete Tracker - Creates Activity
- **Scenario**: Check "Mark as Complete" for trackable
- **Steps**:
  1. Find trackable "Rent" in Tracker
  2. Mark as complete
  3. Select account
  4. Submit
- **Expected**: 
  - Activity created with trackable link
  - Tracker shows as completed
  - Amount reflects in totals

### Test 7.3: Uncomplete Tracker
- **Scenario**: Mark completed tracker as incomplete
- **Expected**: 
  - Tracker uncompleted
  - Activity deleted
  - Reflect in totals

### Test 7.4: View Previous Month Trackers
- **Scenario**: Navigate to previous month
- **Expected**: Shows trackers for that month
- **Verify**: Completed status from last month shown

### Test 7.5: View Future Month Trackers
- **Scenario**: Navigate to future month
- **Expected**: Shows tracking template for future month
- **Status**: All show as incomplete

### Test 7.6: Multiple Trackables Same Month
- **Scenario**: Create 3 monthly trackables, track month
- **Expected**: All 3 appear in Tracker page
- **Track**: Can complete any combination

### Test 7.7: Yearly Trackable Appears Yearly
- **Scenario**: Create yearly trackable "Insurance"
- **Steps**:
  1. January: See insurance in tracker
  2. Complete it
  3. February: Insurance gone from tracker
  4. December: Insurance appears again
- **Expected**: Only appears in designated month

### Test 7.8: Previous Tracker Status Preserved
- **Scenario**: Track activity this month, go to Tracker next month, back to this month
- **Expected**: Previous month's completion status still there

### Test 7.9: Group Trackers
- **Scenario**: Create trackable in group, track
- **Expected**: Tracker data isolated per group

---

## Analytics Tests

### Test 8.1: Analytics - Total Calculations
- **Scenario**: Add multiple activities, check totals
- **Steps**:
  1. Income: 100000 (add 2x 50000)
  2. Expense: 25000 (add 15000 + 10000)
  3. Check Analytics total
- **Expected**: Total = 100000 - 25000 = 75000

### Test 8.2: Analytics - Daily Chart
- **Scenario**: Add activities over 7 days
- **Expected**: Daily chart shows breakdown
- **Verify**: Correct amounts per day

### Test 8.3: Analytics - Category Breakdown
- **Scenario**: Add different expense types
- **Expected**: Pie chart shows expense distribution
- **Verify**: Percentages calculate correctly

### Test 8.4: Analytics - Transfer Not Counted
- **Scenario**: Add transfer, check totals
- **Expected**: Transfer amount NOT in income/expense totals
- **Verify**: Only appears in separate transfer total

### Test 8.5: Analytics - Filter by Date Range
- **Scenario**: Select custom date range
- **Expected**: Chart updates to show date range

### Test 8.6: Analytics - Filter by Account
- **Scenario**: Create 2 accounts with different activities
- **Steps**:
  1. Account A: 50000
  2. Account B: 30000
  3. Filter by Account A
- **Expected**: Chart shows only Account A (50000)

### Test 8.7: Analytics - Group User Names
- **Scenario**: Add activities in group by different members
- **Expected**: User filter shows actual emails (not user IDs)
- **Verify**: Can filter by member

### Test 8.8: Analytics - Monthly Comparison
- **Scenario**: Add different amounts each month
- **Expected**: Comparison chart shows month-over-month

---

## Encryption Tests

### Test 9.1: Data Encrypted Before Storage
- **Scenario**: Add activity, check Firestore directly
- **Expected**: Amount, type, description are encrypted strings
- **Verify**: Cannot read without decryption key

### Test 9.2: Encryption Key Per User
- **Scenario**: Two users, same data, different keys
- **Expected**: Same activity appears different in Firestore

### Test 9.3: Group Encryption Key Sharing
- **Scenario**: User A adds activity, User B edits it
- **Expected**: User B can decrypt using group key

### Test 9.4: Personal Data Not Visible to Group
- **Scenario**: User has activity in personal mode
- **Steps**:
  1. Personal: Add activity X
  2. Group: Cannot see activity X
- **Expected**: Separate encryption contexts

### Test 9.5: Corrupted Data Handling
- **Scenario**: Manually corrupt encrypted data in Firestore
- **Expected**: 
  - Error logged (verbose off)
  - Data skipped/filtered
  - App doesn't crash

### Test 9.6: Account Number Encryption
- **Scenario**: Create account with account number
- **Expected**: Account number encrypted in Firestore

### Test 9.7: Optional Fields Encryption
- **Scenario**: Add activity without description
- **Expected**: No description field in encrypted doc
- **Verify**: Decryption doesn't fail

---

## Cross-Platform Tests

### Test 10.1: Desktop to Mobile Sync
- **Scenario**: Open on desktop, add activity, reload on mobile
- **Expected**: Activity appears on mobile
- **Verify**: Uses server timestamp

### Test 10.2: Mobile to Desktop Sync
- **Scenario**: Phone activity appears on desktop
- **Expected**: Same data, proper formatting

### Test 10.3: Offline Activity (Mobile)
- **Scenario**: Add activity offline, reconnect
- **Expected**: Activity syncs to Firebase
- **Verify**: Uses server timestamp for date

### Test 10.4: Date Filter Consistency
- **Scenario**: Add activity on desktop at 11 PM, check next morning on mobile
- **Expected**: Date filter consistent across devices
- **Verify**: Uses server time, not device time

### Test 10.5: Real-time Updates
- **Scenario**: Two browser tabs, add activity in one
- **Expected**: Other tab updates automatically
- **Verify**: Firestore listener working

### Test 10.6: Concurrency - Edit Same Activity
- **Scenario**: Edit activity in 2 tabs simultaneously
- **Expected**: Last write wins (or conflict handled)

### Test 10.7: Mobile Top Bar Navigation
- **Scenario**: On mobile/responsive, use top bar
- **Steps**:
  1. Click menu button
  2. Navigate to different page
  3. Click logo
- **Expected**: Menu toggles, navigation works

### Test 10.8: Responsive Design
- **Scenario**: Test on different screen sizes
- **Devices**: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Expected**: Proper layout, no overflow, readable

---

## Edge Case Tests

### Test 11.1: Large Amount Input
- **Scenario**: Amount: 999999999999
- **Expected**: Formatted correctly, truncation/warning if needed

### Test 11.2: Special Characters in Description
- **Scenario**: Description: "Café @ 50% off! 🎉"
- **Expected**: Handled correctly, encrypted/decrypted properly

### Test 11.3: Rapid Fire Activity Creation
- **Scenario**: Quickly add 10+ activities
- **Expected**: All created, no duplication

### Test 11.4: Rapid Date Filtering
- **Scenario**: Rapidly toggle between date filters
- **Expected**: UI stays responsive, correct data shown

### Test 11.5: Browser Back Button
- **Scenario**: Navigate, use browser back
- **Expected**: App state maintained properly

### Test 11.6: Multiple Logins
- **Scenario**: Log in, log out, log in again
- **Expected**: Clean state, no data leakage

### Test 11.7: Expired Session
- **Scenario**: Let session expire, try to use app
- **Expected**: Redirected to login

### Test 11.8: Very Long Activity Description
- **Scenario**: Description: 5000+ characters
- **Expected**: Handled properly, truncated in display if needed

---

## How to Run These Tests

See [TESTING.md](TESTING.md) for instructions on running automated and manual tests.
