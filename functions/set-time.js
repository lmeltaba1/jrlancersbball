#!/usr/bin/env node
/**
 * Set simulation time in Firestore (uses gcloud application default credentials)
 *
 * Usage:
 *   node functions/set-time.js "Dec 13, 2026 6:28 PM"   # Set to specific time
 *   node functions/set-time.js clear                    # Clear simulation
 *   node functions/set-time.js                          # Show current time
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'lancers-bball'
});

const db = getFirestore();

async function main() {
  const arg = process.argv[2];
  const simRef = db.collection('config').doc('simulation');
  const doc = await simRef.get();
  const currentOffset = doc.exists && typeof doc.data().timeOffsetMs === 'number'
    ? doc.data().timeOffsetMs : 0;
  const currentSimTime = new Date(Date.now() + currentOffset);

  // No argument - show current time
  if (!arg) {
    console.log('Current simulated time:', currentSimTime.toLocaleString());
    console.log('Offset:', currentOffset, 'ms');
    if (!doc.exists) console.log('(No simulation - using real time)');
    process.exit(0);
  }

  // Clear
  if (arg === 'clear' || arg === 'reset') {
    await simRef.delete();
    console.log('Simulation cleared.');
    process.exit(0);
  }

  // Set time
  const targetTime = new Date(arg);
  if (isNaN(targetTime.getTime())) {
    console.error('Invalid date. Examples: "Dec 13, 2026 6:28 PM" or "2026-12-13T18:28:00"');
    process.exit(1);
  }

  const newOffset = targetTime.getTime() - Date.now();
  await simRef.set({
    timeOffsetMs: newOffset,
    setAt: Timestamp.now()
  });

  console.log(`Time set to: ${targetTime.toLocaleString()}`);
  console.log('Time will advance naturally from here.');
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
