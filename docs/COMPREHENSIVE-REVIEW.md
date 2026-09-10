# Jr. Lancers Basketball App - Comprehensive Review

**Date**: September 9, 2026
**Version**: Pre-Production Review

---

# PART 1: BUG & ISSUE ANALYSIS

## Summary: 30 Issues Found

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 10 |
| MEDIUM | 9 |
| LOW | 6 |

---

## CRITICAL ISSUES

### 1. Firebase Config Credentials Exposed
**File**: `js/firebase-config.js` (lines 40-48)
**Issue**: Firebase API key and project credentials hardcoded in public source code
**Impact**: Anyone can access Firebase project, read/write data
**Note**: This is actually standard for Firebase web apps - security comes from Firestore rules, not hiding the config. However, ensure rules are properly configured.

### 2. Admin Email Hardcoded
**File**: `js/firebase-config.js` (line 5)
**Issue**: `ADMIN_EMAIL = 'lmeltabargerl@icloud.com'` exposed in client code
**Impact**: Reveals admin identity, could enable social engineering

### 3. Emulation System - Potential Auth Bypass
**File**: `js/firebase-config.js` (lines 7-38)
**Issue**: Emulation uses sessionStorage which could be manipulated
**Impact**: If admin email check bypassed, any user could emulate others
**Note**: Currently protected by `isAdmin()` check, but relies on client-side validation

### 4. Viewer Permission Gap in Highlights Upload
**File**: `highlights.html`
**Issue**: No server-side check preventing viewers from uploading
**Impact**: Viewers could upload highlights they shouldn't have access to
**Fix**: Add `currentUserInfo.isViewer` check before upload

### 5. Firestore Rules Need Audit
**File**: `firestore.rules`
**Issue**: Must verify rules match code expectations
**Impact**: Misconfiguration allows unauthorized access

---

## HIGH SEVERITY ISSUES

### 6. Memory Leak: Game Stats Listener Not Cleaned Up
**File**: `game-stats.html` (lines 1233-1254)
**Issue**: `onSnapshot` listener not unsubscribed on page unload
**Fix**: Add `window.addEventListener('beforeunload', () => { if (unsubscribe) unsubscribe(); })`

### 7. Memory Leak: Attendance Listener Not Cleaned Up
**File**: `attendance.html`
**Issue**: Same pattern as game-stats
**Fix**: Add cleanup on page unload

### 8. Undefined `currentUserInfo` Before Auth Resolves
**File**: `game-stats.html`
**Issue**: Variable used before `requireAuth()` promise resolves
**Fix**: Initialize at top and validate before use

### 9. Scorekeeper Permission Logic Confusing
**File**: `game-stats.html` (lines 1118-1146)
**Issue**: Convoluted logic around game window and edit permissions
**Fix**: Refactor with clearer comments

### 10. `getPlayerName()` Returns 'Unknown' Without Warning
**File**: `game-stats.html` (lines 766-769)
**Issue**: Missing players return 'Unknown' silently
**Fix**: Add logging when player not found

### 11. Data Type Inconsistency: playerId String vs Number
**Files**: Multiple
**Issue**: Player IDs mixed types across codebase
**Fix**: Consistently use `parseInt()` everywhere

### 12. Viewer Can Upload Highlights (Frontend Only Check)
**File**: `highlights.html`
**Issue**: No backend validation on upload permission
**Fix**: Add Firestore rule or Cloud Function validation

### 13. Chat Read Status Race Condition
**File**: `messages.html` (lines 604-628)
**Issue**: Read status saved asynchronously, may save wrong ID
**Fix**: Make atomic with message processing

### 14. `isInTrackingWindow()` Regex Edge Case
**File**: `game-stats.html` (lines 701-726)
**Issue**: Time parsing fails silently for malformed times
**Fix**: Add validation and error logging

### 15. Missing Error Handling on Firebase Queries
**File**: `highlights.html` (lines 1008-1039)
**Issue**: No try-catch on Firestore queries
**Fix**: Wrap in try-catch with user-friendly message

---

## MEDIUM SEVERITY ISSUES

### 16. Console Logging in Production
**Files**: highlights.html, messages.html, game-stats.html
**Issue**: Debug logs may expose sensitive data
**Fix**: Remove or use debug flag

### 17. File Operations Missing Null Checks
**File**: `highlights.html`
**Issue**: Path reconstruction from downloadUrl may fail
**Fix**: Add null checks

### 18. Loose Equality in Filtering
**File**: `highlights.html` (lines 852-857)
**Issue**: Using `==` instead of `===` for ID comparison
**Fix**: Use strict equality

