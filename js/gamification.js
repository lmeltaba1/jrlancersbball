// Gamification System for Jr. Lancers
// Points: 10 per volunteer role (completed games only), 1 per highlight upload

const VOLUNTEER_POINTS = 10;
const HIGHLIGHT_POINTS = 1;

const BADGES = {
  volunteer: [
    { id: 'volunteer-1', name: 'First Timer', icon: '🌟', threshold: 1 },
    { id: 'volunteer-5', name: 'Team Player', icon: '⭐', threshold: 5 },
    { id: 'volunteer-10', name: 'MVP Volunteer', icon: '🏆', threshold: 10 }
  ],
  highlights: [
    { id: 'highlight-1', name: 'Paparazzi', icon: '📸', threshold: 1 },
    { id: 'highlight-10', name: 'Historian', icon: '🎬', threshold: 10 }
  ],
  total: [
    { id: 'total-50', name: 'All-Star', icon: '💫', threshold: 50 }
  ]
};

// Build family map from roster, merging families that share parent emails
function buildFamilyMap(roster) {
  const families = {};
  const emailToFamily = {}; // Track which family each email belongs to

  roster.players.forEach(player => {
    // Get all parent emails for this player
    const playerParentEmails = [];
    if (player.parents) {
      player.parents.forEach(p => {
        if (p.email) {
          playerParentEmails.push(p.email.toLowerCase());
        }
      });
    }

    // Check if any parent email already belongs to an existing family
    let existingFamily = null;
    for (const email of playerParentEmails) {
      if (emailToFamily[email]) {
        existingFamily = emailToFamily[email];
        break;
      }
    }

    if (existingFamily) {
      // Add this player to the existing family
      existingFamily.playerIds.push(player.id);
      existingFamily.playerNames.push(player.firstName);
      // Add any new parent emails
      playerParentEmails.forEach(email => {
        if (!existingFamily.parentEmails.includes(email)) {
          existingFamily.parentEmails.push(email);
          emailToFamily[email] = existingFamily;
        }
      });
    } else {
      // Create a new family - use parent's last name if available, else player's
      let familyName = player.lastName;
      if (player.parents && player.parents.length > 0 && player.parents[0].name) {
        const parentNameParts = player.parents[0].name.split(' ');
        if (parentNameParts.length > 1) {
          familyName = parentNameParts[parentNameParts.length - 1];
        }
      }

      const family = {
        name: familyName,
        playerIds: [player.id],
        parentEmails: playerParentEmails,
        playerNames: [player.firstName],
        volunteerCount: 0,
        highlightCount: 0,
        volunteerPoints: 0,
        highlightPoints: 0,
        totalPoints: 0
      };

      families[familyName] = family;
      playerParentEmails.forEach(email => {
        emailToFamily[email] = family;
      });
    }
  });

  return families;
}

// Find family by parent email
function findFamilyByEmail(email, families) {
  if (!email) return null;
  const lowerEmail = email.toLowerCase();
  for (const family of Object.values(families)) {
    if (family.parentEmails.includes(lowerEmail)) {
      return family;
    }
  }
  return null;
}

// Find family by player ID
function findFamilyByPlayerId(playerId, families) {
  for (const family of Object.values(families)) {
    if (family.playerIds.includes(playerId) || family.playerIds.includes(Number(playerId))) {
      return family;
    }
  }
  return null;
}

// Get IDs of past games (completed)
function getPastGameIds(schedule) {
  const now = new Date();
  return schedule.events
    .filter(e => {
      if (e.type !== 'game') return false;
      const gameDate = new Date(e.date);
      return gameDate < now;
    })
    .map(e => e.id);
}

// Calculate all family scores
function calculateFamilyScores(roster, schedule, volunteersData, highlightsData) {
  const families = buildFamilyMap(roster);
  const pastGameIds = getPastGameIds(schedule);

  // Count volunteer points (only past games)
  volunteersData.forEach(v => {
    const gameId = v.gameId || v.id;
    if (!pastGameIds.includes(gameId) && !pastGameIds.includes(Number(gameId))) return;

    if (v.scorekeeper && v.scorekeeper.email) {
      const family = findFamilyByEmail(v.scorekeeper.email, families);
      if (family) {
        family.volunteerCount++;
        family.volunteerPoints += VOLUNTEER_POINTS;
      }
    }
    if (v.tableWorker && v.tableWorker.email) {
      const family = findFamilyByEmail(v.tableWorker.email, families);
      if (family) {
        family.volunteerCount++;
        family.volunteerPoints += VOLUNTEER_POINTS;
      }
    }
  });

  // Count highlight points
  highlightsData.forEach(h => {
    const family = findFamilyByPlayerId(h.playerId, families);
    if (family) {
      family.highlightCount++;
      family.highlightPoints += HIGHLIGHT_POINTS;
    }
  });

  // Calculate totals
  Object.values(families).forEach(f => {
    f.totalPoints = f.volunteerPoints + f.highlightPoints;
  });

  // Sort by total points (descending), then by name
  return Object.values(families).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.name.localeCompare(b.name);
  });
}

// Get badges earned based on counts
function getEarnedBadges(volunteerCount, highlightCount, totalPoints) {
  const earned = [];

  BADGES.volunteer.forEach(badge => {
    if (volunteerCount >= badge.threshold) {
      earned.push({ ...badge, type: 'volunteer' });
    }
  });

  BADGES.highlights.forEach(badge => {
    if (highlightCount >= badge.threshold) {
      earned.push({ ...badge, type: 'highlight' });
    }
  });

  BADGES.total.forEach(badge => {
    if (totalPoints >= badge.threshold) {
      earned.push({ ...badge, type: 'total' });
    }
  });

  return earned;
}

