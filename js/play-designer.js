// Jr. Lancers Basketball - Play Designer
// Based on The Hoops Geek design

// ============================================================================
// STATE
// ============================================================================

let currentUser = null;
let playerInfo = null;

// Play state
let currentPlay = null;
let currentPhaseIndex = 0;
let isDirty = false;

// Mode: 'draw' or 'animate'
let currentMode = 'draw';

// Drag state
let isDragging = false;
let dragTarget = null; // { type: 'player'|'defender'|'action-start'|'action-end', id: ... }
let dragOffset = { x: 0, y: 0 };

// Selected item
let selectedItem = null; // { type: 'player'|'defender'|'action', id: ... }

// Animation state
let isAnimating = false;
let animationTimeout = null;

// Court dimensions (SVG viewBox: -28 -3 56 50)
const COURT = {
  minX: -25,
  maxX: 25,
  minY: 0,
  maxY: 47,
  centerX: 0,
  centerY: 23.5,
  hoopX: 0,
  hoopY: 5.25
};

// ============================================================================
// TEMPLATES
// ============================================================================

const templates = {
  // === HALF COURT OFFENSE ===
  empty: {
    name: 'Empty',
    category: 'halfCourt',
    positions: {}
  },
  traditional: {
    name: 'Traditional',
    category: 'halfCourt',
    positions: {
      1: { x: 0, y: 32, hasBall: true },
      2: { x: -12, y: 22, hasBall: false },
      3: { x: 12, y: 22, hasBall: false },
      4: { x: -10, y: 8, hasBall: false },
      5: { x: 10, y: 8, hasBall: false }
    }
  },
  fiveOut: {
    name: '5 Out',
    category: 'halfCourt',
    positions: {
      1: { x: 0, y: 32, hasBall: true },
      2: { x: -18, y: 22, hasBall: false },
      3: { x: 18, y: 22, hasBall: false },
      4: { x: -20, y: 8, hasBall: false },
      5: { x: 20, y: 8, hasBall: false }
    }
  },
  princeton: {
    name: 'Princeton Offense',
    category: 'halfCourt',
    positions: {
      1: { x: 0, y: 32, hasBall: true },
      2: { x: -14, y: 8, hasBall: false },
      3: { x: 18, y: 12, hasBall: false },
      4: { x: -4, y: 16, hasBall: false },
      5: { x: 14, y: 8, hasBall: false }
    }
  },
  highPost: {
    name: 'High Post',
    category: 'halfCourt',
    positions: {
      1: { x: 0, y: 42, hasBall: true },
      2: { x: -18, y: 28, hasBall: false },
      3: { x: 18, y: 28, hasBall: false },
      4: { x: -18, y: 8, hasBall: false },
      5: { x: 0, y: 20, hasBall: false }
    }
  },
  oneFourLow: {
    name: '1-4 Low',
    category: 'halfCourt',
    positions: {
      1: { x: 0, y: 32, hasBall: true },
      2: { x: -16, y: 7, hasBall: false },
      3: { x: 16, y: 7, hasBall: false },
      4: { x: -6, y: 7, hasBall: false },
      5: { x: 6, y: 7, hasBall: false }
    }
  },
  horns: {
    name: 'Horns',
    category: 'halfCourt',
    positions: {
      1: { x: 0, y: 32, hasBall: true },
      2: { x: -18, y: 18, hasBall: false },
      3: { x: 18, y: 18, hasBall: false },
      4: { x: -6, y: 14, hasBall: false },
      5: { x: 6, y: 14, hasBall: false }
    }
  },
  oneFourHigh: {
    name: '1-4 High',
    category: 'halfCourt',
    positions: {
      1: { x: 0, y: 32, hasBall: true },
      2: { x: -16, y: 18, hasBall: false },
      3: { x: 16, y: 18, hasBall: false },
      4: { x: -6, y: 18, hasBall: false },
      5: { x: 6, y: 18, hasBall: false }
    }
  },
  flex: {
    name: 'Flex',
    category: 'halfCourt',
    positions: {
      1: { x: 10, y: 28, hasBall: true },
      2: { x: 18, y: 12, hasBall: false },
      3: { x: -16, y: 8, hasBall: false },
      4: { x: -10, y: 20, hasBall: false },
      5: { x: 0, y: 8, hasBall: false }
    }
  },

  // === HALF COURT DEFENSE (defenders only) ===
  zone23: {
    name: '2-3 Zone Defense',
    category: 'halfCourt',
    positions: {},
    defenders: {
      1: { x: -6, y: 16 },
      2: { x: 6, y: 16 },
      3: { x: -12, y: 9 },
      4: { x: 12, y: 9 },
      5: { x: 0, y: 9 }
    }
  },
  zone32: {
    name: '3-2 Zone Defense',
    category: 'halfCourt',
    positions: {},
    defenders: {
      1: { x: 0, y: 22 },
      2: { x: 10, y: 14 },
      3: { x: -10, y: 14 },
      4: { x: 12, y: 8 },
      5: { x: -12, y: 8 }
    }
  },
  zone131: {
    name: '1-3-1 Zone Defense',
    category: 'halfCourt',
    positions: {},
    defenders: {
      1: { x: 0, y: 18 },
      2: { x: -14, y: 12 },
      3: { x: 14, y: 12 },
      4: { x: 0, y: 6 },
      5: { x: 0, y: 12 }
    }
  },

  // === HORIZONTAL FULL COURT ===
  fullHEmpty: {
    name: 'Empty',
    category: 'fullCourtH',
    positions: {}
  },
  press1121: {
    name: '1-1-2-1 Press Break',
    category: 'fullCourtH',
    positions: {
      1: { x: -40, y: 24, hasBall: false },
      2: { x: -20, y: 35, hasBall: false },
      3: { x: -20, y: 12, hasBall: true },
      4: { x: 10, y: 35, hasBall: false },
      5: { x: 10, y: 12, hasBall: false }
    }
  },
  press14: {
    name: '1-4 Press Break',
    category: 'fullCourtH',
    positions: {
      1: { x: -35, y: 24, hasBall: false },
      2: { x: -15, y: 35, hasBall: false },
      3: { x: -15, y: 12, hasBall: false },
      4: { x: -15, y: 24, hasBall: true },
      5: { x: 15, y: 24, hasBall: false }
    }
  },
  press131: {
    name: '1-3-1 Press Break',
    category: 'fullCourtH',
    positions: {
      1: { x: -35, y: 35, hasBall: false },
      2: { x: -35, y: 12, hasBall: false },
      3: { x: -15, y: 24, hasBall: false },
      4: { x: -35, y: 24, hasBall: true },
      5: { x: 15, y: 24, hasBall: false }
    }
  },

  // === VERTICAL FULL COURT ===
  fullVEmpty: {
    name: 'Empty',
    category: 'fullCourtV',
    positions: {}
  },
  vPress1121: {
    name: '1-1-2-1 Press Break',
    category: 'fullCourtV',
    positions: {
      1: { x: 0, y: 80, hasBall: false },
      2: { x: -12, y: 60, hasBall: false },
      3: { x: 12, y: 60, hasBall: true },
      4: { x: -12, y: 35, hasBall: false },
      5: { x: 12, y: 35, hasBall: false }
    }
  },
  vPress14: {
    name: '1-4 Press Break',
    category: 'fullCourtV',
    positions: {
      1: { x: 0, y: 75, hasBall: false },
      2: { x: -15, y: 55, hasBall: false },
      3: { x: 15, y: 55, hasBall: false },
      4: { x: 0, y: 55, hasBall: true },
      5: { x: 0, y: 35, hasBall: false }
    }
  },
  vPress131: {
    name: '1-3-1 Press Break',
    category: 'fullCourtV',
    positions: {
      1: { x: -15, y: 75, hasBall: false },
      2: { x: 15, y: 75, hasBall: false },
      3: { x: 0, y: 55, hasBall: false },
      4: { x: 0, y: 75, hasBall: true },
      5: { x: 0, y: 35, hasBall: false }
    }
  }
};

let selectedCourtType = 'halfCourt';

// ============================================================================
// INITIALIZATION
// ============================================================================

function initDesigner(user, info) {
  currentUser = user;
  playerInfo = info;

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const previewId = urlParams.get('preview');
  const animateId = urlParams.get('animate');

  // Preview mode - just show the court, no controls
  if (previewId) {
    initPreviewMode(previewId);
    return;
  }

  // Animate mode - load play and immediately open animation modal
  if (animateId) {
    initAnimateMode(animateId);
    return;
  }

  if (editId) {
    loadPlay(editId);
  } else {
    showTemplateModal();
  }

  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('designerContainer').style.display = 'block';

  initEventListeners();
  renderTemplateGrid();
}

async function initPreviewMode(playId) {
  try {
    const doc = await db.collection('customPlays').doc(playId).get();
    if (!doc.exists) {
      document.body.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Play not found</p>';
      return;
    }

    currentPlay = { ...doc.data(), id: doc.id };
    currentPhaseIndex = 0;

    // Hide everything except the court
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('designerContainer').style.display = 'block';

    // Hide header, sidebar, footer
    const header = document.querySelector('.designer-header');
    const sidebar = document.querySelector('.designer-sidebar');
    const footer = document.querySelector('.designer-footer');
    const phaseNav = document.querySelector('.phase-nav');

    if (header) header.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (phaseNav) phaseNav.style.display = 'none';

    // Make the court fill the container
    const courtArea = document.querySelector('.court-area');
    if (courtArea) {
      courtArea.style.padding = '10px';
      courtArea.style.display = 'flex';
      courtArea.style.alignItems = 'center';
      courtArea.style.justifyContent = 'center';
    }

    // Render the play
    if (currentPlay.phases && currentPlay.phases.length > 0) {
      renderPhase(currentPlay.phases[0]);
      renderActions(currentPlay.phases[0]);
    }

  } catch (error) {
    console.error('Error loading preview:', error);
    document.body.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Error loading play</p>';
  }
}

async function initAnimateMode(playId) {
  try {
    const doc = await db.collection('customPlays').doc(playId).get();
    if (!doc.exists) {
      alert('Play not found');
      window.history.back();
      return;
    }

    currentPlay = { ...doc.data(), id: doc.id };
    currentPhaseIndex = 0;

    // Hide the loading state and show designer
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('designerContainer').style.display = 'block';

    // Set play name
    document.getElementById('playName').value = currentPlay.name || '';
    if (document.getElementById('playDescription')) {
      document.getElementById('playDescription').value = currentPlay.description || '';
    }

    // Render the play
    renderAll();

    // Immediately open the animation modal
    setTimeout(() => {
      openAnimationModal();
      // Auto-play
      setTimeout(() => {
        if (!isPlaying) togglePlayPause();
      }, 500);
    }, 300);

  } catch (error) {
    console.error('Error loading animate mode:', error);
    alert('Error loading play');
    window.history.back();
  }
}

function initEventListeners() {
  const svg = document.getElementById('courtSvg');

  // Mouse events
  svg.addEventListener('mousedown', handleMouseDown);
  svg.addEventListener('mousemove', handleMouseMove);
  svg.addEventListener('mouseup', handleMouseUp);
  svg.addEventListener('mouseleave', handleMouseUp);

  // Touch events
  svg.addEventListener('touchstart', handleTouchStart, { passive: false });
  svg.addEventListener('touchmove', handleTouchMove, { passive: false });
  svg.addEventListener('touchend', handleTouchEnd);

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);
}

// ============================================================================
// MODE SWITCHING (Draw / Animate)
// ============================================================================

function setMode(mode) {
  currentMode = mode;

  // Update toolbar buttons
  document.getElementById('drawModeBtn')?.classList.toggle('active', mode === 'draw');
  document.getElementById('animateModeBtn')?.classList.toggle('active', mode === 'animate');

  // Show/hide mode panels
  const drawPanel = document.getElementById('drawModePanel');
  const animatePanel = document.getElementById('animateModePanel');

  if (drawPanel) drawPanel.style.display = mode === 'draw' ? 'block' : 'none';
  if (animatePanel) animatePanel.style.display = mode === 'animate' ? 'block' : 'none';

  // In animate mode, deselect items and hide handles
  if (mode === 'animate') {
    selectedItem = null;
  }

  renderAll();
}

// ============================================================================
// SIDEBAR TABS (Phases / Objects)
// ============================================================================

