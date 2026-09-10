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

// ========== PAGE TRANSITIONS ==========
// Smooth page exit animation before navigation

function navigateWithTransition(url) {
  // Use View Transitions API if available
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      window.location.href = url;
    });
    return;
  }

  // Fallback: CSS animation
  const main = document.querySelector('.main-content');
  if (main) {
    main.classList.add('page-exit');
    setTimeout(() => {
      window.location.href = url;
    }, 200);
  } else {
    window.location.href = url;
  }
}

// Intercept navigation links for smooth transitions
document.addEventListener('DOMContentLoaded', function() {
  // Add transition to internal links (same-origin)
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip external links, anchors, javascript:, mailto:, tel:
    if (href.startsWith('http') || href.startsWith('#') ||
        href.startsWith('javascript:') || href.startsWith('mailto:') ||
        href.startsWith('tel:') || href.startsWith('sms:')) {
      return;
    }

    // Skip links that open in new tab
    if (link.target === '_blank') return;

    // Skip links with download attribute
    if (link.hasAttribute('download')) return;

    e.preventDefault();
    navigateWithTransition(href);
  });
});

// ========== PULL TO REFRESH ==========
// Usage: initPullToRefresh(refreshCallback)

let ptrEnabled = false;
let ptrStartY = 0;
let ptrCurrentY = 0;
let ptrRefreshing = false;

// ========== SWIPE GESTURES ==========
// Swipe right from edge to go back

let swipeEnabled = false;

function initSwipeNavigation() {
  if (swipeEnabled) return;
  swipeEnabled = true;

  let startX = 0;
  let startY = 0;
  let isEdgeSwipe = false;
  const edgeThreshold = 30; // px from left edge
  const swipeThreshold = 100; // px to trigger back

  // Create swipe indicator
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%) translateX(-100%);
    width: 40px;
    height: 80px;
    background: linear-gradient(90deg, var(--gold), transparent);
    border-radius: 0 40px 40px 0;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    z-index: 9999;
    pointer-events: none;
  `;
  document.body.appendChild(indicator);

  document.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    isEdgeSwipe = startX <= edgeThreshold;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isEdgeSwipe) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - startX;
    const diffY = Math.abs(touch.clientY - startY);

    // Only horizontal swipe
    if (diffY > 50) {
      isEdgeSwipe = false;
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-50%) translateX(-100%)';
      return;
    }

    if (diffX > 20) {
      const progress = Math.min(diffX / swipeThreshold, 1);
      indicator.style.opacity = String(progress * 0.8);
      indicator.style.transform = `translateY(-50%) translateX(${diffX - 40}px)`;
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!isEdgeSwipe) return;

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - startX;

    if (diffX >= swipeThreshold) {
      history.back();
    }

    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(-50%) translateX(-100%)';
    isEdgeSwipe = false;
  });
}

// Auto-init swipe navigation
document.addEventListener('DOMContentLoaded', initSwipeNavigation);

function initPullToRefresh(onRefresh) {
  if (ptrEnabled) return;
  ptrEnabled = true;

  // Create PTR element
  const ptr = document.createElement('div');
  ptr.className = 'ptr-container';
  ptr.innerHTML = '<div class="ptr-spinner"></div>';
  document.body.appendChild(ptr);

  const threshold = 80;
  let pulling = false;

  document.addEventListener('touchstart', (e) => {
    if (ptrRefreshing) return;
    if (window.scrollY > 10) return;
    ptrStartY = e.touches[0].clientY;
    pulling = false;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (ptrRefreshing) return;
    if (window.scrollY > 10) return;

    ptrCurrentY = e.touches[0].clientY;
    const diff = ptrCurrentY - ptrStartY;

    if (diff > 0 && window.scrollY === 0) {
      pulling = true;
      const progress = Math.min(diff / threshold, 1);
      ptr.classList.add('pulling');
      ptr.querySelector('.ptr-spinner').style.transform = `rotate(${progress * 180}deg)`;

      if (diff > threshold) {
        ptr.style.transform = `translateY(${Math.min(diff - threshold, 30)}px)`;
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', async () => {
    if (!pulling || ptrRefreshing) {
      ptr.classList.remove('pulling');
      return;
    }

    const diff = ptrCurrentY - ptrStartY;
    if (diff >= threshold) {
      ptrRefreshing = true;
      ptr.classList.add('refreshing');

      try {
        await onRefresh();
      } catch (e) {
        console.error('Refresh error:', e);
      }

      ptrRefreshing = false;
      ptr.classList.remove('refreshing');
    }

    ptr.classList.remove('pulling');
    ptr.style.transform = '';
    ptrStartY = 0;
    ptrCurrentY = 0;
  });
}

// ========== LIVE SCORE TICKER ==========
// Shows animated score updates during live games

let tickerElement = null;
let tickerLancersScore = 0;
let tickerOpponentScore = 0;

function showScoreTicker(opponent, lancersScore, opponentScore, quarter) {
  if (!tickerElement) {
    tickerElement = document.createElement('div');
    tickerElement.className = 'score-ticker';
    tickerElement.innerHTML = `
      <span class="score-ticker-live">LIVE</span>
      <div class="score-ticker-teams">
        <span class="score-ticker-team lancers">Lancers</span>
        <span class="score-ticker-score" id="ticker-lancers">0</span>
        <span style="color: var(--text-muted);">-</span>
        <span class="score-ticker-score" id="ticker-opponent">0</span>
        <span class="score-ticker-team" id="ticker-opponent-name">OPP</span>
      </div>
      <span class="score-ticker-quarter" id="ticker-quarter">Q1</span>
      <button class="score-ticker-close" onclick="hideScoreTicker()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    document.body.appendChild(tickerElement);
  }

  document.getElementById('ticker-opponent-name').textContent = opponent;
  document.getElementById('ticker-quarter').textContent = quarter;

  // Animate score changes
  updateTickerScore('ticker-lancers', lancersScore, tickerLancersScore);
  updateTickerScore('ticker-opponent', opponentScore, tickerOpponentScore);

  tickerLancersScore = lancersScore;
  tickerOpponentScore = opponentScore;

  document.body.classList.add('has-ticker');
  requestAnimationFrame(() => {
    tickerElement.classList.add('visible');
  });
}

