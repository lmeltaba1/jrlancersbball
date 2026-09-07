# Claude Context - Jr. Lancers Basketball App

## Project Overview

This is a mobile-first web app for managing a youth basketball team (Jr. Lancers, 5th grade boys). Built with vanilla HTML/CSS/JavaScript and Firebase backend. No build step required.

## Current State (as of Sept 2024)

The app is fully functional with all core features implemented:

### Completed Features

1. **Home (index.html)** - Dashboard with next game, recent activity
2. **Roster (roster.html)** - Player cards, parent directory, player profile modals with stats and highlights
3. **Schedule (schedule.html)** - Season schedule with game cards
4. **Game Detail (game-detail.html)** - Individual game info, attendance, volunteers, highlights
5. **Chat (chat.html)** - Real-time team messaging via Firestore
6. **Playbook (playbook.html)** - Interactive play diagrams with SVG animations
7. **Highlights (highlights.html)** - Photo/video uploads tagged by player/game
8. **Attendance (attendance.html)** - RSVP tracking for games
9. **Volunteers (volunteers.html)** - Sign up for game duties
10. **Game Stats (game-stats.html)** - Live stat tracking during games
11. **Stats View (stats-view.html)** - View/edit saved game stats

### Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no React, no build)
- **Styling:** css/athletic.css (dark theme default, light mode toggle)
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Data:** Static JSON files in /data for roster and schedule

### Firebase Collections

- `attendance` - Player availability per game
- `volunteers` - Volunteer signups per game
- `gameStats` - Player statistics per game
- `highlights` - Media uploads with player/game tags
- `messages` - Chat messages

### Key Files

| File | Purpose |
|------|---------|
| `js/firebase-config.js` | Firebase init, auth helpers, `getPlayerFromRoster()` |
| `js/app.js` | Shared utilities: `loadRoster()`, `loadSchedule()`, `formatDate()` |
| `js/theme.js` | Dark/light mode toggle |
| `css/athletic.css` | All styles, CSS variables for theming |
| `data/roster.json` | Player data, parent contacts, coach info |
| `data/schedule.json` | Game schedule with dates, opponents, locations |

### Authentication Flow

1. User logs in with email/password (Firebase Auth)
2. `getPlayerFromRoster()` matches email to roster.json
3. Returns: `{ isCoach, name, player, parent, canTrackStats }`
4. Coaches have full access, parents see their child's data

### Playbook System

Plays are defined in `playbook.html` as JavaScript objects with:
- `positions` - Starting positions for each player (1-5)
- `steps` - Array of animation steps with movements, passes, screens, shots
- SVG rendering with smooth CSS transitions

Recent plays added: Box, Stack, Triangle, Dub (inbound plays)

### Highlights System

- Upload to Firebase Storage: `highlights/{gameId}/{filename}`
- Metadata in Firestore `highlights` collection
- Embedded in: game-detail.html, roster.html player modals
- Main page: highlights.html with game/player filters
- URL params: `?game=5`, `?player=3`, `?upload=true`

### Bottom Navigation (6 tabs)

Order on all pages: Home → Roster → Schedule → Chat → Plays → Highlights

### Firebase Deployment

```bash
firebase deploy --only firestore:rules,storage
```

Rules files: `firestore.rules`, `storage.rules`

## Common Tasks

### Adding a New Play

Edit `playbook.html`, add to the `plays` object following existing pattern. Each step can have:
- `movements` - Player position changes with `curve` option
- `passes` - Ball movement between players
- `screens` - Screen actions with `offset` for positioning
- `shots` - Shot attempts

### Adding a New Page

1. Create HTML file with standard structure (header, main, bottom-nav)
2. Include Firebase scripts + firebase-config.js + theme.js + app.js
3. Add nav item to ALL other HTML files to maintain consistency

### Modifying Roster/Schedule

Edit `data/roster.json` or `data/schedule.json` directly. No build needed.

## Project Structure

```
lancers/
├── css/athletic.css       # All styles
├── data/
│   ├── roster.json        # Players, parents, coaches
│   └── schedule.json      # Games
├── docs/
│   └── HIGHLIGHTS.md      # Highlights feature design doc
├── images/
│   └── lancers-logo.png
├── js/
│   ├── firebase-config.js # Firebase + auth helpers
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
