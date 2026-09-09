const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const sgMail = require('@sendgrid/mail');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// Define secrets
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
// Cloudinary secrets removed - now using GCP Transcoder API

// Single notification function for all use cases
// options.emails - array of emails to send to (null = everyone)
// options.excludeUid - uid to exclude (for chat - don't notify sender)
async function sendNotification(title, body, data = {}, options = {}) {
  const tokensSnapshot = await db.collection('fcmTokens').get();
  const tokens = [];

  const targetEmails = options.emails?.map(e => e.toLowerCase());

  tokensSnapshot.forEach(doc => {
    const tokenData = doc.data();
    if (!tokenData.token) return;

    // Exclude sender for chat
    if (options.excludeUid && tokenData.uid === options.excludeUid) return;

    // Filter by email list if provided
    if (targetEmails && !targetEmails.includes(tokenData.email?.toLowerCase())) return;

    tokens.push(tokenData.token);
  });

  if (tokens.length === 0) {
    console.log(`Notification "${title}": No tokens to send to`);
    return;
  }

  console.log(`Notification "${title}": Sending to ${tokens.length} devices`);

  try {
    const response = await messaging.sendEachForMulticast({
      data: { title, body, ...data },
      tokens
    });
    console.log(`Notification "${title}": ${response.successCount} sent, ${response.failureCount} failed`);
  } catch (error) {
    console.error(`Notification "${title}": Error -`, error.message);
  }
}

// Helper to get head coach email
async function getHeadCoachEmail() {
  const rosterDoc = await db.collection('config').doc('roster').get();
  const coaches = rosterDoc.exists ? rosterDoc.data().coaches || [] : [];
  const headCoach = coaches.find(c => c.role === 'Head Coach');
  return headCoach?.email ? [headCoach.email] : [];
}

// Trigger on new chat message
exports.onNewMessage = onDocumentCreated('messages/{messageId}', async (event) => {
  const message = event.data.data();
  if (!message.senderName) return null;

  const body = message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text;

  await sendNotification(
    message.senderName,
    body,
    { type: 'chat', url: '/messages.html' },
    { excludeUid: message.uid }
  );

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

  await sendNotification(title, body, { type: 'announcement', url: '/index.html' });

  return { success: true };
});

// Simple test endpoint
exports.helloWorld = onRequest((request, response) => {
  response.send("Hello from Jr. Lancers Basketball!");
});

