// Jr. Lancers Basketball - Firebase Configuration

// Admin emails cache (loaded from Firestore)
var _cachedAdminEmails = null;

// Load admin emails from Firestore
async function loadAdminEmails() {
  if (_cachedAdminEmails !== null) return _cachedAdminEmails;
  if (typeof db === 'undefined' || !db) return {};
  try {
    // Try to load adminEmails document
    const doc = await db.collection('config').doc('adminEmails').get();
    if (doc.exists) {
      _cachedAdminEmails = doc.data();
      return _cachedAdminEmails;
    }
    // Fallback: if adminEmails doesn't exist, use head coach as admin
    const headCoachDoc = await db.collection('config').doc('headCoach').get();
    if (headCoachDoc.exists && headCoachDoc.data().email) {
      _cachedAdminEmails = { [headCoachDoc.data().email.toLowerCase()]: true };
      return _cachedAdminEmails;
    }
  } catch (e) {
    console.error('Error loading admin emails:', e);
  }
  return {};
}

// Check if email is an admin (async version for initial check)
async function isAdminAsync(email) {
  if (!email) return false;
  const adminEmails = await loadAdminEmails();
  return email.toLowerCase() in adminEmails;
}

// Emulation helpers - sync version uses cached data
function isAdmin(email) {
  if (!email) return false;
  // Use cached admin emails if available, otherwise return false
  // The async version should be used during initialization
  if (_cachedAdminEmails === null) return false;
  return email.toLowerCase() in _cachedAdminEmails;
}

function getEmulatedEmail() {
  try {
    return sessionStorage.getItem('emulatedEmail');
  } catch (e) {
    return null;
  }
}

function setEmulatedEmail(email) {
  try {
    sessionStorage.setItem('emulatedEmail', email);
    // Log emulation to Firestore for audit trail
    logEmulationEvent('start', email);
  } catch (e) {
    console.error('Could not save emulation state:', e);
  }
}

function clearEmulation() {
  try {
    const wasEmulating = sessionStorage.getItem('emulatedEmail');
    sessionStorage.removeItem('emulatedEmail');
    // Log emulation end to Firestore for audit trail
    if (wasEmulating) {
      logEmulationEvent('stop', wasEmulating);
    }
  } catch (e) {}
}

// Log emulation events to Firestore for security audit
async function logEmulationEvent(action, targetEmail) {
  if (typeof db === 'undefined' || !db || typeof auth === 'undefined' || !auth || !auth.currentUser) return;
  try {
    await db.collection('emulationLogs').add({
      adminEmail: auth.currentUser.email,
      adminUid: auth.currentUser.uid,
      targetEmail: targetEmail,
      action: action, // 'start' or 'stop'
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent,
      page: window.location.pathname
    });
  } catch (e) {
    console.error('Could not log emulation event:', e);
  }
}

function getEffectiveEmail(realEmail) {
  if (!isAdmin(realEmail)) return realEmail;
  const emulated = getEmulatedEmail();
  return emulated || realEmail;
}

var firebaseConfig = {
  apiKey: "AIzaSyCZDonC8aqbg5OvtM-cHdA5LTJleZn8nwk",
  authDomain: "lancers-bball.firebaseapp.com",
  projectId: "lancers-bball",
  storageBucket: "lancers-bball.firebasestorage.app",
  messagingSenderId: "840563401504",
  appId: "1:840563401504:web:fab87697f7129e98976d45",
  measurementId: "G-10SZ72SKMM"
};

var app = null;
var auth = null;
var db = null;
var storage = null;

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  try {
    app = firebase.initializeApp(firebaseConfig);
    if (typeof firebase.auth === 'function') {
      auth = firebase.auth();
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    }
    if (typeof firebase.firestore === 'function') {
      db = firebase.firestore();
      // Enable offline persistence for faster loads
      db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time
          console.log('Persistence unavailable: multiple tabs open');
        } else if (err.code === 'unimplemented') {
          // Browser doesn't support persistence
          console.log('Persistence unavailable: browser not supported');
        }
      });
    }
    if (typeof firebase.storage === 'function') {
      storage = firebase.storage();
    }
    try {
      if (typeof firebase.analytics === 'function') {
        firebase.analytics();
      }
    } catch (e) {}
  } catch (e) {
    console.error('Firebase init error:', e);
  }
}

