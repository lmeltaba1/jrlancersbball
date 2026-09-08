const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const sgMail = require('@sendgrid/mail');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// Define SendGrid API key as a secret
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

// Send notification to all registered devices
async function sendToAllDevices(title, body, data = {}) {
  const tokensSnapshot = await db.collection('fcmTokens').get();

  if (tokensSnapshot.empty) {
    console.log('No FCM tokens found');
    return;
  }

  const tokens = [];
  tokensSnapshot.forEach(doc => {
    const tokenData = doc.data();
    if (tokenData.token) {
      tokens.push(tokenData.token);
    }
  });

  if (tokens.length === 0) {
    console.log('No valid tokens');
    return;
  }

  const message = {
    data: {
      title: title,
      body: body,
      ...data
    },
    tokens: tokens
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`Sent ${response.successCount} notifications, ${response.failureCount} failed`);

    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      if (failedTokens.length > 0) {
        const batch = db.batch();
        const invalidDocs = await db.collection('fcmTokens')
          .where('token', 'in', failedTokens.slice(0, 10))
          .get();

        invalidDocs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

// Trigger on new chat message
exports.onNewMessage = onDocumentCreated('messages/{messageId}', async (event) => {
  const message = event.data.data();
  const senderUid = message.uid;

  if (!message.senderName) return null;

  const title = `${message.senderName}`;
  const body = message.text.length > 100
    ? message.text.substring(0, 100) + '...'
    : message.text;

  const tokensSnapshot = await db.collection('fcmTokens').get();
  const tokens = [];

  tokensSnapshot.forEach(doc => {
    const tokenData = doc.data();
    if (tokenData.token && tokenData.uid !== senderUid) {
      tokens.push(tokenData.token);
    }
  });

  if (tokens.length === 0) {
    console.log('No tokens to notify (excluding sender)');
    return null;
  }

  const notificationMessage = {
    data: {
      title: title,
      body: body,
      type: 'chat',
      url: '/chat.html'
    },
    tokens: tokens
  };

  try {
    const response = await messaging.sendEachForMulticast(notificationMessage);
    console.log(`Chat: Sent ${response.successCount} notifications, ${response.failureCount} failed`);
  } catch (error) {
    console.error('Error sending chat notifications:', error);
  }

  return null;
});

// Manual notification endpoint (for coach)
exports.sendAnnouncement = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const { title, body } = request.data;

  if (!title || !body) {
    throw new HttpsError('invalid-argument', 'Title and body required');
  }

  await sendToAllDevices(title, body, {
    type: 'announcement',
    url: '/index.html'
  });

  return { success: true };
});

// Simple test endpoint
exports.helloWorld = onRequest((request, response) => {
  response.send("Hello from Jr. Lancers Basketball!");
});

// Send test RSVP reminder to a specific email
exports.sendTestReminder = onRequest(async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const email = request.query.email;
  if (!email) {
    response.status(400).json({ error: 'email parameter required' });
    return;
  }

  try {
    // Find token for this email
    const tokensSnapshot = await db.collection('fcmTokens')
      .where('email', '==', email.toLowerCase())
      .get();

    if (tokensSnapshot.empty) {
      response.json({
        success: false,
        error: 'No FCM token found for ' + email,
        hint: 'User needs to enable notifications in the app first'
      });
      return;
    }

    const tokens = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token) tokens.push(data.token);
    });

    const notificationMessage = {
      data: {
        title: 'RSVP Needed',
        body: 'Practice on Wed, Jan 20 - Let us know if your player can attend!',
        type: 'attendance',
        url: '/attendance.html?game=114'
      },
      tokens: tokens
    };

    const result = await messaging.sendEachForMulticast(notificationMessage);

    response.json({
      success: true,
      email: email,
      tokenCount: tokens.length,
      sent: result.successCount,
      failed: result.failureCount
    });
  } catch (error) {
    console.error('Error sending test reminder:', error);
    response.status(500).json({ error: error.message });
  }
});