function switchSidebarTab(tab) {
  const phasesTab = document.getElementById('phasesTab');
  const objectsTab = document.getElementById('objectsTab');
  const phasesContent = document.getElementById('phasesContent');
  const objectsContent = document.getElementById('objectsContent');

  if (tab === 'phases') {
    phasesTab?.classList.add('active');
    objectsTab?.classList.remove('active');
    if (phasesContent) phasesContent.style.display = 'block';
    if (objectsContent) objectsContent.style.display = 'none';
  } else {
    phasesTab?.classList.remove('active');
    objectsTab?.classList.add('active');
    if (phasesContent) phasesContent.style.display = 'none';
    if (objectsContent) objectsContent.style.display = 'block';
    renderObjectsList();
  }
}

function renderObjectsList() {
  const list = document.getElementById('objectsList');
  if (!list || !currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  let html = '<div class="objects-section"><div class="objects-section-title">Players</div>';

  Object.entries(phase.players).forEach(([num, pos]) => {
    html += `<div class="object-item" onclick="selectPlayer(${num})">
      <span class="object-icon">${pos.hasBall ? '⊙' : ''}</span>
      <span>Player ${num}</span>
    </div>`;
  });

  if (phase.defenders && Object.keys(phase.defenders).length > 0) {
    html += '</div><div class="objects-section"><div class="objects-section-title">Defenders</div>';
    Object.entries(phase.defenders).forEach(([num, pos]) => {
      html += `<div class="object-item" onclick="selectDefender(${num})">
        <span>Defender X${num}</span>
      </div>`;
    });
  }

  if (phase.actions && phase.actions.length > 0) {
    html += '</div><div class="objects-section"><div class="objects-section-title">Actions</div>';
    phase.actions.forEach((action, index) => {
      const type = action.type.charAt(0).toUpperCase() + action.type.slice(1);
      html += `<div class="object-item" onclick="selectAction(${index})">
        <span>${type}</span>
      </div>`;
    });
  }

  html += '</div>';
  list.innerHTML = html;
}

function selectPlayer(num) {
  selectedItem = { type: 'player', id: parseInt(num) };
  renderAll();
}

function selectDefender(num) {
  selectedItem = { type: 'defender', id: parseInt(num) };
  renderAll();
}

function selectAction(index) {
  selectedItem = { type: 'action', id: index };
  renderAll();
}

// ============================================================================
// PHASE SYSTEM (Generate Next, Clone, Empty)
// ============================================================================

function generateNextPhase() {
  if (!currentPlay) return;

  const currentPhase = currentPlay.phases[currentPhaseIndex];

  // Calculate end positions of all players based on actions
  const newPositions = JSON.parse(JSON.stringify(currentPhase.players));

  // Process actions to move players to their end positions
  currentPhase.actions.forEach(action => {
    const startPlayer = findNearestPlayer(action.start, currentPhase.players);

    if (startPlayer && (action.type === 'dribble' || action.type === 'cut' || action.type === 'screen')) {
      // Move player to action end position
      newPositions[startPlayer].x = action.end.x;
      newPositions[startPlayer].y = action.end.y;
    }

    if (action.type === 'pass' || action.type === 'handoff') {
      // Transfer ball
      const endPlayer = findNearestPlayer(action.end, currentPhase.players);
      if (startPlayer && endPlayer) {
        Object.keys(newPositions).forEach(k => {
          newPositions[k].hasBall = (parseInt(k) === endPlayer);
        });
      }
    }
  });

  // Create new phase with calculated positions
  const newPhase = {
    players: newPositions,
    defenders: JSON.parse(JSON.stringify(currentPhase.defenders || {})),
    actions: [],
    description: ''
  };

  currentPlay.phases.push(newPhase);
  currentPhaseIndex = currentPlay.phases.length - 1;
  isDirty = true;
  renderAll();
}

function clonePhase() {
  if (!currentPlay) return;

  const currentPhase = currentPlay.phases[currentPhaseIndex];
  const newPhase = {
    players: JSON.parse(JSON.stringify(currentPhase.players)),
    defenders: JSON.parse(JSON.stringify(currentPhase.defenders || {})),
    actions: JSON.parse(JSON.stringify(currentPhase.actions || [])),
    description: currentPhase.description || ''
  };

  currentPlay.phases.splice(currentPhaseIndex + 1, 0, newPhase);
  currentPhaseIndex = currentPhaseIndex + 1;
  isDirty = true;
  renderAll();
}

function addEmptyPhase() {
  if (!currentPlay) return;

  // Use last phase positions but clear actions
  const lastPhase = currentPlay.phases[currentPlay.phases.length - 1];
  const newPhase = {
    players: JSON.parse(JSON.stringify(lastPhase.players)),
    defenders: JSON.parse(JSON.stringify(lastPhase.defenders || {})),
    actions: [],
    description: ''
  };

  currentPlay.phases.push(newPhase);
  currentPhaseIndex = currentPlay.phases.length - 1;
  isDirty = true;
  renderAll();
}

// Mirror the ENTIRE PLAY:
// 1. Flip all X coordinates (right wing → left wing)
// 2. Swap player assignments (2↔3, 4↔5, 1 stays)
function mirrorPlay() {
  if (!currentPlay || !currentPlay.phases || currentPlay.phases.length === 0) return;

  // Check if there are any actions in any phase
  const hasActions = currentPlay.phases.some(p => p.actions && p.actions.length > 0);
  if (!hasActions) {
    alert('No actions to mirror in this play');
    return;
  }

  // Player swap mapping: 2↔3, 4↔5, 1 stays
  const swapMap = {
    2: 3, 3: 2,
    4: 5, 5: 4,
    1: 1
  };

  // Mirror X coordinate (court center is at x=0)
  function mirrorX(x) {
    return -x;
  }

  // Process each phase
  currentPlay.phases.forEach(phase => {
    // Mirror all action coordinates
    if (phase.actions) {
      phase.actions.forEach(action => {
        // Mirror start point
        action.start.x = mirrorX(action.start.x);

        // Mirror end point
        action.end.x = mirrorX(action.end.x);

        // Mirror mid control point if exists
        if (action.mid) {
          action.mid.x = mirrorX(action.mid.x);
        }
      });
    }

    // Mirror all player positions and swap assignments
    const newPlayers = {};
    Object.entries(phase.players).forEach(([num, pos]) => {
      const playerNum = parseInt(num);
      const swappedNum = swapMap[playerNum] || playerNum;
      newPlayers[swappedNum] = {
        x: mirrorX(pos.x),
        y: pos.y,
        hasBall: pos.hasBall
      };
    });
    phase.players = newPlayers;

    // Mirror all defender positions and swap assignments
    if (phase.defenders) {
      const newDefenders = {};
      Object.entries(phase.defenders).forEach(([num, pos]) => {
        const defNum = parseInt(num);
        const swappedNum = swapMap[defNum] || defNum;
        newDefenders[swappedNum] = {
          x: mirrorX(pos.x),
          y: pos.y
        };
      });
      phase.defenders = newDefenders;
    }

    // Update phase description - swap player numbers
    if (phase.description) {
      let desc = phase.description;
      // Use placeholders to avoid double-swapping
      desc = desc.replace(/\b2\b/g, '___TWO___');
      desc = desc.replace(/\b3\b/g, '___THREE___');
      desc = desc.replace(/\b4\b/g, '___FOUR___');
      desc = desc.replace(/\b5\b/g, '___FIVE___');
      // Now replace placeholders with swapped numbers
      desc = desc.replace(/___TWO___/g, '3');
      desc = desc.replace(/___THREE___/g, '2');
      desc = desc.replace(/___FOUR___/g, '5');
      desc = desc.replace(/___FIVE___/g, '4');
      // Also swap left/right
      desc = desc.replace(/\bright\b/gi, '___RIGHT___');
      desc = desc.replace(/\bleft\b/gi, '___LEFT___');
      desc = desc.replace(/___RIGHT___/g, 'left');
      desc = desc.replace(/___LEFT___/g, 'right');
      phase.description = desc;
    }
  });

  isDirty = true;
  renderAll();
}

function showPhaseMenu(event) {
  event.stopPropagation();

  const menu = document.createElement('div');
  menu.className = 'phase-context-menu';
  menu.innerHTML = `
    <div class="menu-item" onclick="deleteCurrentPhase()">Delete Phase</div>
    <div class="menu-item" onclick="movePhaseUp()">Move Up</div>
    <div class="menu-item" onclick="movePhaseDown()">Move Down</div>
  `;

  menu.style.position = 'fixed';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';

  document.body.appendChild(menu);

  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  };

  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function deleteCurrentPhase() {
  if (!currentPlay || currentPlay.phases.length <= 1) {
    alert('Cannot delete the only phase');
    return;
  }

  if (!confirm('Delete this phase?')) return;

  currentPlay.phases.splice(currentPhaseIndex, 1);
  if (currentPhaseIndex >= currentPlay.phases.length) {
    currentPhaseIndex = currentPlay.phases.length - 1;
  }
  isDirty = true;
  renderAll();
}

function movePhaseUp() {
  if (!currentPlay || currentPhaseIndex === 0) return;

  const temp = currentPlay.phases[currentPhaseIndex];
  currentPlay.phases[currentPhaseIndex] = currentPlay.phases[currentPhaseIndex - 1];
  currentPlay.phases[currentPhaseIndex - 1] = temp;
  currentPhaseIndex--;
  isDirty = true;
  renderAll();
}

function movePhaseDown() {
  if (!currentPlay || currentPhaseIndex >= currentPlay.phases.length - 1) return;

  const temp = currentPlay.phases[currentPhaseIndex];
  currentPlay.phases[currentPhaseIndex] = currentPlay.phases[currentPhaseIndex + 1];
  currentPlay.phases[currentPhaseIndex + 1] = temp;
  currentPhaseIndex++;
  isDirty = true;
  renderAll();
}

function toggleShowTitle() {
  if (!currentPlay) return;
  const phase = currentPlay.phases[currentPhaseIndex];
  phase.showTitleInAnimation = document.getElementById('showTitleInAnimation')?.checked || false;
  isDirty = true;
}

function deselectItem() {
  selectedItem = null;
  renderAll();
}

// ============================================================================
// TEMPLATE PICKER
// ============================================================================

function selectCourtType(courtType) {
  selectedCourtType = courtType;
  selectedTemplate = null;

  // Update sidebar buttons
  document.querySelectorAll('.template-sidebar-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.court === courtType);
  });

  // Re-render grid
  renderTemplateGrid();

  // Disable start button
  document.getElementById('startTemplateBtn').disabled = true;
}

// Store loaded existing plays for use in startWithTemplate
let existingPlaysCache = {};

