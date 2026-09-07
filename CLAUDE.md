# Claude Context - Jr. Lancers Basketball App

## Project Overview

This is a mobile-first web app for managing a youth basketball team (Jr. Lancers, 5th grade boys). Built with vanilla HTML/CSS/JavaScript and Firebase backend. No build step required.

## Current State (as of Sept 2024)

The app is fully functional with all core features implemented:

### Completed Features

1. **Home (index.html)** - Dashboard with next game, volunteer stats, live stats button
2. **Roster (roster.html)** - Player cards, parent directory, player profile modals with stats and highlights, viewer management
3. **Schedule (schedule.html)** - Season schedule with game cards
4. **Game Detail (game-detail.html)** - Individual game info, attendance, volunteers, highlights
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

## Bottom Navigation (7 tabs)

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

## Known Issues / Future Work

None currently blocking. Potential enhancements:
- Push notifications for chat
- Video compression before upload
- Multi-player tagging in highlights
- Season stats aggregation page