// Scheduled function to send attendance reminders - daily at 9 AM Central
exports.sendAttendanceReminders = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'America/Chicago'
}, async (event) => {
  console.log('Running attendance reminder check...');

  try {
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    const rosterDoc = await db.collection('config').doc('roster').get();

    if (!scheduleDoc.exists || !rosterDoc.exists) {
      console.log('Schedule or roster config not found in Firestore');
      return null;
    }

    const schedule = scheduleDoc.data();
    const roster = rosterDoc.data();

    if (!roster.players) {
      console.log('Invalid roster data');
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Combine games and events into one list
    const allEvents = [];

    if (schedule.games) {
      schedule.games.forEach(game => {
        if (!game.result) {
          allEvents.push({
            id: game.id,
            date: game.date,
            time: game.time,
            name: `vs ${game.opponent}`,
            type: 'game'
          });
        }
      });
    }

    if (schedule.events) {
      schedule.events.forEach(event => {
        allEvents.push({
          id: event.id,
          date: event.date,
          time: event.time,
          name: event.name,
          type: event.type || 'event'
        });
      });
    }

    // Filter to events within next 4 days
    const upcomingEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 4;
    });

    if (upcomingEvents.length === 0) {
      console.log('No upcoming events within 4 days');
      return null;
    }

    for (const event of upcomingEvents) {
      console.log(`Processing ${event.type} ${event.id}: ${event.name}`);

      const attendanceSnapshot = await db.collection('attendance')
        .where('gameId', '==', event.id)
        .get();

      const respondedPlayerIds = new Set();
      attendanceSnapshot.forEach(doc => {
        respondedPlayerIds.add(doc.data().playerId);
      });

      const nonResponders = roster.players.filter(player =>
        !respondedPlayerIds.has(player.id)
      );

      if (nonResponders.length === 0) {
        console.log(`All players have responded for ${event.type} ${event.id}`);
        continue;
      }

      console.log(`Found ${nonResponders.length} non-responders for ${event.type} ${event.id}`);

      const parentEmails = new Set();
      nonResponders.forEach(player => {
        if (player.parents) {
          player.parents.forEach(parent => {
            if (parent.email) {
              parentEmails.add(parent.email.toLowerCase());
            }
          });
        }
      });

      const tokensSnapshot = await db.collection('fcmTokens').get();
      const tokensToNotify = [];

      tokensSnapshot.forEach(doc => {
        const tokenData = doc.data();
        if (tokenData.token && tokenData.email && parentEmails.has(tokenData.email.toLowerCase())) {
          tokensToNotify.push(tokenData.token);
        }
      });

      if (tokensToNotify.length === 0) {
        console.log(`No FCM tokens found for non-responders of ${event.type} ${event.id}`);
        continue;
      }

      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      const notificationMessage = {
        data: {
          title: 'RSVP Needed',
          body: `${event.name} on ${dateStr} - Let us know if your player can attend!`,
          type: 'attendance',
          url: `/attendance.html?game=${event.id}`
        },
        tokens: tokensToNotify
      };

      try {
        const response = await messaging.sendEachForMulticast(notificationMessage);
        console.log(`Sent ${response.successCount} attendance reminders for ${event.type} ${event.id}, ${response.failureCount} failed`);
      } catch (error) {
        console.error(`Error sending attendance reminders for ${event.type} ${event.id}:`, error);
      }
    }

    return null;
  } catch (error) {
    console.error('Error in sendAttendanceReminders:', error);
    return null;
  }
});