async function renderTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  grid.innerHTML = '';

  // Handle existing plays - query Firestore
  if (selectedCourtType === 'existingPlays') {
    grid.innerHTML = '<div class="template-loading">Loading plays...</div>';

    try {
      const snapshot = await db.collection('customPlays').get();
      grid.innerHTML = '';

      if (snapshot.empty) {
        grid.innerHTML = '<div class="template-empty">No existing plays yet</div>';
        return;
      }

      snapshot.forEach(doc => {
        const play = { ...doc.data(), id: doc.id };
        existingPlaysCache[doc.id] = play;

        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.template = `existing:${doc.id}`;
        card.onclick = () => selectTemplate(`existing:${doc.id}`);

        // Create preview showing all phases
        const preview = createExistingPlayPreview(play);

        const statusBadge = play.status === 'published'
          ? '<span class="template-status published">Published</span>'
          : '<span class="template-status draft">Draft</span>';

        card.innerHTML = `
          <div class="template-preview">${preview}</div>
          <div class="template-name">${play.name || 'Untitled'}</div>
          ${statusBadge}
        `;

        grid.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading existing plays:', error);
      grid.innerHTML = '<div class="template-empty">Error loading plays</div>';
    }
    return;
  }

  // Handle built-in templates
  Object.entries(templates).forEach(([key, template]) => {
    // Filter by court type
    if (template.category !== selectedCourtType) return;

    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.template = key;
    card.onclick = () => selectTemplate(key);

    card.innerHTML = `
      <div class="template-preview">${createMiniCourtSVG(template)}</div>
      <div class="template-name">${template.name}</div>
    `;

    grid.appendChild(card);
  });
}

function createExistingPlayPreview(play) {
  const courtType = play.courtType || 'halfCourt';

  // Use same coordinate transform as regular templates
  let toMiniX, toMiniY, svgStart, svgEnd;

  if (courtType === 'fullCourtH') {
    toMiniX = (x) => (x + 50) * 0.85 + 5;
    toMiniY = (y) => y * 1.1 + 5;
    svgStart = '<svg viewBox="0 0 95 55" class="mini-court"><rect x="0" y="0" width="95" height="55" fill="#dbc097"/><rect x="5" y="5" width="85" height="45" fill="none" stroke="#fff" stroke-width="0.6"/><line x1="47.5" y1="5" x2="47.5" y2="50" stroke="#fff" stroke-width="0.6"/>';
    svgEnd = '</svg>';
  } else if (courtType === 'fullCourtV') {
    toMiniX = (x) => (x + 28) * 1.0 + 5;
    toMiniY = (y) => y * 0.95 + 5;
    svgStart = '<svg viewBox="0 0 65 95" class="mini-court"><rect x="0" y="0" width="65" height="95" fill="#dbc097"/><rect x="5" y="5" width="55" height="85" fill="none" stroke="#fff" stroke-width="0.6"/><line x1="5" y1="47.5" x2="60" y2="47.5" stroke="#fff" stroke-width="0.6"/>';
    svgEnd = '</svg>';
  } else {
    // Half court
    toMiniX = (x) => (x + 25) * 1.5 + 5;
    toMiniY = (y) => y * 1.47 + 5;
    svgStart = '<svg viewBox="0 0 85 79" class="mini-court"><rect x="0" y="0" width="85" height="79" fill="#dbc097"/><rect x="5" y="5" width="75" height="69" fill="none" stroke="#fff" stroke-width="0.8"/><rect x="33" y="5" width="19" height="28" fill="none" stroke="#fff" stroke-width="0.8"/><path d="M33,33 A9.5,9.5 0 0,0 52,33" fill="none" stroke="#fff" stroke-width="0.8"/>';
    svgEnd = '</svg>';
  }

  let playersHtml = '';
  let actionsHtml = '';

  // Get first phase for player positions
  const firstPhase = play.phases && play.phases[0] ? play.phases[0] : { players: {} };

  // Render players from first phase
  if (firstPhase.players) {
    Object.entries(firstPhase.players).forEach(([num, pos]) => {
      const x = toMiniX(pos.x);
      const y = toMiniY(pos.y);
      if (pos.hasBall) {
        playersHtml += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#333" stroke-width="1"/>`;
      }
      playersHtml += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#333" font-size="7" font-weight="700">${num}</text>`;
    });
  }

  // Render actions from ALL phases (stacked)
  if (play.phases) {
    play.phases.forEach(phase => {
      if (!phase.actions) return;
      phase.actions.forEach(action => {
        const startX = toMiniX(action.start.x);
        const startY = toMiniY(action.start.y);
        const endX = toMiniX(action.end.x);
        const endY = toMiniY(action.end.y);
        const color = action.color || '#333';

        if (action.type === 'pass') {
          actionsHtml += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${color}" stroke-width="0.8" stroke-dasharray="2,1"/>`;
        } else if (action.type === 'cut' || action.type === 'dribble') {
          actionsHtml += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${color}" stroke-width="0.8"/>`;
        } else if (action.type === 'shot') {
          actionsHtml += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${color}" stroke-width="0.8" stroke-dasharray="1,1"/>`;
          actionsHtml += `<circle cx="${endX}" cy="${endY}" r="3" fill="none" stroke="${color}" stroke-width="0.5"/>`;
        }
      });
    });
  }

  return svgStart + actionsHtml + playersHtml + svgEnd;
}

function createMiniCourtSVG(template) {
  const category = template.category || 'halfCourt';

  if (category === 'fullCourtH') {
    return createMiniFullCourtHorizontalSVG(template);
  } else if (category === 'fullCourtV') {
    return createMiniFullCourtVerticalSVG(template);
  }

  // Half court
  function toMiniX(x) { return (x + 25) * 1.5 + 5; }
  function toMiniY(y) { return y * 1.47 + 5; }

  let playersHtml = '';

  // Render players
  if (template.positions) {
    Object.entries(template.positions).forEach(([num, pos]) => {
      const x = toMiniX(pos.x);
      const y = toMiniY(pos.y);

      if (pos.hasBall) {
        playersHtml += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#333" stroke-width="1"/>`;
      }
      playersHtml += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#333" font-size="7" font-weight="700">${num}</text>`;
    });
  }

  // Render defenders
  if (template.defenders) {
    Object.entries(template.defenders).forEach(([num, pos]) => {
      const x = toMiniX(pos.x);
      const y = toMiniY(pos.y);
      playersHtml += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#c44" font-size="6" font-weight="700">X<tspan font-size="4" baseline-shift="sub">${num}</tspan></text>`;
    });
  }

  return `
    <svg viewBox="0 0 85 79" class="mini-court">
      <rect x="0" y="0" width="85" height="79" fill="#dbc097"/>
      <rect x="5" y="5" width="75" height="69" fill="none" stroke="#fff" stroke-width="0.8"/>
      <rect x="33" y="5" width="19" height="28" fill="none" stroke="#fff" stroke-width="0.8"/>
      <path d="M33,33 A9.5,9.5 0 0,0 52,33" fill="none" stroke="#fff" stroke-width="0.8"/>
      <path d="M10,5 L10,20 A32,32 0 0,0 75,20 L75,5" fill="none" stroke="#fff" stroke-width="0.8"/>
      <circle cx="42.5" cy="12" r="1.5" fill="none" stroke="#fff" stroke-width="0.8"/>
      <line x1="5" y1="74" x2="80" y2="74" stroke="#fff" stroke-width="0.8"/>
      ${playersHtml}
    </svg>
  `;
}

function createMiniFullCourtHorizontalSVG(template) {
  function toMiniX(x) { return (x + 50) * 0.85 + 5; }
  function toMiniY(y) { return y * 1.1 + 5; }

  let playersHtml = '';

  if (template.positions) {
    Object.entries(template.positions).forEach(([num, pos]) => {
      const x = toMiniX(pos.x);
      const y = toMiniY(pos.y);

      if (pos.hasBall) {
        playersHtml += `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#333" stroke-width="0.8"/>`;
      }
      playersHtml += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#333" font-size="5" font-weight="700">${num}</text>`;
    });
  }

  // Horizontal full court
  return `
    <svg viewBox="0 0 95 55" class="mini-court">
      <rect x="0" y="0" width="95" height="55" fill="#dbc097"/>
      <rect x="5" y="5" width="85" height="45" fill="none" stroke="#fff" stroke-width="0.6"/>
      <line x1="47.5" y1="5" x2="47.5" y2="50" stroke="#fff" stroke-width="0.6"/>
      <circle cx="47.5" cy="27.5" r="6" fill="none" stroke="#fff" stroke-width="0.6"/>
      <rect x="5" y="15" width="12" height="25" fill="none" stroke="#fff" stroke-width="0.6"/>
      <rect x="78" y="15" width="12" height="25" fill="none" stroke="#fff" stroke-width="0.6"/>
      <circle cx="12" cy="27.5" r="1" fill="none" stroke="#fff" stroke-width="0.6"/>
      <circle cx="83" cy="27.5" r="1" fill="none" stroke="#fff" stroke-width="0.6"/>
      ${playersHtml}
    </svg>
  `;
}

function createMiniFullCourtVerticalSVG(template) {
  function toMiniX(x) { return (x + 25) * 1.1 + 5; }
  function toMiniY(y) { return y * 0.75 + 5; }

  let playersHtml = '';

  if (template.positions) {
    Object.entries(template.positions).forEach(([num, pos]) => {
      const x = toMiniX(pos.x);
      const y = toMiniY(pos.y);

      if (pos.hasBall) {
        playersHtml += `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#333" stroke-width="0.8"/>`;
      }
      playersHtml += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#333" font-size="5" font-weight="700">${num}</text>`;
    });
  }

  // Vertical full court
  return `
    <svg viewBox="0 0 65 95" class="mini-court">
      <rect x="0" y="0" width="65" height="95" fill="#dbc097"/>
      <rect x="5" y="5" width="55" height="85" fill="none" stroke="#fff" stroke-width="0.6"/>
      <line x1="5" y1="47.5" x2="60" y2="47.5" stroke="#fff" stroke-width="0.6"/>
      <circle cx="32.5" cy="47.5" r="6" fill="none" stroke="#fff" stroke-width="0.6"/>
      <rect x="20" y="5" width="25" height="15" fill="none" stroke="#fff" stroke-width="0.6"/>
      <rect x="20" y="75" width="25" height="15" fill="none" stroke="#fff" stroke-width="0.6"/>
      <circle cx="32.5" cy="12" r="1" fill="none" stroke="#fff" stroke-width="0.6"/>
      <circle cx="32.5" cy="83" r="1" fill="none" stroke="#fff" stroke-width="0.6"/>
      ${playersHtml}
    </svg>
  `;
}

let selectedTemplate = null;

function selectTemplate(key) {
  selectedTemplate = key;
  document.querySelectorAll('.template-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.template === key);
  });
  document.getElementById('startTemplateBtn').disabled = false;
}

function showTemplateModal() {
  document.getElementById('templateModal').classList.add('active');
  selectedTemplate = null;
  document.getElementById('startTemplateBtn').disabled = true;
}

function closeTemplateModal() {
  document.getElementById('templateModal').classList.remove('active');
}

function startWithTemplate() {
  if (!selectedTemplate) return;

  // Handle existing play as template
  if (selectedTemplate.startsWith('existing:')) {
    const playId = selectedTemplate.replace('existing:', '');
    const existingPlay = existingPlaysCache[playId];

    if (!existingPlay) {
      alert('Play not found');
      return;
    }

    // Clone the existing play as a new draft
    currentPlay = {
      id: null,
      name: existingPlay.name ? `${existingPlay.name} (Copy)` : 'Untitled Copy',
      description: existingPlay.description || '',
      chapter: null,
      status: 'draft',
      courtType: existingPlay.courtType || 'halfCourt',
      createdBy: currentUser.email,
      createdAt: null,
      updatedAt: null,
      phases: JSON.parse(JSON.stringify(existingPlay.phases || []))
    };

    // Ensure at least one phase exists
    if (currentPlay.phases.length === 0) {
      currentPlay.phases = [{
        players: {},
        defenders: {},
        actions: [],
        description: ''
      }];
    }

    currentPhaseIndex = 0;
    isDirty = false;

    closeTemplateModal();
    document.getElementById('playName').value = currentPlay.name;
    if (document.getElementById('playDescription')) {
      document.getElementById('playDescription').value = currentPlay.description;
    }
    renderAll();
    return;
  }

  // Handle built-in template
  const template = templates[selectedTemplate];

  currentPlay = {
    id: null,
    name: '',
    description: '',
    chapter: null,
    status: 'draft',
    courtType: template.category || 'halfCourt',
    createdBy: currentUser.email,
    createdAt: null,
    updatedAt: null,
    phases: [{
      players: JSON.parse(JSON.stringify(template.positions || {})),
      defenders: JSON.parse(JSON.stringify(template.defenders || {})),
      actions: [],
      description: ''
    }]
  };

  currentPhaseIndex = 0;
  isDirty = false;

  closeTemplateModal();
  renderAll();
}

// ============================================================================
// RENDERING
// ============================================================================

function renderAll() {
  updateCourtLayout();
  renderCourt();
  renderPhases();
  renderTimeline();
  renderPropertiesPanel();
}

// Update the court SVG based on courtType (halfCourt, fullCourtH, fullCourtV)
function updateCourtLayout() {
  if (!currentPlay) return;

  const svg = document.getElementById('courtSvg');
  const background = document.getElementById('courtBackground');
  const linesGroup = document.getElementById('courtLines');
  if (!svg || !background || !linesGroup) return;

  const courtType = currentPlay.courtType || 'halfCourt';

  if (courtType === 'fullCourtH') {
    // Horizontal full court
    svg.setAttribute('viewBox', '-53 -3 106 55');
    background.setAttribute('x', '-53');
    background.setAttribute('y', '-3');
    background.setAttribute('width', '106');
    background.setAttribute('height', '55');
    linesGroup.innerHTML = getFullCourtHorizontalLines();
  } else if (courtType === 'fullCourtV') {
    // Vertical full court
    svg.setAttribute('viewBox', '-28 -3 56 97');
    background.setAttribute('x', '-28');
    background.setAttribute('y', '-3');
    background.setAttribute('width', '56');
    background.setAttribute('height', '97');
    linesGroup.innerHTML = getFullCourtVerticalLines();
  } else {
    // Half court (default)
    svg.setAttribute('viewBox', '-28 -3 56 50');
    background.setAttribute('x', '-28');
    background.setAttribute('y', '-3');
    background.setAttribute('width', '56');
    background.setAttribute('height', '50');
    linesGroup.innerHTML = getHalfCourtLines();
  }
}

