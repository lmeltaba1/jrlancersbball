// Jr. Lancers Basketball - Play Viewer
// Extracted from play-designer.js for use in playbook.html
// This is the EXACT same rendering and animation code

const PlayViewer = (function() {
  // Track active animations per play
  const activeAnimations = {};

  // Track highlighted position (shared across all plays)
  let highlightedPosition = null;

  // Court dimensions (SVG viewBox: -28 -3 56 50)
  const COURT = {
    minX: -25,
    maxX: 25,
    minY: 0,
    maxY: 47,
    hoopX: 0,
    hoopY: 5.25
  };

  // Set the highlighted position
  function setHighlightedPosition(position) {
    highlightedPosition = position ? parseInt(position) : null;
  }

  // Create the court SVG structure (EXACT from play-designer.html)
  function createCourtSVG(playId) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'court-svg');
    svg.setAttribute('viewBox', '-28 -3 56 50');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.id = `courtSvg-${playId}`;

    svg.innerHTML = `
      <defs>
        <marker id="arrowhead-${playId}" markerWidth="7" markerHeight="8" refX="6" refY="4" orient="auto">
          <polygon points="0 0, 7 4, 0 8, 0.5 4" fill="#333"/>
        </marker>
        <marker id="arrowhead-reverse-${playId}" markerWidth="7" markerHeight="8" refX="1" refY="4" orient="auto">
          <polygon points="7 0, 0 4, 7 8, 6.5 4" fill="#333"/>
        </marker>
      </defs>
      <rect x="-28" y="-3" width="56" height="50" fill="#dbc097"/>
      <g id="courtLines-${playId}" fill="none" stroke="#fff" stroke-width="0.3" stroke-linecap="square">
        <line x1="-25" y1="0" x2="25" y2="0"/>
        <line x1="-25" y1="0" x2="-25" y2="47"/>
        <line x1="25" y1="0" x2="25" y2="47"/>
        <path d="M -6 0 L -6 19 L 6 19 L 6 0"/>
        <path d="M -6 19 A 6 6 0 0 0 6 19"/>
        <path d="M -21.65 0 L -21.65 9.95 A 22.15 22.15 0 0 0 21.65 9.95 L 21.65 0"/>
        <path d="M -25 47 L 25 47"/>
        <path d="M 6 47 A 6 6 0 0 0 -6 47"/>
        <path d="M -4 5.25 A 4 4 0 0 0 4 5.25"/>
        <line x1="-6" y1="18" x2="-6.5" y2="18"/>
        <line x1="-6" y1="15" x2="-6.5" y2="15"/>
        <line x1="-6" y1="12" x2="-6.5" y2="12"/>
        <rect x="-6.5" y="8" width="0.5" height="1" fill="#fff"/>
        <line x1="6" y1="18" x2="6.5" y2="18"/>
        <line x1="6" y1="15" x2="6.5" y2="15"/>
        <line x1="6" y1="12" x2="6.5" y2="12"/>
        <rect x="6" y="8" width="0.5" height="1" fill="#fff"/>
        <line x1="-3" y1="4" x2="3" y2="4"/>
        <circle cx="0" cy="5.25" r="0.75"/>
      </g>
      <g id="actionsLayer-${playId}" class="actions-layer"></g>
      <g id="playersLayer-${playId}" class="players-layer"></g>
      <g id="defendersLayer-${playId}" class="defenders-layer"></g>
    `;

    return svg;
  }

  // Render players (EXACT from play-designer.js renderPlayers)
  function renderPlayers(playId, phase) {
    const layer = document.getElementById(`playersLayer-${playId}`);
    if (!layer) return;
    layer.innerHTML = '';

    Object.entries(phase.players).forEach(([num, pos]) => {
      const playerNum = parseInt(num);
      const isHighlighted = highlightedPosition && playerNum === highlightedPosition;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'player-marker' + (isHighlighted ? ' player-highlighted' : ''));
      g.setAttribute('data-player', num);
      g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

      // Ball ring
      if (pos.hasBall) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('r', '1.5');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', isHighlighted ? '#00D4FF' : '#333');
        ring.setAttribute('stroke-width', '0.22');
        g.appendChild(ring);
      }

      // Number
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', isHighlighted ? '#00D4FF' : '#333');
      text.setAttribute('font-weight', isHighlighted ? '900' : '700');
      text.setAttribute('font-size', isHighlighted ? '2.8' : '2.2');
      text.setAttribute('font-family', 'Roboto, sans-serif');
      if (isHighlighted) {
        text.setAttribute('style', 'filter: drop-shadow(0 0 2px #00D4FF);');
      }
      text.textContent = num;
      g.appendChild(text);

      layer.appendChild(g);
    });
  }

  // Render defenders (EXACT from play-designer.js renderDefenders)
  function renderDefenders(playId, phase) {
    const layer = document.getElementById(`defendersLayer-${playId}`);
    if (!layer) return;
    layer.innerHTML = '';

    if (!phase.defenders) return;

    Object.entries(phase.defenders).forEach(([num, pos]) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'defender-marker');
      g.setAttribute('data-defender', num);
      g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

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

  // Render actions (EXACT from play-designer.js renderActions)
  function renderActions(playId, phase) {
    const layer = document.getElementById(`actionsLayer-${playId}`);
    if (!layer) return;
    layer.innerHTML = '';

    if (!phase.actions) return;

    phase.actions.forEach((action, index) => {
      const g = createActionSVG(playId, action, index);
      layer.appendChild(g);
    });
  }

  // Create action SVG (EXACT from play-designer.js createActionSVG)
  function createActionSVG(playId, action, index) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `action-group ${action.type}`);
    g.setAttribute('data-action', index);

    const color = action.color || '#333';
    const start = action.start;
    const end = action.end;
    const mid = action.mid;

    let pathEl;
    switch (action.type) {
      case 'dribble':
        pathEl = createWavyPath(playId, start, end, mid, color);
        break;
      case 'pass':
        pathEl = createDashedArrow(playId, start, end, mid, color);
        break;
      case 'cut':
        pathEl = createSolidArrow(playId, start, end, mid, color);
        break;
      case 'screen':
        pathEl = createScreenLine(playId, start, end, mid, color);
        break;
      case 'shot':
        pathEl = createShotArc(playId, start, end, mid, color);
        break;
      case 'handoff':
        pathEl = createHandoffLine(playId, start, end, mid, color);
        break;
      default:
        pathEl = createSolidArrow(playId, start, end, mid, color);
    }

    if (pathEl) {
      g.appendChild(pathEl);
    }

    return g;
  }

  // Action path generators (EXACT from play-designer.js)
  function createWavyPath(playId, start, end, mid, color) {
    const amp = 1.5;

    function generateWavySegment(p0, p1, startWavePhase = 0) {
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.1) return '';

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
      d = `M${start.x},${start.y}`;
      d += generateWavySegment(start, mid, 0);
      d += generateWavySegment(mid, end, 1);
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
    path.setAttribute('marker-end', `url(#arrowhead-${playId})`);
    return path;
  }

  function createDashedArrow(playId, start, end, mid, color) {
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
    path.setAttribute('stroke-dasharray', '1.5,1.2');
    path.setAttribute('marker-end', `url(#arrowhead-${playId})`);
    return path;
  }

  function createSolidArrow(playId, start, end, mid, color) {
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
    path.setAttribute('marker-end', `url(#arrowhead-${playId})`);
    return path;
  }

  function createScreenLine(playId, start, end, mid, color) {
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

  function createShotArc(playId, start, end, mid, color) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

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

    // Crosshair at end
    const size = 2.0;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', end.x);
    circle.setAttribute('cy', end.y);
    circle.setAttribute('r', size);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '0.25');
    g.appendChild(circle);

    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('x1', end.x - size * 1.5);
    hLine.setAttribute('y1', end.y);
    hLine.setAttribute('x2', end.x + size * 1.5);
    hLine.setAttribute('y2', end.y);
    hLine.setAttribute('stroke', color);
    hLine.setAttribute('stroke-width', '0.25');
    g.appendChild(hLine);

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

  function createHandoffLine(playId, start, end, mid, color) {
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
    path.setAttribute('stroke-width', '0.35');
    path.setAttribute('marker-start', `url(#arrowhead-reverse-${playId})`);
    path.setAttribute('marker-end', `url(#arrowhead-${playId})`);
    return path;
  }

  // Helper functions (EXACT from play-designer.js)
  function findNearestPlayer(point, players) {
    let nearest = null;
    let minDist = 4;

    Object.entries(players).forEach(([num, pos]) => {
      const dist = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = parseInt(num);
      }
    });

    return nearest;
  }

  function getSimultaneousActions(phase, startIndex) {
    const actions = [phase.actions[startIndex]];
    let nextIndex = startIndex + 1;

    while (nextIndex < phase.actions.length && phase.actions[nextIndex].executeWithPrevious) {
      actions.push(phase.actions[nextIndex]);
      nextIndex++;
    }

    return actions;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Render the full court
  function renderCourt(playId, phase) {
    renderPlayers(playId, phase);
    renderActions(playId, phase);
    renderDefenders(playId, phase);
  }

  // Initialize a play viewer in a container
  function init(container, play) {
    const playId = play.id;

    // Clear container
    container.innerHTML = '';

    // Create and insert the court SVG directly
    const svg = createCourtSVG(playId);
    container.appendChild(svg);

    // Store the play data on the container for animation
    container.dataset.playId = playId;

    // Render STATIC PREVIEW: show all phases stacked (all actions visible at once)
    renderStaticPreview(playId, play);

    // Store play data for animation
    activeAnimations[playId] = {
      play: JSON.parse(JSON.stringify(play)),
      currentPhase: 0,
      isAnimating: false,
      timeout: null
    };
  }

  // Render static preview with ALL phases' actions stacked on top of each other
  function renderStaticPreview(playId, play) {
    if (!play.phases || play.phases.length === 0) return;

    // Use first phase for player positions
    const basePhase = JSON.parse(JSON.stringify(play.phases[0]));

    // Render players from first phase
    renderPlayers(playId, basePhase);
    renderDefenders(playId, basePhase);

    // Render ALL actions from ALL phases (stacked)
    const actionsLayer = document.getElementById(`actionsLayer-${playId}`);
    if (!actionsLayer) return;
    actionsLayer.innerHTML = '';

    play.phases.forEach((phase) => {
      if (!phase.actions) return;
      phase.actions.forEach((action, index) => {
        const g = createActionSVG(playId, action, index);
        actionsLayer.appendChild(g);
      });
    });
  }

  // Highlight the current phase step in the phase-steps display
  function highlightPhaseStep(playId, phaseIndex) {
    // Find the play card for this play
    const card = document.getElementById(`play-${playId}`);
    if (!card) return;

    // Find all phase steps within this card
    const steps = card.querySelectorAll('.phase-step');
    steps.forEach((step, index) => {
      if (index === phaseIndex) {
        step.classList.add('phase-step-active');
      } else {
        step.classList.remove('phase-step-active');
      }
    });
  }

  // Clear phase step highlighting
  function clearPhaseStepHighlight(playId) {
    const card = document.getElementById(`play-${playId}`);
    if (!card) return;
    const steps = card.querySelectorAll('.phase-step');
    steps.forEach(step => step.classList.remove('phase-step-active'));
  }

  // Play animation in place (EXACT logic from play-designer.js animatePhaseInline)
  function playAnimation(playId) {
    const state = activeAnimations[playId];
    if (!state || state.isAnimating) return;

    state.isAnimating = true;
    const play = state.play;
    let phaseIndex = 0;

    function animatePhase() {
      if (phaseIndex >= play.phases.length) {
        // Animation complete - reset to static preview (all actions visible)
        state.isAnimating = false;
        state.currentPhase = 0;
        renderStaticPreview(playId, play);
        clearPhaseStepHighlight(playId);
        return;
      }

      // Highlight current phase step
      highlightPhaseStep(playId, phaseIndex);

      const phase = JSON.parse(JSON.stringify(play.phases[phaseIndex]));
      const originalPositions = JSON.parse(JSON.stringify(phase.players));
      let actionIndex = 0;

      function animateNextAction() {
        if (actionIndex >= (phase.actions ? phase.actions.length : 0)) {
          // Phase complete, move to next
          phaseIndex++;
          state.timeout = setTimeout(animatePhase, 400);
          return;
        }

        const actionsToAnimate = getSimultaneousActions(phase, actionIndex);
        animateActions(playId, actionsToAnimate, phase, () => {
          actionIndex += actionsToAnimate.length;
          state.timeout = setTimeout(animateNextAction, 200);
        });
      }

      // Render this phase's initial state
      renderCourt(playId, phase);

      if (phase.actions && phase.actions.length > 0) {
        state.timeout = setTimeout(animateNextAction, 300);
      } else {
        // No actions, just pause and move to next phase
        phaseIndex++;
        state.timeout = setTimeout(animatePhase, 800);
      }
    }

    animatePhase();
  }

  // Animate a set of actions (EXACT from play-designer.js animateActionsInline)
  function animateActions(playId, actions, phase, onComplete) {
    const duration = 600;
    const startTime = performance.now();

    const animations = actions.map(action => ({
      action,
      startPlayer: findNearestPlayer(action.start, phase.players),
      endPlayer: findNearestPlayer(action.end, phase.players),
      startPos: null,
      endPos: null
    }));

    animations.forEach(anim => {
      if (anim.startPlayer && (anim.action.type === 'dribble' || anim.action.type === 'cut')) {
        anim.startPos = { ...phase.players[anim.startPlayer] };
        anim.endPos = { x: anim.action.end.x, y: anim.action.end.y };
      }
    });

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      animations.forEach(({ action, startPlayer, endPlayer, startPos, endPos }) => {
        if (startPos && endPos && startPlayer) {
          phase.players[startPlayer].x = startPos.x + (endPos.x - startPos.x) * eased;
          phase.players[startPlayer].y = startPos.y + (endPos.y - startPos.y) * eased;
        }

        if (progress >= 1 && (action.type === 'pass' || action.type === 'handoff') && startPlayer && endPlayer) {
          Object.keys(phase.players).forEach(k => {
            phase.players[k].hasBall = (parseInt(k) === endPlayer);
          });
        }
      });

      renderCourt(playId, phase);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    }

    requestAnimationFrame(animate);
  }

  // Stop animation
  function stopAnimation(playId) {
    const state = activeAnimations[playId];
    if (state) {
      if (state.timeout) {
        clearTimeout(state.timeout);
        state.timeout = null;
      }
      state.isAnimating = false;
    }
  }

  // Check if animating
  function isAnimating(playId) {
    const state = activeAnimations[playId];
    return state ? state.isAnimating : false;
  }

  // Public API
  return {
    init,
    playAnimation,
    stopAnimation,
    isAnimating,
    renderCourt,
    setHighlightedPosition
  };
})();