// Register main service worker for offline caching
if ('serviceWorker' in navigator) {
  // Register sw.js for caching (separate from firebase-messaging-sw.js)
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW: Registered with scope', registration.scope);

      // Check for updates periodically (every hour)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Listen for new service worker waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - show update prompt
              console.log('SW: New version available');
              // Optionally show a toast: showToast('App update available. Refresh to update.', 'info', 10000);
            }
          });
        }
      });
    })
    .catch(err => {
      console.log('SW: Registration failed:', err.message);
    });

  // Listen for navigation messages from service worker (notification clicks)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NAVIGATE') {
      window.location.href = event.data.url;
    }
  });
}

// Helper to load roster data from Firestore
async function loadRosterData() {
  if (!db) {
    console.error('loadRosterData: db is undefined');
    return null;
  }
  try {
    const doc = await db.collection('config').doc('roster').get();
    if (doc.exists) {
      return doc.data();
    } else {
      console.error('loadRosterData: roster document does not exist');
    }
  } catch (e) {
    console.error('Error loading roster from Firestore:', e);
  }
  return null;
}

// Helper to get player info from roster
async function getPlayerFromRoster(email) {
  if (!email) return null;

  try {
    // Load admin emails first to ensure isAdmin() works correctly
    await loadAdminEmails();

    const data = await loadRosterData();
    if (!data) {
      console.error('Failed to load roster data');
      // Return a basic coach object to prevent lockout on errors
      return { isCoach: true, isParent: false, isViewer: false, name: email, canChat: true, canViewPlaybook: true, canSignUp: true };
    }
    const emailLower = email.toLowerCase();

    // Check if coach
    let isCoach = false;
    let coachInfo = null;
    if (data.coaches) {
      for (const coach of data.coaches) {
        if (coach.email.toLowerCase() === emailLower) {
          isCoach = true;
          coachInfo = coach;
          break;
        }
      }
    }

    // Check players - find ALL players for this parent
    const parentPlayers = [];
    let parentInfo = null;
    for (const player of data.players) {
      if (player.parents) {
        for (const parent of player.parents) {
          if (parent.email.toLowerCase() === emailLower) {
            parentPlayers.push({ player, parent });
            if (!parentInfo) parentInfo = parent;
          }
        }
      }
    }

    if (parentPlayers.length > 0) {
      // Sort by ID descending so higher IDs come first (Ashton=5 before Raequan=1)
      parentPlayers.sort((a, b) => b.player.id - a.player.id);

      // Check localStorage for selected player preference
      let selectedIndex = 0;
      try {
        const savedPlayerId = localStorage.getItem('selectedPlayerId');
        if (savedPlayerId) {
          const idx = parentPlayers.findIndex(p => p.player.id === parseInt(savedPlayerId));
          if (idx >= 0) selectedIndex = idx;
        }
      } catch (e) { /* localStorage not available */ }

      const selected = parentPlayers[selectedIndex];
      const allPlayers = parentPlayers.map(p => ({
        id: p.player.id,
        firstName: p.player.firstName,
        lastName: p.player.lastName,
        number: p.player.number
      }));

      return {
        isCoach: isCoach,
        isViewer: false,
        isParent: true,
        name: isCoach ? coachInfo.name : selected.parent.name,
        player: selected.player,
        parent: selected.parent,
        playerName: selected.player.firstName + ' ' + selected.player.lastName,
        position: selected.player.position,
        positionName: selected.player.positionName,
        canTrackStats: selected.parent.canTrackStats || isCoach,
        canChat: true,
        canViewPlaybook: true,
        canSignUp: true,
        allPlayers: allPlayers.length > 1 ? allPlayers : null
      };
    }

    // Check players - viewers (from roster.json)
    for (const player of data.players) {
      if (player.viewers) {
        for (const viewer of player.viewers) {
          if (viewer.email.toLowerCase() === emailLower) {
            return {
              isCoach: false,
              isViewer: true,
              isParent: false,
              name: viewer.name,
              player: player,
              viewer: viewer,
              playerName: player.firstName + ' ' + player.lastName,
              position: player.position,
              positionName: player.positionName,
              relationship: viewer.relationship || 'Viewer',
              canTrackStats: false,
              canChat: false,
              canViewPlaybook: false,
              canSignUp: false
            };
          }
        }
      }
    }

    // Check Firestore viewers (invited by parents) and blocklist
    if (db) {
      try {
        const viewersSnapshot = await db.collection('viewers').get();

        // First, check if this email is blocklisted for any player
        for (const doc of viewersSnapshot.docs) {
          const removedEmails = doc.data().removedEmails || [];
          if (removedEmails.includes(emailLower)) {
            // This email was removed - check if it was a roster.json viewer
            const playerId = parseInt(doc.id);
            const player = data.players.find(p => p.id === playerId);
            if (player && player.viewers) {
              const wasRosterViewer = player.viewers.some(v => v.email.toLowerCase() === emailLower);
              if (wasRosterViewer) {
                // Was a roster viewer but was removed - deny access
                return null;
              }
            }
          }
        }

        // Then check for active Firestore viewers
        for (const doc of viewersSnapshot.docs) {
          const playerId = parseInt(doc.id);
          const player = data.players.find(p => p.id === playerId);
          const viewers = doc.data().viewers || [];
          for (const viewer of viewers) {
            if (viewer.email.toLowerCase() === emailLower && player) {
              return {
                isCoach: false,
                isViewer: true,
                isParent: false,
                name: viewer.name,
                player: player,
                viewer: viewer,
                playerName: player.firstName + ' ' + player.lastName,
                position: player.position,
                positionName: player.positionName,
                relationship: viewer.relationship || 'Viewer',
                canTrackStats: false,
                canChat: false,
                canViewPlaybook: false,
                canSignUp: false
              };
            }
          }
        }
      } catch (e) {
        console.log('Could not check Firestore viewers:', e);
      }
    }

    // Coach but not a parent
    if (isCoach) {
      return {
        isCoach: true,
        isViewer: false,
        isParent: false,
        name: coachInfo.name,
        position: null,
        canTrackStats: coachInfo.canTrackStats,
        canChat: true,
        canViewPlaybook: true,
        canSignUp: true
      };
    }

    return null;
  } catch (e) {
    console.error('Error loading roster:', e);
    // Return a basic object to prevent lockout on errors
    return { isCoach: true, isParent: false, isViewer: false, name: email, canChat: true, canViewPlaybook: true, canSignUp: true };
  }
}