function updateTickerScore(elementId, newScore, oldScore) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = newScore;
  if (newScore !== oldScore) {
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 500);
  }
}

function hideScoreTicker() {
  if (tickerElement) {
    tickerElement.classList.remove('visible');
    document.body.classList.remove('has-ticker');
  }
}

// ========== MINI SPARKLINES ==========
// Creates small bar charts for showing stat trends
// Usage: createSparkline([5, 3, 8, 2, 6]) returns HTML string

function createSparkline(values, maxHeight = 16) {
  if (!values || values.length === 0) return '';

  const max = Math.max(...values, 1);

  const bars = values.map(v => {
    const height = Math.max(2, (v / max) * maxHeight);
    const isZero = v === 0;
    const isHigh = v === max && v > 0;
    const classes = ['sparkline-bar'];
    if (isZero) classes.push('zero');
    if (isHigh) classes.push('high');
    return `<div class="${classes.join(' ')}" style="height: ${height}px;"></div>`;
  }).join('');

  return `<span class="sparkline">${bars}</span>`;
}

// ========== ANIMATED LEADERBOARD ==========
// Track leaderboard changes and animate position shifts

let previousLeaderboard = [];

function animateLeaderboardChanges(newLeaderboard, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Compare with previous state
  newLeaderboard.forEach((item, newIndex) => {
    const prevIndex = previousLeaderboard.findIndex(p => p.name === item.name);
    const row = container.children[newIndex];
    if (!row) return;

    if (prevIndex !== -1 && prevIndex !== newIndex) {
      // Position changed
      if (prevIndex > newIndex) {
        // Moved up
        row.classList.add('rank-up');
        setTimeout(() => row.classList.remove('rank-up'), 1000);
      } else {
        // Moved down
        row.classList.add('rank-down');
        setTimeout(() => row.classList.remove('rank-down'), 1000);
      }
    }
  });

  previousLeaderboard = [...newLeaderboard];
}

// ========== GAME FLOW CHART ==========
// ESPN-style game flow chart showing score progression over time
// Usage: createGameTimeline(events, currentQuarter) returns HTML string