// Get next badge to earn (the closest one not yet earned)
function getNextBadge(volunteerCount, highlightCount, totalPoints) {
  let nextBadge = null;
  let smallestGap = Infinity;

  BADGES.volunteer.forEach(badge => {
    if (volunteerCount < badge.threshold) {
      const gap = badge.threshold - volunteerCount;
      if (gap < smallestGap) {
        smallestGap = gap;
        nextBadge = { ...badge, type: 'volunteer', current: volunteerCount, remaining: gap };
      }
    }
  });

  BADGES.highlights.forEach(badge => {
    if (highlightCount < badge.threshold) {
      const gap = badge.threshold - highlightCount;
      if (gap < smallestGap) {
        smallestGap = gap;
        nextBadge = { ...badge, type: 'highlight', current: highlightCount, remaining: gap };
      }
    }
  });

  BADGES.total.forEach(badge => {
    if (totalPoints < badge.threshold) {
      const gap = badge.threshold - totalPoints;
      if (gap < smallestGap) {
        smallestGap = gap;
        nextBadge = { ...badge, type: 'total', current: totalPoints, remaining: gap };
      }
    }
  });

  return nextBadge;
}

// Get rank suffix (1st, 2nd, 3rd, etc.)
function getRankSuffix(rank) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return rank + 'th';
}

// Get medal emoji for rank
function getRankMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

// Render leaderboard HTML
function renderLeaderboard(families, currentUserEmail, maxDisplay = 10) {
  if (!families || families.length === 0) {
    return '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No data yet. Volunteer or upload highlights to get started!</p>';
  }

  // Find current user's family
  let userFamily = null;
  let userRank = 0;
  families.forEach((f, i) => {
    if (f.parentEmails.includes(currentUserEmail.toLowerCase())) {
      userFamily = f;
      userRank = i + 1;
    }
  });

  let html = '';

  // User's rank summary (if logged in and found)
  if (userFamily) {
    const earnedBadges = getEarnedBadges(userFamily.volunteerCount, userFamily.highlightCount, userFamily.totalPoints);
    const nextBadge = getNextBadge(userFamily.volunteerCount, userFamily.highlightCount, userFamily.totalPoints);

    html += `<div style="background: var(--bg-elevated); border-radius: 8px; padding: 12px; margin-bottom: 12px;">`;
    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">`;
    html += `<span style="font-weight: 600; color: var(--text-primary);">Your Family</span>`;
    html += `<span style="color: var(--gold); font-weight: 700;">${userFamily.totalPoints} pts (${getRankSuffix(userRank)})</span>`;
    html += `</div>`;

    // Progress bar to next badge
    if (nextBadge) {
      const progress = Math.round((nextBadge.current / nextBadge.threshold) * 100);
      html += `<div style="margin-bottom: 8px;">`;
      html += `<div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 4px;">`;
      html += `<span>${nextBadge.remaining} more to ${nextBadge.icon} ${nextBadge.name}</span>`;
      html += `<span>${progress}%</span>`;
      html += `</div>`;
      html += `<div style="height: 6px; background: var(--bg-body); border-radius: 3px; overflow: hidden;">`;
      html += `<div style="height: 100%; width: ${progress}%; background: var(--gold); border-radius: 3px;"></div>`;
      html += `</div>`;
      html += `</div>`;
    }

    // Breakdown
    html += `<div style="display: flex; gap: 16px; font-size: 0.75rem; color: var(--text-secondary);">`;
    html += `<span>🎽 Volunteering: ${userFamily.volunteerPoints}</span>`;
    html += `<span>📸 Highlights: ${userFamily.highlightPoints}</span>`;
    html += `</div>`;

    // Earned badges
    if (earnedBadges.length > 0) {
      html += `<div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">`;
      earnedBadges.forEach(badge => {
        html += `<span style="font-size: 1.2rem;" title="${badge.name}">${badge.icon}</span>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  }

  // Leaderboard list
  html += `<div style="border-top: 1px solid var(--border-color); padding-top: 8px;">`;

  const displayCount = Math.min(maxDisplay, families.length);
  for (let i = 0; i < displayCount; i++) {
    const family = families[i];
    const rank = i + 1;
    const medal = getRankMedal(rank);
    const isUser = userFamily && family.name === userFamily.name;

    html += `<div style="display: flex; align-items: center; padding: 8px 0; ${isUser ? 'background: var(--bg-elevated); margin: 0 -8px; padding-left: 8px; padding-right: 8px; border-radius: 6px;' : ''}">`;
    html += `<span style="width: 24px; text-align: center; font-size: 0.85rem; ${medal ? '' : 'color: var(--text-secondary);'}">${medal || rank}</span>`;
    html += `<span style="flex: 1; font-weight: ${rank <= 3 ? '600' : '400'}; color: var(--text-primary); margin-left: 8px;">${family.name}</span>`;
    html += `<span style="font-weight: 600; color: ${rank === 1 ? 'var(--gold)' : 'var(--text-primary)'};">${family.totalPoints}</span>`;
    html += `</div>`;
  }

  html += `</div>`;

  return html;
}
