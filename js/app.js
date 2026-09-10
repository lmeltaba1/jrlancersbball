// Jr. Lancers Basketball - Main App JavaScript

// SIMULATION: Set to null for real date, or a date string for testing
const SIMULATED_DATE = '2026-12-13';

// Get current date (uses simulated date if set, but keeps actual time)
function getCurrentDate() {
  if (SIMULATED_DATE) {
    const now = new Date();
    const simDate = new Date(SIMULATED_DATE + 'T00:00:00');
    // Use simulated date but actual current time
    simDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return simDate;
  }
  return new Date();
}

// Get Firestore timestamp (uses simulated date if set, real server time otherwise)
// Use this instead of firebase.firestore.FieldValue.serverTimestamp()
function getFirestoreTimestamp() {
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    if (SIMULATED_DATE) {
      return firebase.firestore.Timestamp.fromDate(getCurrentDate());
    }
    return firebase.firestore.FieldValue.serverTimestamp();
  }
  return null;
}

// Data loading functions - fetch from Firestore (requires auth)
let _cachedRoster = null;
let _cachedSchedule = null;

async function loadRoster() {
  // Return cached data if available
  if (_cachedRoster) return _cachedRoster;

  // Load from Firestore (requires authentication)
  if (typeof db !== 'undefined' && db) {
    try {
      const doc = await db.collection('config').doc('roster').get();
      if (doc.exists) {
        _cachedRoster = doc.data();
        return _cachedRoster;
      }
    } catch (e) {
      console.error('Error loading roster from Firestore:', e);
    }
  }

  // Return empty structure if not authenticated
  return { team: {}, coaches: [], players: [] };
}

async function loadSchedule() {
  // Return cached data if available
  if (_cachedSchedule) return _cachedSchedule;

  // Load from Firestore (requires authentication)
  if (typeof db !== 'undefined' && db) {
    try {
      const doc = await db.collection('config').doc('schedule').get();
      if (doc.exists) {
        _cachedSchedule = doc.data();
        return _cachedSchedule;
      }
    } catch (e) {
      console.error('Error loading schedule from Firestore:', e);
    }
  }

  // Return empty structure if not authenticated
  return { season: '', games: [], events: [] };
}

// Clear cached data (call on logout)
function clearDataCache() {
  _cachedRoster = null;
  _cachedSchedule = null;
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
  const now = getCurrentDate();
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

// Get next upcoming event (practice, game, or event)
async function getNextEvent() {
  const data = await loadSchedule();
  const now = getCurrentDate();
  now.setHours(0, 0, 0, 0);

  // Combine games and events into a single array
  const allEvents = [];

  // Add games
  for (const game of data.games) {
    if (!game.result) {
      allEvents.push({
        ...game,
        eventType: 'game'
      });
    }
  }

  // Add events (practices and other events)
  if (data.events) {
    for (const event of data.events) {
      allEvents.push({
        ...event,
        eventType: event.type // 'practice' or 'event'
      });
    }
  }

  // Sort by date and time
  allEvents.sort((a, b) => {
    const dateA = new Date(a.date + 'T' + convertTo24Hour(a.time));
    const dateB = new Date(b.date + 'T' + convertTo24Hour(b.time));
    return dateA - dateB;
  });

  // Find the next upcoming event
  for (const event of allEvents) {
    const [year, month, day] = event.date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);
    if (eventDate >= now) {
      return event;
    }
  }

  return null;
}

