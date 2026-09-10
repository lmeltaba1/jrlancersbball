# Claude Context - Jr. Lancers Basketball App

## Project Overview

This is a mobile-first web app for managing a youth basketball team (Jr. Lancers, 5th grade boys). Built with vanilla HTML/CSS/JavaScript and Firebase backend. No build step required.

## Current State (as of Sept 2026)

The app is fully functional with all core features implemented. **Season simulation is active** with 3 completed games (Dec 5, 6, 12) containing full play-by-play event logs and simulated highlights.

### Completed Features

1. **Home (index.html)** - Dashboard with next game, volunteer stats, live stats button
2. **Roster (roster.html)** - Player cards, parent directory, player profile modals with stats and highlights, viewer management
3. **Schedule (schedule.html)** - Season schedule with game cards
4. **Game Detail (game-detail.html)** - Individual game info, attendance, volunteers, highlights, play-by-play
5. **Messages (messages.html)** - 3-tab messaging hub (parents/coaches only):
   - **Group Chat** - Real-time team messaging (default tab)
   - **Posts** - Coach announcements (coaches can post, all can view)
   - **Text** - Contact directory with SMS links to parents/coaches
6. **Playbook (playbook.html)** - Interactive play diagrams with SVG animations (parents/coaches only)
7. **Highlights (highlights.html)** - Photo/video uploads tagged by player/game
8. **Attendance (attendance.html)** - RSVP tracking for games (parents/coaches only)
9. **Volunteers (volunteers.html)** - Sign up for game duties (parents/coaches only)
10. **Game Stats (game-stats.html)** - Live stat tracking during games + view-only mode
11. **Stats View (stats-view.html)** - View/edit saved game stats

### Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no React, no build)
- **Styling:** css/athletic.css (dark theme default, light mode toggle)
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Data:** Firestore `config/roster` and `config/schedule` documents (synced from static JSON via `syncConfig` function)

### Firebase Collections

- `config` - App configuration (roster, schedule, headCoach, coachEmails, adminEmails documents)
- `attendance` - Player availability per game
- `volunteers` - Volunteer signups per game (scorekeeper, tableWorker)
- `gameStats` - Player statistics per game
- `highlights` - Media uploads with player/game tags
- `messages` - Group chat messages
- `posts` - Coach announcements (with comments subcollection)
- `viewers` - Invited viewers per player (managed by parents, includes blocklist)
- `chatReadStatus` - Per-user chat read timestamps
- `fcmTokens` - Push notification tokens
- `userProfiles` - User profile data
- `wrapups` - Post-game wrap-up reports (AI-generated narratives, coach notes)
- `rateLimits` - Rate limiting for cloud functions (per user/action)
- `emulationLogs` - Audit trail for admin user emulation (immutable)

### Key Files

| File | Purpose |
|------|---------|
| `js/firebase-config.js` | Firebase init, auth helpers, `getPlayerFromRoster()`, `requireAuth()`, `isEmailInRoster()`, `loadRosterData()`, `loadAdminEmails()` |
| `js/app.js` | Shared utilities: `loadRoster()`, `loadSchedule()`, `formatDate()`, `escapeHtml()`, `leagueNames`, `getCurrentDate()` - included in most HTML files |
| `js/theme.js` | Dark/light mode toggle |
| `css/athletic.css` | All styles, CSS variables for theming |
| `functions/data/roster-full.json` | Source data for roster (synced to Firestore via `syncConfig`) |
| `functions/data/schedule-full.json` | Source data for schedule (synced to Firestore via `syncConfig`) |
| `functions/index.js` | Cloud Functions: notifications, wrap-ups, rate limiting, config sync |

## Security & Roles

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Coach** | In `roster.json` coaches array | Full access, can edit stats anytime |
| **Parent** | In player's `parents` array | Full access except stat editing (unless scorekeeper) |
| **Viewer** | In player's `viewers` array or Firestore | View-only: schedule, roster, stats, highlights |

### Authentication Flow

1. User registers with email (must be pre-approved in Firestore `config/roster` or `viewers` collection)
2. `isEmailInRoster()` validates email before registration (checks Firestore)
3. `requireAuth()` on each page checks login and role
4. `getPlayerFromRoster()` returns user info with permissions:
   - `isCoach`, `isParent`, `isViewer`
   - `canChat`, `canViewPlaybook`, `canSignUp`
   - `player`, `playerName`, `position`

