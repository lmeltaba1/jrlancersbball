const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addViewers() {
  const playerId = '6'; // Dean Meltabarger

  const viewers = [
    {
      name: 'Hal Meltabarger',
      email: 'halmel777@gmail.com',
      relationship: 'Grandparent',
      source: 'firestore'
    },
    {
      name: 'Rick Nihiser',
      email: 'rnihiser@sbcglobal.net',
      relationship: 'Grandparent',
      source: 'firestore'
    },
    {
      name: 'Pam Nihiser',
      email: 'no1mom39@sbcglobal.net',
      relationship: 'Grandparent',
      source: 'firestore'
    },
    {
      name: 'Paige Meltabarger',
      email: 'paige_2005@hotmail.com',
      relationship: 'Aunt',
      source: 'firestore'
    },
    {
      name: 'Mardeanna Sproat',
      email: 'mksproat97@hotmail.com',
      relationship: 'Grandparent',
      source: 'firestore'
    },
    {
      name: 'Dave Sproat',
      email: 'dsproat85@gmail.com',
      relationship: 'Grandparent',
      source: 'firestore'
    }
  ];

  try {
    // Get existing document if any
    const docRef = db.collection('viewers').doc(playerId);
    const doc = await docRef.get();

    let existingViewers = [];
    let removedEmails = [];

    if (doc.exists) {
      const data = doc.data();
      existingViewers = data.viewers || [];
      removedEmails = data.removedEmails || [];
    }

    // Add new viewers (avoid duplicates by email)
    const existingEmails = existingViewers.map(v => v.email.toLowerCase());
    const newViewers = viewers.filter(v => !existingEmails.includes(v.email.toLowerCase()));

    const allViewers = [...existingViewers, ...newViewers];

    await docRef.set({
      viewers: allViewers,
      removedEmails: removedEmails
    });

    console.log(`Added ${newViewers.length} viewers for Dean (player ID ${playerId}):`);
    newViewers.forEach(v => console.log(`  - ${v.name} (${v.email}) - ${v.relationship}`));

    if (newViewers.length < viewers.length) {
      console.log(`\n${viewers.length - newViewers.length} viewers already existed.`);
    }

  } catch (error) {
    console.error('Error adding viewers:', error);
  }

  process.exit(0);
}

addViewers();
