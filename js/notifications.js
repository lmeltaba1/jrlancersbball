// Notification Center - In-app notification display
// This complements push notifications by showing them in the app UI

// Local escapeHtml fallback if app.js isn't loaded
if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
}

let unreadCount = 0;

// Initialize notification center after auth
function initNotificationCenter() {
  const user = auth.currentUser;
  if (!user) return;

  // Create the notification bell UI if not exists
  createNotificationUI();

  // Subscribe to user's notifications
  subscribeToNotifications(user.uid);
}

// Create the bell icon and dropdown UI
function createNotificationUI() {
  const wrapper = document.getElementById('profileBtnWrapper');
  if (!wrapper || document.getElementById('notificationBell')) return;

  // Inject styles once
  if (!document.getElementById('notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      #notificationBtn {
        background: var(--bg-elevated);
        border: 1px solid var(--border-color);
        border-radius: 50%;
        width: 44px;
        height: 44px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      #notificationBtn:hover {
        background: var(--bg-hover);
        transform: scale(1.05);
      }
      #notificationBtn:active {
        transform: scale(0.95);
      }
      #notificationBadge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        color: white;
        font-size: 11px;
        font-weight: 700;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0 5px;
        border: 2px solid var(--bg-primary);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        animation: badgePulse 2s ease-in-out infinite;
      }
      @keyframes badgePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      #notificationPanel {
        display: none;
        position: absolute;
        top: 52px;
        right: -8px;
        background: var(--bg-card);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        width: 360px;
        max-width: calc(100vw - 24px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
        z-index: 1001;
        max-height: 480px;
        overflow: hidden;
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      #notificationPanel.show {
        display: block;
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .notification-header {
        padding: 18px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%);
      }
      .notification-header h3 {
        font-weight: 700;
        color: var(--text-primary);
        font-size: 1.15rem;
        margin: 0;
      }
      .notification-header button {
        background: none;
        border: none;
        color: var(--accent-color);
        font-size: 0.85rem;
        cursor: pointer;
        font-weight: 600;
        padding: 6px 12px;
        border-radius: 8px;
        transition: background 0.15s;
      }
      .notification-header button:hover {
        background: rgba(99, 102, 241, 0.15);
      }
      .notification-actions {
        display: flex;
        gap: 8px;
      }
      .notification-actions .clear-all {
        color: #EF4444;
      }
      .notification-actions .clear-all:hover {
        background: rgba(239, 68, 68, 0.15);
      }
      .notification-item {
        padding: 18px 20px;
        padding-right: 48px;
        border-bottom: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
        min-height: 70px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .notification-item:last-child {
        border-bottom: none;
      }
      .notification-item:hover, .notification-item:active {
        background: var(--bg-hover);
      }
      .notification-item.unread {
        background: linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%);
        border-left: 4px solid var(--lancers-gold);
      }
      .notification-item.unread .title {
        color: #fff;
      }
      .notification-item .icon {
        font-size: 28px;
        line-height: 1;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
      .notification-item .title {
        font-weight: 700;
        color: var(--text-primary);
        font-size: 1rem;
        margin-bottom: 6px;
        line-height: 1.4;
      }
      .notification-item .body {
        color: rgba(255, 255, 255, 0.85);
        font-size: 0.9rem;
        line-height: 1.5;
        margin-bottom: 8px;
      }
      .notification-item .time {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.8rem;
        font-weight: 500;
      }
      .notification-item .dot {
        width: 12px;
        height: 12px;
        background: var(--lancers-gold);
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 10px var(--lancers-gold);
      }
      .notification-item .dismiss {
        position: absolute;
        top: 50%;
        right: 12px;
        transform: translateY(-50%);
        width: 36px;
        height: 36px;
        border: none;
        background: rgba(239, 68, 68, 0.2);
        color: #EF4444;
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        transition: all 0.15s;
      }
      .notification-item .dismiss:hover, .notification-item .dismiss:active {
        background: rgba(239, 68, 68, 0.4);
        transform: translateY(-50%) scale(1.1);
      }
      .notification-empty {
        padding: 48px 24px;
        text-align: center;
        color: var(--text-muted);
      }
      .notification-empty svg {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.4;
      }
    `;
    document.head.appendChild(styles);
  }

  // Create bell button
  const bellHtml = `
    <div id="notificationBell" style="position: relative; margin-right: 8px;">
      <button id="notificationBtn" onclick="toggleNotificationPanel()" aria-label="Notifications">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 22px; height: 22px; color: var(--text-primary);">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span id="notificationBadge">0</span>
      </button>

      <div id="notificationPanel">
        <div class="notification-header">
          <h3>Notifications</h3>
          <div class="notification-actions">
            <button onclick="markAllNotificationsRead()">Mark read</button>
            <button class="clear-all" onclick="clearAllNotifications()">Clear all</button>
          </div>
        </div>
        <div id="notificationList" style="max-height: 400px; overflow-y: auto;">
          <div class="notification-empty">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div>No notifications yet</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Insert before profile button
  wrapper.insertAdjacentHTML('beforebegin', bellHtml);
}