// Manual trigger for attendance reminders (for testing)
exports.triggerAttendanceReminders = onRequest(async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  try {
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    const rosterDoc = await db.collection('config').doc('roster').get();

    if (!scheduleDoc.exists || !rosterDoc.exists) {
      response.status(400).json({
        success: false,
        error: 'Schedule or roster config not found. Please sync config first.'
      });
      return;
    }

    const schedule = scheduleDoc.data();
    const roster = rosterDoc.data();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Combine games and events into one list
    const allEvents = [];

    if (schedule.games) {
      schedule.games.forEach(game => {
        if (!game.result) {
          allEvents.push({
            id: game.id,
            date: game.date,
            time: game.time,
            name: `vs ${game.opponent}`,
            type: 'game'
          });
        }
      });
    }

    if (schedule.events) {
      schedule.events.forEach(event => {
        allEvents.push({
          id: event.id,
          date: event.date,
          time: event.time,
          name: event.name,
          type: event.type || 'event'
        });
      });
    }

    // Filter to events within next 4 days
    const upcomingEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 4;
    });

    const results = [];

    for (const event of upcomingEvents) {
      const attendanceSnapshot = await db.collection('attendance')
        .where('gameId', '==', event.id)
        .get();

      const respondedPlayerIds = new Set();
      attendanceSnapshot.forEach(doc => {
        respondedPlayerIds.add(doc.data().playerId);
      });

      const nonResponders = roster.players.filter(player =>
        !respondedPlayerIds.has(player.id)
      );

      const parentEmails = new Set();
      nonResponders.forEach(player => {
        if (player.parents) {
          player.parents.forEach(parent => {
            if (parent.email) {
              parentEmails.add(parent.email.toLowerCase());
            }
          });
        }
      });

      const tokensSnapshot = await db.collection('fcmTokens').get();
      const tokensToNotify = [];

      tokensSnapshot.forEach(doc => {
        const tokenData = doc.data();
        if (tokenData.token && tokenData.email && parentEmails.has(tokenData.email.toLowerCase())) {
          tokensToNotify.push(tokenData.token);
        }
      });

      if (tokensToNotify.length > 0) {
        const eventDate = new Date(event.date);
        const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const notificationMessage = {
          data: {
            title: 'RSVP Needed',
            body: `${event.name} on ${dateStr} - Let us know if your player can attend!`,
            type: 'attendance',
            url: `/attendance.html?game=${event.id}`
          },
          tokens: tokensToNotify
        };

        const sendResult = await messaging.sendEachForMulticast(notificationMessage);
        results.push({
          eventId: event.id,
          eventName: event.name,
          eventType: event.type,
          nonResponders: nonResponders.length,
          notificationsSent: sendResult.successCount,
          notificationsFailed: sendResult.failureCount
        });
      } else {
        results.push({
          eventId: event.id,
          eventName: event.name,
          eventType: event.type,
          nonResponders: nonResponders.length,
          notificationsSent: 0,
          reason: 'No FCM tokens found for non-responders'
        });
      }
    }

    response.json({
      success: true,
      eventsChecked: upcomingEvents.length,
      results: results
    });
  } catch (error) {
    console.error('Error triggering attendance reminders:', error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sync schedule and roster from hosted JSON to Firestore
exports.syncConfig = onRequest({ invoker: 'public' }, async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const https = require('https');
  const fetchJson = (url) => {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  };

  try {
    const baseUrl = 'https://lancers-bball.web.app';
    const [schedule, roster] = await Promise.all([
      fetchJson(`${baseUrl}/data/schedule.json`),
      fetchJson(`${baseUrl}/data/roster.json`)
    ]);

    await Promise.all([
      db.collection('config').doc('schedule').set(schedule),
      db.collection('config').doc('roster').set(roster)
    ]);

    response.json({
      success: true,
      message: `Synced ${schedule.games.length} games and ${roster.players.length} players to Firestore`
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// Send viewer invite email
exports.sendViewerInvite = onCall({
  secrets: [sendgridApiKey]
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const { viewerEmail, viewerName, playerName, inviterName, relationship } = request.data;

  if (!viewerEmail || !viewerName || !playerName || !inviterName) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  // Check if SendGrid is configured
  const apiKey = sendgridApiKey.value();
  if (!apiKey) {
    console.log('SendGrid not configured, skipping email');
    return { success: true, emailSent: false, reason: 'Email service not configured' };
  }

  sgMail.setApiKey(apiKey);

  const appUrl = 'https://lancers-bball.web.app';
  const registerUrl = `${appUrl}/register.html`;

  const msg = {
    to: viewerEmail,
    from: {
      email: 'noreply@lancers-bball.web.app',
      name: 'Jr. Lancers Basketball'
    },
    subject: `You're invited to follow ${playerName} on Jr. Lancers!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #000; padding: 20px; text-align: center;">
          <h1 style="color: #FFD700; margin: 0;">Jr. Lancers Basketball</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Hi ${viewerName}!</h2>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            ${inviterName} has invited you to follow <strong>${playerName}</strong>'s basketball season with the Jr. Lancers!
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            As a <strong>${relationship || 'viewer'}</strong>, you'll be able to:
          </p>
          <ul style="font-size: 16px; color: #555; line-height: 1.8;">
            <li>View the game schedule</li>
            <li>See the team roster</li>
            <li>Watch live game stats</li>
            <li>View photos and videos</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registerUrl}" style="background: #FFD700; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
              Create Your Account
            </a>
          </div>
          <p style="font-size: 14px; color: #888; text-align: center;">
            Use this email address (<strong>${viewerEmail}</strong>) when registering.
          </p>
        </div>
        <div style="background: #333; padding: 15px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Jr. Lancers Basketball • Lafayette 5th Grade
          </p>
        </div>
      </div>
    `,
    text: `
Hi ${viewerName}!

${inviterName} has invited you to follow ${playerName}'s basketball season with the Jr. Lancers!

As a ${relationship || 'viewer'}, you'll be able to view the game schedule, team roster, live game stats, and photos/videos.

Create your account here: ${registerUrl}

Use this email address (${viewerEmail}) when registering.

- Jr. Lancers Basketball
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Viewer invite email sent to ${viewerEmail} for player ${playerName}`);
    return { success: true, emailSent: true };
  } catch (error) {
    console.error('Error sending viewer invite email:', error);
    return { success: true, emailSent: false, reason: error.message };
  }
});

// Trigger notification when game starts (phase changes from 'pre' to 'Q1')
exports.onGameStarted = onDocumentUpdated('gameStats/{gameId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only trigger when phase changes from 'pre' to 'Q1'
  if (before.gamePhase !== 'pre' || after.gamePhase !== 'Q1') {
    return null;
  }

  const gameId = event.params.gameId;
  console.log(`Game ${gameId} started! Sending notifications...`);

  try {
    // Get game details from schedule
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    const games = scheduleDoc.exists ? scheduleDoc.data().games || [] : [];
    const game = games.find(g => g.id.toString() === gameId);

    const opponentName = game ? game.opponent : 'Opponent';
    const gameUrl = `/game-stats.html?game=${gameId}&view=1`;

    // Send notification to all devices
    await sendToAllDevices(
      'Game Started!',
      `Lancers vs ${opponentName} is now LIVE!`,
      {
        type: 'gameStarted',
        url: gameUrl,
        gameId: gameId
      }
    );

    console.log(`Game start notification sent for game ${gameId}`);
    return null;
  } catch (error) {
    console.error('Error sending game start notification:', error);
    return null;
  }
});

// ============================================================
// SIMULATION ENDPOINT - Creates realistic play-by-play data
// ============================================================

// Player data
const simPlayers = [
  { id: 1, firstName: 'Raequan', lastName: 'Brimer', number: 1, position: 'PF' },
  { id: 2, firstName: 'Camden', lastName: 'Kreyling', number: 9, position: 'PG' },
  { id: 3, firstName: 'Grant', lastName: 'Weltz', number: 14, position: 'C' },
  { id: 4, firstName: 'Rylan', lastName: 'Trott', number: 19, position: 'SF' },
  { id: 5, firstName: 'Ashton', lastName: 'Carney', number: 22, position: 'C' },
  { id: 6, firstName: 'Dean', lastName: 'Meltabarger', number: 30, position: 'SG' },
  { id: 7, firstName: 'Wyatt', lastName: 'Weems', number: 29, position: 'SF' },
  { id: 8, firstName: 'Peyton', lastName: 'Parks', number: 23, position: 'SG' },
  { id: 9, firstName: 'Jeevan', lastName: 'Sabharwal', number: 12, position: 'PG' },
  { id: 10, firstName: 'Easton', lastName: 'Moore', number: 5, position: 'PF' }
];

// Games schedule
const simGames = [
  { id: 1, date: '2026-12-05', time: '9:00 AM', opponent: 'Warriors' },
  { id: 2, date: '2026-12-06', time: '1:00 PM', opponent: 'Eagles' },
  { id: 3, date: '2026-12-12', time: '10:30 AM', opponent: 'Hawks' },
  { id: 4, date: '2026-12-13', time: '2:00 PM', opponent: 'Celtics' },
  { id: 5, date: '2026-12-19', time: '9:00 AM', opponent: 'Thunder' },
  { id: 6, date: '2026-12-20', time: '3:00 PM', opponent: 'Rockets' },
  { id: 7, date: '2027-01-03', time: '1:00 PM', opponent: 'Blazers' },
  { id: 8, date: '2027-01-09', time: '11:00 AM', opponent: 'Spurs' },
  { id: 9, date: '2027-01-10', time: '2:00 PM', opponent: 'Grizzlies' },
  { id: 10, date: '2027-01-16', time: '9:00 AM', opponent: 'Pelicans' },
  { id: 11, date: '2027-01-17', time: '1:00 PM', opponent: 'Mavericks' },
  { id: 12, date: '2027-01-23', time: '10:30 AM', opponent: 'Warriors' }
];

// Parent volunteers (for volunteer simulation)
const simParents = [
  { name: 'Ryan Carney', email: 'ryancar20@gmail.com', playerId: 1 },
  { name: 'Mindy Carney', email: 'mindy.m.carney@gmail.com', playerId: 1 },
  { name: 'Kristina Kreyling', email: 'kmkreyling@gmail.com', playerId: 2 },
  { name: 'Todd Weltz', email: 'tdweltz@gmail.com', playerId: 3 },
  { name: 'Melanie Trott', email: 'melaniemtrott@gmail.com', playerId: 4 },
  { name: 'Ryan Carney Sr', email: 'ashton.carney.parent@example.com', playerId: 5 },
  { name: 'Logan Meltabarger', email: 'lmeltabarger@icloud.com', playerId: 6 },
  { name: 'Kelsey Meltabarger', email: 'kelseymeltabarger@gmail.com', playerId: 6 },
  { name: 'Mike Weems', email: 'mweems@example.com', playerId: 7 },
  { name: 'Sarah Parks', email: 'sparks@example.com', playerId: 8 },
  { name: 'Raj Sabharwal', email: 'raj.sabharwal@example.com', playerId: 9 },
  { name: 'Matthew Moore', email: 'matthewmoore09@yahoo.com', playerId: 10 }
];

// Events (practices, etc)
const simEvents = [
  { id: 101, date: '2026-10-14', name: 'Practice' },
  { id: 102, date: '2026-10-21', name: 'Practice' },
  { id: 103, date: '2026-10-28', name: 'Practice' },
  { id: 104, date: '2026-11-04', name: 'Practice' },
  { id: 105, date: '2026-11-11', name: 'Practice' },
  { id: 106, date: '2026-11-18', name: 'Practice' },
  { id: 107, date: '2026-11-21', name: 'Team Photos' },
  { id: 108, date: '2026-11-25', name: 'Practice' },
  { id: 109, date: '2026-12-02', name: 'Practice' },
  { id: 110, date: '2026-12-09', name: 'Practice' },
  { id: 111, date: '2026-12-16', name: 'Practice' },
  { id: 112, date: '2027-01-06', name: 'Practice' },
  { id: 113, date: '2027-01-13', name: 'Practice' },
  { id: 114, date: '2027-01-20', name: 'Practice' }
];

function parseSimGameTime(dateStr, timeStr) {
  // Parse date parts
  const [year, month, day] = dateStr.split('-').map(Number);

  // Parse time parts
  const [hour, minutePart] = timeStr.split(':');
  const [minutes, ampm] = minutePart.split(' ');
  let h = parseInt(hour);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  // Create date with explicit local time components (Central Time approximation)
  // Cloud Functions run in UTC, so we need to offset for Central Time (-6 hours)
  const date = new Date(Date.UTC(year, month - 1, day, h + 6, parseInt(minutes), 0, 0));
  return date;
}

function simRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simPickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simGenerateEventId() {
  return 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function generateSimGamePlayByPlay(game, gameStartTime) {
  const events = [];
  const playerStats = {};
  let lancersScore = 0;
  let opponentScore = 0;

  simPlayers.forEach(p => {
    playerStats[p.id] = {
      name: p.firstName + ' ' + p.lastName.charAt(0) + '.',
      points: 0, rebounds: 0, assists: 0, steals: 0, turnovers: 0, fouls: 0,
      twoPointersMade: 0, threePointersMade: 0, freeThrowsMade: 0
    };
  });

  const starters = [2, 6, 4, 1, 5];
  let onCourt = [...starters];
  const timeouts = { lancers: { first: 0, second: 0, OT: 0 }, opponent: { first: 0, second: 0, OT: 0 } };
  let currentTime = new Date(gameStartTime);

  events.push({
    id: simGenerateEventId(),
    timestamp: Timestamp.fromDate(currentTime),
    gamePhase: 'Q1',
    type: 'phase',
    description: 'Q1 started'
  });

  const phases = ['Q1', 'Q2', 'halftime', 'Q3', 'Q4'];

  for (const phase of phases) {
    if (phase === 'halftime') {
      currentTime = new Date(currentTime.getTime() + 2 * 60 * 1000);
      events.push({
        id: simGenerateEventId(),
        timestamp: Timestamp.fromDate(currentTime),
        gamePhase: 'halftime',
        type: 'phase',
        description: 'HALFTIME'
      });
      continue;
    }

    if (phase !== 'Q1') {
      currentTime = new Date(currentTime.getTime() + 30 * 1000);
      events.push({
        id: simGenerateEventId(),
        timestamp: Timestamp.fromDate(currentTime),
        gamePhase: phase,
        type: 'phase',
        description: `${phase} started`
      });
    }

    const playsPerQuarter = simRandomInt(8, 15);

    for (let i = 0; i < playsPerQuarter; i++) {
      currentTime = new Date(currentTime.getTime() + simRandomInt(15, 45) * 1000);

      if (Math.random() < 0.6) {
        const playerId = simPickRandom(onCourt);
        const player = simPlayers.find(p => p.id === playerId);
        const pts = simPickRandom([2, 2, 2, 2, 3, 1]);

        playerStats[playerId].points += pts;
        lancersScore += pts;

        // Track shot type made
        if (pts === 2) {
          playerStats[playerId].twoPointersMade = (playerStats[playerId].twoPointersMade || 0) + 1;
        } else if (pts === 3) {
          playerStats[playerId].threePointersMade = (playerStats[playerId].threePointersMade || 0) + 1;
        } else if (pts === 1) {
          playerStats[playerId].freeThrowsMade = (playerStats[playerId].freeThrowsMade || 0) + 1;
        }

        const shotType = pts === 3 ? '3-pointer' : (pts === 2 ? '2 points' : 'free throw');
        events.push({
          id: simGenerateEventId(),
          timestamp: Timestamp.fromDate(currentTime),
          gamePhase: phase,
          type: 'stat',
          playerId: playerId,
          stat: 'points',
          value: pts,
          team: 'lancers',
          lancersScore: lancersScore,
          opponentScore: opponentScore,
          description: `${player.firstName} scores ${shotType}`
        });

        if (pts >= 2 && Math.random() < 0.4) {
          const assisterId = simPickRandom(onCourt.filter(id => id !== playerId));
          const assister = simPlayers.find(p => p.id === assisterId);
          playerStats[assisterId].assists += 1;
          currentTime = new Date(currentTime.getTime() + 2000);
          events.push({
            id: simGenerateEventId(),
            timestamp: Timestamp.fromDate(currentTime),
            gamePhase: phase,
            type: 'stat',
            playerId: assisterId,
            stat: 'assists',
            value: 1,
            team: 'lancers',
            description: `${assister.firstName} assist`
          });
        }
      } else {
        const pts = simPickRandom([2, 2, 2, 3, 1]);
        opponentScore += pts;
        const shotType = pts === 3 ? '3-pointer' : (pts === 2 ? '2 points' : 'free throw');
        events.push({
          id: simGenerateEventId(),
          timestamp: Timestamp.fromDate(currentTime),
          gamePhase: phase,
          type: 'stat',
          stat: 'points',
          value: pts,
          team: 'opponent',
          lancersScore: lancersScore,
          opponentScore: opponentScore,
          description: `Opponent scores ${shotType}`
        });
      }

      if (Math.random() < 0.3) {
        currentTime = new Date(currentTime.getTime() + 3000);
        const playerId = simPickRandom(onCourt);
        const player = simPlayers.find(p => p.id === playerId);
        const stat = simPickRandom(['rebounds', 'steals', 'turnovers']);
        playerStats[playerId][stat] += 1;
        const statLabel = { rebounds: 'rebound', steals: 'steal', turnovers: 'turnover' }[stat];
        events.push({
          id: simGenerateEventId(),
          timestamp: Timestamp.fromDate(currentTime),
          gamePhase: phase,
          type: 'stat',
          playerId: playerId,
          stat: stat,
          value: 1,
          team: 'lancers',
          description: `${player.firstName} ${statLabel}`
        });
      }

      if (Math.random() < 0.15) {
        currentTime = new Date(currentTime.getTime() + 5000);
        const playerId = simPickRandom(onCourt);
        const player = simPlayers.find(p => p.id === playerId);
        playerStats[playerId].fouls += 1;
        events.push({
          id: simGenerateEventId(),
          timestamp: Timestamp.fromDate(currentTime),
          gamePhase: phase,
          type: 'stat',
          playerId: playerId,
          stat: 'fouls',
          value: 1,
          team: 'lancers',
          description: `${player.firstName} foul`
        });
      }

      if (Math.random() < 0.2) {
        const bench = simPlayers.filter(p => !onCourt.includes(p.id)).map(p => p.id);
        if (bench.length > 0) {
          const playerOut = simPickRandom(onCourt);
          const playerIn = simPickRandom(bench);
          const idx = onCourt.indexOf(playerOut);
          onCourt[idx] = playerIn;
          const pOut = simPlayers.find(p => p.id === playerOut);
          const pIn = simPlayers.find(p => p.id === playerIn);
          currentTime = new Date(currentTime.getTime() + 5000);
          events.push({
            id: simGenerateEventId(),
            timestamp: Timestamp.fromDate(currentTime),
            gamePhase: phase,
            type: 'sub',
            playerIn: playerIn,
            playerOut: playerOut,
            description: `SUB: ${pIn.firstName} in for ${pOut.firstName}`
          });
        }
      }

      if (Math.random() < 0.05) {
        const team = Math.random() < 0.5 ? 'lancers' : 'opponent';
        const half = (phase === 'Q1' || phase === 'Q2') ? 'first' : 'second';
        if (timeouts[team][half] < 4) {
          timeouts[team][half] += 1;
          const remaining = 4 - timeouts[team][half];
          currentTime = new Date(currentTime.getTime() + 5000);
          events.push({
            id: simGenerateEventId(),
            timestamp: Timestamp.fromDate(currentTime),
            gamePhase: phase,
            type: 'timeout',
            team: team,
            description: `${team === 'lancers' ? 'Lancers' : 'Opponent'} TIMEOUT (${remaining} left)`
          });
        }
      }
    }
    currentTime = new Date(currentTime.getTime() + 3 * 60 * 1000);
  }

  let result;
  if (lancersScore > opponentScore) {
    result = 'W';
  } else if (lancersScore < opponentScore) {
    result = 'L';
  } else {
    lancersScore += 2;
    playerStats[simPickRandom(onCourt)].points += 2;
    result = 'W';
  }

  currentTime = new Date(currentTime.getTime() + 10000);
  const resultText = result === 'W' ? 'WIN' : 'LOSS';
  events.push({
    id: simGenerateEventId(),
    timestamp: Timestamp.fromDate(currentTime),
    gamePhase: 'final',
    type: 'phase',
    description: `FINAL: Lancers ${resultText} ${lancersScore}-${opponentScore}`
  });

  return { events, playerStats, lancersScore, opponentScore, result, timeouts, onCourt, gameStartTime, gameEndTime: currentTime };
}

// Simulate season data endpoint
exports.simulateSeasonData = onRequest({ timeoutSeconds: 300 }, async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const SIMULATED_TODAY = new Date(request.query.date || '2027-01-25');
  const results = { deleted: {}, created: {} };

  try {
    // Delete existing data
    console.log('Deleting existing data...');

    const gameStatsSnapshot = await db.collection('gameStats').get();
    for (const doc of gameStatsSnapshot.docs) {
      await doc.ref.delete();
    }
    results.deleted.gameStats = gameStatsSnapshot.size;

    const attendanceSnapshot = await db.collection('attendance').get();
    for (const doc of attendanceSnapshot.docs) {
      await doc.ref.delete();
    }
    results.deleted.attendance = attendanceSnapshot.size;

    const highlightsSnapshot = await db.collection('highlights').get();
    for (const doc of highlightsSnapshot.docs) {
      await doc.ref.delete();
    }
    results.deleted.highlights = highlightsSnapshot.size;

    const volunteersSnapshot = await db.collection('volunteers').get();
    for (const doc of volunteersSnapshot.docs) {
      await doc.ref.delete();
    }
    results.deleted.volunteers = volunteersSnapshot.size;

    // Create attendance
    console.log('Creating attendance...');
    let attendanceCount = 0;
    const allSimEvents = [
      ...simGames.map(g => ({ ...g, type: 'game' })),
      ...simEvents.map(e => ({ ...e, type: 'event' }))
    ];

    for (const event of allSimEvents) {
      const eventDate = new Date(event.date);
      if (eventDate >= SIMULATED_TODAY) continue;

      for (const player of simPlayers) {
        const status = Math.random() < 0.85 ? 'yes' : (Math.random() < 0.5 ? 'no' : 'maybe');
        await db.collection('attendance').add({
          gameId: event.id,
          playerId: player.id,
          playerName: player.firstName,
          status: status,
          respondedBy: `parent_${player.id}@example.com`,
          respondedAt: Timestamp.fromDate(
            new Date(eventDate.getTime() - simRandomInt(1, 5) * 24 * 60 * 60 * 1000)
          )
        });
        attendanceCount++;
      }
    }
    results.created.attendance = attendanceCount;

    // Create game stats with play-by-play
    console.log('Creating game stats...');
    let gameCount = 0;
    const gameResults = [];

    for (const game of simGames) {
      const gameDate = new Date(game.date);
      if (gameDate >= SIMULATED_TODAY) continue;

      const gameStartTime = parseSimGameTime(game.date, game.time);
      const gameData = generateSimGamePlayByPlay(game, gameStartTime);

      await db.collection('gameStats').doc(game.id.toString()).set({
        gameId: game.id,
        isLive: false,
        gamePhase: 'final',
        playerStats: gameData.playerStats,
        opponentScore: gameData.opponentScore,
        lancersScore: gameData.lancersScore,
        onCourt: gameData.onCourt,
        events: gameData.events,
        timeouts: gameData.timeouts,
        result: gameData.result,
        finalScore: `${gameData.lancersScore}-${gameData.opponentScore}`,
        trackedBy: 'lmeltabarger@icloud.com',
        startedAt: Timestamp.fromDate(gameData.gameStartTime),
        endedAt: Timestamp.fromDate(gameData.gameEndTime)
      });

      gameResults.push({
        id: game.id,
        opponent: game.opponent,
        result: gameData.result,
        score: `${gameData.lancersScore}-${gameData.opponentScore}`,
        events: gameData.events.length
      });
      gameCount++;
    }
    results.created.gameStats = gameCount;
    results.games = gameResults;

    // Create highlights
    console.log('Creating highlights...');
    let highlightCount = 0;

    const newGameStatsSnapshot = await db.collection('gameStats').get();
    for (const doc of newGameStatsSnapshot.docs) {
      const gameData = doc.data();
      const gameId = parseInt(doc.id);
      const events = gameData.events || [];

      const scoringEvents = events.filter(e =>
        e.type === 'stat' && e.stat === 'points' && e.team === 'lancers' && e.value >= 2 && e.playerId
      );

      const numHighlights = Math.min(simRandomInt(2, 4), scoringEvents.length);
      const selectedEvents = [];

      for (let i = 0; i < numHighlights && scoringEvents.length > 0; i++) {
        const idx = simRandomInt(0, scoringEvents.length - 1);
        selectedEvents.push(scoringEvents.splice(idx, 1)[0]);
      }

      for (const event of selectedEvents) {
        const player = simPlayers.find(p => p.id === event.playerId);
        if (!player) continue;

        const eventTime = event.timestamp.toDate();
        await db.collection('highlights').add({
          gameId: gameId,
          playerId: event.playerId,
          playerName: player.firstName,
          eventId: event.id,
          mediaType: Math.random() < 0.7 ? 'video' : 'image',
          mediaUrl: `https://example.com/placeholder-${gameId}-${event.playerId}.mp4`,
          thumbnailUrl: `https://example.com/placeholder-thumb-${gameId}-${event.playerId}.jpg`,
          caption: event.description,
          uploadedBy: `parent_${event.playerId}@example.com`,
          timestamp: event.timestamp,
          createdAt: Timestamp.fromDate(
            new Date(eventTime.getTime() + simRandomInt(5, 30) * 60 * 1000)
          )
        });
        highlightCount++;
      }
    }
    results.created.highlights = highlightCount;

    // Create volunteers for past games, today's games, and next 3 upcoming games
    console.log('Creating volunteers...');
    let volunteerCount = 0;
    const usedParents = []; // Track which parents have volunteered to distribute evenly

    // Calculate end of simulated today for comparison
    const simulatedTodayEnd = new Date(SIMULATED_TODAY);
    simulatedTodayEnd.setHours(23, 59, 59, 999);

    // Find games that need volunteers: past, today, and next 3 upcoming
    const upcomingGames = simGames
      .filter(g => new Date(g.date) > simulatedTodayEnd)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
    const upcomingGameIds = upcomingGames.map(g => g.id);

    for (const game of simGames) {
      const gameDate = new Date(game.date);
      // Include past games, today's games, and next 3 upcoming
      const isPastOrToday = gameDate <= simulatedTodayEnd;
      const isUpcoming3 = upcomingGameIds.includes(game.id);
      if (!isPastOrToday && !isUpcoming3) continue;

      const gameTime = parseSimGameTime(game.date, game.time);
      const signupTime = new Date(gameDate.getTime() - simRandomInt(1, 5) * 24 * 60 * 60 * 1000);

      // Pick scorekeeper (avoid same parent twice in a row if possible)
      let availableParents = simParents.filter(p => !usedParents.includes(p.email));
      if (availableParents.length < 2) {
        availableParents = simParents;
        usedParents.length = 0;
      }
      const scorekeeperIdx = simRandomInt(0, availableParents.length - 1);
      const scorekeeper = availableParents[scorekeeperIdx];
      usedParents.push(scorekeeper.email);

      // Pick table worker (different from scorekeeper)
      availableParents = availableParents.filter(p => p.email !== scorekeeper.email);
      const tableWorkerIdx = simRandomInt(0, availableParents.length - 1);
      const tableWorker = availableParents[tableWorkerIdx];
      usedParents.push(tableWorker.email);

      await db.collection('volunteers').doc(game.id.toString()).set({
        gameId: game.id,
        scorekeeper: {
          name: scorekeeper.name,
          email: scorekeeper.email,
          playerId: scorekeeper.playerId,
          signedUpAt: Timestamp.fromDate(signupTime)
        },
        tableWorker: {
          name: tableWorker.name,
          email: tableWorker.email,
          playerId: tableWorker.playerId,
          signedUpAt: Timestamp.fromDate(new Date(signupTime.getTime() + simRandomInt(1, 24) * 60 * 60 * 1000))
        }
      });
      volunteerCount++;
    }
    results.created.volunteers = volunteerCount;

    console.log('Simulation complete!');
    response.json({
      success: true,
      simulatedDate: SIMULATED_TODAY.toISOString().split('T')[0],
      results: results
    });

  } catch (error) {
    console.error('Simulation error:', error);
    response.status(500).json({ success: false, error: error.message });
  }
});
