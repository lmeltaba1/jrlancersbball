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

let notificationUnsubscribe = null;
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
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .notification-item:last-child {
        border-bottom: none;
      }
      .notification-item:hover {
        background: var(--bg-hover);
      }
      .notification-item.unread {
        background: linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, transparent 100%);
        border-left: 3px solid var(--accent-color);
      }
      .notification-item .icon {
        font-size: 28px;
        line-height: 1;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
      .notification-item .title {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.95rem;
        margin-bottom: 4px;
        line-height: 1.35;
      }
      .notification-item .body {
        color: var(--text-secondary);
        font-size: 0.85rem;
        line-height: 1.45;
        margin-bottom: 6px;
      }
      .notification-item .time {
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 500;
      }
      .notification-item .dot {
        width: 10px;
        height: 10px;
        background: var(--accent-color);
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 8px var(--accent-color);
      }
      .notification-item .dismiss {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.15s;
      }
      .notification-item:hover .dismiss {
        opacity: 1;
      }
      .notification-item .dismiss:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #EF4444;
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

// Subscribe to Firestore notifications
function subscribeToNotifications(uid) {
  if (notificationUnsubscribe) {
    notificationUnsubscribe();
  }

  notificationUnsubscribe = db.collection('userNotifications').doc(uid)
    .collection('notifications')
    .orderBy('sentAt', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {
      const notifications = [];
      unreadCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        notifications.push({ id: doc.id, ...data });
        if (!data.read) unreadCount++;
      });

      renderNotifications(notifications);
      updateBadge(unreadCount);
    }, err => {
      console.error('Notification subscription error:', err);
    });
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

    return `
      <div class="notification-item ${unreadClass}" style="position: relative;" onclick="handleNotificationClick('${n.id}', '${escapeHtml(url)}')">
        <button class="dismiss" onclick="event.stopPropagation(); dismissNotification('${n.id}')" aria-label="Dismiss">
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
  if (t.includes('game') && t.includes('start')) return '🏀';
  if (t.includes('game') && (t.includes('end') || t.includes('over'))) return '🏁';
  if (t.includes('message') || t.includes('chat')) return '💬';
  if (t.includes('wrap') || t.includes('recap')) return '📰';
  if (t.includes('rsvp') || t.includes('attendance')) return '📋';
  if (t.includes('volunteer') || t.includes('scorekeeper')) return '✋';
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
async function handleNotificationClick(notificationId, url) {
  const user = auth.currentUser;
  if (!user) return;

  // Mark as read
  try {
    await db.collection('userNotifications').doc(user.uid)
      .collection('notifications').doc(notificationId)
      .update({ read: true });
  } catch (e) {
    console.error('Error marking notification read:', e);
  }

  // Close panel
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.remove('show');

  // Navigate if URL provided
  if (url) {
    window.location.href = url;
  }
}

// Dismiss a single notification
async function dismissNotification(notificationId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await db.collection('userNotifications').doc(user.uid)
      .collection('notifications').doc(notificationId)
      .delete();
  } catch (e) {
    console.error('Error dismissing notification:', e);
  }
}

// Clear all notifications
async function clearAllNotifications() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await db.collection('userNotifications').doc(user.uid)
      .collection('notifications')
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (e) {
    console.error('Error clearing all notifications:', e);
  }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await db.collection('userNotifications').doc(user.uid)
      .collection('notifications')
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (e) {
    console.error('Error marking all notifications read:', e);
  }
}

// Cleanup on page unload
window.addEventListener('pagehide', () => {
  if (notificationUnsubscribe) {
    notificationUnsubscribe();
    notificationUnsubscribe = null;
  }
});