// Track which broadcast notifications user has read/dismissed
let broadcastReadIds = new Set();
let broadcastDismissedIds = new Set();
let currentUserUid = null;

// Store notifications from both sources
let teamNotifications = [];
let userNotifications = [];
let teamUnsubscribe = null;
let userUnsubscribe = null;

// Subscribe to BOTH collections (hybrid approach)
function subscribeToNotifications(uid) {
  // Cleanup existing subscriptions
  if (teamUnsubscribe) teamUnsubscribe();
  if (userUnsubscribe) userUnsubscribe();

  currentUserUid = uid;

  // Load broadcast read/dismissed status first
  loadBroadcastStatus(uid).then(() => {
    // 1. Subscribe to teamNotifications (broadcast - everyone)
    teamUnsubscribe = db.collection('teamNotifications')
      .orderBy('sentAt', 'desc')
      .limit(30)
      .onSnapshot(snapshot => {
        teamNotifications = [];
        snapshot.forEach(doc => {
          const data = doc.data();

          // Skip if dismissed
          if (broadcastDismissedIds.has(doc.id)) return;

          // Skip if sender (for chat)
          if (data.excludeUid && data.excludeUid === currentUserUid) return;

          const isRead = broadcastReadIds.has(doc.id);
          teamNotifications.push({
            id: doc.id,
            source: 'team',
            ...data,
            read: isRead
          });
        });
        mergeAndRender();
      }, err => console.error('Team notifications error:', err));

    // 2. Subscribe to userNotifications (targeted - private)
    userUnsubscribe = db.collection('userNotifications').doc(uid)
      .collection('notifications')
      .orderBy('sentAt', 'desc')
      .limit(30)
      .onSnapshot(snapshot => {
        userNotifications = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          userNotifications.push({
            id: doc.id,
            source: 'user',
            ...data
            // read field is already in the document
          });
        });
        mergeAndRender();
      }, err => console.error('User notifications error:', err));
  });
}

// Merge both sources and render
function mergeAndRender() {
  // Combine and sort by sentAt descending
  const all = [...teamNotifications, ...userNotifications];
  all.sort((a, b) => {
    const timeA = a.sentAt?.toMillis?.() || 0;
    const timeB = b.sentAt?.toMillis?.() || 0;
    return timeB - timeA;
  });

  // Aggregate chat notifications into a single item
  const chatNotifications = all.filter(n => n.data?.type === 'chat' && !n.read);
  const otherNotifications = all.filter(n => n.data?.type !== 'chat' || n.read);

  let aggregatedNotifications = [...otherNotifications];

  if (chatNotifications.length > 0) {
    // Create aggregated chat notification
    const mostRecent = chatNotifications[0];
    const aggregatedChat = {
      id: 'chat_aggregate',
      source: 'team',
      title: chatNotifications.length === 1
        ? mostRecent.title
        : `${chatNotifications.length} new messages`,
      body: chatNotifications.length === 1
        ? mostRecent.body
        : `Latest from ${mostRecent.title}`,
      data: { type: 'chat', url: '/messages.html' },
      sentAt: mostRecent.sentAt,
      read: false,
      isAggregate: true,
      aggregateIds: chatNotifications.map(n => ({ id: n.id, source: n.source }))
    };
    aggregatedNotifications.push(aggregatedChat);
  }

  // Sort again after aggregation
  aggregatedNotifications.sort((a, b) => {
    const timeA = a.sentAt?.toMillis?.() || 0;
    const timeB = b.sentAt?.toMillis?.() || 0;
    return timeB - timeA;
  });

  // Limit to 30 total
  const notifications = aggregatedNotifications.slice(0, 30);

  // Count unread
  unreadCount = notifications.filter(n => !n.read).length;

  renderNotifications(notifications);
  updateBadge(unreadCount);
}