// Debug endpoint to inspect FCM tokens
exports.debugTokens = onRequest(async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const rosterDoc = await db.collection('config').doc('roster').get();
  const coaches = rosterDoc.exists ? rosterDoc.data().coaches || [] : [];
  const headCoach = coaches.find(c => c.role === 'Head Coach');

  const tokensSnapshot = await db.collection('fcmTokens').get();
  const tokens = [];

  tokensSnapshot.forEach(doc => {
    const data = doc.data();
    tokens.push({
      docId: doc.id,
      email: data.email,
      hasToken: !!data.token,
      tokenPreview: data.token ? data.token.substring(0, 30) + '...' : 'none',
      isCoach: headCoach && data.email?.toLowerCase() === headCoach.email?.toLowerCase()
    });
  });

  response.json({
    headCoachEmail: headCoach?.email || 'not found',
    tokenCount: tokens.length,
    tokens: tokens
  });
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

// Send scorekeeper reminder 10 minutes before game - runs every 5 minutes
exports.sendScorekeeperReminders = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'America/Chicago'
}, async (event) => {
  console.log('Checking for games starting soon...');

  try {
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    if (!scheduleDoc.exists) {
      console.log('Schedule config not found');
      return null;
    }

    const schedule = scheduleDoc.data();
    const games = schedule.games || [];

    const now = new Date();
    // Check for games starting in 8-15 minutes (gives buffer for 5-min schedule)
    const windowStart = new Date(now.getTime() + 8 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    for (const game of games) {
      if (game.result) continue; // Skip completed games

      // Parse game date/time
      const [year, month, day] = game.date.split('-').map(Number);
      const [hour, minutePart] = game.time.split(':');
      const [minutes, ampm] = minutePart.split(' ');
      let h = parseInt(hour);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;

      const gameStart = new Date(year, month - 1, day, h, parseInt(minutes));

      // Check if game is in the reminder window
      if (gameStart >= windowStart && gameStart <= windowEnd) {
        console.log(`Game ${game.id} vs ${game.opponent} starts at ${gameStart.toISOString()}`);

        // Get volunteer data to find scorekeeper
        const volunteerDoc = await db.collection('volunteers').doc(game.id.toString()).get();
        if (!volunteerDoc.exists || !volunteerDoc.data().scorekeeper) {
          console.log(`No scorekeeper assigned for game ${game.id}`);
          continue;
        }

        const scorekeeper = volunteerDoc.data().scorekeeper;
        const scorekeeperEmail = scorekeeper.email?.toLowerCase();

        if (!scorekeeperEmail) {
          console.log(`No scorekeeper email for game ${game.id}`);
          continue;
        }

        // Check if we already sent a reminder for this game
        const reminderKey = `scorekeeperReminder_${game.id}`;
        const reminderDoc = await db.collection('notificationsSent').doc(reminderKey).get();
        if (reminderDoc.exists) {
          console.log(`Already sent scorekeeper reminder for game ${game.id}`);
          continue;
        }

        // Find FCM token for scorekeeper
        const tokensSnapshot = await db.collection('fcmTokens')
          .where('email', '==', scorekeeperEmail)
          .get();

        if (tokensSnapshot.empty) {
          console.log(`No FCM token for scorekeeper ${scorekeeperEmail}`);
          continue;
        }

        const tokens = [];
        tokensSnapshot.forEach(doc => {
          if (doc.data().token) tokens.push(doc.data().token);
        });

        if (tokens.length === 0) continue;

        // Send notification
        const message = {
          data: {
            title: 'Game Starting Soon!',
            body: `You're scorekeeping vs ${game.opponent} in 10 minutes`,
            type: 'scorekeeperReminder',
            url: `/game-stats.html?game=${game.id}`
          },
          tokens: tokens
        };

        try {
          const response = await messaging.sendEachForMulticast(message);
          console.log(`Scorekeeper reminder sent for game ${game.id}: ${response.successCount} success, ${response.failureCount} failed`);

          // Mark reminder as sent
          await db.collection('notificationsSent').doc(reminderKey).set({
            gameId: game.id,
            sentAt: Timestamp.now(),
            sentTo: scorekeeperEmail
          });
        } catch (err) {
          console.error(`Error sending scorekeeper reminder for game ${game.id}:`, err);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error in sendScorekeeperReminders:', error);
    return null;
  }
});

// Manual trigger for scorekeeper reminder (for testing)
exports.triggerScorekeeperReminder = onRequest(async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const gameId = request.query.gameId;
  if (!gameId) {
    response.status(400).json({ error: 'gameId parameter required' });
    return;
  }

  try {
    // Get game info from schedule
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    if (!scheduleDoc.exists) {
      response.status(404).json({ error: 'Schedule not found' });
      return;
    }

    const games = scheduleDoc.data().games || [];
    const game = games.find(g => g.id.toString() === gameId);
    if (!game) {
      response.status(404).json({ error: `Game ${gameId} not found in schedule` });
      return;
    }

    // Get volunteer data to find scorekeeper
    const volunteerDoc = await db.collection('volunteers').doc(gameId).get();
    if (!volunteerDoc.exists || !volunteerDoc.data().scorekeeper) {
      response.status(404).json({ error: `No scorekeeper assigned for game ${gameId}` });
      return;
    }

    const scorekeeper = volunteerDoc.data().scorekeeper;
    const scorekeeperEmail = scorekeeper.email?.toLowerCase();

    if (!scorekeeperEmail) {
      response.status(404).json({ error: 'Scorekeeper has no email' });
      return;
    }

    // Find FCM token for scorekeeper
    const tokensSnapshot = await db.collection('fcmTokens')
      .where('email', '==', scorekeeperEmail)
      .get();

    if (tokensSnapshot.empty) {
      response.json({
        success: false,
        error: `No FCM token for ${scorekeeperEmail}`,
        scorekeeper: scorekeeper.name
      });
      return;
    }

    const tokens = [];
    tokensSnapshot.forEach(doc => {
      if (doc.data().token) tokens.push(doc.data().token);
    });

    // Send notification
    const message = {
      data: {
        title: 'Game Starting Soon!',
        body: `You're scorekeeping vs ${game.opponent} in 10 minutes`,
        type: 'scorekeeperReminder',
        url: `/game-stats.html?game=${gameId}`
      },
      tokens: tokens
    };

    const result = await messaging.sendEachForMulticast(message);

    response.json({
      success: true,
      gameId: gameId,
      opponent: game.opponent,
      scorekeeper: scorekeeper.name,
      scorekeeperEmail: scorekeeperEmail,
      tokenCount: tokens.length,
      sent: result.successCount,
      failed: result.failureCount
    });

  } catch (error) {
    console.error('Error triggering scorekeeper reminder:', error);
    response.status(500).json({ error: error.message });
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
    await sendNotification(
      'Game Started!',
      `Lancers vs ${opponentName} is now LIVE!`,
      { type: 'gameStarted', url: gameUrl, gameId: gameId }
    );

    console.log(`Game start notification sent for game ${gameId}`);
    return null;
  } catch (error) {
    console.error('Error sending game start notification:', error);
    return null;
  }
});

// Trigger notification when game ends (phase changes to 'final')
exports.onGameEnded = onDocumentUpdated('gameStats/{gameId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only trigger when phase changes TO 'final' (and wasn't already final)
  if (before.gamePhase === 'final' || after.gamePhase !== 'final') {
    return null;
  }

  const gameId = event.params.gameId;
  console.log(`Game ${gameId} ended! Sending notifications...`);

  try {
    // Get game details from schedule
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    const games = scheduleDoc.exists ? scheduleDoc.data().games || [] : [];
    const game = games.find(g => g.id.toString() === gameId);

    const opponentName = game ? game.opponent : 'Opponent';
    const lancersScore = after.lancersScore || 0;
    const oppScore = after.opponentScore || 0;
    const result = lancersScore > oppScore ? 'WIN' : (lancersScore < oppScore ? 'LOSS' : 'TIE');
    const gameUrl = `/game-detail.html?id=${gameId}`;

    // Send notification to everyone - upload highlights
    await sendNotification(
      `Game Over - ${result}!`,
      `Lancers ${lancersScore} - ${opponentName} ${oppScore}. Now is the time to upload highlights!`,
      { type: 'gameEnded', url: gameUrl, gameId: gameId }
    );

    // Send notification to head coach - add commentary
    await sendNotification(
      'Add Your Game Commentary',
      `Share your thoughts on the ${opponentName} game before the wrap-up is generated.`,
      { type: 'coachCommentary', url: `${gameUrl}#coach-notes-card`, gameId: gameId },
      { emails: await getHeadCoachEmail() }
    );

    // Create wrap-up document with 2-hour coach window
    const windowEnds = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db.collection('wrapups').doc(gameId).set({
      gameId: parseInt(gameId),
      status: 'pending',
      coachNotes: null,
      coachWindowEndsAt: Timestamp.fromDate(windowEnds),
      gameEndedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      opponent: opponentName,
      finalScore: `${lancersScore}-${oppScore}`,
      result: result
    });

    // Schedule wrap-up generation via Cloud Tasks (2 hours from now)
    // Wrapped in try-catch so Cloud Tasks failures don't break notifications
    try {
      await scheduleWrapupGeneration(gameId, windowEnds);
      console.log(`Wrap-up scheduled for game ${gameId} at ${windowEnds.toISOString()}`);
    } catch (taskError) {
      console.error('Cloud Tasks scheduling failed (non-fatal):', taskError.message);
      console.log('Wrap-up will need to be triggered manually');
    }

    return null;
  } catch (error) {
    console.error('Error in game end handler:', error);
    return null;
  }
});

