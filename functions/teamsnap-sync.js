#!/usr/bin/env node
/**
 * TeamSnap Roster Sync
 *
 * Usage:
 *   node functions/teamsnap-sync.js auth     # Get authorization (first time)
 *   node functions/teamsnap-sync.js sync     # Sync roster after auth
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CLIENT_ID = 'srTfX4tTwRc6CsQ7ieY08PzsYJ6YrnJEXaV_UxoqlPY';
const CLIENT_SECRET = 'lvHjea2PM7YM2B5HKErTEFweeCWQD9P3o1hQ1aGEdSw';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const TOKEN_FILE = path.join(__dirname, '.teamsnap-token.json');
const TEAM_ID = 10778938; // From roster-full.json

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getAuthUrl() {
  // Use broader scope
  const url = `https://auth.teamsnap.com/oauth/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code`;

  console.log('\n=== TeamSnap Authorization ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(url);
  console.log('\n2. Log in and authorize the app');
  console.log('3. Copy the authorization code shown');
  console.log('4. Run: node functions/teamsnap-sync.js token <CODE>\n');
}

async function exchangeToken(code) {
  const postData = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  }).toString();

  const response = await httpRequest({
    hostname: 'auth.teamsnap.com',
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  }, postData);

  if (response.status === 200 && response.data.access_token) {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(response.data, null, 2));
    console.log('Token saved successfully!');
    console.log('Now run: node functions/teamsnap-sync.js sync');
    return response.data;
  } else {
    console.error('Error getting token:', response.data);
    return null;
  }
}

function getStoredToken() {
  if (fs.existsSync(TOKEN_FILE)) {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  }
  return null;
}

async function apiRequest(path, token) {
  const response = await httpRequest({
    hostname: 'api.teamsnap.com',
    path: '/v3' + path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response;
}

async function listTeams() {
  const tokenData = getStoredToken();
  if (!tokenData) {
    console.log('No token found. Run: node functions/teamsnap-sync.js auth');
    return;
  }

  const token = tokenData.access_token;
  console.log('Fetching your teams from TeamSnap...\n');

  // First get /me to find available links
  const meRes = await apiRequest('/me', token);
  if (meRes.status !== 200) {
    console.error('Error fetching user:', meRes.data);
    return;
  }

  // First get the user ID from /me
  const userItems = meRes.data.collection?.items || [];
  const getField = (item, name) => {
    const field = item.data?.find(d => d.name === name);
    return field ? field.value : null;
  };

  const userId = userItems.length > 0 ? getField(userItems[0], 'id') : null;
  console.log('User ID:', userId);

  // Get members for this user
  const membersRes = await apiRequest(`/members?user_id=${userId}`, token);
  if (membersRes.status !== 200) {
    console.error('Error fetching members:', membersRes.data);
    return;
  }

  console.log('Members API returned', membersRes.data.collection?.items?.length || 0, 'members');
  const members = membersRes.data.collection?.items || [];

  if (members.length === 0) {
    console.log('\nNo members found via user_id. Trying search...');

    // Try searching teams
    const searchRes = await apiRequest('/teams/search?name=Lancers', token);
    console.log('Search response:', JSON.stringify(searchRes.data, null, 2).substring(0, 2000));

    // Try the known team ID directly
    console.log('\nTrying known team ID 10778938...');
    const directRes = await apiRequest('/teams/10778938', token);
    console.log('Direct team response:', JSON.stringify(directRes.data, null, 2).substring(0, 1000));
    return;
  }

  // Collect unique team IDs from members
  const teamIds = new Set();
  members.forEach(m => {
    const teamId = getField(m, 'team_id');
    if (teamId) teamIds.add(teamId);
  });

  console.log('Teams found via your memberships:\n');

  for (const teamId of teamIds) {
    const teamRes = await apiRequest(`/teams/${teamId}`, token);
    if (teamRes.status === 200) {
      const items = teamRes.data.collection?.items || [];
      if (items.length > 0) {
        const name = getField(items[0], 'name');
        const season = getField(items[0], 'season_name');
        console.log(`  ID: ${teamId}  -  ${name} (${season || 'no season'})`);
      }
    }
  }

  if (teamIds.size === 0) {
    console.log('  No teams found. You may not have any active memberships.');
  }

  console.log('\nUpdate TEAM_ID in the script and run sync again.');
}

async function syncRoster() {
  const tokenData = getStoredToken();
  if (!tokenData) {
    console.log('No token found. Run: node functions/teamsnap-sync.js auth');
    return;
  }

  const token = tokenData.access_token;
  console.log('Fetching roster from TeamSnap...\n');

  // Get team members (use search endpoint)
  const membersRes = await apiRequest(`/members/search?team_id=${TEAM_ID}`, token);
  if (membersRes.status !== 200) {
    console.error('Error fetching members:', membersRes.data);
    return;
  }

  // Get contact info (use search endpoint)
  const contactsRes = await apiRequest(`/contacts/search?team_id=${TEAM_ID}`, token);

  // Parse Collection+JSON format
  const members = membersRes.data.collection?.items || [];
  const contacts = contactsRes.data?.collection?.items || [];

  // Helper to extract field value from Collection+JSON item
  const getField = (item, name) => {
    const field = item.data?.find(d => d.name === name);
    return field ? field.value : null;
  };

  // Build contact lookup by member_id
  const contactsByMember = {};
  contacts.forEach(c => {
    const memberId = getField(c, 'member_id');
    if (!contactsByMember[memberId]) contactsByMember[memberId] = [];
    contactsByMember[memberId].push({
      name: `${getField(c, 'first_name') || ''} ${getField(c, 'last_name') || ''}`.trim(),
      email: getField(c, 'email'),
      phone: (getField(c, 'phone') || '').replace(/\D/g, '')
    });
  });

  // Separate players and coaches
  const players = [];
  const coaches = [];
  let playerId = 1;

  members.forEach(m => {
    const isNonPlayer = getField(m, 'is_non_player');
    const firstName = getField(m, 'first_name') || '';
    const lastName = getField(m, 'last_name') || '';
    const memberId = getField(m, 'id');
    const jerseyNumber = getField(m, 'jersey_number');
    const position = getField(m, 'position');

    if (isNonPlayer) {
      // Coach
      const memberContacts = contactsByMember[memberId] || [];
      const primaryContact = memberContacts[0] || {};
      coaches.push({
        name: `${firstName} ${lastName}`.trim(),
        role: position || 'Coach',
        email: primaryContact.email || '',
        phone: primaryContact.phone || '',
        canTrackStats: true
      });
    } else {
      // Player
      const memberContacts = contactsByMember[memberId] || [];
      players.push({
        id: playerId++,
        firstName,
        lastName,
        number: jerseyNumber ? parseInt(jerseyNumber) : null,
        position: mapPosition(position),
        positionName: position || '',
        parents: memberContacts.map(c => ({
          name: c.name,
          email: c.email,
          phone: c.phone
        })),
        viewers: []
      });
    }
  });

  // Sort players by jersey number
  players.sort((a, b) => (a.number || 99) - (b.number || 99));

  // Reassign IDs after sorting
  players.forEach((p, i) => p.id = i + 1);

  console.log(`Found ${players.length} players and ${coaches.length} coaches\n`);

  // Load existing roster to preserve any manual edits
  const rosterPath = path.join(__dirname, 'data/roster-full.json');
  let existingRoster = { team: {}, adminEmails: [] };
  if (fs.existsSync(rosterPath)) {
    existingRoster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  }

  // Update roster
  const newRoster = {
    team: existingRoster.team || {
      name: 'Jr. Lancers',
      school: 'Lafayette',
      season: '2026-2027',
      grade: '5th',
      teamSnapId: TEAM_ID,
      colors: { primary: '#000000', secondary: '#FFD700' }
    },
    adminEmails: existingRoster.adminEmails || [],
    coaches: coaches,
    players: players
  };

  // Write roster
  fs.writeFileSync(rosterPath, JSON.stringify(newRoster, null, 2));
  console.log('Roster saved to functions/data/roster-full.json');
  console.log('\nRun syncConfig to update Firestore:');
  console.log('  curl https://syncconfig-b2dpys66ra-uc.a.run.app');
}

function mapPosition(pos) {
  if (!pos) return 'SF';
  const p = pos.toLowerCase();
  if (p.includes('point')) return 'PG';
  if (p.includes('shooting')) return 'SG';
  if (p.includes('small')) return 'SF';
  if (p.includes('power')) return 'PF';
  if (p.includes('center')) return 'C';
  return 'SF';
}

async function syncEvents() {
  const tokenData = getStoredToken();
  if (!tokenData) {
    console.log('No token found. Run: node functions/teamsnap-sync.js auth');
    return;
  }

  const token = tokenData.access_token;
  console.log('Fetching events from TeamSnap...\n');

  // Get team events
  const eventsRes = await apiRequest(`/events/search?team_id=${TEAM_ID}`, token);
  if (eventsRes.status !== 200) {
    console.error('Error fetching events:', eventsRes.data);
    return;
  }

  const events = eventsRes.data.collection?.items || [];

  // Helper to extract field value from Collection+JSON item
  const getField = (item, name) => {
    const field = item.data?.find(d => d.name === name);
    return field ? field.value : null;
  };

  // Collect unique division_location_ids to fetch addresses
  const divisionLocationIds = new Set();
  events.forEach(e => {
    const divLocId = getField(e, 'division_location_id');
    if (divLocId) divisionLocationIds.add(divLocId);
  });

  // Fetch addresses for division locations
  const locationAddresses = {};
  for (const locId of divisionLocationIds) {
    const locRes = await apiRequest(`/division_locations/${locId}`, token);
    if (locRes.status === 200) {
      const items = locRes.data.collection?.items || [];
      if (items.length > 0) {
        const address = getField(items[0], 'address');
        if (address) locationAddresses[locId] = address;
      }
    }
  }

  // Convert TeamSnap events to our format
  const practiceEvents = [];
  let eventId = 101;

  events.forEach(e => {
    const isGame = getField(e, 'is_game');
    if (isGame) return; // Skip games, we only want practices/events

    const startDate = getField(e, 'start_date');
    if (!startDate) return;

    const date = new Date(startDate);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    // Format time in Central timezone
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' };
    const startTime = date.toLocaleTimeString('en-US', timeOptions);

    // Calculate end time
    const durationMinutes = getField(e, 'duration_minutes') || 90;
    const endDate = new Date(date.getTime() + durationMinutes * 60 * 1000);
    const endTime = endDate.toLocaleTimeString('en-US', timeOptions);

    const name = getField(e, 'name') || 'Practice';
    const locationName = getField(e, 'location_name') || '';
    const divLocationId = getField(e, 'division_location_id');
    const locationAddress = locationAddresses[divLocationId] || getField(e, 'formatted_address') || '';
    const notes = getField(e, 'notes') || '';
    const minutesToArriveEarly = getField(e, 'minutes_to_arrive_early') || 0;
    const additionalLocationDetails = getField(e, 'additional_location_details') || '';

    practiceEvents.push({
      id: eventId++,
      type: 'practice',
      date: dateStr,
      time: startTime,
      endTime: endTime,
      name: name,
      location: locationName,
      address: locationAddress,
      notes: notes,
      arriveEarly: minutesToArriveEarly,
      locationDetails: additionalLocationDetails
    });
  });

  // Sort by date
  practiceEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`Found ${practiceEvents.length} practices/events\n`);

  // Load existing schedule to preserve games
  const schedulePath = path.join(__dirname, 'data/schedule-full.json');
  let existingSchedule = { season: '2026-2027', games: [], events: [] };
  if (fs.existsSync(schedulePath)) {
    existingSchedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  }

  // Update schedule with new events
  const newSchedule = {
    season: existingSchedule.season || '2026-2027',
    games: existingSchedule.games || [],
    events: practiceEvents
  };

  // Write schedule
  fs.writeFileSync(schedulePath, JSON.stringify(newSchedule, null, 2));
  console.log('Events saved to functions/data/schedule-full.json');

  // Show the events
  practiceEvents.forEach(e => {
    console.log(`  ${e.date} ${e.time} - ${e.name} @ ${e.location}`);
    if (e.arriveEarly > 0) console.log(`    → Arrive ${e.arriveEarly} min early`);
    if (e.locationDetails) console.log(`    → ${e.locationDetails}`);
  });

  console.log('\nRun syncConfig to update Firestore:');
  console.log('  curl https://syncconfig-b2dpys66ra-uc.a.run.app');
}

// Main
const command = process.argv[2];
const arg = process.argv[3];

if (command === 'auth') {
  getAuthUrl();
} else if (command === 'token' && arg) {
  exchangeToken(arg);
} else if (command === 'teams') {
  listTeams();
} else if (command === 'sync') {
  syncRoster();
} else if (command === 'events') {
  syncEvents();
} else {
  console.log('Usage:');
  console.log('  node functions/teamsnap-sync.js auth          # Start authorization');
  console.log('  node functions/teamsnap-sync.js token <CODE>  # Exchange code for token');
  console.log('  node functions/teamsnap-sync.js teams         # List your teams');
  console.log('  node functions/teamsnap-sync.js sync          # Sync roster');
  console.log('  node functions/teamsnap-sync.js events        # Sync events/practices');
}