// Global user info - set by requireAuth
var currentUserInfo = null;

// Require authentication - call on page load for protected pages
// Options: { requireParent: true } to block viewers
// Options: { timeout: 10000 } to set custom timeout (default 10s)
// Returns promise that resolves with user info or redirects to login
function requireAuth(options = {}) {
  const timeoutMs = options.timeout || 10000;

  return new Promise((resolve, reject) => {
    if (!auth) {
      window.location.href = 'login.html';
      reject('No auth');
      return;
    }

    // Timeout protection - prevents infinite hang on slow networks
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('Auth timeout after ' + timeoutMs + 'ms');
        reject(new Error('Auth timeout - please check your connection and reload'));
      }
    }, timeoutMs);

    auth.onAuthStateChanged(async function(user) {
      if (resolved) return; // Already timed out

      if (!user) {
        resolved = true;
        clearTimeout(timeoutId);
        window.location.href = 'login.html';
        reject('Not authenticated');
        return;
      }

      try {
        // Load admin emails first so isAdmin() works for emulation check
        await loadAdminEmails();

        // Check for emulation (admin only)
        const effectiveEmail = getEffectiveEmail(user.email);
        const isEmulating = effectiveEmail !== user.email;

        // Check if user is in roster (use effective email for emulation)
        const userInfo = await getPlayerFromRoster(effectiveEmail);
        if (!userInfo) {
          // User not in roster - sign them out and redirect
          resolved = true;
          clearTimeout(timeoutId);
          await auth.signOut();
          if (typeof showToast === 'function') {
            showToast('Your account is not authorized for this app. Please contact Coach Logan.', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
          } else {
            alert('Your account is not authorized for this app. Please contact Coach Logan.');
            window.location.href = 'login.html';
          }
          reject('Not in roster');
          return;
        }

        // Check if page requires parent/coach (not viewer)
        if (options.requireParent && userInfo.isViewer) {
          resolved = true;
          clearTimeout(timeoutId);
          window.location.href = 'index.html';
          reject('Viewer not allowed');
          return;
        }

        // Add emulation info
        userInfo.isEmulating = isEmulating;
        userInfo.emulatedEmail = isEmulating ? effectiveEmail : null;
        userInfo.realEmail = user.email;
        userInfo.isRealAdmin = isAdmin(user.email);

        // Store user info globally
        currentUserInfo = userInfo;
        resolved = true;
        clearTimeout(timeoutId);
        resolve(userInfo);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.error('Auth error:', error);
          reject(error);
        }
      }
    });
  });
}

