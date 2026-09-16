#!/usr/bin/env node
/**
 * Set simulation time via Firebase function (requires coach login)
 *
 * Usage:
 *   node set-sim-time.js "Dec 13, 2026 6:28 PM"   # Set to specific time
 *   node set-sim-time.js clear                    # Clear simulation (use real time)
 *   node set-sim-time.js                          # Show current simulated time
 *
 * Time advances naturally - set to 6:28 PM and wait 2 minutes, it becomes 6:30 PM
 *
 * Note: Requires a valid Firebase ID token in ~/.firebase-token or FIREBASE_TOKEN env var
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FUNCTION_URL = 'https://us-central1-lancers-bball.cloudfunctions.net/setSimulationTime';

// Try to get token from file or env
function getToken() {
  // Check env first
  if (process.env.FIREBASE_TOKEN) {
    return process.env.FIREBASE_TOKEN;
  }
  // Check file
  const tokenPath = path.join(process.env.HOME, '.firebase-token');
  if (fs.existsSync(tokenPath)) {
    return fs.readFileSync(tokenPath, 'utf8').trim();
  }
  return null;
}

async function makeRequest(body) {
  const token = getToken();
  if (!token) {
    console.error('No Firebase token found.');
    console.error('Either:');
    console.error('  1. Set FIREBASE_TOKEN environment variable');
    console.error('  2. Save token to ~/.firebase-token');
    console.error('\nTo get a token, run in browser console while logged in:');
    console.error('  firebase.auth().currentUser.getIdToken().then(t => console.log(t))');
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(FUNCTION_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve({ raw: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const arg = process.argv[2];

  let body = {};
  if (!arg) {
    // Get current time
  } else if (arg === 'clear' || arg === 'reset') {
    body = { clear: true };
  } else {
    body = { time: arg };
  }

  try {
    const result = await makeRequest(body);
    if (result.error) {
      console.error('Error:', result.error);
      process.exit(1);
    }
    if (result.currentTime) {
      console.log('Current simulated time:', new Date(result.currentTime).toLocaleString());
      console.log('Offset:', result.offset, 'ms');
      console.log('Simulated:', result.isSimulated);
    } else if (result.message) {
      console.log(result.message);
    } else {
      console.log('Response:', result);
    }
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }
}

main();