function getHalfCourtLines() {
  return `
    <!-- Baseline (top) -->
    <line x1="-25" y1="0" x2="25" y2="0"/>
    <!-- Sidelines -->
    <line x1="-25" y1="0" x2="-25" y2="47"/>
    <line x1="25" y1="0" x2="25" y2="47"/>
    <!-- Paint/Key -->
    <path d="M -6 0 L -6 19 L 6 19 L 6 0"/>
    <!-- Free throw circle (bottom half) -->
    <path d="M -6 19 A 6 6 0 0 0 6 19"/>
    <!-- 3-point line -->
    <path d="M -21.65 0 L -21.65 9.95 A 22.15 22.15 0 0 0 21.65 9.95 L 21.65 0"/>
    <!-- Half court line -->
    <path d="M -25 47 L 25 47"/>
    <!-- Half court circle (top half) -->
    <path d="M 6 47 A 6 6 0 0 0 -6 47"/>
    <!-- Restricted area arc -->
    <path d="M -4 5.25 A 4 4 0 0 0 4 5.25"/>
    <!-- Lane tick marks -->
    <line x1="-6" y1="18" x2="-6.5" y2="18"/>
    <line x1="-6" y1="15" x2="-6.5" y2="15"/>
    <line x1="-6" y1="12" x2="-6.5" y2="12"/>
    <rect x="-6.5" y="8" width="0.5" height="1" fill="#fff"/>
    <line x1="6" y1="18" x2="6.5" y2="18"/>
    <line x1="6" y1="15" x2="6.5" y2="15"/>
    <line x1="6" y1="12" x2="6.5" y2="12"/>
    <rect x="6" y="8" width="0.5" height="1" fill="#fff"/>
    <!-- Backboard and rim -->
    <line x1="-3" y1="4" x2="3" y2="4"/>
    <circle cx="0" cy="5.25" r="0.75"/>
  `;
}

function getFullCourtHorizontalLines() {
  return `
    <!-- Court outline -->
    <rect x="-50" y="0" width="100" height="48" fill="none" stroke="#fff" stroke-width="0.4"/>
    <!-- Center line -->
    <line x1="0" y1="0" x2="0" y2="48"/>
    <!-- Center circle -->
    <circle cx="0" cy="24" r="6" fill="none"/>

    <!-- LEFT SIDE (baseline at x=-50) -->
    <!-- Paint/Key -->
    <path d="M -50 18 L -31 18 L -31 30 L -50 30"/>
    <!-- Free throw circle -->
    <path d="M -31 18 A 6 6 0 0 0 -31 30"/>
    <!-- 3-point line -->
    <path d="M -50 5 L -27 5 A 22.15 22.15 0 0 1 -27 43 L -50 43"/>
    <!-- Restricted area -->
    <path d="M -50 20 A 4 4 0 0 1 -50 28"/>
    <!-- Backboard and rim -->
    <line x1="-49" y1="21" x2="-49" y2="27"/>
    <circle cx="-48.25" cy="24" r="0.75"/>

    <!-- RIGHT SIDE (baseline at x=50) -->
    <!-- Paint/Key -->
    <path d="M 50 18 L 31 18 L 31 30 L 50 30"/>
    <!-- Free throw circle -->
    <path d="M 31 18 A 6 6 0 0 1 31 30"/>
    <!-- 3-point line -->
    <path d="M 50 5 L 27 5 A 22.15 22.15 0 0 0 27 43 L 50 43"/>
    <!-- Restricted area -->
    <path d="M 50 20 A 4 4 0 0 0 50 28"/>
    <!-- Backboard and rim -->
    <line x1="49" y1="21" x2="49" y2="27"/>
    <circle cx="48.25" cy="24" r="0.75"/>
  `;
}

function getFullCourtVerticalLines() {
  return `
    <!-- Court outline -->
    <rect x="-25" y="0" width="50" height="94" fill="none" stroke="#fff" stroke-width="0.4"/>
    <!-- Center line -->
    <line x1="-25" y1="47" x2="25" y2="47"/>
    <!-- Center circle -->
    <circle cx="0" cy="47" r="6" fill="none"/>

    <!-- TOP SIDE (baseline at y=0) -->
    <!-- Paint/Key -->
    <path d="M -6 0 L -6 19 L 6 19 L 6 0"/>
    <!-- Free throw circle (bottom half) -->
    <path d="M -6 19 A 6 6 0 0 0 6 19"/>
    <!-- 3-point line -->
    <path d="M -21.65 0 L -21.65 9.95 A 22.15 22.15 0 0 0 21.65 9.95 L 21.65 0"/>
    <!-- Restricted area arc -->
    <path d="M -4 5.25 A 4 4 0 0 0 4 5.25"/>
    <!-- Backboard and rim -->
    <line x1="-3" y1="4" x2="3" y2="4"/>
    <circle cx="0" cy="5.25" r="0.75"/>

    <!-- BOTTOM SIDE (baseline at y=94) -->
    <!-- Paint/Key -->
    <path d="M -6 94 L -6 75 L 6 75 L 6 94"/>
    <!-- Free throw circle (top half) -->
    <path d="M -6 75 A 6 6 0 0 1 6 75"/>
    <!-- 3-point line -->
    <path d="M -21.65 94 L -21.65 84.05 A 22.15 22.15 0 0 1 21.65 84.05 L 21.65 94"/>
    <!-- Restricted area arc -->
    <path d="M -4 88.75 A 4 4 0 0 1 4 88.75"/>
    <!-- Backboard and rim -->
    <line x1="-3" y1="90" x2="3" y2="90"/>
    <circle cx="0" cy="88.75" r="0.75"/>
  `;
}

function renderPropertiesPanel() {
  const panel = document.getElementById('actionPropertiesPanel');
  if (!panel) return;

  if (!selectedItem || selectedItem.type !== 'action' || !currentPlay) {
    panel.style.display = 'none';
    return;
  }

  const phase = currentPlay.phases[currentPhaseIndex];
  const action = phase.actions[selectedItem.id];

  if (!action) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  // Get ball flow analysis for this action
  const flowAnalysis = analyzeBallFlow(phase);
  const assignment = flowAnalysis[selectedItem.id];

  // Update title
  const title = action.type.toUpperCase();
  document.getElementById('actionPropertiesTitle').textContent = title;
  document.getElementById('actionTypeLabel').textContent = action.type.charAt(0).toUpperCase() + action.type.slice(1);

  // Update color picker
  document.getElementById('actionColor').value = action.color || '#333333';

  // Show/hide error message
  let errorDiv = document.getElementById('actionError');
  if (!errorDiv) {
    // Create error div if it doesn't exist
    const propsDiv = panel.querySelector('.action-properties');
    errorDiv = document.createElement('div');
    errorDiv.id = 'actionError';
    errorDiv.className = 'action-error';
    propsDiv.insertBefore(errorDiv, propsDiv.firstChild);
  }

  if (assignment && assignment.error) {
    errorDiv.innerHTML = `<span class="error-icon">⚠</span> ${assignment.error}`;
    errorDiv.style.display = 'flex';
  } else {
    errorDiv.style.display = 'none';
  }
}

function updateActionColor(color) {
  if (!selectedItem || selectedItem.type !== 'action' || !currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  const action = phase.actions[selectedItem.id];

  if (action) {
    action.color = color;
    isDirty = true;
    renderCourt();
  }
}

function deleteSelectedAction() {
  if (!selectedItem || selectedItem.type !== 'action') return;
  deleteAction(selectedItem.id);
}

function deselectAction() {
  selectedItem = null;
  renderAll();
}

function renderCourt() {
  if (!currentPlay) return;
  const phase = currentPlay.phases[currentPhaseIndex];

  renderActions(phase);
  renderPlayers(phase);
  renderDefenders(phase);
}

function renderPlayers(phase) {
  const layer = document.getElementById('playersLayer');
  layer.innerHTML = '';

  Object.entries(phase.players).forEach(([num, pos]) => {
    const isSelected = selectedItem?.type === 'player' && selectedItem?.id === parseInt(num);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `player-marker ${isSelected ? 'selected' : ''}`);
    g.setAttribute('data-type', 'player');
    g.setAttribute('data-id', num);
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    g.style.cursor = 'grab';

    // Hit area
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitArea.setAttribute('r', '2.5');
    hitArea.setAttribute('fill', 'transparent');
    g.appendChild(hitArea);

    // Ball ring
    if (pos.hasBall) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', '1.5');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#333');
      ring.setAttribute('stroke-width', '0.22');
      g.appendChild(ring);
    }

    // Selection ring
    if (isSelected) {
      const sel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      sel.setAttribute('r', '2');
      sel.setAttribute('fill', 'none');
      sel.setAttribute('stroke', '#4a9f6e');
      sel.setAttribute('stroke-width', '0.3');
      g.appendChild(sel);
    }

    // Number
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#333');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-size', '2.2');
    text.setAttribute('font-family', 'Roboto, sans-serif');
    text.textContent = num;
    g.appendChild(text);

    layer.appendChild(g);
  });
}

function renderDefenders(phase) {
  const layer = document.getElementById('defendersLayer');
  layer.innerHTML = '';

  if (!phase.defenders) return;

  Object.entries(phase.defenders).forEach(([num, pos]) => {
    const isSelected = selectedItem?.type === 'defender' && selectedItem?.id === parseInt(num);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `defender-marker ${isSelected ? 'selected' : ''}`);
    g.setAttribute('data-type', 'defender');
    g.setAttribute('data-id', num);
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    g.style.cursor = 'grab';

    // Hit area
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitArea.setAttribute('r', '2.5');
    hitArea.setAttribute('fill', 'transparent');
    g.appendChild(hitArea);

    // Selection ring
    if (isSelected) {
      const sel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      sel.setAttribute('r', '2');
      sel.setAttribute('fill', 'none');
      sel.setAttribute('stroke', '#4a9f6e');
      sel.setAttribute('stroke-width', '0.3');
      g.appendChild(sel);
    }

    // Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#333');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-size', '1.8');
    text.setAttribute('font-family', 'Roboto, sans-serif');
    text.textContent = `X${num}`;
    g.appendChild(text);

    layer.appendChild(g);
  });
}

function renderActions(phase) {
  const layer = document.getElementById('actionsLayer');
  layer.innerHTML = '';

  if (!phase.actions) return;

  phase.actions.forEach((action, index) => {
    const isSelected = selectedItem?.type === 'action' && selectedItem?.id === index;
    const g = createActionSVG(action, index, isSelected);
    layer.appendChild(g);
  });
}

function createActionSVG(action, index, isSelected) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', `action-group ${action.type} ${isSelected ? 'selected' : ''}`);
  g.setAttribute('data-type', 'action');
  g.setAttribute('data-id', index);

  // Use action's custom color, or green if selected, or default black
  const color = isSelected ? '#4a9f6e' : (action.color || '#333');
  const start = action.start;
  const end = action.end;
  const mid = action.mid;

  // Draw the action line
  let pathEl;
  switch (action.type) {
    case 'dribble':
      pathEl = createWavyPath(start, end, mid, color);
      break;
    case 'pass':
      pathEl = createDashedArrow(start, end, mid, color);
      break;
    case 'cut':
      pathEl = createSolidArrow(start, end, mid, color);
      break;
    case 'screen':
      pathEl = createScreenLine(start, end, mid, color);
      break;
    case 'shot':
      pathEl = createShotArc(start, end, mid, color);
      break;
    case 'handoff':
      pathEl = createHandoffLine(start, end, mid, color);
      break;
    default:
      pathEl = createSolidArrow(start, end, mid, color);
  }

  if (pathEl) {
    g.appendChild(pathEl);
  }

  // Draw draggable handles at endpoints
  const handleColor = isSelected ? '#4a9f6e' : '#3b82f6';

  // Start handle
  const startHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  startHandle.setAttribute('cx', start.x);
  startHandle.setAttribute('cy', start.y);
  startHandle.setAttribute('r', '0.8');
  startHandle.setAttribute('fill', handleColor);
  startHandle.setAttribute('stroke', '#fff');
  startHandle.setAttribute('stroke-width', '0.15');
  startHandle.setAttribute('data-type', 'action-start');
  startHandle.setAttribute('data-id', index);
  startHandle.style.cursor = 'grab';
  g.appendChild(startHandle);

  // Midpoint handle (for creating curves)
  const midX = mid ? mid.x : (start.x + end.x) / 2;
  const midY = mid ? mid.y : (start.y + end.y) / 2;

  const midHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  midHandle.setAttribute('cx', midX);
  midHandle.setAttribute('cy', midY);
  midHandle.setAttribute('r', '0.6');
  midHandle.setAttribute('fill', mid ? handleColor : 'transparent');
  midHandle.setAttribute('stroke', handleColor);
  midHandle.setAttribute('stroke-width', '0.15');
  midHandle.setAttribute('data-type', 'action-mid');
  midHandle.setAttribute('data-id', index);
  midHandle.style.cursor = 'grab';
  g.appendChild(midHandle);

  // End handle
  const endHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  endHandle.setAttribute('cx', end.x);
  endHandle.setAttribute('cy', end.y);
  endHandle.setAttribute('r', '0.8');
  endHandle.setAttribute('fill', handleColor);
  endHandle.setAttribute('stroke', '#fff');
  endHandle.setAttribute('stroke-width', '0.15');
  endHandle.setAttribute('data-type', 'action-end');
  endHandle.setAttribute('data-id', index);
  endHandle.style.cursor = 'grab';
  g.appendChild(endHandle);

  return g;
}

