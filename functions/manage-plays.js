#!/usr/bin/env node
/**
 * CLI tool for managing plays backup and restore
 *
 * Usage:
 *   node functions/manage-plays.js export              # Export plays to functions/data/plays-full.json
 *   node functions/manage-plays.js restore             # Restore plays from functions/data/plays-full.json
 *   node functions/manage-plays.js backup              # Download latest backup from Firebase Storage
 *   node functions/manage-plays.js list                # List all plays in Firestore
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// Initialize with application default credentials
initializeApp({
  credential: applicationDefault(),
  storageBucket: 'lancers-bball.appspot.com'
});

const db = getFirestore();
const storage = getStorage();

const PLAYS_FILE = path.join(__dirname, 'data', 'plays-full.json');

async function exportPlays() {
  console.log('Exporting plays from Firestore...');

  const snapshot = await db.collection('customPlays').get();
  const plays = [];

  snapshot.forEach(doc => {
    plays.push({
      id: doc.id,
      ...doc.data()
    });
  });

  const exportData = {
    plays: plays,
    lastExported: new Date().toISOString(),
    version: 1,
    playCount: plays.length
  };

  fs.writeFileSync(PLAYS_FILE, JSON.stringify(exportData, null, 2));
  console.log(`Exported ${plays.length} plays to ${PLAYS_FILE}`);
}

async function restorePlays() {
  console.log('Restoring plays from local file...');

  if (!fs.existsSync(PLAYS_FILE)) {
    console.error(`File not found: ${PLAYS_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(PLAYS_FILE, 'utf8'));

  if (!data.plays || data.plays.length === 0) {
    console.log('No plays to restore');
    return;
  }

  const batch = db.batch();

  for (const play of data.plays) {
    const playId = play.id;
    const playRef = db.collection('customPlays').doc(playId);
    const { id, ...playData } = play;
    batch.set(playRef, playData);
  }

  await batch.commit();
  console.log(`Restored ${data.plays.length} plays to Firestore`);
}

async function downloadBackup() {
  console.log('Downloading latest backup from Firebase Storage...');

  const bucket = storage.bucket();
  const file = bucket.file('backups/plays-current.json');

  const [exists] = await file.exists();
  if (!exists) {
    console.error('No backup found in Firebase Storage');
    process.exit(1);
  }

  const [contents] = await file.download();
  const backup = JSON.parse(contents.toString());

  fs.writeFileSync(PLAYS_FILE, JSON.stringify(backup, null, 2));
  console.log(`Downloaded backup with ${backup.plays?.length || 0} plays (from ${backup.lastExported})`);
  console.log(`Saved to ${PLAYS_FILE}`);
}

async function listPlays() {
  console.log('Listing plays in Firestore...\n');

  const snapshot = await db.collection('customPlays').get();

  if (snapshot.empty) {
    console.log('No plays found');
    return;
  }

  snapshot.forEach(doc => {
    const play = doc.data();
    console.log(`[${play.status || 'unknown'}] ${play.name || doc.id}`);
    if (play.description) console.log(`    ${play.description}`);
    if (play.chapter) console.log(`    Chapter: ${play.chapter}`);
    console.log();
  });

  console.log(`Total: ${snapshot.size} plays`);
}

// Main
const command = process.argv[2];

switch (command) {
  case 'export':
    exportPlays().catch(console.error);
    break;
  case 'restore':
    restorePlays().catch(console.error);
    break;
  case 'backup':
    downloadBackup().catch(console.error);
    break;
  case 'list':
    listPlays().catch(console.error);
    break;
  default:
    console.log(`
Plays Management CLI

Usage:
  node functions/manage-plays.js export    Export plays to functions/data/plays-full.json
  node functions/manage-plays.js restore   Restore plays from functions/data/plays-full.json
  node functions/manage-plays.js backup    Download latest backup from Firebase Storage
  node functions/manage-plays.js list      List all plays in Firestore
`);
}
