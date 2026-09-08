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
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Data:** Static JSON files in /data for roster and schedule

### Firebase Collections

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

### Key Files

| File | Purpose |
|------|---------|
| `js/firebase-config.js` | Firebase init, auth helpers, `getPlayerFromRoster()`, `requireAuth()`, `isEmailInRoster()` |
| `js/app.js` | Shared utilities: `loadRoster()`, `loadSchedule()`, `formatDate()` |
| `js/theme.js` | Dark/light mode toggle |
| `css/athletic.css` | All styles, CSS variables for theming |
| `data/roster.json` | Player data, parent contacts, coach info, static viewers |
| `data/schedule.json` | Game schedule with dates, opponents, locations |

## Security & Roles

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Coach** | In `roster.json` coaches array | Full access, can edit stats anytime |
| **Parent** | In player's `parents` array | Full access except stat editing (unless scorekeeper) |
| **Viewer** | In player's `viewers` array or Firestore | View-only: schedule, roster, stats, highlights |

### Authentication Flow

1. User registers with email (must be pre-approved in roster.json or Firestore viewers)
2. `isEmailInRoster()` validates email before registration
3. `requireAuth()` on each page checks login and role
4. `getPlayerFromRoster()` returns user info with permissions:
   - `isCoach`, `isParent`, `isViewer`
   - `canChat`, `canViewPlaybook`, `canSignUp`
   - `player`, `playerName`, `position`

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

- Player/Coach banner when logged in
- Next game card with live stats button (during game window)
- RSVP reminder if attendance not submitted
- Volunteer needs for next 7 days
- **My Volunteering card**: Shows completed/upcoming counts by role
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
├── data/
│   ├── roster.json        # Players, parents, coaches, viewers
│   └── schedule.json      # Games
├── docs/
│   └── HIGHLIGHTS.md      # Highlights feature design doc
├── images/
│   └── lancers-logo.png
├── js/
│   ├── firebase-config.js # Firebase + auth helpers + role checks
│   ├── app.js             # Shared utilities
│   └── theme.js           # Theme toggle
├── *.html                 # All pages
├── firestore.rules        # Firestore security
├── storage.rules          # Storage security
├── firebase.json          # Firebase config
└── README.md              # Project readme
```

## Push Notifications (Cloud Functions)

| Function | Trigger | Message |
|----------|---------|---------|
| `onNewMessage` | New chat message | "{sender}: {message}" |
| `onGameStarted` | gamePhase changes to 'Q1' | "Game Started! Lancers vs {opponent} is now LIVE!" |
| `onGameEnded` | gamePhase changes to 'final' | "Game Over - {result}! Lancers {score} - {opponent} {score}. Now is the time to upload highlights!" |
| `sendAttendanceReminders` | Daily 9 AM | Reminds parents who haven't RSVP'd for games/practices in next 4 days |
| `sendAnnouncement` | Manual (coach) | Custom announcement to all users |

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

## Known Issues / Future Work

None currently blocking. Potential enhancements:
- Video compression before upload
- Multi-player tagging in highlights