// Load broadcast read/dismissed status
async function loadBroadcastStatus(uid) {
  try {
    const doc = await db.collection('notificationStatus').doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      broadcastReadIds = new Set(data.readIds || []);
      broadcastDismissedIds = new Set(data.dismissedIds || []);
    }
  } catch (e) {
    console.error('Error loading notification status:', e);
  }
}

// Save broadcast status
async function saveBroadcastStatus() {
  if (!currentUserUid) return;
  try {
    await db.collection('notificationStatus').doc(currentUserUid).set({
      readIds: Array.from(broadcastReadIds),
      dismissedIds: Array.from(broadcastDismissedIds),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error('Error saving notification status:', e);
  }
}

// Render notifications in the dropdown
function renderNotifications(notifications) {
  const list = document.getElementById('notificationList');
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = `
      <div class="notification-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <div>No notifications yet</div>
      </div>`;
    return;
  }

  list.innerHTML = notifications.map(n => {
    const timeAgo = getTimeAgo(n.sentAt?.toDate());
    const icon = getNotificationIcon(n.data?.type || n.title);
    const unreadClass = n.read ? '' : 'unread';
    const url = n.data?.url || '';
    const source = n.source || 'user';
    const isAggregate = n.isAggregate ? 'true' : 'false';
    const aggregateIdsAttr = n.aggregateIds
      ? `data-aggregate-ids='${JSON.stringify(n.aggregateIds).replace(/'/g, "&#39;")}'`
      : '';

    return `
      <div class="notification-item ${unreadClass}" data-id="${n.id}" data-source="${source}" ${aggregateIdsAttr} style="position: relative; transition: opacity 0.2s, transform 0.2s;" onclick="handleNotificationClick('${n.id}', '${source}', '${escapeHtml(url)}', '${isAggregate}')">
        <button class="dismiss" onclick="event.stopPropagation(); dismissNotification('${n.id}', '${source}')" aria-label="Dismiss">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div style="display: flex; gap: 14px; align-items: flex-start;">
          <div class="icon">${icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="title">${escapeHtml(n.title)}</div>
            <div class="body">${escapeHtml(n.body)}</div>
            <div class="time">${timeAgo}</div>
          </div>
          ${!n.read ? '<div class="dot"></div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Get appropriate icon based on notification type
function getNotificationIcon(type) {
  if (!type) return '🔔';
  const t = type.toLowerCase();
  if (t.includes('gamestarted')) return '🏀';
  if (t.includes('gameended') || t.includes('game') && t.includes('over')) return '🏁';
  if (t.includes('chat') || t.includes('message')) return '💬';
  if (t.includes('newpost') || t.includes('post')) return '📢';
  if (t.includes('wrap') || t.includes('recap')) return '📰';
  if (t.includes('attendance') || t.includes('rsvp')) return '📋';
  if (t.includes('volunteer')) return '🙋';
  if (t.includes('scorekeeper')) return '📊';
  if (t.includes('highlight')) return '🎬';
  return '🔔';
}

// Calculate time ago string
function getTimeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Update badge count
function updateBadge(count) {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Toggle notification panel
function toggleNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (!panel) return;

  const isVisible = panel.classList.contains('show');

  // Close profile menu if open
  const profileMenu = document.getElementById('profileMenu');
  if (profileMenu) profileMenu.style.display = 'none';

  if (isVisible) {
    panel.classList.remove('show');
  } else {
    panel.classList.add('show');
    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', closeNotificationPanelOnClickOutside);
    }, 0);
  }
}

function closeNotificationPanelOnClickOutside(e) {
  const panel = document.getElementById('notificationPanel');
  const bell = document.getElementById('notificationBell');

  if (panel && bell && !bell.contains(e.target)) {
    panel.classList.remove('show');
    document.removeEventListener('click', closeNotificationPanelOnClickOutside);
  }
}

// Handle notification click - mark as read and navigate
async function handleNotificationClick(notificationId, source, url, isAggregate) {
  if (!currentUserUid) return;

  // Handle aggregated notifications (like chat)
  if (isAggregate === 'true' || isAggregate === true) {
    // Find the aggregate notification and mark all its children as read
    const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
    const aggregateIdsStr = item?.dataset.aggregateIds;
    if (aggregateIdsStr) {
      try {
        const aggregateIds = JSON.parse(aggregateIdsStr);
        for (const {id, source: src} of aggregateIds) {
          if (src === 'team') {
            broadcastReadIds.add(id);
          }
        }
        await saveBroadcastStatus();
      } catch (e) {
        console.error('Error marking aggregate notifications read:', e);
      }
    }
  } else {
    // Mark single notification as read based on source
    if (source === 'team') {
      broadcastReadIds.add(notificationId);
      await saveBroadcastStatus();
    } else {
      // User notification - update directly in Firestore
      try {
        await db.collection('userNotifications').doc(currentUserUid)
          .collection('notifications').doc(notificationId)
          .update({ read: true });
      } catch (e) {
        console.error('Error marking notification read:', e);
      }
    }
  }

  // Update UI immediately
  unreadCount = Math.max(0, unreadCount - 1);
  updateBadge(unreadCount);

  // Close panel
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.remove('show');

  // Navigate if URL provided
  if (url) {
    window.location.href = url;
  }
}

// Dismiss a single notification
async function dismissNotification(notificationId, source) {
  if (!currentUserUid) return;

  if (source === 'team') {
    // Broadcast: track in notificationStatus
    broadcastDismissedIds.add(notificationId);
    if (!broadcastReadIds.has(notificationId)) {
      broadcastReadIds.add(notificationId);
      unreadCount = Math.max(0, unreadCount - 1);
      updateBadge(unreadCount);
    }
    await saveBroadcastStatus();
  } else {
    // User notification: delete from Firestore
    try {
      await db.collection('userNotifications').doc(currentUserUid)
        .collection('notifications').doc(notificationId)
        .delete();
    } catch (e) {
      console.error('Error dismissing notification:', e);
    }
  }

  // Remove from UI immediately
  const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
  if (item) {
    item.style.opacity = '0';
    item.style.transform = 'translateX(100%)';
    setTimeout(() => item.remove(), 200);
  }
}

// Clear all notifications
async function clearAllNotifications() {
  if (!currentUserUid) return;

  const items = document.querySelectorAll('.notification-item[data-id]');
  const userIdsToDelete = [];

  items.forEach(item => {
    const id = item.dataset.id;
    const source = item.dataset.source;
    if (!id) return;

    if (source === 'team') {
      broadcastDismissedIds.add(id);
      broadcastReadIds.add(id);
    } else {
      userIdsToDelete.push(id);
    }
  });

  // Save broadcast status
  await saveBroadcastStatus();

  // Delete user notifications
  if (userIdsToDelete.length > 0) {
    const batch = db.batch();
    userIdsToDelete.forEach(id => {
      const ref = db.collection('userNotifications').doc(currentUserUid)
        .collection('notifications').doc(id);
      batch.delete(ref);
    });
    try {
      await batch.commit();
    } catch (e) {
      console.error('Error clearing user notifications:', e);
    }
  }

  // Clear UI
  unreadCount = 0;
  updateBadge(0);
  const list = document.getElementById('notificationList');
  if (list) {
    list.innerHTML = `
      <div class="notification-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <div>No notifications</div>
      </div>`;
  }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  if (!currentUserUid) return;

  const items = document.querySelectorAll('.notification-item.unread[data-id]');
  const userIdsToUpdate = [];

  items.forEach(item => {
    const id = item.dataset.id;
    const source = item.dataset.source;
    if (!id) return;

    if (source === 'team') {
      broadcastReadIds.add(id);
    } else {
      userIdsToUpdate.push(id);
    }

    item.classList.remove('unread');
    const dot = item.querySelector('.dot');
    if (dot) dot.remove();
  });

  // Save broadcast status
  await saveBroadcastStatus();

  // Update user notifications
  if (userIdsToUpdate.length > 0) {
    const batch = db.batch();
    userIdsToUpdate.forEach(id => {
      const ref = db.collection('userNotifications').doc(currentUserUid)
        .collection('notifications').doc(id);
      batch.update(ref, { read: true });
    });
    try {
      await batch.commit();
    } catch (e) {
      console.error('Error marking user notifications read:', e);
    }
  }

  unreadCount = 0;
  updateBadge(0);
}

// Cleanup on page unload
window.addEventListener('pagehide', () => {
  if (teamUnsubscribe) {
    teamUnsubscribe();
    teamUnsubscribe = null;
  }
  if (userUnsubscribe) {
    userUnsubscribe();
    userUnsubscribe = null;
  }
});

// Auto-clear notifications when user navigates to the relevant page
function autoClearNotificationsForCurrentPage() {
  if (!currentUserUid) return;

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  // Determine which notification types to clear based on current page
  let typesToClear = [];

  if (path.includes('messages.html')) {
    if (params.get('tab') === 'posts') {
      typesToClear = ['newPost', 'post'];
    } else {
      typesToClear = ['chat', 'message'];
    }
  } else if (path.includes('game-detail.html')) {
    const gameId = params.get('id');
    if (hash.includes('wrapup')) {
      typesToClear = ['wrapupReady', 'wrapupPendingApproval'];
    } else if (hash.includes('highlights')) {
      typesToClear = ['gameEnded'];
    } else if (gameId) {
      typesToClear = ['gameStarted', 'gameEnded', 'wrapupReady'];
    }
  } else if (path.includes('game-stats.html')) {
    typesToClear = ['gameStarted', 'scorekeeperReminder'];
  } else if (path.includes('attendance.html')) {
    typesToClear = ['attendance', 'rsvp'];
  } else if (path.includes('volunteers.html')) {
    typesToClear = ['volunteer', 'volunteerReminder'];
  } else if (path.includes('highlights.html')) {
    typesToClear = ['highlight'];
  }

  if (typesToClear.length === 0) return;

  // Mark matching notifications as read
  let hasChanges = false;
  const userIdsToUpdate = [];

  // Check team notifications
  teamNotifications.forEach(n => {
    const type = n.data?.type || '';
    if (typesToClear.some(t => type.toLowerCase().includes(t.toLowerCase())) && !n.read) {
      broadcastReadIds.add(n.id);
      hasChanges = true;
    }
  });

  // Check user notifications
  userNotifications.forEach(n => {
    const type = n.data?.type || '';
    if (typesToClear.some(t => type.toLowerCase().includes(t.toLowerCase())) && !n.read) {
      userIdsToUpdate.push(n.id);
      hasChanges = true;
    }
  });

  // Save changes
  if (hasChanges) {
    saveBroadcastStatus();

    if (userIdsToUpdate.length > 0) {
      const batch = db.batch();
      userIdsToUpdate.forEach(id => {
        const ref = db.collection('userNotifications').doc(currentUserUid)
          .collection('notifications').doc(id);
        batch.update(ref, { read: true });
      });
      batch.commit().catch(e => console.error('Error auto-clearing notifications:', e));
    }

    // Re-render to update UI (use original to avoid recursion)
    if (typeof originalMergeAndRender === 'function') {
      originalMergeAndRender();
    }
  }
}

// Call auto-clear after notifications are loaded (runs once per page)
let autoClearCalled = false;
const originalMergeAndRender = mergeAndRender;
mergeAndRender = function() {
  originalMergeAndRender();
  // Only auto-clear once after initial load, with delay to ensure data is loaded
  if (!autoClearCalled) {
    autoClearCalled = true;
    setTimeout(() => {
      if (teamNotifications.length > 0 || userNotifications.length > 0) {
        autoClearNotificationsForCurrentPage();
      }
    }, 1000);
  }
};