// ============================================================
// POST-GAME WRAP-UP GENERATION
// ============================================================

// Schedule wrap-up generation using Cloud Tasks
async function scheduleWrapupGeneration(gameId, executeAt) {
  const { CloudTasksClient } = require('@google-cloud/tasks');
  const client = new CloudTasksClient();

  const project = process.env.GCLOUD_PROJECT || 'lancers-bball';
  const location = 'us-central1';
  const queue = 'wrapup-generation';

  const functionUrl = `https://${location}-${project}.cloudfunctions.net/generateWrapupReport`;

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: functionUrl,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ gameId: gameId.toString() })).toString('base64')
    },
    scheduleTime: {
      seconds: Math.floor(executeAt.getTime() / 1000)
    }
  };

  const parent = client.queuePath(project, location, queue);

  try {
    await client.createTask({ parent, task });
    console.log(`Task scheduled for game ${gameId} at ${executeAt.toISOString()}`);
  } catch (error) {
    // If Cloud Tasks queue doesn't exist, fall back to immediate generation
    if (error.code === 5) { // NOT_FOUND
      console.log('Cloud Tasks queue not found. Will use scheduled function fallback.');
      // Mark for scheduled function pickup
      await db.collection('wrapups').doc(gameId.toString()).update({
        needsGeneration: true
      });
    } else {
      console.error('Error scheduling task:', error);
      throw error;
    }
  }
}