// Action path generators - all support optional mid point for curves
function createWavyPath(start, end, mid, color) {
  const amp = 1.5;  // Increased amplitude for more pronounced squiggle

  // Generate wavy path along a quadratic bezier if mid exists
  function generateWavySegment(p0, p1, startWavePhase = 0) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.1) return '';

    // More waves for a squigglier look
    const waves = Math.max(3, Math.floor(len / 2));
    const perpX = -dy / len;
    const perpY = dx / len;

    let d = '';
    for (let i = 1; i <= waves; i++) {
      const t = i / waves;
      const x = p0.x + dx * t;
      const y = p0.y + dy * t;
      const offset = ((i + startWavePhase) % 2 === 1 ? 1 : -1) * amp;
      const cpX = p0.x + dx * (t - 0.5/waves) + perpX * offset;
      const cpY = p0.y + dy * (t - 0.5/waves) + perpY * offset;
      d += ` Q${cpX},${cpY} ${x},${y}`;
    }
    return d;
  }

  let d;
  if (mid) {
    // Create wavy path: start → mid → end
    d = `M${start.x},${start.y}`;
    d += generateWavySegment(start, mid, 0);
    d += generateWavySegment(mid, end, 1); // Continue wave phase
  } else {
    d = `M${start.x},${start.y}`;
    d += generateWavySegment(start, end, 0);
  }

  if (!d || d === `M${start.x},${start.y}`) return null;

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '0.25');
  path.setAttribute('marker-end', 'url(#arrowhead)');
  return path;
}

function createDashedArrow(start, end, mid, color) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let d;
  if (mid) {
    d = `M${start.x},${start.y} Q${mid.x},${mid.y} ${end.x},${end.y}`;
  } else {
    d = `M${start.x},${start.y} L${end.x},${end.y}`;
  }
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '0.25');
  path.setAttribute('stroke-dasharray', '1.5,1.2');  // Wider gaps for visibility
  path.setAttribute('marker-end', 'url(#arrowhead)');
  return path;
}

function createSolidArrow(start, end, mid, color) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let d;
  if (mid) {
    d = `M${start.x},${start.y} Q${mid.x},${mid.y} ${end.x},${end.y}`;
  } else {
    d = `M${start.x},${start.y} L${end.x},${end.y}`;
  }
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '0.25');
  path.setAttribute('marker-end', 'url(#arrowhead)');
  return path;
}

function createScreenLine(start, end, mid, color) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let d;
  if (mid) {
    d = `M${start.x},${start.y} Q${mid.x},${mid.y} ${end.x},${end.y}`;
  } else {
    d = `M${start.x},${start.y} L${end.x},${end.y}`;
  }
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '0.25');
  path.setAttribute('stroke-dasharray', '0.8,0.4');
  g.appendChild(path);

  // T-bar at end
  const dx = end.x - (mid ? mid.x : start.x);
  const dy = end.y - (mid ? mid.y : start.y);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len * 1.2;
  const perpY = dx / len * 1.2;

  const tBar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  tBar.setAttribute('x1', end.x - perpX);
  tBar.setAttribute('y1', end.y - perpY);
  tBar.setAttribute('x2', end.x + perpX);
  tBar.setAttribute('y2', end.y + perpY);
  tBar.setAttribute('stroke', color);
  tBar.setAttribute('stroke-width', '0.4');
  tBar.setAttribute('stroke-linecap', 'round');
  g.appendChild(tBar);

  return g;
}

function createShotArc(start, end, mid, color) {
  const ctrlX = mid ? mid.x : (start.x + end.x) / 2;
  const ctrlY = mid ? mid.y : Math.min(start.y, end.y) - 5;

  // Create a group to hold the arc and the crosshair target
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // The dashed line path (straight, not arc for shot)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (mid) {
    path.setAttribute('d', `M${start.x},${start.y} Q${mid.x},${mid.y} ${end.x},${end.y}`);
  } else {
    path.setAttribute('d', `M${start.x},${start.y} L${end.x},${end.y}`);
  }
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '0.25');
  path.setAttribute('stroke-dasharray', '0.8,0.5');
  g.appendChild(path);

  // Crosshair/target indicator at the end point
  const size = 2.0;

  // Outer circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', end.x);
  circle.setAttribute('cy', end.y);
  circle.setAttribute('r', size);
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', color);
  circle.setAttribute('stroke-width', '0.25');
  g.appendChild(circle);

  // Horizontal crosshair line
  const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  hLine.setAttribute('x1', end.x - size * 1.5);
  hLine.setAttribute('y1', end.y);
  hLine.setAttribute('x2', end.x + size * 1.5);
  hLine.setAttribute('y2', end.y);
  hLine.setAttribute('stroke', color);
  hLine.setAttribute('stroke-width', '0.25');
  g.appendChild(hLine);

  // Vertical crosshair line
  const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  vLine.setAttribute('x1', end.x);
  vLine.setAttribute('y1', end.y - size * 1.5);
  vLine.setAttribute('x2', end.x);
  vLine.setAttribute('y2', end.y + size * 1.5);
  vLine.setAttribute('stroke', color);
  vLine.setAttribute('stroke-width', '0.25');
  g.appendChild(vLine);

  return g;
}

function createHandoffLine(start, end, mid, color) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let d;
  if (mid) {
    d = `M${start.x},${start.y} Q${mid.x},${mid.y} ${end.x},${end.y}`;
  } else {
    d = `M${start.x},${start.y} L${end.x},${end.y}`;
  }
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '0.25');
  path.setAttribute('marker-start', 'url(#arrowhead-reverse)');
  path.setAttribute('marker-end', 'url(#arrowhead)');
  return path;
}

// ============================================================================
// PHASES
// ============================================================================

function renderPhases() {
  const list = document.getElementById('phaseList');
  list.innerHTML = '';

  if (!currentPlay) return;

  // Update phase counter
  const counter = document.getElementById('phaseCounter');
  if (counter) {
    counter.textContent = `PHASE ${currentPhaseIndex + 1}/${currentPlay.phases.length}`;
  }

  // Update phase description textarea
  const descInput = document.getElementById('phaseDescription');
  if (descInput) {
    const phase = currentPlay.phases[currentPhaseIndex];
    descInput.value = phase?.description || '';
  }

  currentPlay.phases.forEach((phase, index) => {
    const item = document.createElement('div');
    item.className = `phase-item ${index === currentPhaseIndex ? 'active' : ''}`;
    item.onclick = () => switchPhase(index);

    // Pass court type for phase thumbnails
    const phaseTemplate = {
      positions: phase.players,
      defenders: phase.defenders,
      category: currentPlay.courtType || 'halfCourt'
    };

    item.innerHTML = `
      <div class="phase-preview">${createMiniCourtSVG(phaseTemplate)}</div>
      <div class="phase-label">Phase ${index + 1}</div>
      ${currentPlay.phases.length > 1 ? `
        <button class="phase-delete" onclick="event.stopPropagation(); deletePhase(${index})">×</button>
      ` : ''}
    `;

    list.appendChild(item);
  });
}

function switchPhase(index) {
  if (index < 0 || index >= currentPlay.phases.length) return;
  currentPhaseIndex = index;
  selectedItem = null;
  renderAll();
}

function updatePhaseDescription(value) {
  if (!currentPlay) return;
  const phase = currentPlay.phases[currentPhaseIndex];
  if (phase) {
    phase.description = value;
    isDirty = true;
  }
}

function addPhase() {
  if (!currentPlay) return;

  const lastPhase = currentPlay.phases[currentPlay.phases.length - 1];
  const newPhase = {
    players: JSON.parse(JSON.stringify(lastPhase.players)),
    defenders: JSON.parse(JSON.stringify(lastPhase.defenders || {})),
    actions: [],
    description: ''
  };

  currentPlay.phases.push(newPhase);
  currentPhaseIndex = currentPlay.phases.length - 1;
  isDirty = true;
  renderAll();
}

function deletePhase(index) {
  if (!currentPlay || currentPlay.phases.length <= 1) return;
  if (!confirm('Delete this phase?')) return;

  currentPlay.phases.splice(index, 1);
  if (currentPhaseIndex >= currentPlay.phases.length) {
    currentPhaseIndex = currentPlay.phases.length - 1;
  }
  isDirty = true;
  renderAll();
}

// ============================================================================
// TIMELINE
// ============================================================================

function renderTimeline() {
  const timeline = document.getElementById('actionTimeline');

  if (!currentPlay) {
    timeline.innerHTML = '<div class="timeline-empty">No actions</div>';
    return;
  }

  const phase = currentPlay.phases[currentPhaseIndex];

  // Update animate mode phase title
  const animateTitle = document.getElementById('animatePhaseTitle');
  if (animateTitle) {
    animateTitle.textContent = `Phase ${currentPhaseIndex + 1}`;
  }

  // Update show title checkbox
  const showTitleCheckbox = document.getElementById('showTitleInAnimation');
  if (showTitleCheckbox) {
    showTitleCheckbox.checked = phase.showTitleInAnimation || false;
  }

  if (!phase.actions || phase.actions.length === 0) {
    timeline.innerHTML = '<div class="timeline-empty">No actions in this phase</div>';
    return;
  }

  // Analyze all actions for ball flow
  const flowAnalysis = analyzeBallFlow(phase);

  let html = '';

  html += phase.actions.map((action, index) => {
    const isSelected = selectedItem?.type === 'action' && selectedItem?.id === index;
    const assignment = flowAnalysis[index] || { isValid: false, description: action.type };
    const hasWarning = !assignment.isValid;
    const executeSimultaneous = action.executeWithPrevious || false;

    // "Execute at same time" toggle - only for actions after the first
    const simultaneousToggle = index > 0 ? `
      <button class="simultaneous-btn ${executeSimultaneous ? 'active' : ''}"
              onclick="event.stopPropagation(); toggleSimultaneous(${index})"
              title="Execute at same time as previous action">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8v4l3 3"/>
          <circle cx="12" cy="12" r="9"/>
        </svg>
      </button>
    ` : '';

    // Curve toggle
    const hasCurve = action.mid !== null && action.mid !== undefined;
    const curveToggle = `
      <button class="curve-btn ${hasCurve ? 'active' : ''}"
              onclick="event.stopPropagation(); toggleCurve(${index})"
              title="Toggle curve">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 20 Q 12 4, 20 20"/>
        </svg>
      </button>
    `;

    // Menu button
    const menuBtn = `
      <button class="action-menu-btn" onclick="event.stopPropagation(); showActionMenu(event, ${index})" title="More options">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <circle cx="12" cy="6" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="18" r="2"/>
        </svg>
      </button>
    `;

    // Visual indicator for simultaneous execution - indented item
    const simultaneousClass = executeSimultaneous ? 'simultaneous' : '';

    return `
      <div class="timeline-item ${isSelected ? 'selected' : ''} ${hasWarning ? 'warning' : ''} ${simultaneousClass}"
           onclick="selectTimelineAction(${index})" draggable="true"
           ondragstart="handleTimelineDragStart(event, ${index})"
           ondragover="handleTimelineDragOver(event)"
           ondrop="handleTimelineDrop(event, ${index})">
        <div class="timeline-drag" title="Drag to reorder">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/>
            <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
            <circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>
          </svg>
        </div>
        ${hasWarning ? '<div class="timeline-warning" title="' + (assignment.error || 'Invalid action') + '">⚠</div>' : ''}
        <div class="timeline-desc">${assignment.description}</div>
        <div class="timeline-actions">
          ${simultaneousToggle}
          ${curveToggle}
          ${menuBtn}
        </div>
      </div>
    `;
  }).join('');

  timeline.innerHTML = html;
}