**Important:** All roster/schedule data is loaded from Firestore (requires authentication). The static JSON files in `functions/data/` are source files that get synced to Firestore via the `syncConfig` cloud function.

### Viewer Management

- Parents can invite viewers (grandparents, aunts, uncles) via roster.html
- Viewers stored in Firestore `viewers/{playerId}` collection
- Static viewers in `roster.json` can be "removed" via blocklist
- Removed viewer emails stored in `removedEmails` array

### Live Stats Permissions

| User | During Game Window* | After Window |
|------|---------------------|--------------|
| Coach | Can track any game | Can edit any game |
| Designated Scorekeeper | Can track their game | View only |
| Everyone else | View only | View only |

*Window = 10 min before game start → 30 min after game ends

## Live Stats System

### View Mode vs Track Mode

- **View Mode**: All players shown with large stats, no buttons, sticky scoreboard
- **Track Mode**: On-court players only, full button controls, SUB/END GAME

### URL Parameters

- `?game=5` - Auto-select and start game ID 5
- `?view=1` - Force view-only mode (for testing)

### Home Page Integration

- Shows "View Live Stats" or "Track Live Stats" button during game window
- Button links directly to game (no selection needed)
- Green button for scorekeeper/coach, blue for viewers

### Play-by-Play Event Logging

Every stat action during live tracking logs an event to `gameStats/{gameId}.events[]`:

```javascript
{
  id: "evt-{gameId}-{n}",
  timestamp: Firestore.Timestamp,
  gamePhase: "Q1" | "Q2" | "halftime" | "Q3" | "Q4" | "OT" | "final",
  type: "stat" | "timeout" | "phase",
  description: "Grant W. scores 3-pointer",
  playerId: 3,           // For player stats
  stat: "points",        // points, rebounds, assists, steals, fouls, turnovers
  value: 3,
  team: "lancers" | "opponent",
  lancersScore: 12,      // Running score at time of event
  opponentScore: 8
}
```

## Game Detail Features (game-detail.html)

### Play-by-Play Section
- Shows chronological event feed for completed games
- Groups events by quarter with headers
- Scoring events show highlight icon if matched highlight exists
- Click play button opens fullscreen video/image modal

### Highlight-Event Matching
- Highlights linked to events by comparing timestamps (within 8 seconds)
- `playHighlight(url, mediaType)` - Opens fullscreen modal for video/image playback
- Navigation to highlights.html pre-filters by current game via URL param

### Inline Highlight Upload
- "Add" button opens modal directly on game-detail page (no navigation away)
- Upload flow: Select file → Auto-match to play-by-play → Confirm or select player
- Uses same timestamp matching logic as highlights.html

## Home Page Features

- Player/Coach banner when logged in (with player switcher for multi-child families)
- Next game card with live stats button (during game window)
- RSVP reminder if attendance not submitted
- Volunteer needs for next 7 days
- **Family Volunteering card**: Shows completed/upcoming counts for entire family (both parents)
- **Team Spirit Leaderboard**: Gamification with points for volunteering (10 pts) and highlights (1 pt)
- Season record

## Playbook System

Plays are defined in `playbook.html` as JavaScript objects with:
- `positions` - Starting positions for each player (1-5)
- `steps` - Array of animation steps with movements, passes, screens, shots
- SVG rendering with smooth CSS transitions

Recent plays added: Box, Stack, Triangle, Dub (inbound plays)

## Highlights System

- Upload to Firebase Storage: `highlights/{gameId}/{filename}`
- Metadata in Firestore `highlights` collection
- Embedded in: game-detail.html, roster.html player modals
- Main page: highlights.html with game/player filters
- URL params: `?game=5`, `?player=3`, `?upload=true`

### Smart Timestamp Matching (NEW)

When uploading highlights, the app reads the file's capture timestamp and auto-matches to play-by-play events:

1. **Photos**: Reads EXIF `DateTimeOriginal` via exif-js library
2. **Videos**: Reads MP4 `creation_time` from mvhd atom (inline parser, handles Mac HFS+ epoch 1904)
3. **Matching Logic**: Finds scoring events where highlight was captured 0-8 seconds BEFORE the event timestamp
4. **Auto-populate**: If match found, game and player dropdowns are pre-selected
5. **Visual Feedback**: Red banner if no match found, green banner if match found