// Generate wrap-up report using Claude API and Cloudinary
exports.generateWrapupReport = onRequest({
  secrets: [anthropicApiKey],
  timeoutSeconds: 300,
  memory: '1GiB'
}, async (request, response) => {
  // Allow CORS for browser requests (regenerate button)
  response.set('Access-Control-Allow-Origin', '*');
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.status(204).send('');
    return;
  }

  const gameId = request.body.gameId || request.query.gameId;

  if (!gameId) {
    response.status(400).json({ error: 'gameId required' });
    return;
  }

  console.log(`Generating wrap-up for game ${gameId}...`);

  try {
    // Fetch all required data
    const [wrapupDoc, gameStatsDoc, highlightsSnapshot, scheduleDoc] = await Promise.all([
      db.collection('wrapups').doc(gameId.toString()).get(),
      db.collection('gameStats').doc(gameId.toString()).get(),
      db.collection('highlights').where('gameId', '==', parseInt(gameId)).get(),
      db.collection('config').doc('schedule').get()
    ]);

    // Create wrap-up document if it doesn't exist (for regeneration)
    let wrapupData;
    if (!wrapupDoc.exists) {
      console.log(`Creating wrap-up document for game ${gameId}`);
      const windowEnds = new Date(Date.now() + 2 * 60 * 60 * 1000);
      wrapupData = {
        gameId: parseInt(gameId),
        status: 'pending',
        coachNotes: null,
        coachWindowEndsAt: Timestamp.fromDate(windowEnds),
        gameEndedAt: Timestamp.now(),
        createdAt: Timestamp.now()
      };
      await db.collection('wrapups').doc(gameId.toString()).set(wrapupData);
    } else {
      wrapupData = wrapupDoc.data();
    }

    // Skip if already complete (approved and sent to everyone) - never regenerate
    if (wrapupData.status === 'complete') {
      console.log(`Wrap-up for game ${gameId} already complete, skipping`);
      response.json({ success: true, skipped: true, message: 'Already complete' });
      return;
    }

    // Skip if pending approval (already generated, waiting for coach) unless regenerate requested
    if (wrapupData.status === 'pendingApproval' && !regenerate) {
      console.log(`Wrap-up for game ${gameId} pending approval, skipping (use regenerate=true to force)`);
      response.json({ success: true, skipped: true, message: 'Pending approval - use regenerate=true to force' });
      return;
    }

    if (!gameStatsDoc.exists) {
      response.status(404).json({ error: 'Game stats not found' });
      return;
    }
    const gameStats = gameStatsDoc.data();

    // Update status to 'generating'
    const wrapupRef = db.collection('wrapups').doc(gameId.toString());
    await wrapupRef.update({
      status: 'generating',
      updatedAt: Timestamp.now()
    });

    // Get opponent name from schedule
    const games = scheduleDoc.exists ? scheduleDoc.data().games || [] : [];
    const game = games.find(g => g.id.toString() === gameId.toString());
    const opponentName = game ? game.opponent : wrapupData.opponent || 'Opponent';

    // Generate AI narrative
    const narrative = await generateNarrativeWithClaude(gameStats, wrapupData, opponentName);

    // Compile highlights video (if any video highlights exist)
    const highlights = [];
    highlightsSnapshot.forEach(doc => highlights.push({ id: doc.id, ...doc.data() }));

    let compiledVideo = null;
    const videoHighlights = highlights.filter(h =>
      h.mediaType === 'video' &&
      (h.downloadUrl || h.url) &&
      !(h.downloadUrl || h.url).includes('example.com')
    );

    if (videoHighlights.length > 0) {
      // Debug: log each video highlight's URL
      console.log(`Video highlights to compile (${videoHighlights.length}):`);
      videoHighlights.forEach((h, i) => {
        console.log(`  [${i}] id=${h.id} url=${(h.downloadUrl || h.url).substring(0, 100)}...`);
      });
      compiledVideo = await compileHighlightsVideo(gameId, videoHighlights);
    }

    // Check if already pending approval (avoid duplicate notifications on regenerate)
    const wasAlreadyPending = wrapupData.status === 'pendingApproval';

    // Save results - pending coach approval
    await wrapupRef.update({
      status: 'pendingApproval',
      report: narrative,
      compiledVideo: compiledVideo,
      highlightCount: highlights.length,
      updatedAt: Timestamp.now()
    });

    // Send notification to head coach for approval
    const title = wasAlreadyPending ? 'Wrap-Up Updated' : 'Wrap-Up Ready for Review';
    const body = wasAlreadyPending
      ? `The ${opponentName} game recap has been regenerated`
      : `The ${opponentName} game recap is ready for your approval`;

    await sendNotification(
      title,
      body,
      { type: 'wrapupPendingApproval', url: `/game-detail.html?id=${gameId}#wrapup-card`, gameId: gameId.toString() },
      { emails: await getHeadCoachEmail() }
    );
    response.json({ success: true, gameId });

  } catch (error) {
    console.error('Error generating wrap-up:', error);

    // Update status to error
    await db.collection('wrapups').doc(gameId.toString()).update({
      status: 'error',
      error: error.message,
      updatedAt: Timestamp.now()
    });

    response.status(500).json({ error: error.message });
  }
});