// Hide nav items that viewers can't access (chat, playbook)
function hideViewerRestrictedNav() {
  // Hide Chat and Plays nav items for viewers
  document.querySelectorAll('.nav-item').forEach(item => {
    const text = item.textContent.trim().toLowerCase();
    if (text.includes('chat') || text.includes('plays')) {
      item.style.display = 'none';
    }
  });
}

// Helper to check if email is in roster (for registration validation)
// Checks both Firestore roster and Firestore viewers collection
async function isEmailInRoster(email) {
  try {
    const data = await loadRosterData();
    if (!data) return false;
    const emailLower = email.toLowerCase();

    // Check coaches
    if (data.coaches) {
      for (const coach of data.coaches) {
        if (coach.email.toLowerCase() === emailLower) {
          return true;
        }
      }
    }

    // Check players - parents first (parents can't be blocklisted)
    for (const player of data.players) {
      if (player.parents) {
        for (const parent of player.parents) {
          if (parent.email.toLowerCase() === emailLower) {
            return true;
          }
        }
      }
    }

    // Check Firestore for blocklist and dynamic viewers
    if (db) {
      try {
        const viewersSnapshot = await db.collection('viewers').get();

        // First, check if email is blocklisted for any player's roster.json viewers
        for (const doc of viewersSnapshot.docs) {
          const removedEmails = doc.data().removedEmails || [];
          if (removedEmails.includes(emailLower)) {
            const playerId = parseInt(doc.id);
            const player = data.players.find(p => p.id === playerId);
            if (player && player.viewers) {
              const wasRosterViewer = player.viewers.some(v => v.email.toLowerCase() === emailLower);
              if (wasRosterViewer) {
                // Was a roster viewer but was removed - don't allow registration
                return false;
              }
            }
          }
        }

        // Check dynamic Firestore viewers
        for (const doc of viewersSnapshot.docs) {
          const viewers = doc.data().viewers || [];
          for (const viewer of viewers) {
            if (viewer.email.toLowerCase() === emailLower) {
              return true;
            }
          }
        }
      } catch (e) {
        console.log('Could not check Firestore viewers:', e);
      }
    }

    // Check roster.json viewers (not blocklisted at this point)
    for (const player of data.players) {
      if (player.viewers) {
        for (const viewer of player.viewers) {
          if (viewer.email.toLowerCase() === emailLower) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (e) {
    console.error('Error checking roster:', e);
    return false;
  }
}

// Get all users from roster for emulation (admin only)
async function getAllRosterUsers() {
  try {
    const data = await loadRosterData();
    if (!data) return [];
    const users = [];

    // Add coaches
    if (data.coaches) {
      for (const coach of data.coaches) {
        users.push({
          email: coach.email,
          name: coach.name,
          role: 'Coach',
          player: null
        });
      }
    }

    // Add parents
    if (data.players) {
      for (const player of data.players) {
        if (player.parents) {
          for (const parent of player.parents) {
            // Check if already added (might be parent of multiple players)
            const existing = users.find(u => u.email.toLowerCase() === parent.email.toLowerCase());
            if (!existing) {
              users.push({
                email: parent.email,
                name: parent.name,
                role: 'Parent',
                player: `#${player.number} ${player.firstName}`
              });
            }
          }
        }
      }

      // Add viewers from roster
      for (const player of data.players) {
        if (player.viewers) {
          for (const viewer of player.viewers) {
            const existing = users.find(u => u.email.toLowerCase() === viewer.email.toLowerCase());
            if (!existing) {
              users.push({
                email: viewer.email,
                name: viewer.name,
                role: 'Viewer',
                player: `#${player.number} ${player.firstName}`
              });
            }
          }
        }
      }
    }

    // Sort by name
    users.sort((a, b) => a.name.localeCompare(b.name));
    return users;
  } catch (e) {
    console.error('Error loading roster users:', e);
    return [];
  }
}