// Toggle "execute at same time as previous action"
function toggleSimultaneous(index) {
  if (!currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  if (!phase.actions[index]) return;

  phase.actions[index].executeWithPrevious = !phase.actions[index].executeWithPrevious;
  isDirty = true;
  renderTimeline();
}

// Toggle curve on action
function toggleCurve(index) {
  if (!currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  if (!phase.actions[index]) return;

  const action = phase.actions[index];
  if (action.mid) {
    // Remove curve
    action.mid = null;
  } else {
    // Add curve at midpoint
    action.mid = {
      x: (action.start.x + action.end.x) / 2,
      y: (action.start.y + action.end.y) / 2 - 5 // Offset upward
    };
  }
  isDirty = true;
  renderAll();
}

// Show action context menu
function showActionMenu(event, index) {
  event.stopPropagation();

  const existingMenu = document.querySelector('.action-context-menu');
  if (existingMenu) existingMenu.remove();

  const phase = currentPlay.phases[currentPhaseIndex];
  const action = phase.actions[index];
  const isOptional = action.isOptional || false;

  const menu = document.createElement('div');
  menu.className = 'action-context-menu';
  menu.innerHTML = `
    <div class="menu-item" onclick="showActionOnCourt(${index})">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      Show ${action.type}
    </div>
    <div class="menu-item" onclick="editAction(${index})">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit ${action.type}
    </div>
    <div class="menu-item" onclick="toggleOptional(${index})">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        ${isOptional ? '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>' : '<path d="M20 6L9 17l-5-5"/>'}
      </svg>
      ${isOptional ? 'Make required' : 'Make optional'}
    </div>
    <div class="menu-item delete" onclick="deleteAction(${index})">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      Delete
    </div>
  `;

  menu.style.position = 'fixed';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';

  document.body.appendChild(menu);

  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  };

  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

function showActionOnCourt(index) {
  // Select and highlight the action
  selectedItem = { type: 'action', id: index };
  renderAll();

  // Flash the action
  const actionEl = document.querySelector(`[data-type="action"][data-id="${index}"]`);
  if (actionEl) {
    actionEl.classList.add('flash');
    setTimeout(() => actionEl.classList.remove('flash'), 500);
  }
}

function editAction(index) {
  selectedItem = { type: 'action', id: index };
  setMode('draw');
  renderAll();
}

function toggleOptional(index) {
  if (!currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  if (!phase.actions[index]) return;

  phase.actions[index].isOptional = !phase.actions[index].isOptional;
  isDirty = true;
  renderTimeline();
}

// Find which player an action endpoint is closest to
function findNearestPlayer(point, players) {
  let nearest = null;
  let minDist = 4; // Snap distance threshold (court is ~50 units wide)

  Object.entries(players).forEach(([num, pos]) => {
    const dist = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
    if (dist < minDist) {
      minDist = dist;
      nearest = parseInt(num);
    }
  });

  return nearest;
}

// Check if point is near the hoop
function isNearHoop(point) {
  const dist = Math.sqrt(Math.pow(point.x - COURT.hoopX, 2) + Math.pow(point.y - COURT.hoopY, 2));
  return dist < 4;
}

// Get who starts with the ball
function getInitialBallHolder(phase) {
  for (const [num, pos] of Object.entries(phase.players)) {
    if (pos.hasBall) return parseInt(num);
  }
  return null;
}

// Analyze ball flow through all actions and return assignments for each
function analyzeBallFlow(phase) {
  const results = [];
  let ballHolder = getInitialBallHolder(phase);

  for (let i = 0; i < phase.actions.length; i++) {
    const action = phase.actions[i];
    const startPlayer = findNearestPlayer(action.start, phase.players);
    const endPlayer = findNearestPlayer(action.end, phase.players);
    const endsAtHoop = isNearHoop(action.end);

    const type = action.type.charAt(0).toUpperCase() + action.type.slice(1);
    let assignment = { isValid: false, description: `Unassigned ${type}`, ballHolder: ballHolder };

    switch (action.type) {
      case 'dribble':
        // Dribble: ball holder moves with ball
        if (!startPlayer) {
          assignment = { isValid: false, description: `Unassigned ${type}`, error: 'Not connected to player' };
        } else if (startPlayer !== ballHolder) {
          assignment = { isValid: false, description: `${type} by Player ${startPlayer}`, error: `Player ${startPlayer} doesn't have ball (Player ${ballHolder} has it)` };
        } else {
          assignment = { isValid: true, description: `${type} by Player ${startPlayer}` };
          // Ball stays with same player
        }
        break;

      case 'pass':
        // Pass: ball transfers from holder to receiver
        if (!startPlayer || !endPlayer) {
          assignment = { isValid: false, description: `Unassigned ${type}`, error: 'Not connected to players' };
        } else if (startPlayer !== ballHolder) {
          assignment = { isValid: false, description: `${type} by Player ${startPlayer} to Player ${endPlayer}`, error: `Player ${startPlayer} doesn't have ball` };
        } else {
          assignment = { isValid: true, description: `${type} by Player ${startPlayer} to Player ${endPlayer}` };
          ballHolder = endPlayer; // Ball transfers
        }
        break;

      case 'handoff':
        // Handoff: ball transfers (players must be close)
        if (!startPlayer || !endPlayer) {
          assignment = { isValid: false, description: `Unassigned ${type}`, error: 'Not connected to players' };
        } else if (startPlayer !== ballHolder) {
          assignment = { isValid: false, description: `${type} by Player ${startPlayer} to Player ${endPlayer}`, error: `Player ${startPlayer} doesn't have ball` };
        } else {
          assignment = { isValid: true, description: `${type} by Player ${startPlayer} to Player ${endPlayer}` };
          ballHolder = endPlayer; // Ball transfers
        }
        break;

      case 'cut':
        // Cut: player moves without ball (any player can cut)
        if (!startPlayer) {
          assignment = { isValid: false, description: `Unassigned ${type}`, error: 'Not connected to player' };
        } else {
          assignment = { isValid: true, description: `${type} by Player ${startPlayer}` };
          // No ball movement
        }
        break;

      case 'screen':
        // Screen: player sets screen (any player can screen)
        if (!startPlayer) {
          assignment = { isValid: false, description: `Unassigned Screen`, error: 'Not connected to player' };
        } else {
          assignment = { isValid: true, description: `Screen by Player ${startPlayer}` };
          // No ball movement
        }
        break;

      case 'shot':
        // Shot: must be by ball holder, ends at hoop
        if (!startPlayer) {
          assignment = { isValid: false, description: `Unassigned Shot`, error: 'Not connected to player' };
        } else if (startPlayer !== ballHolder) {
          assignment = { isValid: false, description: `Shot by Player ${startPlayer}`, error: `Player ${startPlayer} doesn't have ball` };
        } else if (!endsAtHoop) {
          assignment = { isValid: false, description: `Shot by Player ${startPlayer}`, error: 'Shot must end at hoop' };
        } else {
          assignment = { isValid: true, description: `Shot by Player ${startPlayer}` };
          ballHolder = null; // Ball is shot
        }
        break;

      default:
        assignment = { isValid: false, description: type };
    }

    assignment.ballHolder = ballHolder;
    results.push(assignment);
  }

  return results;
}

// Get descriptive assignment for a single action (considering ball flow)
function getActionAssignment(action, phase, actionIndex) {
  const flowAnalysis = analyzeBallFlow(phase);
  if (actionIndex !== undefined && flowAnalysis[actionIndex]) {
    return flowAnalysis[actionIndex];
  }

  // Fallback for single action check (find its index)
  const idx = phase.actions.indexOf(action);
  if (idx >= 0 && flowAnalysis[idx]) {
    return flowAnalysis[idx];
  }

  // Ultimate fallback
  const type = action.type.charAt(0).toUpperCase() + action.type.slice(1);
  return { isValid: false, description: `Unassigned ${type}` };
}

// Timeline drag-and-drop reordering
let draggedActionIndex = null;

function handleTimelineDragStart(event, index) {
  draggedActionIndex = index;
  event.dataTransfer.effectAllowed = 'move';
  event.target.classList.add('dragging');
}

function handleTimelineDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleTimelineDrop(event, targetIndex) {
  event.preventDefault();
  if (draggedActionIndex === null || draggedActionIndex === targetIndex) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  const [removed] = phase.actions.splice(draggedActionIndex, 1);
  phase.actions.splice(targetIndex, 0, removed);

  // Update selected item index if needed
  if (selectedItem?.type === 'action') {
    if (selectedItem.id === draggedActionIndex) {
      selectedItem.id = targetIndex;
    } else if (draggedActionIndex < targetIndex && selectedItem.id > draggedActionIndex && selectedItem.id <= targetIndex) {
      selectedItem.id--;
    } else if (draggedActionIndex > targetIndex && selectedItem.id >= targetIndex && selectedItem.id < draggedActionIndex) {
      selectedItem.id++;
    }
  }

  draggedActionIndex = null;
  isDirty = true;
  renderAll();
}

function getActionIcon(type) {
  const icons = {
    dribble: '〰',
    pass: '⤳',
    cut: '→',
    screen: '┃',
    shot: '◎',
    handoff: '⇄'
  };
  return icons[type] || '•';
}

function selectTimelineAction(index) {
  if (selectedItem?.type === 'action' && selectedItem?.id === index) {
    selectedItem = null;
  } else {
    selectedItem = { type: 'action', id: index };
  }
  renderAll();
}

function deleteAction(index) {
  if (!currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  phase.actions.splice(index, 1);

  if (selectedItem?.type === 'action' && selectedItem?.id === index) {
    selectedItem = null;
  } else if (selectedItem?.type === 'action' && selectedItem?.id > index) {
    selectedItem.id--;
  }

  isDirty = true;
  renderAll();
}

// ============================================================================
// ADD ITEMS (Actions placed in center with handles)
// ============================================================================

function addAction(type) {
  if (!currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];

  // Place action at bottom of court (like Hoops Geek) with default horizontal orientation
  // mid is null for straight lines, set to a point for curves
  const action = {
    type: type,
    start: { x: COURT.centerX - 8, y: COURT.maxY - 5 },
    end: { x: COURT.centerX + 8, y: COURT.maxY - 5 },
    mid: null,  // Will be set when user drags midpoint handle
    color: '#333333'  // Default color
  };

  phase.actions.push(action);
  selectedItem = { type: 'action', id: phase.actions.length - 1 };
  isDirty = true;
  renderAll();
}

function addPlayer(num, hasBall) {
  if (!currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];

  // If player already exists, toggle ball or remove
  if (phase.players[num]) {
    if (hasBall && !phase.players[num].hasBall) {
      // Give this player the ball, remove from others
      Object.keys(phase.players).forEach(k => phase.players[k].hasBall = false);
      phase.players[num].hasBall = true;
    } else if (!hasBall && phase.players[num].hasBall) {
      // Remove ball from this player
      phase.players[num].hasBall = false;
    } else {
      // Remove player (but keep at least one)
      if (Object.keys(phase.players).length > 1) {
        delete phase.players[num];
      }
    }
  } else {
    // Add player at default position
    const defaults = {
      1: { x: 0, y: 31 },
      2: { x: -13, y: 25 },
      3: { x: 13, y: 25 },
      4: { x: -18, y: 9 },
      5: { x: 18, y: 9 }
    };

    // If hasBall, remove from others
    if (hasBall) {
      Object.keys(phase.players).forEach(k => phase.players[k].hasBall = false);
    }

    phase.players[num] = { ...defaults[num], hasBall };
  }

  isDirty = true;
  renderAll();
}

function addDefender(num) {
  if (!currentPlay) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  if (!phase.defenders) phase.defenders = {};

  if (phase.defenders[num]) {
    delete phase.defenders[num];
  } else {
    const defaults = {
      1: { x: 0, y: 28 },
      2: { x: -11, y: 22 },
      3: { x: 11, y: 22 },
      4: { x: -15, y: 12 },
      5: { x: 15, y: 12 }
    };
    phase.defenders[num] = { ...defaults[num] };
  }

  isDirty = true;
  renderAll();
}

// ============================================================================
// MOUSE / TOUCH HANDLING
// ============================================================================

function handleMouseDown(e) {
  const svg = document.getElementById('courtSvg');
  const pt = screenToSVG(svg, e.clientX, e.clientY);

  // Check what was clicked
  const target = e.target;
  const type = target.getAttribute('data-type') || target.closest('[data-type]')?.getAttribute('data-type');
  const id = target.getAttribute('data-id') || target.closest('[data-id]')?.getAttribute('data-id');

  if (type && id !== null) {
    isDragging = true;
    dragTarget = { type, id: parseInt(id) };

    // Select the item
    if (type === 'action-start' || type === 'action-end' || type === 'action-mid') {
      selectedItem = { type: 'action', id: parseInt(id) };
    } else {
      selectedItem = { type, id: parseInt(id) };
    }

    renderAll();
    return;
  }

  // Clicked on empty space - deselect
  selectedItem = null;
  renderAll();
}

function handleMouseMove(e) {
  if (!isDragging || !dragTarget || !currentPlay) return;

  const svg = document.getElementById('courtSvg');
  const pt = screenToSVG(svg, e.clientX, e.clientY);

  // Clamp to viewBox (allow out of bounds for inbound plays)
  const x = Math.max(-27, Math.min(27, pt.x));
  const y = Math.max(-2, Math.min(46, pt.y));

  const phase = currentPlay.phases[currentPhaseIndex];

  switch (dragTarget.type) {
    case 'player':
      if (phase.players[dragTarget.id]) {
        phase.players[dragTarget.id].x = x;
        phase.players[dragTarget.id].y = y;
      }
      break;
    case 'defender':
      if (phase.defenders?.[dragTarget.id]) {
        phase.defenders[dragTarget.id].x = x;
        phase.defenders[dragTarget.id].y = y;
      }
      break;
    case 'action-start':
      if (phase.actions[dragTarget.id]) {
        phase.actions[dragTarget.id].start = { x, y };
      }
      break;
    case 'action-mid':
      if (phase.actions[dragTarget.id]) {
        phase.actions[dragTarget.id].mid = { x, y };
      }
      break;
    case 'action-end':
      if (phase.actions[dragTarget.id]) {
        phase.actions[dragTarget.id].end = { x, y };
      }
      break;
  }

  renderCourt();
}

function handleMouseUp() {
  if (isDragging && dragTarget && currentPlay) {
    isDirty = true;

    // Snap action endpoints to nearest player if close enough
    const phase = currentPlay.phases[currentPhaseIndex];
    const SNAP_DISTANCE = 2; // SVG units - tight snapping for precise placement

    if (dragTarget.type === 'action-start' || dragTarget.type === 'action-end') {
      const action = phase.actions[dragTarget.id];
      if (action) {
        const point = dragTarget.type === 'action-start' ? action.start : action.end;

        // Find nearest player
        let nearestPlayer = null;
        let nearestDist = Infinity;

        Object.entries(phase.players).forEach(([num, pos]) => {
          const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlayer = { num, pos };
          }
        });

        // Also check defenders
        if (phase.defenders) {
          Object.entries(phase.defenders).forEach(([num, pos]) => {
            const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestPlayer = { num: 'X' + num, pos };
            }
          });
        }

        // Also check hoop (for shot actions)
        const hoopPos = { x: COURT.hoopX, y: COURT.hoopY };
        const hoopDist = Math.hypot(point.x - hoopPos.x, point.y - hoopPos.y);
        let snapToHoop = false;
        if (hoopDist < nearestDist && hoopDist < SNAP_DISTANCE) {
          nearestDist = hoopDist;
          snapToHoop = true;
        }

        // Snap if close enough
        if (snapToHoop) {
          if (dragTarget.type === 'action-start') {
            action.start = { x: hoopPos.x, y: hoopPos.y };
          } else {
            action.end = { x: hoopPos.x, y: hoopPos.y };
          }
          renderCourt();
        } else if (nearestPlayer && nearestDist < SNAP_DISTANCE) {
          if (dragTarget.type === 'action-start') {
            action.start = { x: nearestPlayer.pos.x, y: nearestPlayer.pos.y };
          } else {
            action.end = { x: nearestPlayer.pos.x, y: nearestPlayer.pos.y };
          }
          renderCourt();
        }
      }
    }
  }
  isDragging = false;
  dragTarget = null;
}

function handleTouchStart(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();

  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, target });
}