Key functions in `highlights.html`:
- `getCaptureTimestamp(file)` - Extracts timestamp from EXIF or MP4 metadata
- `getMp4CreationTime(file)` - Inline MP4 parser for creation_time
- `suggestMatchFromTimestamp(file)` - Searches all games' events for matches

### Highlight Fields

- Real uploads: `downloadUrl` field (Firebase Storage URL)
- Simulated: `url` field (fake example.com URLs)
- Code checks both: `highlight.downloadUrl || highlight.url`

## Navigation

### Back Button
All pages (except Home) have a back arrow (←) in the header that uses `history.back()` to return to the exact previous page. This enables natural navigation flow when drilling down through the app.

### Bottom Navigation (7 tabs)
Order on all pages: Home → Roster → Schedule → Messages → Plays → Stats → Highlights

Note: Messages and Plays hidden for viewers via `hideViewerRestrictedNav()`

## Firebase Deployment

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules,storage
```

Rules files: `firestore.rules`, `storage.rules`

## Project Structure

```
lancers/
├── css/athletic.css       # All styles
├── docs/
│   └── HIGHLIGHTS.md      # Highlights feature design doc
├── functions/
│   ├── index.js           # Cloud Functions
│   ├── package.json       # Function dependencies
│   └── data/
│       ├── roster-full.json   # Source roster data
│       └── schedule-full.json # Source schedule data
├── images/
│   └── lancers-logo.png
├── js/
│   ├── firebase-config.js # Firebase + auth helpers + role checks
│   ├── app.js             # Shared utilities (included in most HTML)
│   └── theme.js           # Theme toggle
├── *.html                 # All pages
├── firestore.rules        # Firestore security
├── storage.rules          # Storage security
├── firebase.json          # Firebase config
└── README.md              # Project readme
```

## Push Notifications (Cloud Functions)

### Unified Notification System

All notifications use a single `sendNotification(title, body, data, options)` function:
- `options.emails` - Array of emails to send to (null = everyone)
- `options.excludeUid` - UID to exclude (for chat - don't notify sender)

Helper: `getHeadCoachEmail()` - Returns head coach email for coach-only notifications

### Notification Triggers

| Function | Trigger | Recipients | Message |
|----------|---------|------------|---------|
| `onNewMessage` | New chat message | Everyone except sender | "{sender}: {message}" |
| `onGameStarted` | gamePhase → 'Q1' | Everyone | "Game Started! Lancers vs {opponent} is now LIVE!" |
| `onGameEnded` | gamePhase → 'final' | Everyone + Head coach only | "Game Over!" + "Add Your Game Commentary" |
| `sendAttendanceReminders` | Daily 9 AM | Parents missing RSVP | Reminder for games in next 4 days |
| `sendScorekeeperReminders` | Daily 9 AM | Assigned scorekeepers | Reminder 1-2 days before game |
| `checkPendingWrapups` | Every 30 min | Head coach | "Wrap-Up Ready for Review" |
| `approveWrapup` | Manual (coach) | Everyone | "Game Wrap-Up Ready!" |

### Service Worker (firebase-messaging-sw.js)

- Handles background push messages (data-only payloads)
- Notification click opens URL via `clients.openWindow(url)`
- No caching - lets browser handle requests normally

## Post-Game Wrap-Up System

AI-generated game recaps with coach commentary, triggered after games end.

### Wrap-Up Flow

1. **Game Ends** → `onGameEnded` creates wrap-up doc with 2-hour coach window
2. **Coach Window** → Coach can add notes via game-detail.html
3. **Window Ends** → `checkPendingWrapups` (every 30 min) triggers generation
4. **Generation** → `generateWrapupReport` calls Claude API for narrative
5. **Approval** → Head coach reviews, clicks approve
6. **Published** → `approveWrapup` sends notification to everyone

### Wrap-Up Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Waiting for coach window to end |
| `generating` | AI is generating narrative |
| `pendingApproval` | Generated, waiting for coach approval |
| `complete` | Approved and published to everyone |
| `error` | Generation failed |

### Firestore: `wrapups/{gameId}`

```javascript
{
  gameId: 4,
  status: 'complete',
  opponent: 'Celtics',
  finalScore: '45-38',
  result: 'W',
  coachNotes: { commentary: '...', playerShoutouts: [...] },
  coachWindowEndsAt: Timestamp,
  report: { narrative: '...', generatedAt: Timestamp },
  approvedAt: Timestamp
}
```

### Cloud Functions

**Wrap-Up Functions:**
- `generateWrapupReport` - HTTP endpoint, calls Claude API (claude-sonnet-4-20250514)
- `checkPendingWrapups` - Scheduled every 30 min, auto-triggers pending wrap-ups
- `approveWrapup` - HTTP endpoint, marks complete and notifies everyone
- `triggerWrapupGeneration` - Manual trigger for testing
- `cleanupPendingWrapups` - HTTP endpoint (head coach only), deletes all pending/generating wrap-ups

**Config Sync:**
- `syncConfig` - HTTP endpoint, syncs `data/roster.json` and `data/schedule.json` to Firestore `config` collection

**Rate Limiting:**
- All sensitive functions use `checkRateLimit(userEmail, action, maxRequests, windowMinutes)`
- Rate limits stored in `rateLimits` collection with TTL cleanup

## Development & Testing Tools

### Season Simulation (simulate-season.html)

Requires clicking **Run Full Simulation** button. Creates:
- Volunteers for games 1-6
- Attendance for games 1-6
- Completed game stats for games 1-3 with full play-by-play events
- Simulated highlights with fake URLs (example.com) matching play-by-play timestamps

Buttons:
- **Run Full Simulation** - Clears and regenerates all simulation data
- **Delete Fake Highlights Only** - Removes highlights with example.com URLs
- **Delete Incomplete Games** - Removes gameStats docs without gamePhase='final'

## Security (Sept 2026 Update)

### Cloud Functions Authentication
All admin endpoints use Firebase Auth token verification via `verifyAdminAuth()`:
- `headCoachOnly: true` - Only head coach can access
- `coachOnly: true` - Any coach can access
- No more hardcoded API keys

### Firestore Rules
- `isCoach()` helper checks `config/coachEmails` document
- Messages require `senderUid` to match auth UID
- Highlights require `uploadedBy` to match auth UID
- FCM tokens restricted to owner only
- Emulation logs are immutable (no update/delete)

### Admin Emulation
- Admin emails stored in Firestore `config/adminEmails` (synced via `syncConfig`)
- Falls back to head coach if `adminEmails` doesn't exist
- All emulation events logged to `emulationLogs` collection

### XSS Prevention
- Global `escapeHtml()` in `js/app.js` for all dynamic content
- Player names, messages, and user content escaped before innerHTML

## Performance (Sept 2026 Update)

- **Deferred scripts**: Analytics, messaging, gamification load with `defer`
- **Skeleton loading**: Shows placeholder cards while Firebase initializes
- **Image dimensions**: Header logo has width/height to prevent CLS
- **Lazy loading**: Highlight images use `loading="lazy"`
- **Touch targets**: Profile button is 44x44px minimum
- **Touch optimization**: `touch-action: manipulation` on buttons prevents 300ms delay
- **Auth-first loading**: Index.html waits for auth before fetching Firestore data

## Accessibility (Sept 2026 Update)

- **Navigation**: `role="navigation"` and `aria-label` on bottom nav
- **Live regions**: `aria-live="polite"` on main content areas
- **Keyboard support**: Back buttons have `tabindex`, `onkeydown` handlers
- **Button labels**: Profile button has `aria-label="User menu"`
- **Skip links**: All pages have "Skip to main content" link (visible on focus)
- **Focus trapping**: Modals trap focus and restore on close (roster, highlights, game-detail)
- **Modal accessibility**: Modals have `role="dialog"`, `aria-modal="true"`, escape key closes

## Timezone Handling

- Game times use `America/Chicago` timezone
- DST handled via `Intl.DateTimeFormat` API (not hardcoded offset)
- `parseSimGameTime()` in functions/index.js converts local time to UTC correctly

## Known Issues / Future Work

None currently blocking. Potential enhancements:
- Video compression before upload
- Multi-player tagging in highlights
