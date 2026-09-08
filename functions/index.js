const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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
exports.syncConfig = onRequest(async (request, response) => {
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