### 19. No Input Length Limit on Posts
**File**: `messages.html` (lines 492-500)
**Issue**: Users could post 100KB+ text
**Fix**: Add max length limit (e.g., 5000 chars)

### 20. No Input Length Limit on Chat
**File**: `messages.html` (lines 728-749)
**Issue**: No length limit on chat messages
**Fix**: Add limit (e.g., 500 chars)

### 21. Object URLs Not Revoked (Memory Leak)
**File**: `highlights.html`
**Issue**: `URL.createObjectURL()` not always revoked
**Fix**: Add cleanup on modal close

### 22. No Pagination on Highlights Query
**File**: `highlights.html`
**Issue**: Loads ALL highlights into memory
**Fix**: Add `.limit(100)` and pagination

### 23. Timestamp Format Validation Missing
**File**: `game-stats.html`
**Issue**: Event timestamps may parse incorrectly
**Fix**: Add format validation

### 24. Empty State Handling
**Files**: Various
**Issue**: Need to verify empty states handled gracefully
**Fix**: Test with no data scenarios

---

## LOW SEVERITY ISSUES

### 25. Light Mode CSS Verification Needed
**File**: `game-stats.html`
**Issue**: Need to verify light mode styling works
**Fix**: Test theme toggle

### 26. Service Worker Registration Commented Out
**File**: `js/app.js`
**Issue**: Dead code, indicates incomplete feature
**Fix**: Clean up or complete rollout

### 27. View-Only Mode Indicator Not Prominent
**File**: `game-stats.html`
**Issue**: "(View Only)" text small and faded
**Fix**: Make more visible

### 28. Missing ARIA Labels
**Files**: Multiple
**Issue**: Interactive elements lack accessibility labels
**Fix**: Add aria-label attributes

### 29. Inconsistent Variable Naming
**Files**: Multiple
**Issue**: Mix of `var`, `let`, `const`
**Fix**: Standardize on `const`/`let`

### 30. Potential XSS in Event Descriptions
**File**: `game-stats.html`
**Issue**: Player names not escaped in descriptions
**Fix**: Sanitize event descriptions (low risk since from roster)

---

# PART 2: SECURITY REVIEW

## Summary: 22 Vulnerabilities Found

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 11 |
| MEDIUM | 5 |

---

## CRITICAL VULNERABILITIES

### S1. Public Read Access to Sensitive Collections
**File**: `firestore.rules`
**Issue**: `allow read: if true` on gameStats, attendance, highlights, config
**Impact**: Unauthenticated public access to all data
**Fix**: Change to `allow read: if isAuthenticated()`

### S2. Post Creation Not Restricted to Coaches
**File**: `firestore.rules`
**Issue**: Any authenticated user can create posts
**Impact**: Viewers can impersonate coaches, spread misinformation
**Fix**: Add `&& isCoach(request.auth.email)` to create rule

### S3. No Authentication on Cloud Functions
**File**: `functions/index.js`
**Issue**: `approveWrapup` and `generateWrapupReport` have no auth check
**Impact**: Anyone can call these endpoints
**Fix**: Add authentication validation or convert to `onCall`

### S4. CORS Allows Any Origin
**File**: `functions/index.js` (line 1138)
**Issue**: `Access-Control-Allow-Origin: '*'`
**Impact**: CSRF attacks possible
**Fix**: Restrict to `https://lancers-bball.web.app`

### S5. No Input Validation on gameId
**File**: `functions/index.js`
**Issue**: gameId not validated against actual games
**Impact**: Data manipulation, cross-game access
**Fix**: Validate gameId against schedule

### S6. COPPA Compliance Risk
**Issue**: Public access to minors' data (names, stats, photos)
**Impact**: Legal liability ($43,280 per violation)
**Fix**: Require auth for all data, implement parental consent

---

## HIGH VULNERABILITIES

### S7. Viewers Can Modify Attendance & Volunteers
**File**: `firestore.rules`
**Issue**: `allow write: if isAuthenticated()` with no role check
**Fix**: Validate user is parent of player

### S8. Unrestricted Viewers Collection Writes
**File**: `firestore.rules`
**Issue**: Anyone can modify viewer invitations
**Fix**: Validate user is parent of playerId

### S9. Storage Publicly Readable
**File**: `storage.rules`
**Issue**: `allow read: if true` on highlights
**Fix**: Require authentication

### S10. Roster.json Contains PII
**File**: `data/roster.json`
**Issue**: All emails, phone numbers publicly accessible
**Fix**: Move to Firestore with access controls

### S11. Browser Storage Trusted for Emulation
**File**: `js/firebase-config.js`
**Issue**: sessionStorage can be manipulated
**Fix**: Move emulation to server-side with JWT claims

