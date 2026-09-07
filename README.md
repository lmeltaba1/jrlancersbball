# Jr. Lancers Basketball App

A mobile-first web application for managing a youth basketball team. Built with vanilla JavaScript and Firebase.

## Features

- **Home** - Dashboard with upcoming games, recent activity, and quick actions
- **Roster** - Player and parent directory with contact info and player stats
- **Schedule** - Season schedule with game details and results
- **Chat** - Team messaging with real-time updates
- **Playbook** - Interactive play diagrams with animations
- **Highlights** - Photo/video uploads from games, tagged by player
- **Attendance** - Track player availability for games
- **Volunteers** - Sign up for game day duties (snacks, scorekeeper, etc.)
- **Game Stats** - Live stat tracking during games

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript (no build step)
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Hosting:** Firebase Hosting or any static host
- **PWA:** Service worker for offline support

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Enable Storage
5. Update `js/firebase-config.js` with your project credentials

### Deploy Rules

```bash
firebase deploy --only firestore:rules,storage
```

## Project Structure

```
lancers/
├── css/
│   └── athletic.css        # Main stylesheet
├── data/
│   ├── roster.json         # Player/parent data
│   └── schedule.json       # Game schedule
├── images/
│   └── lancers-logo.png    # Team logo
├── js/
│   ├── firebase-config.js  # Firebase initialization
│   ├── app.js              # Shared utilities
│   └── theme.js            # Dark/light mode
├── index.html              # Home page
├── roster.html             # Roster & player profiles
├── schedule.html           # Season schedule
├── game-detail.html        # Individual game details
├── chat.html               # Team chat
├── playbook.html           # Play diagrams
├── highlights.html         # Photo/video highlights
├── attendance.html         # Game attendance
├── volunteers.html         # Volunteer signups
├── game-stats.html         # Live stat tracking
├── stats-view.html         # Stats viewer
├── login.html              # Authentication
├── register.html           # User registration
├── firestore.rules         # Firestore security rules
├── storage.rules           # Storage security rules
└── firebase.json           # Firebase config
```

## Firestore Collections

- `attendance` - Player availability per game
- `volunteers` - Volunteer signups per game
- `gameStats` - Player statistics per game
- `highlights` - Media uploads with player/game tags
- `messages` - Chat messages

## Authentication

Users authenticate with email/password. The app matches authenticated emails to entries in `roster.json` to determine:
- Whether user is a coach (full access)
- Which player they are a parent of
- Whether they can track stats

## Local Development

No build step required. Serve the files with any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

## License

Private - Jr. Lancers Basketball Team