function createGameTimeline(events, currentQuarter = 'final') {
  if (!events || events.length === 0) {
    return '<div class="game-flow-chart"><p style="color: var(--text-muted); text-align: center; padding: 20px;">No play-by-play data available</p></div>';
  }

  // Get scoring events with running scores
  const scoringEvents = events.filter(e =>
    (e.stat === 'points' && e.value > 0) || e.type === 'phase'
  ).filter(e => typeof e.lancersScore === 'number' && typeof e.opponentScore === 'number');

  if (scoringEvents.length === 0) {
    return '<div class="game-flow-chart"><p style="color: var(--text-muted); text-align: center; padding: 20px;">No scoring data available</p></div>';
  }

  // Chart dimensions
  const width = 320;
  const height = 180;
  const padding = { top: 25, right: 15, bottom: 35, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get max score for Y-axis
  const maxScore = Math.max(
    ...scoringEvents.map(e => Math.max(e.lancersScore, e.opponentScore))
  );
  const yMax = Math.ceil(maxScore / 10) * 10 + 5;

  // Get final scores
  const lastEvent = scoringEvents[scoringEvents.length - 1];
  const finalLancers = lastEvent.lancersScore;
  const finalOpponent = lastEvent.opponentScore;
  const result = finalLancers > finalOpponent ? 'W' : finalLancers < finalOpponent ? 'L' : 'T';

  // Quarter positions (0-100% of chart width)
  const quarterPositions = { 'Q1': 0, 'Q2': 0.25, 'Q3': 0.5, 'Q4': 0.75, 'final': 1 };

  // Build data points - start at 0,0
  const lancersPoints = [{ x: 0, y: 0 }];
  const opponentPoints = [{ x: 0, y: 0 }];

  // Group events by quarter and track position within quarter
  const quarterCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const quarterTotals = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  // First pass: count events per quarter
  scoringEvents.forEach(e => {
    const q = e.gamePhase || 'Q1';
    if (quarterTotals[q] !== undefined) quarterTotals[q]++;
  });

  // Second pass: position events
  scoringEvents.forEach((event, idx) => {
    const quarter = event.gamePhase || 'Q1';
    const qStart = quarterPositions[quarter] || 0;
    const qEnd = quarterPositions[quarter === 'Q4' ? 'final' :
                  quarter === 'Q3' ? 'Q4' :
                  quarter === 'Q2' ? 'Q3' : 'Q2'] || 0.25;

    // Position within quarter
    quarterCounts[quarter] = (quarterCounts[quarter] || 0) + 1;
    const posInQuarter = quarterTotals[quarter] > 0
      ? quarterCounts[quarter] / (quarterTotals[quarter] + 1)
      : 0.5;

    const x = qStart + (qEnd - qStart) * posInQuarter;

    lancersPoints.push({ x, y: event.lancersScore });
    opponentPoints.push({ x, y: event.opponentScore });
  });

  // Convert to SVG coordinates
  function toSvgX(x) { return padding.left + x * chartWidth; }
  function toSvgY(y) { return padding.top + chartHeight - (y / yMax) * chartHeight; }

  // Create path strings
  function createPath(points) {
    if (points.length === 0) return '';
    let d = `M ${toSvgX(points[0].x)} ${toSvgY(points[0].y)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${toSvgX(points[i].x)} ${toSvgY(points[i].y)}`;
    }
    return d;
  }

  const lancersPath = createPath(lancersPoints);
  const opponentPath = createPath(opponentPoints);

  // Y-axis labels (0, mid, max)
  const yMid = Math.round(yMax / 2);
  const yLabels = [
    { value: 0, y: toSvgY(0) },
    { value: yMid, y: toSvgY(yMid) },
    { value: yMax, y: toSvgY(yMax) }
  ];

  // Quarter markers
  const quarters = ['1st', '2nd', '3rd', '4th'];
  const qMarkers = quarters.map((label, i) => ({
    label,
    x: toSvgX((i + 0.5) * 0.25)
  }));

  return `
    <div class="game-flow-chart">
      <div class="game-flow-header">
        <span class="game-flow-score lancers">Lancers ${finalLancers}</span>
        <span class="game-flow-result ${result === 'W' ? 'win' : result === 'L' ? 'loss' : ''}">${result}</span>
        <span class="game-flow-score opponent">Opponent ${finalOpponent}</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" class="game-flow-svg">
        <!-- Grid lines -->
        <line x1="${padding.left}" y1="${toSvgY(yMid)}" x2="${width - padding.right}" y2="${toSvgY(yMid)}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>

        <!-- Y-axis -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="var(--border-color)" stroke-width="1"/>
        ${yLabels.map(l => `<text x="${padding.left - 8}" y="${l.y + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${l.value}</text>`).join('')}

        <!-- X-axis -->
        <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="var(--border-color)" stroke-width="1"/>
        ${qMarkers.map(q => `<text x="${q.x}" y="${height - padding.bottom + 18}" fill="var(--text-muted)" font-size="11" text-anchor="middle">${q.label}</text>`).join('')}

        <!-- Quarter dividers -->
        ${[0.25, 0.5, 0.75].map(x => `<line x1="${toSvgX(x)}" y1="${padding.top}" x2="${toSvgX(x)}" y2="${height - padding.bottom}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="2,2" opacity="0.3"/>`).join('')}

        <!-- Opponent line (gray dashed) -->
        <path d="${opponentPath}" fill="none" stroke="#888" stroke-width="2" stroke-dasharray="6,3" opacity="0.7"/>

        <!-- Lancers line (gold solid) -->
        <path d="${lancersPath}" fill="none" stroke="var(--lancers-gold)" stroke-width="2.5"/>

        <!-- End dots -->
        <circle cx="${toSvgX(1)}" cy="${toSvgY(finalLancers)}" r="4" fill="var(--lancers-gold)"/>
        <circle cx="${toSvgX(1)}" cy="${toSvgY(finalOpponent)}" r="4" fill="#888" stroke="var(--card-bg)" stroke-width="1"/>
      </svg>
      <div class="game-flow-legend">
        <span class="legend-item"><span class="legend-line lancers"></span>Lancers</span>
        <span class="legend-item"><span class="legend-line opponent"></span>Opponent</span>
      </div>
    </div>
  `;
}