// Convert time like "9:00 AM" to "09:00" for date parsing
function convertTo24Hour(timeStr) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Format jersey label for display
function formatJerseyLabel(jersey) {
  if (!jersey) return '';
  switch (jersey) {
    case 'parkrock': return 'PARK ROCK JERSEY';
    case 'home': return 'HOME JERSEY';
    case 'away': return 'AWAY JERSEY';
    default: return jersey.toUpperCase() + ' JERSEY';
  }
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

// Escape HTML to prevent XSS attacks
// Use this function when inserting dynamic content (player names, messages, etc.) into innerHTML
function escapeHtml(text) {
  if (text == null) return '';
  const str = String(text);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== TOAST NOTIFICATIONS ==========
// Usage: showToast('Message sent!', 'success')
// Types: 'success', 'error', 'info', 'warning'

function showToast(message, type = 'info', duration = 3000) {
  // Create container if it doesn't exist
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Icon SVGs
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);

  return toast;
}

// ========== CONFETTI CELEBRATION ==========
// Usage: launchConfetti() - call when showing a win

function launchConfetti(count = 50) {
  // Create container if it doesn't exist
  let container = document.querySelector('.confetti-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
  }

  const colors = ['gold', 'white', 'black'];
  const shapes = ['circle', 'square', 'ribbon'];

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    confetti.className = `confetti ${color} ${shape}`;
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.animationDuration = (2 + Math.random() * 2) + 's';

    container.appendChild(confetti);

    // Remove after animation
    setTimeout(() => confetti.remove(), 4000);
  }

  // Clean up container after all confetti is done
  setTimeout(() => {
    if (container && container.children.length === 0) {
      container.remove();
    }
  }, 5000);
}

// ========== ANIMATED COUNTERS ==========
// Usage: animateCounter(element, fromValue, toValue, duration)

function animateCounter(element, from, to, duration = 500) {
  const startTime = performance.now();
  const diff = to - from;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(from + diff * easeOut);

    element.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Add pop animation at the end
      element.classList.add('counting');
      setTimeout(() => element.classList.remove('counting'), 400);
    }
  }

  requestAnimationFrame(update);
}

// Animate a stat value with glow effect
function flashStatValue(element) {
  element.classList.add('updated');
  setTimeout(() => element.classList.remove('updated'), 500);
}

// ========== BOTTOM SHEET ==========
// Usage: openBottomSheet({ title: 'Title', content: '<html>', size: 'medium' })
// Sizes: 'small', 'medium', 'large', 'full'

let currentBottomSheet = null;

function openBottomSheet(options = {}) {
  const { title = '', content = '', size = 'medium', onClose = null } = options;

  // Close existing sheet if any
  closeBottomSheet();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'bottom-sheet-overlay';
  overlay.innerHTML = `
    <div class="bottom-sheet ${size}">
      <div class="bottom-sheet-handle"></div>
      <div class="bottom-sheet-header">
        <div class="bottom-sheet-title">${escapeHtml(title)}</div>
        <button class="bottom-sheet-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="bottom-sheet-body">${content}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Store reference and callback
  currentBottomSheet = { overlay, onClose };

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  // Close handlers
  overlay.querySelector('.bottom-sheet-close').addEventListener('click', closeBottomSheet);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBottomSheet();
  });

  // Close on escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') closeBottomSheet();
  };
  document.addEventListener('keydown', escHandler);
  currentBottomSheet.escHandler = escHandler;

  // Swipe down to close
  let startY = 0;
  let currentY = 0;
  const sheet = overlay.querySelector('.bottom-sheet');

  sheet.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      sheet.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  sheet.addEventListener('touchend', () => {
    const diff = currentY - startY;
    if (diff > 100) {
      closeBottomSheet();
    } else {
      sheet.style.transform = '';
    }
    startY = 0;
    currentY = 0;
  });

  return overlay;
}

function closeBottomSheet() {
  if (!currentBottomSheet) return;

  const { overlay, onClose, escHandler } = currentBottomSheet;

  overlay.classList.remove('active');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', escHandler);

  setTimeout(() => {
    overlay.remove();
    if (onClose) onClose();
  }, 400);

  currentBottomSheet = null;
}

// Get bottom sheet body element (for updating content)
function getBottomSheetBody() {
  if (!currentBottomSheet) return null;
  return currentBottomSheet.overlay.querySelector('.bottom-sheet-body');
}

