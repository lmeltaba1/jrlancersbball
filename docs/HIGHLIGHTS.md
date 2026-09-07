# Highlights Feature - Design Document

## Overview

The highlights feature allows parents to upload photos and videos from games, tag players, and view aggregated highlights on player profiles and game detail pages.

## User Stories

1. As a parent, I can upload a video of my child making a great play
2. As a parent, I can tag which player is featured in the highlight
3. As a parent, I can view all highlights for a specific game
4. As a parent, I can view all highlights featuring my child
5. As a coach, I can delete inappropriate highlights

## Architecture

### Firebase Storage

Media files are stored in Firebase Storage under:
```
highlights/{gameId}/{filename}
```

### Firestore Collection: `highlights`

```javascript
{
  id: "auto-generated",
  gameId: 5,                    // Which game
  playerId: 3,                  // Tagged player
  uploadedBy: "uid-123",        // Who uploaded
  uploaderName: "John Smith",   // Display name
  mediaType: "video",           // "video" or "photo"
  storagePath: "highlights/game-5/abc123.mp4",
  downloadUrl: "https://...",
  caption: "Great steal!",      // Optional
  timestamp: Timestamp
}
```

### Security Rules

**Storage (storage.rules):**
- Authenticated users can upload images/videos up to 100MB
- Anyone can read (view) highlights

**Firestore (firestore.rules):**
- Anyone can read highlights
- Authenticated users can create highlights
- Only the uploader can update/delete their highlights

## UI Components

### 1. Main Highlights Page (highlights.html)

- Header with upload button
- Filter dropdowns: Game, Player
- Grid of highlight cards
- Each card shows: thumbnail, player name, game, caption, uploader
- Click to view in lightbox

### 2. Upload Modal

- File picker (camera roll integration on mobile)
- Game selector dropdown
- Player selector dropdown
- Caption text field (optional)
- Upload progress bar
- Submit button

### 3. Embedded Highlights (game-detail.html)

- Highlights section showing up to 4 thumbnails for that game
- "View All" link to highlights.html?game={id}
- "+ Add" button to upload with game pre-selected

### 4. Player Profile Highlights (roster.html modal)

- Highlights card showing up to 6 thumbnails for that player
- "View All Highlights" link to highlights.html?player={id}

### 5. Lightbox Viewer

- Full-screen overlay
- Video with controls or full-size image
- Caption displayed below
- Close button

## URL Parameters

- `?game=5` - Filter to specific game
- `?player=3` - Filter to specific player
- `?upload=true` - Auto-open upload modal

## Cost Estimate

Based on 10 players, 15 games/season, ~5 highlights per game:

| Item | Monthly Cost |
|------|-------------|
| Storage (~1.6GB) | $0.04 |
| Bandwidth (~23GB) | $2.82 |
| Firestore | $0.00 (free tier) |
| **Total** | **~$3/month** |

## Implementation Files

| File | Changes |
|------|---------|
| `js/firebase-config.js` | Added Storage initialization |
| `storage.rules` | New file - Storage security rules |
| `firestore.rules` | Added highlights collection rules |
| `highlights.html` | New file - Main highlights page |
| `game-detail.html` | Added embedded highlights section |
| `roster.html` | Added highlights to player modal |
| All HTML files | Added Highlights to bottom nav |

## Future Enhancements

1. **Multi-player tagging** - Tag multiple players in one highlight
2. **Thumbnail generation** - Cloud Function to extract video frame
3. **Video compression** - Client-side compression before upload
4. **Moderation** - Approval workflow before highlights are visible
5. **Reactions** - Like/heart highlights