// Approve wrap-up and send notification to all parents
exports.approveWrapup = onRequest(async (request, response) => {
  // Allow CORS for the web app
  response.set('Access-Control-Allow-Origin', '*');
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.status(204).send('');
    return;
  }

  const gameId = request.query.gameId || request.body.gameId;
  if (!gameId) {
    response.status(400).json({ error: 'gameId is required' });
    return;
  }

  try {
    const wrapupDoc = await db.collection('wrapups').doc(gameId.toString()).get();
    if (!wrapupDoc.exists) {
      response.status(404).json({ error: 'Wrap-up not found' });
      return;
    }

    const wrapupData = wrapupDoc.data();
    if (wrapupData.status !== 'pendingApproval') {
      response.status(400).json({ error: `Wrap-up status is ${wrapupData.status}, not pendingApproval` });
      return;
    }

    // Update status to complete
    await wrapupDoc.ref.update({
      status: 'complete',
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const opponentName = wrapupData.opponent || 'Opponent';

    // Send notification to everyone
    await sendNotification(
      'Game Wrap-Up Ready!',
      `Check out the recap from the ${opponentName} game`,
      { type: 'wrapupReady', url: `/game-detail.html?id=${gameId}#wrapup-card`, gameId: gameId.toString() }
    );

    console.log(`Wrap-up approved and published for game ${gameId}`);
    response.json({ success: true, gameId });

  } catch (error) {
    console.error('Error approving wrap-up:', error);
    response.status(500).json({ error: error.message });
  }
});

// Generate narrative using Claude API
async function generateNarrativeWithClaude(gameStats, wrapupData, opponentName) {
  const Anthropic = require('@anthropic-ai/sdk');

  const apiKey = anthropicApiKey.value();
  if (!apiKey) {
    console.log('Anthropic API key not configured, using fallback narrative');
    return generateFallbackNarrative(gameStats, wrapupData, opponentName);
  }

  const client = new Anthropic({ apiKey });

  // Build context from play-by-play events
  const events = gameStats.events || [];
  const scoringPlays = events.filter(e => e.type === 'stat' && e.stat === 'points' && e.team === 'lancers');
  const playerStats = gameStats.playerStats || {};

  // Get top performers
  const playerStatsList = Object.entries(playerStats)
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  const lancersScore = gameStats.lancersScore || 0;
  const oppScore = gameStats.opponentScore || 0;
  const result = lancersScore > oppScore ? 'WIN' : (lancersScore < oppScore ? 'LOSS' : 'TIE');

  const prompt = `You are writing a game recap for a 5th grade boys basketball team called the Jr. Lancers.

GAME DATA:
- Final Score: Lancers ${lancersScore} - ${opponentName} ${oppScore}
- Result: ${result}

PLAY-BY-PLAY HIGHLIGHTS (scoring plays):
${scoringPlays.slice(0, 25).map(e => `- ${e.gamePhase}: ${e.description} (Score: ${e.lancersScore}-${e.opponentScore})`).join('\n')}

PLAYER STATISTICS:
${playerStatsList.map(stats =>
  `- ${stats.name}: ${stats.points || 0} pts, ${stats.rebounds || 0} reb, ${stats.assists || 0} ast, ${stats.steals || 0} stl`
).join('\n')}

${wrapupData.coachNotes ? `
COACH NOTES:
Commentary: ${wrapupData.coachNotes.commentary || 'None provided'}
Player Shoutouts: ${(wrapupData.coachNotes.playerShoutouts || []).map(s => `${s.note}`).join(', ') || 'None'}
Game Highlight: ${wrapupData.coachNotes.gameHighlight || 'None'}
` : ''}

Write a 2-3 paragraph game recap in an enthusiastic but professional sports journalism style.
Mention specific players and plays. Include the final score and key moments.
Keep the tone positive and encouraging - these are 10-11 year old kids.
Do not make up any statistics or events not mentioned above.
Do not use the phrase "young Lancers" - just say "Lancers" or "the team".`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    return {
      narrative: message.content[0].text,
      playerOfTheGame: playerStatsList[0] ? {
        playerId: parseInt(playerStatsList[0].id),
        name: playerStatsList[0].name,
        points: playerStatsList[0].points || 0
      } : null,
      generatedAt: Timestamp.now(),
      modelUsed: 'claude-sonnet-4-20250514'
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return generateFallbackNarrative(gameStats, wrapupData, opponentName);
  }
}

// Fallback narrative if Claude API fails
function generateFallbackNarrative(gameStats, wrapupData, opponentName) {
  const lancersScore = gameStats.lancersScore || 0;
  const oppScore = gameStats.opponentScore || 0;
  const result = lancersScore > oppScore ? 'victory' : (lancersScore < oppScore ? 'loss' : 'tie');

  const playerStats = gameStats.playerStats || {};
  const topScorer = Object.entries(playerStats)
    .sort((a, b) => (b[1].points || 0) - (a[1].points || 0))[0];

  let narrative = `The Jr. Lancers finished with a ${lancersScore}-${oppScore} ${result} against ${opponentName}. `;

  if (topScorer) {
    narrative += `${topScorer[1].name} led the team with ${topScorer[1].points || 0} points. `;
  }

  // Coach notes are private input for AI prompt only - not appended to output

  return {
    narrative,
    playerOfTheGame: topScorer ? {
      playerId: parseInt(topScorer[0]),
      name: topScorer[1].name,
      points: topScorer[1].points || 0
    } : null,
    generatedAt: Timestamp.now(),
    modelUsed: 'fallback'
  };
}

// Compile highlight videos using GCP Transcoder API
async function compileHighlightsVideo(gameId, videoHighlights) {
  const { TranscoderServiceClient } = require('@google-cloud/video-transcoder');
  const { getStorage } = require('firebase-admin/storage');

  if (!videoHighlights || videoHighlights.length === 0) {
    console.log('No video highlights to compile');
    return null;
  }

  // Sort highlights by capture time (when video was recorded), oldest first
  const sortedHighlights = [...videoHighlights].sort((a, b) => {
    const getTime = (h) => {
      if (!h.timestamp) return 0;
      return h.timestamp.toDate ? h.timestamp.toDate().getTime() : (h.timestamp.seconds || 0) * 1000;
    };
    return getTime(a) - getTime(b);
  });

  console.log(`Processing ${sortedHighlights.length} video highlights for game ${gameId} (sorted by timestamp)`);

  // Convert Firebase Storage URLs to gs:// URIs
  const bucket = getStorage().bucket();
  const bucketName = bucket.name;

  const inputUris = [];
  const seenPaths = new Set(); // Track unique paths to avoid duplicates

  for (const highlight of sortedHighlights) {
    const url = highlight.downloadUrl || highlight.url;
    if (!url || url.includes('example.com')) continue;

    // Extract path from Firebase Storage URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=...
    const match = url.match(/\/o\/([^?]+)/);
    if (match) {
      const path = decodeURIComponent(match[1]);
      // Skip duplicates
      if (seenPaths.has(path)) {
        console.log(`Skipping duplicate: ${path}`);
        continue;
      }
      seenPaths.add(path);
      inputUris.push(`gs://${bucketName}/${path}`);
      console.log(`Added input: gs://${bucketName}/${path}`);
    }
  }

  if (inputUris.length === 0) {
    console.log('No valid video URIs found');
    return null;
  }

  // For a single video, just return the original URL
  if (inputUris.length === 1) {
    const originalUrl = sortedHighlights[0].downloadUrl || sortedHighlights[0].url;
    return {
      url: originalUrl,
      highlightCount: 1,
      createdAt: Timestamp.now()
    };
  }

  try {
    const client = new TranscoderServiceClient();
    const projectId = process.env.GCLOUD_PROJECT || 'lancers-bball';
    const location = 'us-central1';
    const outputUri = `gs://${bucketName}/compiled-highlights/game${gameId}/`;
    const outputFileName = `highlight-reel-${Date.now()}.mp4`;

    // Create inputs array
    const inputs = inputUris.map((uri, index) => ({
      key: `input${index}`,
      uri: uri
    }));

    // Create edit list for concatenation (references input keys)
    // Each atom references one input and uses full duration
    const editList = inputUris.map((uri, index) => ({
      key: `atom${index}`,
      inputs: [`input${index}`],
    }));

    const job = {
      outputUri: outputUri,
      config: {
        inputs: inputs,
        editList: editList,
        elementaryStreams: [
          {
            key: 'video-stream0',
            videoStream: {
              h264: {
                heightPixels: 720,
                widthPixels: 1280,
                bitrateBps: 2500000,
                frameRate: 30,
              },
            },
          },
        ],
        muxStreams: [
          {
            key: 'sd',
            container: 'mp4',
            elementaryStreams: ['video-stream0'],
            fileName: outputFileName,
          },
        ],
      },
    };

    console.log(`Creating transcoder job with ${inputUris.length} inputs...`);

    const [response] = await client.createJob({
      parent: `projects/${projectId}/locations/${location}`,
      job: job,
    });

    console.log(`Transcoder job created: ${response.name}`);

    // Poll for job completion (with timeout)
    const maxWaitTime = 240000; // 4 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const [jobStatus] = await client.getJob({ name: response.name });

      if (jobStatus.state === 'SUCCEEDED') {
        console.log('Transcoder job completed successfully');

        // Make the file publicly readable and use public URL
        const outputFile = bucket.file(`compiled-highlights/game${gameId}/${outputFileName}`);
        try {
          await outputFile.makePublic();
          console.log('Made compiled video public');
        } catch (pubError) {
          console.log('Could not make public (may already be):', pubError.message);
        }

        // Use public URL format
        const publicUrl = `https://storage.googleapis.com/${bucketName}/compiled-highlights/game${gameId}/${outputFileName}`;
        console.log('Compiled video URL:', publicUrl);

        return {
          url: publicUrl,
          gcsPath: `${outputUri}${outputFileName}`,
          highlightCount: inputUris.length,
          createdAt: Timestamp.now()
        };
      } else if (jobStatus.state === 'FAILED') {
        console.error('Transcoder job failed:', jobStatus.error);
        return null;
      }

      console.log(`Job state: ${jobStatus.state}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    console.error('Transcoder job timed out');
    return null;

  } catch (error) {
    console.error('Transcoder error:', error.message);
    console.error('Transcoder error details:', JSON.stringify(error.details || error));
    return null;
  }
}

// Manual trigger for wrap-up generation (for testing)
exports.triggerWrapupGeneration = onRequest(async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const gameId = request.query.gameId;
  const reset = request.query.reset === 'true';

  if (!gameId) {
    response.status(400).json({ error: 'gameId parameter required' });
    return;
  }

  // Delete existing wrap-up if reset=true
  if (reset) {
    console.log(`Resetting wrap-up for game ${gameId}`);
    await db.collection('wrapups').doc(gameId).delete();
  }

  // Check if wrap-up exists
  const wrapupDoc = await db.collection('wrapups').doc(gameId).get();

  if (!wrapupDoc.exists) {
    // Create wrap-up doc if it doesn't exist
    const gameStatsDoc = await db.collection('gameStats').doc(gameId).get();
    if (!gameStatsDoc.exists) {
      response.status(404).json({ error: 'Game stats not found' });
      return;
    }

    const gameStats = gameStatsDoc.data();
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    const games = scheduleDoc.exists ? scheduleDoc.data().games || [] : [];
    const game = games.find(g => g.id.toString() === gameId);

    await db.collection('wrapups').doc(gameId).set({
      gameId: parseInt(gameId),
      status: 'pending',
      coachNotes: null,
      coachWindowEndsAt: Timestamp.now(), // Already ended for testing
      gameEndedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      opponent: game ? game.opponent : 'Opponent',
      finalScore: `${gameStats.lancersScore || 0}-${gameStats.opponentScore || 0}`,
      result: gameStats.result || 'W'
    });
  }

  // Trigger generation
  const functionUrl = `https://us-central1-lancers-bball.cloudfunctions.net/generateWrapupReport`;

  const https = require('https');
  const postData = JSON.stringify({ gameId });

  const req = https.request(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      response.json({ success: true, triggered: true, response: data });
    });
  });

  req.on('error', (error) => {
    response.status(500).json({ error: error.message });
  });

  req.write(postData);
  req.end();
});

