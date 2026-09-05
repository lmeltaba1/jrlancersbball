// Jr. Lancers Basketball - Main App JavaScript

// Data loading functions
async function loadRoster() {
  // Always fetch fresh data with cache-busting
  const response = await fetch('data/roster.json?v=' + Date.now());
  return response.json();
}

async function loadSchedule() {
  const response = await fetch('data/schedule.json?v=' + Date.now());
  return response.json();
}

// Position colors for basketball
const positionColors = {
  PG: '#FFD700',  // Gold
  SG: '#FFFFFF',  // White
  SF: '#888888',  // Gray
  PF: '#555555',  // Dark Gray
  C: '#333333'    // Charcoal
};

// Position names
const positionNames = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center'
};

// League display names
const leagueNames = {
  parkrock: 'Park Rock',
  cnr: 'CNR'
};

// Format date for display
function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  };
}

// Format time for display
function formatTime(timeString) {
  return timeString;
}

// Get next upcoming game
async function getNextGame() {
  const data = await loadSchedule();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const game of data.games) {
    const [year, month, day] = game.date.split('-').map(Number);
    const gameDate = new Date(year, month - 1, day);
    if (gameDate >= now && !game.result) {
      return game;
    }
  }
  return null;
}

// Calculate season record
async function getSeasonRecord() {
  const data = await loadSchedule();
  let wins = 0;
  let losses = 0;

  for (const game of data.games) {
    if (game.result === 'W') wins++;
    else if (game.result === 'L') losses++;
  }

  return { wins, losses };
}

// Check if user can track stats for a game
async function canTrackStats(gameId) {
  if (!auth || !auth.currentUser) return false;

  const userEmail = auth.currentUser.email.toLowerCase();

  // Check if coach
  const roster = await loadRoster();
  const isCoach = roster.coaches && roster.coaches.some(c =>
    c.email.toLowerCase() === userEmail && c.canTrackStats
  );
  if (isCoach) return true;

  // Check if designated scorekeeper for this game
  try {
    const volunteerDoc = await db.collection('volunteers').doc(gameId.toString()).get();
    if (volunteerDoc.exists) {
      const data = volunteerDoc.data();
      if (data.scorekeeper && data.scorekeeper.email.toLowerCase() === userEmail) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error checking volunteer status:', e);
  }

  return false;
}

// Initialize stat tracking for a game
function initializePlayerStats(players) {
  const stats = {};
  for (const player of players) {
    stats[player.id] = {
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      number: player.number,
      position: player.position,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      twoPointersMade: 0,
      twoPointersAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0
    };
  }
  return stats;
}

// Calculate player points from detailed stats
function calculatePoints(playerStats) {
  return (playerStats.freeThrowsMade || 0) +
         ((playerStats.twoPointersMade || 0) * 2) +
         ((playerStats.threePointersMade || 0) * 3);
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}
