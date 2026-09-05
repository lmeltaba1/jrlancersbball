// Jr. Lancers Basketball - Firebase Configuration
// TODO: Replace with your Firebase project credentials

var firebaseConfig = {
  apiKey: "AIzaSyCZDonC8aqbg5OvtM-cHdA5LTJleZn8nwk",
  authDomain: "lancers-bball.firebaseapp.com",
  projectId: "lancers-bball",
  storageBucket: "lancers-bball.firebasestorage.app",
  messagingSenderId: "840563401504",
  appId: "1:840563401504:web:fab87697f7129e98976d45",
  measurementId: "G-10SZ72SKMM"
};

var app = null;
var auth = null;
var db = null;

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  try {
    app = firebase.initializeApp(firebaseConfig);
    if (typeof firebase.auth === 'function') {
      auth = firebase.auth();
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    }
    if (typeof firebase.firestore === 'function') {
      db = firebase.firestore();
    }
    try {
      if (typeof firebase.analytics === 'function') {
        firebase.analytics();
      }
    } catch (e) {}
  } catch (e) {
    console.error('Firebase init error:', e);
  }
}

// Helper to get player info from roster
async function getPlayerFromRoster(email) {
  try {
    const res = await fetch('data/roster.json?v=' + Date.now());
    const data = await res.json();
    const emailLower = email.toLowerCase();

    // Check if coach
    let isCoach = false;
    let coachInfo = null;
    if (data.coaches) {
      for (const coach of data.coaches) {
        if (coach.email.toLowerCase() === emailLower) {
          isCoach = true;
          coachInfo = coach;
          break;
        }
      }
    }

    // Check players (coach might also be a parent)
    for (const player of data.players) {
      if (player.parents) {
        for (const parent of player.parents) {
          if (parent.email.toLowerCase() === emailLower) {
            return {
              isCoach: isCoach,
              name: isCoach ? coachInfo.name : parent.name,
              player: player,
              parent: parent,
              playerName: player.firstName + ' ' + player.lastName,
              position: player.position,
              positionName: player.positionName,
              canTrackStats: parent.canTrackStats || isCoach
            };
          }
        }
      }
    }

    // Coach but not a parent
    if (isCoach) {
      return {
        isCoach: true,
        name: coachInfo.name,
        position: null,
        canTrackStats: coachInfo.canTrackStats
      };
    }

    return null;
  } catch (e) {
    console.error('Error loading roster:', e);
    return null;
  }
}