### S12. Admin UI Visible in DOM
**File**: `messages.html`
**Issue**: Emulation dropdown in DOM (hidden with CSS)
**Fix**: Only render for admins

### S13. No Rate Limiting
**File**: `functions/index.js`
**Issue**: Endpoints can be called unlimited times
**Fix**: Implement per-minute limits

### S14. Insufficient Update Validation in Firestore
**File**: `firestore.rules`
**Issue**: `wrapups` update has no author check
**Fix**: Add owner validation

### S15. Missing Audit Logging
**Issue**: No logging of data access or admin actions
**Fix**: Create auditLogs collection

### S16. No Data Encryption at Rest
**Issue**: PII stored unencrypted in Firestore
**Fix**: Consider field-level encryption for sensitive data

### S17. Weak API Key Authentication
**File**: `functions/index.js`
**Issue**: `key=lancers2026` is easily guessable
**Fix**: Use Firebase Admin SDK or proper API key management

---

## MEDIUM VULNERABILITIES

### S18. XSS Risk - Inconsistent HTML Escaping
**Files**: Various
**Issue**: Not all user input consistently escaped
**Fix**: Use centralized sanitize function (DOMPurify)

### S19. Player Switcher in localStorage
**File**: `js/firebase-config.js`
**Issue**: `selectedPlayerId` persists across sessions
**Fix**: Use sessionStorage or clear on logout

### S20. No Secret Rotation Policy
**File**: `functions/index.js`
**Issue**: API keys may be stale
**Fix**: Implement 90-day rotation

### S21. 100MB Upload Limit
**File**: `storage.rules`
**Issue**: Large file uploads allowed
**Fix**: Reduce to 50MB, validate server-side

### S22. No Schema Validation on Input
**File**: `functions/index.js`
**Issue**: gameId and other inputs not type-checked
**Fix**: Use Zod/Joi for validation

---

## IMMEDIATE ACTION ITEMS (Before Production)

1. **CRITICAL**: Change all `allow read: if true` to `if isAuthenticated()` in firestore.rules
2. **CRITICAL**: Restrict post creation to coaches in firestore.rules
3. **CRITICAL**: Add auth check to `approveWrapup` and `generateWrapupReport`
4. **CRITICAL**: Restrict CORS to lancers-bball.web.app
5. **HIGH**: Validate viewers write to only their player
6. **HIGH**: Require auth for storage reads
7. **HIGH**: Move roster PII to Firestore
8. **HIGH**: Add gameId validation in Cloud Functions
9. **HIGH**: Implement rate limiting

---

# PART 3: BETA TESTING PLAN

## Test Accounts

| Role | Email | Notes |
|------|-------|-------|
| Coach | lmeltabarger@icloud.com | Head Coach - full access |
| Coach | matthewmoore09@yahoo.com | Assistant Coach |
| Parent | mindy.m.carney@gmail.com | 2 children: Raequan & Ashton |
| Parent | mkreyling@yahoo.com | Camden's parent |
| Parent | careypatton@hotmail.com | Grant's parent |

---

## Feature Access Matrix

| Feature | Coach | Parent | Viewer |
|---------|-------|--------|--------|
| View Home/Roster/Schedule | Yes | Yes | Yes |
| RSVP Attendance | Yes | Yes | No |
| Group Chat | Yes | Yes | No |
| Post Announcements | Yes | No | No |
| View Playbook | Yes | Yes | No |
| Upload Highlights | Yes | Yes | No |
| Sign Up Volunteers | Yes | Yes | No |
| Track Live Stats | Yes | If assigned | No |
| View Live Stats | Yes | Yes | Yes |
| Add/Edit Wrap-Ups | Yes | No | No |
| Invite Viewers | No | Yes | No |

---

## Testing Checklist

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Register new account (with roster email)
- [ ] Register with non-roster email (should fail)
- [ ] Password reset flow
- [ ] Logout and verify session cleared

### Home Page
- [ ] Player banner shows correct name/number
- [ ] Next game card displays
- [ ] Live stats button appears during game window
- [ ] RSVP reminder shows if not submitted
- [ ] Volunteer needs show next 7 days
- [ ] Family Volunteering stats correct
- [ ] Team Spirit Leaderboard displays
- [ ] Season record accurate

### Roster
- [ ] All 10 players displayed
- [ ] Player cards show number, name, position
- [ ] Click player opens profile modal
- [ ] Stats display in modal
- [ ] Highlights show in modal (if any)
- [ ] Parent can invite viewers
- [ ] Parent can remove viewers