function handleTouchMove(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();

  const touch = e.touches[0];
  handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
}

function handleTouchEnd() {
  handleMouseUp();
}

function screenToSVG(svg, screenX, screenY) {
  const pt = svg.createSVGPoint();
  pt.x = screenX;
  pt.y = screenY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// ============================================================================
// KEYBOARD
// ============================================================================

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    selectedItem = null;
    renderAll();
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItem) {
    if (e.target.matches('input, textarea')) return;
    e.preventDefault();

    const phase = currentPlay.phases[currentPhaseIndex];

    if (selectedItem.type === 'action') {
      phase.actions.splice(selectedItem.id, 1);
    } else if (selectedItem.type === 'player' && Object.keys(phase.players).length > 1) {
      delete phase.players[selectedItem.id];
    } else if (selectedItem.type === 'defender') {
      delete phase.defenders[selectedItem.id];
    }

    selectedItem = null;
    isDirty = true;
    renderAll();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    savePlay();
  }
}

// ============================================================================
// ANIMATION MODAL
// ============================================================================

let animationSpeed = 1;
let animationPaused = false;
let animationComplete = false;
let animationPhaseIndex = 0;
let animationActionIndex = 0;
let animationState = null; // Stores current animation state for pause/resume

function openAnimationModal() {
  if (!currentPlay) return;

  const modal = document.getElementById('animationModal');
  if (!modal) return;

  modal.classList.add('active');

  // Set title
  const title = document.getElementById('animationTitle');
  if (title) {
    title.textContent = currentPlay.name || 'Animation';
  }

  // Create phase dots
  renderPhaseDots();

  // Initialize animation state
  animationPhaseIndex = 0;
  animationActionIndex = 0;
  animationPaused = true;

  // Copy play state for animation
  animationState = {
    phases: JSON.parse(JSON.stringify(currentPlay.phases))
  };

  // Render initial state
  renderAnimationCourt(animationState.phases[0]);
  updatePhaseIndicator();
}

function closeAnimationModal() {
  const modal = document.getElementById('animationModal');
  if (modal) {
    modal.classList.remove('active');
  }

  // Stop any running animation
  stopAnimation();
  animationState = null;
}

function renderPhaseDots() {
  const dotsContainer = document.getElementById('phaseDots');
  if (!dotsContainer || !currentPlay) return;

  let html = '';
  for (let i = 0; i < currentPlay.phases.length; i++) {
    html += `<span class="phase-dot ${i === 0 ? 'active' : ''}" data-phase="${i}"></span>`;
  }
  dotsContainer.innerHTML = html;
}

function updatePhaseIndicator() {
  const label = document.getElementById('animPhaseLabel');
  if (label) {
    label.textContent = `Phase ${animationPhaseIndex + 1}`;
  }

  const dots = document.querySelectorAll('.phase-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === animationPhaseIndex);
    dot.classList.toggle('completed', i < animationPhaseIndex);
  });

  // Update description
  const descEl = document.getElementById('animDescription');
  if (descEl && animationState && animationState.phases[animationPhaseIndex]) {
    const phase = animationState.phases[animationPhaseIndex];
    descEl.textContent = phase.description || '';
  }
}

function renderAnimationCourt(phase, completedActionCount = 0) {
  const playersLayer = document.getElementById('animPlayersLayer');
  const actionsLayer = document.getElementById('animActionsLayer');

  if (!playersLayer || !actionsLayer) return;

  // Clear layers
  playersLayer.innerHTML = '';
  actionsLayer.innerHTML = '';

  // Render players
  Object.entries(phase.players).forEach(([num, pos]) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'player-marker');
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    g.setAttribute('data-player', num);

    // Ball ring
    if (pos.hasBall) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', '1.5');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#333');
      ring.setAttribute('stroke-width', '0.22');
      g.appendChild(ring);
    }

    // Number
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#333');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-size', '2.2');
    text.setAttribute('font-family', 'Roboto, sans-serif');
    text.textContent = num;
    g.appendChild(text);

    playersLayer.appendChild(g);
  });

  // Render only actions that haven't been completed yet
  if (phase.actions) {
    phase.actions.forEach((action, index) => {
      // Skip actions that have already been animated
      if (index < completedActionCount) return;
      const g = createActionSVG(action, index, false);
      actionsLayer.appendChild(g);
    });
  }
}

function togglePlayPause() {
  if (animationComplete) {
    // If animation finished, restart it
    restartAnimation();
    startAnimation();
  } else if (animationPaused) {
    startAnimation();
  } else {
    pauseAnimation();
  }
}

function startAnimation() {
  if (!animationState) return;

  animationPaused = false;
  animationComplete = false;
  document.getElementById('playIcon').style.display = 'none';
  document.getElementById('pauseIcon').style.display = 'block';
  document.getElementById('restartIcon').style.display = 'none';
  document.getElementById('playPauseBtn').classList.remove('restart-mode');

  runAnimationLoop();
}

function pauseAnimation() {
  animationPaused = true;
  document.getElementById('playIcon').style.display = 'block';
  document.getElementById('pauseIcon').style.display = 'none';
  document.getElementById('restartIcon').style.display = 'none';
}

function stopAnimation() {
  animationPaused = true;
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
}

function restartAnimation() {
  stopAnimation();

  // Reset to initial state
  animationPhaseIndex = 0;
  animationActionIndex = 0;
  animationComplete = false;
  animationState = {
    phases: JSON.parse(JSON.stringify(currentPlay.phases))
  };

  renderAnimationCourt(animationState.phases[0]);
  updatePhaseIndicator();

  // Reset button to play mode
  document.getElementById('playIcon').style.display = 'block';
  document.getElementById('pauseIcon').style.display = 'none';
  document.getElementById('restartIcon').style.display = 'none';
  document.getElementById('playPauseBtn').classList.remove('restart-mode');
  animationPaused = true;
}

function stepAnimation() {
  if (!animationState) return;

  const phase = animationState.phases[animationPhaseIndex];

  if (animationActionIndex < phase.actions.length) {
    // Animate next action(s)
    const actionsToAnimate = getSimultaneousActions(phase, animationActionIndex);
    animateActionsInModal(actionsToAnimate, phase, () => {
      animationActionIndex += actionsToAnimate.length;
      renderAnimationCourt(phase, animationActionIndex);
    });
  } else {
    // Move to next phase
    if (animationPhaseIndex < animationState.phases.length - 1) {
      animationPhaseIndex++;
      animationActionIndex = 0;
      updatePhaseIndicator();
      renderAnimationCourt(animationState.phases[animationPhaseIndex]);
    }
  }
}

function setAnimationSpeed() {
  const select = document.getElementById('animSpeed');
  if (select) {
    animationSpeed = parseFloat(select.value);
  }
}

// Get actions that should execute simultaneously (including the one at index)
function getSimultaneousActions(phase, startIndex) {
  const actions = [phase.actions[startIndex]];
  let nextIndex = startIndex + 1;

  while (nextIndex < phase.actions.length && phase.actions[nextIndex].executeWithPrevious) {
    actions.push(phase.actions[nextIndex]);
    nextIndex++;
  }

  return actions;
}