// Scheduled fallback: Check for pending wrap-ups that need generation
exports.checkPendingWrapups = onSchedule({
  schedule: 'every 30 minutes',
  timeZone: 'America/Chicago'
}, async (event) => {
  console.log('Checking for pending wrap-ups...');

  const now = Timestamp.now();

  // Find wrap-ups where coach window has ended but status is still pending
  const pendingSnapshot = await db.collection('wrapups')
    .where('status', '==', 'pending')
    .where('coachWindowEndsAt', '<=', now)
    .get();

  if (pendingSnapshot.empty) {
    console.log('No pending wrap-ups found');
    return null;
  }

  console.log(`Found ${pendingSnapshot.size} pending wrap-ups`);

  for (const doc of pendingSnapshot.docs) {
    const gameId = doc.id;
    console.log(`Triggering wrap-up generation for game ${gameId}`);

    // Call the generate function directly
    try {
      const gameStatsDoc = await db.collection('gameStats').doc(gameId).get();
      const highlightsSnapshot = await db.collection('highlights')
        .where('gameId', '==', parseInt(gameId))
        .get();
      const scheduleDoc = await db.collection('config').doc('schedule').get();

      if (!gameStatsDoc.exists) {
        console.log(`Game stats not found for ${gameId}`);
        continue;
      }

      const wrapupData = doc.data();
      const gameStats = gameStatsDoc.data();
      const games = scheduleDoc.exists ? scheduleDoc.data().games || [] : [];
      const game = games.find(g => g.id.toString() === gameId);
      const opponentName = game ? game.opponent : wrapupData.opponent || 'Opponent';

      // Update status
      await doc.ref.update({ status: 'generating', updatedAt: Timestamp.now() });

      // Generate narrative
      const narrative = await generateNarrativeWithClaude(gameStats, wrapupData, opponentName);

      // Get highlights
      const highlights = [];
      highlightsSnapshot.forEach(hdoc => highlights.push({ id: hdoc.id, ...hdoc.data() }));

      // Save results - pending coach approval (and mark notification sent)
      await doc.ref.update({
        status: 'pendingApproval',
        report: narrative,
        highlightCount: highlights.length,
        approvalNotificationSentAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Send notification to head coach for approval
      await sendNotification(
        'Wrap-Up Ready for Review',
        `The ${opponentName} game recap is ready for your approval`,
        { type: 'wrapupPendingApproval', url: `/game-detail.html?id=${gameId}#wrapup-card`, gameId: gameId },
        { emails: await getHeadCoachEmail() }
      );

      console.log(`Wrap-up pending approval for game ${gameId}`);
    } catch (error) {
      console.error(`Error generating wrap-up for game ${gameId}:`, error);
      await doc.ref.update({
        status: 'error',
        error: error.message,
        updatedAt: Timestamp.now()
      });
    }
  }

  return null;
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

// Cleanup duplicate highlights for a game
exports.cleanupDuplicateHighlights = onRequest({ timeoutSeconds: 60 }, async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const gameId = request.query.gameId;
  if (!gameId) {
    response.status(400).json({ error: 'gameId required' });
    return;
  }

  try {
    const highlightsSnapshot = await db.collection('highlights')
      .where('gameId', '==', parseInt(gameId))
      .get();

    const highlights = [];
    highlightsSnapshot.forEach(doc => highlights.push({ id: doc.id, ...doc.data() }));

    // Group by downloadUrl to find duplicates
    const urlGroups = {};
    for (const h of highlights) {
      const url = h.downloadUrl || h.url || '';
      if (!url || url.includes('example.com')) continue;

      // Extract just the path from the URL for comparison
      const match = url.match(/\/o\/([^?]+)/);
      const key = match ? decodeURIComponent(match[1]) : url;

      if (!urlGroups[key]) {
        urlGroups[key] = [];
      }
      urlGroups[key].push(h);
    }

    const results = {
      totalHighlights: highlights.length,
      uniquePaths: Object.keys(urlGroups).length,
      duplicatesDeleted: [],
      kept: []
    };

    // For each group, keep the first one and delete the rest
    for (const [path, docs] of Object.entries(urlGroups)) {
      results.kept.push({ id: docs[0].id, path: path.substring(0, 50), mediaType: docs[0].mediaType });

      for (let i = 1; i < docs.length; i++) {
        await db.collection('highlights').doc(docs[i].id).delete();
        results.duplicatesDeleted.push({ id: docs[i].id, path: path.substring(0, 50) });
      }
    }

    response.json(results);
  } catch (error) {
    console.error('Error cleaning up highlights:', error);
    response.status(500).json({ error: error.message });
  }
});

// Delete specific highlights by ID
exports.deleteHighlights = onRequest({ timeoutSeconds: 60 }, async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const ids = request.query.ids?.split(',') || [];
  if (ids.length === 0) {
    response.status(400).json({ error: 'ids required (comma-separated)' });
    return;
  }

  const results = { deleted: [], errors: [] };
  for (const id of ids) {
    try {
      await db.collection('highlights').doc(id.trim()).delete();
      results.deleted.push(id.trim());
    } catch (e) {
      results.errors.push({ id: id.trim(), error: e.message });
    }
  }
  response.json(results);
});

// Test endpoint: Reset game and trigger end-game flow
exports.resetAndEndGame = onRequest({ timeoutSeconds: 60 }, async (request, response) => {
  const apiKey = request.query.key;
  if (apiKey !== 'lancers2026') {
    response.status(403).send('Unauthorized');
    return;
  }

  const gameId = request.query.gameId;
  if (!gameId) {
    response.status(400).json({ error: 'gameId required' });
    return;
  }

  const results = { steps: [] };

  try {
    // 1. Delete wrap-up document
    results.steps.push('Deleting wrap-up...');
    try {
      await db.collection('wrapups').doc(gameId).delete();
      results.steps.push('Wrap-up deleted');
    } catch (e) {
      results.steps.push('No wrap-up to delete');
    }

    // 2. Delete compiled video from storage
    results.steps.push('Deleting compiled video...');
    const { getStorage } = require('firebase-admin/storage');
    const bucket = getStorage().bucket();
    try {
      const [files] = await bucket.getFiles({ prefix: `compiled-highlights/game${gameId}/` });
      for (const file of files) {
        await file.delete();
        results.steps.push(`Deleted: ${file.name}`);
      }
      if (files.length === 0) results.steps.push('No compiled videos found');
    } catch (e) {
      results.steps.push(`Storage error: ${e.message}`);
    }

    // 3. Reset gamePhase to Q4
    results.steps.push('Setting gamePhase to Q4...');
    await db.collection('gameStats').doc(gameId).update({ gamePhase: 'Q4' });

    // 4. Wait 2 seconds
    results.steps.push('Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));

    // 5. Set to final to trigger onGameEnded
    results.steps.push('Setting gamePhase to final (triggers onGameEnded)...');
    await db.collection('gameStats').doc(gameId).update({ gamePhase: 'final' });

    results.steps.push('Done! onGameEnded should fire now.');
    results.expectedNotifications = [
      'All users: "Game Over - WIN/LOSS!"',
      'Coach only: "Add Your Game Commentary"'
    ];

    response.json(results);

  } catch (error) {
    console.error('Error in resetAndEndGame:', error);
    results.error = error.message;
    response.status(500).json(results);
  }
});

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
