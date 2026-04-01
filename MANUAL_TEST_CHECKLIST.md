# Lekalu - Manual Testing Checklist

## How to Use This Checklist

1. Print or copy this file
2. Run: `npm run dev`
3. Open http://localhost:5173
4. Go through each test and mark ✅ (pass) or ❌ (fail)
5. Add notes in the "Notes" column
6. Save as `TEST_RUN_[DATE].md`

---

## Test Run: [YOUR DATE HERE]

### Authentication (5 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 1.1 | Register new user email@test.com | User created, redirected to Activity page | ✅ ❌ | |
| 1.2 | Login with correct credentials | Logged in, sidebar shows email | ✅ ❌ | |
| 1.3 | Login with wrong password | Error message shown, not logged in | ✅ ❌ | |
| 1.4 | Logout | Redirected to login page | ✅ ❌ | |
| 1.5 | Login, refresh page (F5) | Still logged in | ✅ ❌ | |

---

### Personal Mode - Activities (12 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 2.1 | Add income activity ₹50,000 | Activity appears, total includes it | ✅ ❌ | |
| 2.2 | Add expense activity ₹5,000 | Activity appears, subtracted from total | ✅ ❌ | |
| 2.3 | Add transfer ₹10,000 | Transfer recorded, NOT in income/expense | ✅ ❌ | |
| 2.4 | Edit activity, change amount | Amount updated, totals recalculated | ✅ ❌ | |
| 2.5 | Delete non-trackable activity | Activity removed, totals updated | ✅ ❌ | |
| 2.6 | Try to delete trackable activity | No delete button visible | ✅ ❌ | |
| 2.7 | Set filter to Daily | Only today's activities shown | ✅ ❌ | |
| 2.8 | Set filter to Weekly | Only 7-day activities shown | ✅ ❌ | |
| 2.9 | Set filter to Monthly | Only 30-day activities shown | ✅ ❌ | |
| 2.10 | Set filter to Yearly | Only 365-day activities shown | ✅ ❌ | |
| 2.11 | Set filter to Year-to-Date | Jan 1 to today shown | ✅ ❌ | |
| 2.12 | Create 2 accounts, add to each, filter | Only selected account shown | ✅ ❌ | |

---

### Group Mode (10 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 3.1 | Create new group "Test Group" | Group created, selector appears | ✅ ❌ | |
| 3.2 | Switch to group mode | Activity page shows "Group Mode" | ✅ ❌ | |
| 3.3 | Add activity in group | Activity appears in group view | ✅ ❌ | |
| 3.4 | Edit group activity | Activity updated in group | ✅ ❌ | |
| 3.5 | Delete group activity (no trackable) | Activity deleted from group | ✅ ❌ | |
| 3.6 | Add personal activity, switch to group | Personal activity NOT visible in group | ✅ ❌ | |
| 3.7 | Add group activity, switch to personal | Group activity NOT visible in personal | ✅ ❌ | |
| 3.8 | Create 2 groups with different data | Groups isolated, right data shown | ✅ ❌ | |
| 3.9 | Open 2 browser tabs, add in Tab 1 | Appears in Tab 2 within seconds | ✅ ❌ | |
| 3.10 | Edit group activity as member | Changes saved and encrypted | ✅ ❌ | |

---

### Bank Accounts (6 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 6.1 | Create account with name and number | Account appears in list | ✅ ❌ | |
| 6.2 | Create account without account number | Account created successfully | ✅ ❌ | |
| 6.3 | Edit account name | Name updated | ✅ ❌ | |
| 6.4 | Delete account with activities | Account deleted, activities remain | ✅ ❌ | |
| 6.5 | Create 3 accounts, add activity | All 3 appear in account dropdown | ✅ ❌ | |
| 6.6 | Transfer ₹5,000 between 2 accounts | Transfer shows both accounts | ✅ ❌ | |

---

### Trackables (8 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 5.1 | Create monthly trackable "Rent" ₹15,000 | Trackable appears in list | ✅ ❌ | |
| 5.2 | Create yearly trackable "Insurance" ₹80,000 | Trackable appears in list | ✅ ❌ | |
| 5.3 | Edit trackable name and amount | Changes saved | ✅ ❌ | |
| 5.4 | Try to change "Include in Tracker" | Checkbox disabled with note | ✅ ❌ | |
| 5.5 | Delete trackable with activities | Trackable AND all its activities deleted | ✅ ❌ | |
| 5.6 | Delete trackable with trackers | All tracker records deleted too | ✅ ❌ | |
| 5.7 | Trackable doesn't require account | Can choose different account per activity | ✅ ❌ | |
| 5.8 | Create trackable in group | Group-specific, personal can't see | ✅ ❌ | |

---