function runAnimationLoop() {
  if (animationPaused || !animationState) return;

  const phase = animationState.phases[animationPhaseIndex];

  if (animationActionIndex < phase.actions.length) {
    // Get simultaneous actions
    const actionsToAnimate = getSimultaneousActions(phase, animationActionIndex);

    animateActionsInModal(actionsToAnimate, phase, () => {
      animationActionIndex += actionsToAnimate.length;

      // Short delay between action groups
      setTimeout(() => runAnimationLoop(), 200 / animationSpeed);
    });
  } else {
    // Move to next phase
    if (animationPhaseIndex < animationState.phases.length - 1) {
      animationPhaseIndex++;
      animationActionIndex = 0;
      updatePhaseIndicator();

      // Brief pause between phases
      setTimeout(() => {
        renderAnimationCourt(animationState.phases[animationPhaseIndex]);
        setTimeout(() => runAnimationLoop(), 300 / animationSpeed);
      }, 500 / animationSpeed);
    } else {
      // Animation complete - show final state with players at end positions, no action lines
      const finalPhase = animationState.phases[animationPhaseIndex];
      const totalActions = finalPhase.actions ? finalPhase.actions.length : 0;
      renderAnimationCourt(finalPhase, totalActions); // Hide all actions, show final player positions

      // Show restart button instead of play/pause
      animationPaused = true;
      animationComplete = true;
      document.getElementById('playIcon').style.display = 'none';
      document.getElementById('pauseIcon').style.display = 'none';
      document.getElementById('restartIcon').style.display = 'block';
      document.getElementById('playPauseBtn').classList.add('restart-mode');
    }
  }
}

function animateActionsInModal(actions, phase, onComplete) {
  const duration = 600 / animationSpeed;
  const startingActionIndex = animationActionIndex;
  const numActions = actions.length;

  // Process all actions simultaneously
  const animations = actions.map(action => {
    const startPlayer = findNearestPlayer(action.start, phase.players);
    const endPlayer = findNearestPlayer(action.end, phase.players);
    const isMovementAction = action.type === 'dribble' || action.type === 'cut' || action.type === 'screen';

    return {
      action,
      startPlayer,
      endPlayer,
      startPos: startPlayer ? { ...phase.players[startPlayer] } : null,
      midPos: isMovementAction && action.mid ? { x: action.mid.x, y: action.mid.y } : null,
      endPos: isMovementAction ? { x: action.end.x, y: action.end.y } : null
    };
  });

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    // Update all animations
    animations.forEach(({ action, startPlayer, endPlayer, startPos, midPos, endPos }) => {
      // Move player for dribble/cut/screen
      if (startPos && endPos && startPlayer) {
        if (midPos) {
          // Follow curved path using quadratic bezier
          const pos = quadraticBezier(eased, startPos, midPos, endPos);
          phase.players[startPlayer].x = pos.x;
          phase.players[startPlayer].y = pos.y;
        } else {
          // Straight line interpolation
          phase.players[startPlayer].x = startPos.x + (endPos.x - startPos.x) * eased;
          phase.players[startPlayer].y = startPos.y + (endPos.y - startPos.y) * eased;
        }
      }

      // Transfer ball at end of animation
      if (progress >= 1 && (action.type === 'pass' || action.type === 'handoff') && startPlayer && endPlayer) {
        Object.keys(phase.players).forEach(k => {
          phase.players[k].hasBall = (parseInt(k) === endPlayer);
        });
      }
    });

    // Re-render court with updated positions
    // Hide the CURRENT animating actions immediately (they're being executed)
    // After progress >= 0.3, hide the current actions (the arrow has served its purpose)
    const hideCurrentActions = progress >= 0.3;
    const completedCount = hideCurrentActions ? startingActionIndex + numActions : startingActionIndex;
    renderAnimationCourt(phase, completedCount);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(animate);
}

// ============================================================================
// ANIMATION (Inline)
// ============================================================================

function playPhase() {
  if (isAnimating || !currentPlay) return;
  animatePhaseInline(currentPhaseIndex);
}

function playFull() {
  openAnimationModal();
}

function playFullAnimation() {
  openAnimationModal();
}

function animatePhaseInline(phaseIndex) {
  isAnimating = true;
  const phase = currentPlay.phases[phaseIndex];
  const originalPositions = JSON.parse(JSON.stringify(phase.players));

  let actionIndex = 0;

  function animateNext() {
    if (actionIndex >= phase.actions.length) {
      // Reset and finish
      phase.players = originalPositions;
      isAnimating = false;
      renderAll();
      return;
    }

    const actionsToAnimate = getSimultaneousActions(phase, actionIndex);
    animateActionsInline(actionsToAnimate, phase, () => {
      actionIndex += actionsToAnimate.length;
      setTimeout(animateNext, 200);
    });
  }

  animateNext();
}

function animateActionsInline(actions, phase, onComplete) {
  const duration = 600;
  const startTime = performance.now();

  const animations = actions.map(action => ({
    action,
    startPlayer: findNearestPlayer(action.start, phase.players),
    endPlayer: findNearestPlayer(action.end, phase.players),
    startPos: null,
    midPos: null,
    endPos: null
  }));

  animations.forEach(anim => {
    if (anim.startPlayer && (anim.action.type === 'dribble' || anim.action.type === 'cut' || anim.action.type === 'screen')) {
      anim.startPos = { ...phase.players[anim.startPlayer] };
      anim.endPos = { x: anim.action.end.x, y: anim.action.end.y };
      // Capture mid point for curved paths
      if (anim.action.mid) {
        anim.midPos = { x: anim.action.mid.x, y: anim.action.mid.y };
      }
    }
  });

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    animations.forEach(({ action, startPlayer, endPlayer, startPos, midPos, endPos }) => {
      if (startPos && endPos && startPlayer) {
        if (midPos) {
          // Follow curved path using quadratic bezier
          const pos = quadraticBezier(eased, startPos, midPos, endPos);
          phase.players[startPlayer].x = pos.x;
          phase.players[startPlayer].y = pos.y;
        } else {
          // Straight line interpolation
          phase.players[startPlayer].x = startPos.x + (endPos.x - startPos.x) * eased;
          phase.players[startPlayer].y = startPos.y + (endPos.y - startPos.y) * eased;
        }
      }

      if (progress >= 1 && (action.type === 'pass' || action.type === 'handoff') && startPlayer && endPlayer) {
        Object.keys(phase.players).forEach(k => {
          phase.players[k].hasBall = (parseInt(k) === endPlayer);
        });
      }
    });

    renderCourt();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(animate);
}

function animatePhase(phaseIndex, onComplete) {
  const phase = currentPlay.phases[phaseIndex];
  if (!phase || !phase.actions || phase.actions.length === 0) {
    if (onComplete) onComplete();
    return;
  }

  let actionIndex = 0;

  function animateNextAction() {
    if (actionIndex >= phase.actions.length) {
      if (onComplete) onComplete();
      return;
    }

    const action = phase.actions[actionIndex];

    // Highlight current action in timeline
    selectedItem = { type: 'action', id: actionIndex };
    renderTimeline();

    // Animate this action
    animateAction(action, phase, () => {
      actionIndex++;
      // Short delay between actions
      animationTimeout = setTimeout(animateNextAction, 400);
    });
  }

  animateNextAction();
}

function animateAction(action, phase, onComplete) {
  const duration = 800; // ms per action
  const startTime = performance.now();

  const startPlayer = findNearestPlayer(action.start, phase.players);
  const endPlayer = findNearestPlayer(action.end, phase.players);

  // Store start position for movement actions
  let startPos = null;
  let midPos = null;
  let endPos = null;

  if (startPlayer && (action.type === 'dribble' || action.type === 'cut' || action.type === 'screen')) {
    startPos = { ...phase.players[startPlayer] };
    endPos = { x: action.end.x, y: action.end.y };
    // Capture mid point for curved paths
    if (action.mid) {
      midPos = { x: action.mid.x, y: action.mid.y };
    }
  }

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    // Move player for dribble/cut/screen
    if (startPos && endPos && startPlayer) {
      if (midPos) {
        // Follow curved path using quadratic bezier
        const pos = quadraticBezier(eased, startPos, midPos, endPos);
        phase.players[startPlayer].x = pos.x;
        phase.players[startPlayer].y = pos.y;
      } else {
        // Straight line interpolation
        phase.players[startPlayer].x = startPos.x + (endPos.x - startPos.x) * eased;
        phase.players[startPlayer].y = startPos.y + (endPos.y - startPos.y) * eased;
      }
      renderCourt();
    }

    // Transfer ball for pass/handoff
    if (progress >= 1 && (action.type === 'pass' || action.type === 'handoff') && startPlayer && endPlayer) {
      Object.keys(phase.players).forEach(k => {
        phase.players[k].hasBall = (parseInt(k) === endPlayer);
      });
      renderCourt();
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(animate);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Quadratic bezier interpolation: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
function quadraticBezier(t, p0, p1, p2) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
    y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y
  };
}

function stopAnimation() {
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
  isAnimating = false;
}

function resetPositions() {
  if (!currentPlay) return;
  stopAnimation();
  currentPhaseIndex = 0;
  selectedItem = null;
  renderAll();
}

function clearActions() {
  if (!currentPlay) return;
  if (!confirm('Clear all actions in this phase?')) return;

  const phase = currentPlay.phases[currentPhaseIndex];
  phase.actions = [];
  selectedItem = null;
  isDirty = true;
  renderAll();
}

// ============================================================================
// VALIDATION
// ============================================================================

function validatePlay() {
  if (!currentPlay) return { valid: false, errors: ['No play loaded'] };

  const errors = [];

  // Check each phase
  for (let phaseIdx = 0; phaseIdx < currentPlay.phases.length; phaseIdx++) {
    const phase = currentPlay.phases[phaseIdx];
    const phaseNum = phaseIdx + 1;

    // Must have at least one player
    if (!phase.players || Object.keys(phase.players).length === 0) {
      errors.push(`Phase ${phaseNum}: No players on court`);
      continue;
    }

    // Must have a ball holder
    const ballHolder = getInitialBallHolder(phase);
    if (!ballHolder) {
      errors.push(`Phase ${phaseNum}: No player has the ball`);
      continue;
    }

    // Must have at least one action
    if (!phase.actions || phase.actions.length === 0) {
      errors.push(`Phase ${phaseNum}: No actions defined`);
      continue;
    }

    // Validate ball flow
    const flowAnalysis = analyzeBallFlow(phase);
    let hasShot = false;

    for (let i = 0; i < flowAnalysis.length; i++) {
      const assignment = flowAnalysis[i];
      const action = phase.actions[i];

      if (!assignment.isValid) {
        errors.push(`Phase ${phaseNum}, Action ${i + 1}: ${assignment.error || 'Invalid action'}`);
      }

      if (action.type === 'shot' && assignment.isValid) {
        hasShot = true;
      }
    }

    // Play should end with a shot (warning, not error)
    if (!hasShot && phaseIdx === currentPlay.phases.length - 1) {
      // Only warn on last phase - earlier phases might just be setups
      errors.push(`Phase ${phaseNum}: Play should end with a shot`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function showValidationErrors(errors) {
  const message = 'Please fix the following issues:\n\n' + errors.map(e => '• ' + e).join('\n');
  alert(message);
}

// ============================================================================
// SAVE / LOAD
// ============================================================================

async function savePlay() {
  if (!currentPlay) return;

  const name = document.getElementById('playName').value.trim();
  if (!name) {
    alert('Please enter a play name');
    document.getElementById('playName').focus();
    return;
  }

  // Validate ball flow logic
  const validation = validatePlay();
  if (!validation.valid) {
    showValidationErrors(validation.errors);
    return;
  }

  currentPlay.name = name;
  currentPlay.description = document.getElementById('playDescription')?.value.trim() || '';
  currentPlay.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

  const saveBtn = document.getElementById('saveBtn');

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    if (currentPlay.id) {
      await db.collection('customPlays').doc(currentPlay.id).update({
        name: currentPlay.name,
        description: currentPlay.description,
        phases: currentPlay.phases,
        updatedAt: currentPlay.updatedAt
      });
    } else {
      currentPlay.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection('customPlays').add(currentPlay);
      currentPlay.id = docRef.id;

      const url = new URL(window.location);
      url.searchParams.set('edit', currentPlay.id);
      window.history.replaceState({}, '', url);
    }

    isDirty = false;
    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Save Draft`;
    }, 1500);

  } catch (error) {
    console.error('Save error:', error);
    alert('Failed to save. Please try again.');
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Save Draft`;
  }
}

async function loadPlay(playId) {
  try {
    const doc = await db.collection('customPlays').doc(playId).get();

    if (!doc.exists) {
      alert('Play not found');
      showTemplateModal();
      return;
    }

    currentPlay = { ...doc.data(), id: doc.id };
    currentPhaseIndex = 0;

    document.getElementById('playName').value = currentPlay.name || '';
    if (document.getElementById('playDescription')) {
      document.getElementById('playDescription').value = currentPlay.description || '';
    }

    renderAll();

  } catch (error) {
    console.error('Load error:', error);
    alert('Failed to load play');
    showTemplateModal();
  }
}

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
