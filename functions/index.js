const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

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

  // Use data-only message to prevent FCM from auto-showing notification
  // Our service worker will handle displaying it
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

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Remove invalid tokens
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
exports.onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const senderUid = message.uid;

    // Don't notify about system messages
    if (!message.senderName) return null;

    const title = `${message.senderName}`;
    const body = message.text.length > 100
      ? message.text.substring(0, 100) + '...'
      : message.text;

    // Get all tokens except the sender's
    const tokensSnapshot = await db.collection('fcmTokens').get();
    const tokens = [];

    tokensSnapshot.forEach(doc => {
      const tokenData = doc.data();
      // Exclude the sender's tokens
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
exports.sendAnnouncement = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { title, body } = data;

  if (!title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Title and body required');
  }

  await sendToAllDevices(title, body, {
    type: 'announcement',
    url: '/index.html'
  });

  return { success: true };
});

// Simple test endpoint
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Jr. Lancers Basketball!");
});

// Scheduled function to send attendance reminders
// Runs daily at 9 AM Central time
exports.sendAttendanceReminders = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('America/Chicago')
  .onRun(async (context) => {
    console.log('Running attendance reminder check...');

    try {
      // Load schedule and roster from Firestore config
      const scheduleDoc = await db.collection('config').doc('schedule').get();
      const rosterDoc = await db.collection('config').doc('roster').get();

      if (!scheduleDoc.exists || !rosterDoc.exists) {
        console.log('Schedule or roster config not found in Firestore');
        return null;
      }

      const schedule = scheduleDoc.data();
      const roster = rosterDoc.data();

      if (!schedule.games || !roster.players) {
        console.log('Invalid schedule or roster data');
        return null;
      }

      // Find games within 4 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingGames = schedule.games.filter(game => {
        const gameDate = new Date(game.date);
        gameDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((gameDate - today) / (1000 * 60 * 60 * 24));
        return daysUntil > 0 && daysUntil <= 4 && !game.result;
      });

      if (upcomingGames.length === 0) {
        console.log('No upcoming games within 4 days');
        return null;
      }

      // Process each upcoming game
      for (const game of upcomingGames) {
        console.log(`Processing game ${game.id}: vs ${game.opponent}`);

        // Get all attendance responses for this game
        const attendanceSnapshot = await db.collection('attendance')
          .where('gameId', '==', game.id)
          .get();

        const respondedPlayerIds = new Set();
        attendanceSnapshot.forEach(doc => {
          respondedPlayerIds.add(doc.data().playerId);
        });

        // Find non-responders
        const nonResponders = roster.players.filter(player =>
          !respondedPlayerIds.has(player.id)
        );

        if (nonResponders.length === 0) {
          console.log(`All players have responded for game ${game.id}`);
          continue;
        }

        console.log(`Found ${nonResponders.length} non-responders for game ${game.id}`);

        // Collect all parent emails for non-responders
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

        // Get FCM tokens for these parents
        const tokensSnapshot = await db.collection('fcmTokens').get();
        const tokensToNotify = [];

        tokensSnapshot.forEach(doc => {
          const tokenData = doc.data();
          if (tokenData.token && tokenData.email && parentEmails.has(tokenData.email.toLowerCase())) {
            tokensToNotify.push(tokenData.token);
          }
        });

        if (tokensToNotify.length === 0) {
          console.log(`No FCM tokens found for non-responders of game ${game.id}`);
          continue;
        }

        // Build notification
        const gameTitle = `vs ${game.opponent}`;
        const gameDate = new Date(game.date);
        const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const title = 'RSVP Needed';
        const body = `${gameTitle} on ${dateStr} - Let us know if your player can attend!`;

        // Send notifications
        const message = {
          data: {
            title: title,
            body: body,
            type: 'attendance',
            url: `/attendance.html?game=${game.id}`
          },
          tokens: tokensToNotify
        };

        try {
          const response = await messaging.sendEachForMulticast(message);
          console.log(`Sent ${response.successCount} attendance reminders for game ${game.id}, ${response.failureCount} failed`);
        } catch (error) {
          console.error(`Error sending attendance reminders for game ${game.id}:`, error);
        }
      }

      return null;
    } catch (error) {
      console.error('Error in sendAttendanceReminders:', error);
      return null;
    }
  });

// Manual trigger for attendance reminders (for testing)
exports.triggerAttendanceReminders = functions.https.onRequest(async (request, response) => {
  // Simple API key check
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  try {
    // Load schedule and roster from Firestore config
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

    // Find games within 4 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingGames = schedule.games.filter(game => {
      const gameDate = new Date(game.date);
      gameDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((gameDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 4 && !game.result;
    });

    const results = [];

    for (const game of upcomingGames) {
      // Get attendance responses
      const attendanceSnapshot = await db.collection('attendance')
        .where('gameId', '==', game.id)
        .get();

      const respondedPlayerIds = new Set();
      attendanceSnapshot.forEach(doc => {
        respondedPlayerIds.add(doc.data().playerId);
      });

      // Find non-responders
      const nonResponders = roster.players.filter(player =>
        !respondedPlayerIds.has(player.id)
      );

      // Collect parent emails
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

      // Get FCM tokens
      const tokensSnapshot = await db.collection('fcmTokens').get();
      const tokensToNotify = [];

      tokensSnapshot.forEach(doc => {
        const tokenData = doc.data();
        if (tokenData.token && tokenData.email && parentEmails.has(tokenData.email.toLowerCase())) {
          tokensToNotify.push(tokenData.token);
        }
      });

      if (tokensToNotify.length > 0) {
        const gameTitle = `vs ${game.opponent}`;
        const gameDate = new Date(game.date);
        const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const message = {
          data: {
            title: 'RSVP Needed',
            body: `${gameTitle} on ${dateStr} - Let us know if your player can attend!`,
            type: 'attendance',
            url: `/attendance.html?game=${game.id}`
          },
          tokens: tokensToNotify
        };

        const sendResult = await messaging.sendEachForMulticast(message);
        results.push({
          gameId: game.id,
          opponent: game.opponent,
          nonResponders: nonResponders.length,
          notificationsSent: sendResult.successCount,
          notificationsFailed: sendResult.failureCount
        });
      } else {
        results.push({
          gameId: game.id,
          opponent: game.opponent,
          nonResponders: nonResponders.length,
          notificationsSent: 0,
          reason: 'No FCM tokens found for non-responders'
        });
      }
    }

    response.json({
      success: true,
      gamesChecked: upcomingGames.length,
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
exports.syncConfig = functions.https.onRequest(async (request, response) => {
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
    // TODO: Update these URLs when deployed
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