### Tracker (9 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 7.1 | Go to Tracker page | Shows trackables for current month | ✅ ❌ | |
| 7.2 | Mark trackable complete | Creates activity with trackable link | ✅ ❌ | |
| 7.3 | Uncheck completed tracker | Activity deleted, uncompleted | ✅ ❌ | |
| 7.4 | Navigate to previous month | Shows previous month's status | ✅ ❌ | |
| 7.5 | Navigate to future month | Shows all incomplete | ✅ ❌ | |
| 7.6 | Create 3 monthly trackables | All 3 appear in tracker | ✅ ❌ | |
| 7.7 | Create yearly trackable | Only appears in designated month | ✅ ❌ | |
| 7.8 | Complete tracker, go to next month, back | Completion status preserved | ✅ ❌ | |
| 7.9 | Track in group mode | Trackers isolated per group | ✅ ❌ | |

---

### Analytics (8 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 8.1 | Add income 100K, expense 25K | Total shows 75K net | ✅ ❌ | |
| 8.2 | Add activities over 7 days | Daily chart shows breakdown | ✅ ❌ | |
| 8.3 | Add different expense types | Pie chart shows distribution | ✅ ❌ | |
| 8.4 | Add transfer | NOT in income/expense totals | ✅ ❌ | |
| 8.5 | Select custom date range | Chart updates to range | ✅ ❌ | |
| 8.6 | Create 2 accounts, filter by one | Chart shows only that account | ✅ ❌ | |
| 8.7 | Group with multiple members | User filter shows actual emails | ✅ ❌ | |
| 8.8 | Add different amounts each month | Monthly comparison chart works | ✅ ❌ | |

---

### Encryption (7 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 9.1 | Add activity, check Firestore | Data is encrypted strings | ✅ ❌ | |
| 9.2 | Two users same activity | Different encrypted data | ✅ ❌ | |
| 9.3 | User A adds, User B edits in group | User B can decrypt & edit | ✅ ❌ | |
| 9.4 | Personal activity in group mode | Cannot see personal encrypted data | ✅ ❌ | |
| 9.5 | Corrupted encrypted data | App doesn't crash, gracefully skips | ✅ ❌ | |
| 9.6 | Create account with number | Account number encrypted | ✅ ❌ | |
| 9.7 | Activity without description | Decryption still works | ✅ ❌ | |

---

### Cross-Platform (8 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 10.1 | Desktop: add activity, Mobile: refresh | Activity appears on mobile | ✅ ❌ | Uses server time |
| 10.2 | Mobile: add activity, Desktop: refresh | Activity appears on desktop | ✅ ❌ | |
| 10.3 | Mobile offline, add activity, reconnect | Syncs to Firebase | ✅ ❌ | |
| 10.4 | Activity added 11 PM, check mobile next AM | Same date filter on both | ✅ ❌ | |
| 10.5 | Two tabs, add in Tab 1 | Tab 2 updates automatically | ✅ ❌ | |
| 10.6 | Edit same activity in 2 tabs | Last write wins | ✅ ❌ | |
| 10.7 | Mobile: use top bar navigation | Menu toggles, nav works | ✅ ❌ | |
| 10.8 | Test responsive: desktop/tablet/mobile | Proper layout all sizes | ✅ ❌ | |

---

### Edge Cases (5 tests)

| # | Test | Expected Result | Result | Notes |
|---|------|-----------------|--------|-------|
| 11.1 | Amount: ₹999,99,99,999 | Formatted correctly | ✅ ❌ | |
| 11.2 | Description: Café @ 50% off! 🎉 | Handled correctly | ✅ ❌ | |
| 11.3 | Quickly add 10 activities | All created, no duplication | ✅ ❌ | |
| 11.4 | Rapidly toggle date filters | UI responsive, data correct | ✅ ❌ | |
| 11.5 | Use browser back button | App state maintained | ✅ ❌ | |

---

## Summary

| Category | Total | Passed | Failed | Success % |
|----------|-------|--------|--------|-----------|
| Authentication | 5 | | | |
| Personal Activities | 12 | | | |
| Group Mode | 10 | | | |
| Bank Accounts | 6 | | | |
| Trackables | 8 | | | |
| Tracker | 9 | | | |
| Analytics | 8 | | | |
| Encryption | 7 | | | |
| Cross-Platform | 8 | | | |
| Edge Cases | 5 | | | |
| **TOTAL** | **78** | | | |

### Critical Issues
- [ ] None found
- [ ] Issues:

### High Priority Issues
- [ ] None found
- [ ] Issues:

### Low Priority Issues
- [ ] None found
- [ ] Issues:

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Tester | _________________ | _______ | ✅ Pass / ❌ Fail |
| Reviewer | _________________ | _______ | ✅ Approved / ❌ Rejected |

---

## Notes & Observations

```
[Add any additional observations, suggestions, or improvements here]




```