### Schedule
- [ ] All games listed in order
- [ ] Each card shows date, time, opponent, location
- [ ] Completed games show final score
- [ ] Click game navigates to detail page

### Game Detail
- [ ] Game info displays correctly
- [ ] Attendance section shows RSVP status
- [ ] Volunteers section shows assignments
- [ ] Highlights display for completed games
- [ ] Play-by-play shows events by quarter
- [ ] Highlight icons on scoring plays work
- [ ] Wrap-up displays after approval

### Messages (Parent/Coach only)
- [ ] Group Chat tab shows messages
- [ ] New message appears in real-time
- [ ] Posts tab shows announcements
- [ ] Coach can create new post
- [ ] Text tab shows contact directory
- [ ] Viewers cannot access this page

### Playbook (Parent/Coach only)
- [ ] Play list displays
- [ ] Click play shows animation
- [ ] Animation runs smoothly
- [ ] Viewers cannot access this page

### Highlights
- [ ] Upload button visible for parents/coaches
- [ ] Select photo/video from device
- [ ] Timestamp auto-matching works
- [ ] Manual game/player selection works
- [ ] Upload completes successfully
- [ ] Filters by game work
- [ ] Filters by player work
- [ ] Fullscreen playback works

### Attendance
- [ ] Upcoming games listed
- [ ] RSVP buttons work (Yes/No)
- [ ] Status saves immediately
- [ ] Coach sees all RSVPs

### Volunteers
- [ ] Games with positions displayed
- [ ] Sign up for position works
- [ ] Confirmation shown
- [ ] Coach sees all signups

### Live Stats
- [ ] "Track Live Stats" button for coach/scorekeeper
- [ ] "View Live Stats" button for others
- [ ] Track mode: can enter stats
- [ ] View mode: read-only
- [ ] Real-time sync between users
- [ ] Score updates immediately
- [ ] After window: view-only for all

### Push Notifications
- [ ] Enable notifications prompt works
- [ ] Chat message notification received
- [ ] Game start notification received
- [ ] Game end notification received
- [ ] Click notification opens correct page

### PWA
- [ ] Install prompt appears on mobile
- [ ] App installs to home screen
- [ ] Opens in standalone mode
- [ ] Works with cached content offline

### Dark Mode
- [ ] Theme toggle works
- [ ] All text readable in both modes
- [ ] Preference persists after refresh

### Navigation
- [ ] Bottom tabs work (7 for parents, 5 for viewers)
- [ ] Back button returns to previous page
- [ ] No broken links

### Multi-Child Family (Carney)
- [ ] Player switcher appears
- [ ] Switching changes displayed data
- [ ] Correct stats for each child
- [ ] Selection persists

---

## Performance Targets

- Page load: < 2 seconds
- Chat message: < 1 second delay
- Live stat entry: < 500ms update
- Photo upload: < 10 seconds for 2MB

---

## Bug Report Template

```
**Title**: [Brief description]
**Role**: [Coach/Parent/Viewer]
**Steps to Reproduce**:
1. ...
2. ...
3. ...
**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Device**: [iPhone/Android/Desktop, browser]
**Screenshot**: [If applicable]
```

---

## Special Test Scenarios

### Scenario 1: Live Game Day
1. Start 10 min before game
2. Verify live stats button appears
3. Coach tracks stats through all quarters
4. Parents view in real-time
5. After game, verify stats saved

### Scenario 2: Post-Game Wrap-Up
1. After game, coach enters notes
2. Wait for AI generation (after 2 hours)
3. Coach reviews and approves
4. Verify all parents get notification

### Scenario 3: Multi-Child Family
1. Login as Mindy Carney
2. Switch between Raequan and Ashton
3. Verify stats/highlights load correctly
4. RSVP for different games per child

### Scenario 4: Highlight Timestamp Matching
1. Upload photo taken during game
2. App extracts EXIF timestamp
3. Matches to play-by-play event
4. Confirm auto-populated fields

---

# RECOMMENDATIONS

## Priority 1 (Before Any Real Data)
1. Fix Firestore rules to require authentication
2. Restrict post creation to coaches
3. Add auth to Cloud Functions
4. Restrict CORS origins

## Priority 2 (Before Beta)
1. Add viewer upload restrictions
2. Add input length limits
3. Fix memory leaks (listener cleanup)
4. Add rate limiting

## Priority 3 (Before Production)
1. Complete COPPA compliance review
2. Move roster PII to Firestore
3. Implement audit logging
4. Add monitoring and alerts

---

**Report Generated**: September 9, 2026
**Recommendation**: Address all CRITICAL issues before using with real player/family data.
