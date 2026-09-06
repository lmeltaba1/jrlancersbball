// Jr. Lancers Playbook - Play Definitions
// Coordinates based on 400x420 SVG viewBox
// Court conversion: center X at 200, baseline at y=20, half-court at y=400

const chapters = [
  { id: 'man', name: 'vs Man-to-Man' },
  { id: 'zone', name: 'vs Zone' },
  { id: 'inbound', name: 'Inbound' }
];

// Helper to convert TheHoopsGeek coords to our SVG coords
// Their court: X centered (-25 to 25), Y from baseline (0) to half (~47)
// Our court: X (0-400, center=200), Y (20-400, baseline=20)
function convertCoord(x, y) {
  return {
    x: 200 + (x * 8),      // Scale and center
    y: 20 + (y * 8)        // Scale from baseline
  };
}

// Pre-computed coordinates for common positions
const POS = {
  // Standard 5-out positions
  topKey: convertCoord(0, 45),           // Point guard at top of key
  leftWing: convertCoord(-17, 35),       // Left wing 3pt
  rightWing: convertCoord(17, 35),       // Right wing 3pt
  leftCorner: convertCoord(-22, 8),      // Left corner
  rightCorner: convertCoord(22, 8),      // Right corner

  // Post positions
  leftBlock: convertCoord(-6, 12),       // Left block
  rightBlock: convertCoord(6, 12),       // Right block
  leftElbow: convertCoord(-8, 22),       // Left elbow
  rightElbow: convertCoord(8, 22),       // Right elbow
  highPost: convertCoord(0, 22),         // High post / free throw

  // Paint
  paint: convertCoord(0, 10),            // In the paint
  rim: convertCoord(0, 3),               // At the rim
};

const plays = {
  // ==========================================
  // CHAPTER 1: OFFENSE VS MAN-TO-MAN
  // ==========================================

  'man-1': {
    name: 'Play #1',
    chapter: 'man',
    description: 'Drive and kick for layup (right)',
    phases: [
      {
        // Phase 1: Starting positions - same for both plays 1 & 2
        positions: {
          1: { x: 200, y: 370 },   // PG at top with ball
          2: { x: 60, y: 200 },    // SG left wing on 3pt line
          3: { x: 340, y: 200 },   // SF right wing on 3pt line
          4: { x: 120, y: 80 },    // PF left block
          5: { x: 280, y: 80 }     // C right block
        },
        ball: 1,
        actions: []
      },
      {
        // Phase 2: PG dribbles to where 3 is, 3 cuts to corner (SIMULTANEOUSLY)
        positions: {
          1: { x: 340, y: 200 },   // PG takes 3's spot
          2: { x: 60, y: 200 },
          3: { x: 365, y: 55 },    // SF cuts to right corner
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          { type: 'dribble', player: 1, path: 'M200,370 Q270,285 340,200' },
          { type: 'cut', player: 3, from: { x: 340, y: 200 }, to: { x: 365, y: 55 } }
        ]
      },
      {
        // Phase 3: PG passes to 3 in corner
        positions: {
          1: { x: 340, y: 200 },
          2: { x: 60, y: 200 },
          3: { x: 365, y: 55 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      {
        // Phase 4: 3 passes to 5 in post
        positions: {
          1: { x: 340, y: 200 },
          2: { x: 60, y: 200 },
          3: { x: 365, y: 55 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 3, to: 5 }
        ]
      },
      {
        // Phase 5: 5 shoots layup
        positions: {
          1: { x: 340, y: 200 },
          2: { x: 60, y: 200 },
          3: { x: 365, y: 55 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 5,
        actions: [
          { type: 'shot', player: 5, target: { x: 200, y: 45 } }
        ]
      }
    ]
  },

  'man-2': {
    name: 'Play #2',
    chapter: 'man',
    description: 'Drive and kick for layup (left)',
    phases: [
      {
        // Phase 1: Same starting positions as Play 1
        positions: {
          1: { x: 200, y: 370 },   // PG at top with ball
          2: { x: 60, y: 200 },    // SG left wing on 3pt line
          3: { x: 340, y: 200 },   // SF right wing on 3pt line
          4: { x: 120, y: 80 },    // PF left block
          5: { x: 280, y: 80 }     // C right block
        },
        ball: 1,
        actions: []
      },
      {
        // Phase 2: PG dribbles to where 2 is, 2 cuts to corner (SIMULTANEOUSLY)
        positions: {
          1: { x: 60, y: 200 },    // PG takes 2's spot
          2: { x: 35, y: 55 },     // SG cuts to left corner
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          { type: 'dribble', player: 1, path: 'M200,370 Q130,285 60,200' },
          { type: 'cut', player: 2, from: { x: 60, y: 200 }, to: { x: 35, y: 55 } }
        ]
      },
      {
        // Phase 3: PG passes to 2 in corner
        positions: {
          1: { x: 60, y: 200 },
          2: { x: 35, y: 55 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      {
        // Phase 4: 2 passes to 4 in post
        positions: {
          1: { x: 60, y: 200 },
          2: { x: 35, y: 55 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 4,
        actions: [
          { type: 'pass', from: 2, to: 4 }
        ]
      },
      {
        // Phase 5: 4 shoots layup
        positions: {
          1: { x: 60, y: 200 },
          2: { x: 35, y: 55 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 4,
        actions: [
          { type: 'shot', player: 4, target: { x: 200, y: 45 } }
        ]
      }
    ]
  },

  'man-3': {
    name: 'Play #3',
    chapter: 'man',
    description: 'Give and go (right)',
    phases: [
      {
        // Phase 1: Starting positions
        positions: {
          1: { x: 200, y: 300 },   // PG closer to FT line
          2: { x: 60, y: 200 },    // SG left wing
          3: { x: 340, y: 200 },   // SF right wing ON 3pt line
          4: { x: 120, y: 80 },    // PF left block
          5: { x: 280, y: 80 }     // C right block
        },
        ball: 1,
        actions: []
      },
      {
        // Phase 2: 1 passes to 3 (3 stays put)
        positions: {
          1: { x: 200, y: 300 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      {
        // Phase 3: 1 cuts toward basket (in paint, not at rim)
        positions: {
          1: { x: 200, y: 120 },   // PG in paint area
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 3,
        actions: [
          { type: 'cut', player: 1, from: { x: 200, y: 300 }, to: { x: 200, y: 120 } }
        ]
      },
      {
        // Phase 4: 3 passes to 1 in paint
        positions: {
          1: { x: 200, y: 120 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          { type: 'pass', from: 3, to: 1 }
        ]
      },
      {
        // Phase 5: 1 shoots layup
        positions: {
          1: { x: 200, y: 120 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          { type: 'shot', player: 1, target: { x: 200, y: 45 } }
        ]
      }
    ]
  },

  'man-4': {
    name: 'Play #4',
    chapter: 'man',
    description: 'Give and go (left)',
    phases: [
      {
        // Phase 1: Same starting positions as Play 3
        positions: {
          1: { x: 200, y: 300 },   // PG closer to FT line
          2: { x: 60, y: 200 },    // SG left wing ON 3pt line
          3: { x: 340, y: 200 },   // SF right wing
          4: { x: 120, y: 80 },    // PF left block
          5: { x: 280, y: 80 }     // C right block
        },
        ball: 1,
        actions: []
      },
      {
        // Phase 2: 1 passes to 2 (2 stays put)
        positions: {
          1: { x: 200, y: 300 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      {
        // Phase 3: 1 cuts toward basket (in paint, not at rim)
        positions: {
          1: { x: 200, y: 120 },   // PG in paint area
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 2,
        actions: [
          { type: 'cut', player: 1, from: { x: 200, y: 300 }, to: { x: 200, y: 120 } }
        ]
      },
      {
        // Phase 4: 2 passes to 1 in paint
        positions: {
          1: { x: 200, y: 120 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          { type: 'pass', from: 2, to: 1 }
        ]
      },
      {
        // Phase 5: 1 shoots layup
        positions: {
          1: { x: 200, y: 120 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          { type: 'shot', player: 1, target: { x: 200, y: 45 } }
        ]
      }
    ]
  },

  'man-5': {
    name: 'Play #5',
    chapter: 'man',
    description: 'Curl off screen (right)',
    // Defender X1 guards wing, 5 screens X1, 3 curls around
    defenders: {
      1: { x: 300, y: 220 }   // Defender X1 guarding player 3
    },
    phases: [
      {
        // Phase 1: Starting positions
        positions: {
          1: { x: 200, y: 260 },   // PG at top of 3pt arc
          2: { x: 60, y: 200 },    // SG left wing
          3: { x: 340, y: 200 },   // SF right wing (will curl)
          4: { x: 120, y: 80 },    // PF left block
          5: { x: 250, y: 140 }    // C near elbow (will screen)
        },
        ball: 1,
        actions: []
      },
      {
        // Phase 2: 5 moves to set screen ON defender X1
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 120, y: 80 },
          5: { x: 300, y: 210 }    // 5 screens the defender
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 5, from: { x: 250, y: 140 }, to: { x: 300, y: 210 } },
          { type: 'screen', player: 5, angle: 90 }  // Screen faces right toward 3
        ]
      },
      {
        // Phase 3: 3 curls AROUND the screen toward basket
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 60, y: 200 },
          3: { x: 220, y: 100 },   // SF curled around screen
          4: { x: 120, y: 80 },
          5: { x: 300, y: 210 }
        },
        ball: 1,
        actions: [
          // Curved cut AROUND the screen (5 is at 300,210) - curl behind then to basket
          { type: 'cut', player: 3, path: 'M340,200 Q290,220 260,180 Q240,140 220,100' }
        ]
      },
      {
        // Phase 4: 1 passes to 3
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 60, y: 200 },
          3: { x: 220, y: 100 },
          4: { x: 120, y: 80 },
          5: { x: 300, y: 210 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      {
        // Phase 5: 3 shoots
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 60, y: 200 },
          3: { x: 220, y: 100 },
          4: { x: 120, y: 80 },
          5: { x: 300, y: 210 }
        },
        ball: 3,
        actions: [
          { type: 'shot', player: 3, target: { x: 200, y: 45 } }
        ]
      }
    ]
  },

  'man-6': {
    name: 'Play #6',
    chapter: 'man',
    description: 'Curl off screen (left)',
    // Mirror: Defender X1 guards wing, 4 screens X1, 2 curls around
    defenders: {
      1: { x: 100, y: 220 }   // Defender X1 guarding player 2
    },
    phases: [
      {
        // Phase 1: Starting positions (mirror of Play 5)
        positions: {
          1: { x: 200, y: 260 },   // PG at top of 3pt arc
          2: { x: 60, y: 200 },    // SG left wing (will curl)
          3: { x: 340, y: 200 },   // SF right wing
          4: { x: 150, y: 140 },   // PF near elbow (will screen)
          5: { x: 280, y: 80 }     // C right block
        },
        ball: 1,
        actions: []
      },
      {
        // Phase 2: 4 moves to set screen ON defender X1
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 60, y: 200 },
          3: { x: 340, y: 200 },
          4: { x: 100, y: 210 },   // 4 screens the defender
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 4, from: { x: 150, y: 140 }, to: { x: 100, y: 210 } },
          { type: 'screen', player: 4, angle: 270 }  // Screen faces left toward 2
        ]
      },
      {
        // Phase 3: 2 curls AROUND the screen toward basket
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 180, y: 100 },   // SG curled around screen
          3: { x: 340, y: 200 },
          4: { x: 100, y: 210 },
          5: { x: 280, y: 80 }
        },
        ball: 1,
        actions: [
          // Curved cut AROUND the screen (4 is at 100,210) - curl behind then to basket
          { type: 'cut', player: 2, path: 'M60,200 Q110,220 140,180 Q160,140 180,100' }
        ]
      },
      {
        // Phase 4: 1 passes to 2
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 180, y: 100 },
          3: { x: 340, y: 200 },
          4: { x: 100, y: 210 },
          5: { x: 280, y: 80 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      {
        // Phase 5: 2 shoots
        positions: {
          1: { x: 200, y: 260 },
          2: { x: 180, y: 100 },
          3: { x: 340, y: 200 },
          4: { x: 100, y: 210 },
          5: { x: 280, y: 80 }
        },
        ball: 2,
        actions: [
          { type: 'shot', player: 2, target: { x: 200, y: 45 } }
        ]
      }
    ]
  },

  // ==========================================
  // CHAPTER 2: OFFENSE VS ZONE
  // ==========================================

  'zone-high': {
    name: 'High',
    chapter: 'zone',
    description: 'Options from high post entry vs zone',
    phases: [
      // ========== VIDEO PHASE 1 ==========
      {
        description: [],
        positions: {
          1: { x: 300, y: 320 },   // PG right side below 3pt (has ball)
          2: { x: 100, y: 320 },   // SG left side below 3pt
          3: { x: 350, y: 200 },   // SF right wing
          4: { x: 50, y: 200 },    // PF left wing
          5: { x: 200, y: 200 }    // C high post
        },
        ball: 1,
        actions: []
      },
      {
        description: [
          '1 passes to 5 in the high post',
          '5 could look to drive here since there isn\'t a lot of help'
        ],
        positions: {
          1: { x: 300, y: 320 },
          2: { x: 100, y: 320 },
          3: { x: 350, y: 200 },
          4: { x: 50, y: 200 },
          5: { x: 200, y: 200 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 1, to: 5 }
        ]
      },
      // ========== VIDEO PHASE 2: SCREEN ==========
      {
        description: ['1 screens away for 3'],
        positions: {
          1: { x: 320, y: 200 },   // PG moves to screen position near 3
          2: { x: 100, y: 320 },
          3: { x: 350, y: 200 },
          4: { x: 50, y: 200 },
          5: { x: 200, y: 200 }
        },
        ball: 5,
        actions: [
          { type: 'cut', player: 1, from: { x: 300, y: 320 }, to: { x: 320, y: 200 } },
          { type: 'screen', player: 1, angle: 90 }  // Screen faces right toward 3
        ]
      },
      // ========== VIDEO PHASE 2: CURL ==========
      {
        description: ['3 curls tight to the rim'],
        positions: {
          1: { x: 320, y: 200 },
          2: { x: 100, y: 320 },
          3: { x: 230, y: 45 },    // SF curls to rim
          4: { x: 50, y: 200 },
          5: { x: 200, y: 200 }
        },
        ball: 5,
        actions: [
          // Curved cut AROUND the screen (1 is at 320,200) - curl behind/around then to basket
          { type: 'cut', player: 3, path: 'M350,200 Q310,220 280,180 Q250,100 230,45' }
        ]
      },
      // ========== VIDEO PHASE 3 ==========
      {
        description: ['1, 2, 3, and 4 rotate to their next spots'],
        positions: {
          1: { x: 350, y: 200 },   // PG right wing
          2: { x: 290, y: 320 },   // SG right low
          3: { x: 50, y: 200 },    // SF left wing
          4: { x: 110, y: 320 },   // PF left low
          5: { x: 200, y: 200 }    // C high post
        },
        ball: 5,
        actions: [
          { type: 'cut', player: 1, from: { x: 320, y: 200 }, to: { x: 350, y: 200 } },
          { type: 'cut', player: 2, path: 'M100,320 Q200,340 290,320' },
          { type: 'cut', player: 4, path: 'M50,200 Q80,260 110,320' },
          { type: 'cut', player: 3, path: 'M230,45 Q140,100 50,200' }
        ]
      },
      // ========== VIDEO PHASE 4: DRIBBLE HANDOFF ==========
      {
        description: ['If nothing is there, 5 can run a dribble handoff with 1'],
        positions: {
          1: { x: 350, y: 200 },
          2: { x: 290, y: 320 },
          3: { x: 50, y: 200 },
          4: { x: 110, y: 320 },
          5: { x: 320, y: 200 }    // C dribbles to 1
        },
        ball: 5,
        actions: [
          { type: 'dribble', player: 5, path: 'M200,200 Q260,200 320,200' },
          { type: 'screen', player: 5, angle: 180 }  // Screen faces up - DHO screen for 1
        ]
      },
      {
        description: ['1 curls around the handoff'],
        positions: {
          1: { x: 290, y: 180 },   // PG curls around 5
          2: { x: 290, y: 320 },
          3: { x: 50, y: 200 },
          4: { x: 110, y: 320 },
          5: { x: 320, y: 200 }
        },
        ball: 1,
        actions: [
          // 1 curls around 5's screen (5 at 320,200), going left/up around
          { type: 'cut', player: 1, path: 'M350,200 Q340,220 310,210 Q290,200 290,180' }
        ]
      },
      // ========== VIDEO PHASE 5 ==========
      {
        description: ['1 gets the handoff and drives'],
        positions: {
          1: { x: 200, y: 140 },   // PG drives into paint
          2: { x: 290, y: 320 },
          3: { x: 50, y: 200 },
          4: { x: 110, y: 320 },
          5: { x: 320, y: 200 }
        },
        ball: 1,
        actions: [
          { type: 'dribble', player: 1, path: 'M290,180 Q245,160 200,140' }
        ]
      },
      {
        description: ['5 rolls'],
        positions: {
          1: { x: 200, y: 140 },
          2: { x: 290, y: 320 },
          3: { x: 50, y: 200 },
          4: { x: 110, y: 320 },
          5: { x: 250, y: 45 }     // C rolls to basket
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 5, from: { x: 320, y: 200 }, to: { x: 250, y: 45 } }
        ]
      },
      {
        description: ['2, 4, and 3 rotate to their next spots'],
        positions: {
          1: { x: 200, y: 140 },
          2: { x: 110, y: 320 },   // SG to left low
          3: { x: 50, y: 50 },     // SF to corner
          4: { x: 50, y: 200 },    // PF to left wing
          5: { x: 250, y: 45 }
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 3, path: 'M50,200 Q50,120 50,50' },
          { type: 'cut', player: 4, from: { x: 110, y: 320 }, to: { x: 50, y: 200 } },
          { type: 'cut', player: 2, from: { x: 290, y: 320 }, to: { x: 110, y: 320 } }
        ]
      },
      {
        description: ['1 makes the read'],
        positions: {
          1: { x: 200, y: 140 },
          2: { x: 110, y: 320 },
          3: { x: 50, y: 50 },
          4: { x: 50, y: 200 },
          5: { x: 250, y: 45 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 1, to: 5 }
        ]
      }
    ]
  },

  'zone-dive': {
    name: 'Dive',
    chapter: 'zone',
    description: 'Dive cut off high post screen',
    phases: [
      // ========== INITIAL POSITIONS ==========
      {
        description: [],
        positions: {
          1: { x: 330, y: 310 },   // PG right side with ball
          2: { x: 170, y: 310 },   // SG left of center
          3: { x: 370, y: 200 },   // SF right wing
          4: { x: 60, y: 200 },    // PF left wing
          5: { x: 200, y: 220 }    // C high post
        },
        ball: 1,
        actions: []
      },
      // ========== VIDEO PHASE 1 ==========
      {
        description: ['1 passes to 2'],
        positions: {
          1: { x: 330, y: 310 },
          2: { x: 170, y: 310 },
          3: { x: 370, y: 200 },
          4: { x: 60, y: 200 },
          5: { x: 200, y: 220 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      // ========== VIDEO PHASE 2: SCREEN ==========
      {
        description: ['5 screens 1 on his cut to the rim'],
        positions: {
          1: { x: 330, y: 310 },
          2: { x: 170, y: 310 },
          3: { x: 370, y: 200 },
          4: { x: 60, y: 200 },
          5: { x: 280, y: 280 }    // 5 moves to screen position
        },
        ball: 2,
        actions: [
          { type: 'cut', player: 5, from: { x: 200, y: 220 }, to: { x: 280, y: 280 } },
          { type: 'screen', player: 5, angle: 45 }  // Screen faces down-right toward 1 at (330,310)
        ]
      },
      // ========== VIDEO PHASE 2: CUT ==========
      {
        description: [],
        positions: {
          1: { x: 200, y: 60 },    // 1 cuts to rim
          2: { x: 170, y: 310 },
          3: { x: 370, y: 200 },
          4: { x: 60, y: 200 },
          5: { x: 280, y: 280 }
        },
        ball: 2,
        actions: [
          // Curved cut AROUND the screen - goes LEFT of screen (280,280) to wrap around it
          { type: 'cut', player: 1, path: 'M330,310 Q240,330 220,260 Q200,150 200,60' }
        ]
      },
      // ========== VIDEO PHASE 3 ==========
      {
        description: ['3 and 1 fill the open slots'],
        positions: {
          1: { x: 350, y: 170 },   // 1 fills to right wing
          2: { x: 170, y: 310 },
          3: { x: 360, y: 270 },   // 3 fills to right low
          4: { x: 60, y: 200 },
          5: { x: 280, y: 250 }    // 5 drifts slightly
        },
        ball: 2,
        actions: [
          // 1 curves from rim out to wing
          { type: 'cut', player: 1, path: 'M200,60 Q260,100 320,140 Q340,160 350,170' },
          // 3 curves from wing down to low
          { type: 'cut', player: 3, path: 'M370,200 Q370,235 365,255 Q362,265 360,270' }
        ]
      },
      // ========== VIDEO PHASE 4: BALL SCREEN ==========
      {
        description: ['Now, 5 sets a ball screen for 2'],
        positions: {
          1: { x: 350, y: 170 },
          2: { x: 170, y: 310 },
          3: { x: 360, y: 270 },
          4: { x: 60, y: 200 },
          5: { x: 220, y: 290 }    // 5 moves to ball screen position
        },
        ball: 2,
        actions: [
          { type: 'cut', player: 5, from: { x: 280, y: 250 }, to: { x: 220, y: 290 } },
          { type: 'screen', player: 5, angle: 270 }  // Screen faces left toward ball handler 2
        ]
      },
      // ========== VIDEO PHASE 4: DRIBBLE + CUTS ==========
      {
        description: ['2 attacks off the dribble', '3 and 1 move in the direction of the drive'],
        positions: {
          1: { x: 360, y: 80 },    // 1 moves toward corner
          2: { x: 290, y: 230 },   // 2 dribbles right using screen
          3: { x: 360, y: 200 },   // 3 moves up toward wing
          4: { x: 60, y: 200 },
          5: { x: 220, y: 290 }
        },
        ball: 2,
        actions: [
          // 2 curves around the screen (goes right of screen at 220,290)
          { type: 'dribble', player: 2, path: 'M170,310 Q200,320 240,300 Q270,270 290,230' },
          { type: 'cut', player: 1, path: 'M350,170 Q355,125 360,80' },
          { type: 'cut', player: 3, path: 'M360,270 Q360,235 360,200' }
        ]
      },
      // ========== VIDEO PHASE 5: ROLL + REPLACE ==========
      {
        description: ['2 reads the ball screen, 5 rolls, 4 replaces'],
        positions: {
          1: { x: 360, y: 80 },
          2: { x: 290, y: 210 },
          3: { x: 360, y: 200 },
          4: { x: 170, y: 280 },   // 4 replaces (moves down/right)
          5: { x: 200, y: 100 }    // 5 rolls to basket
        },
        ball: 2,
        actions: [
          { type: 'cut', player: 5, path: 'M220,290 Q200,200 200,100' },
          { type: 'cut', player: 4, path: 'M60,200 Q100,240 170,280' }
        ]
      },
      // ========== VIDEO PHASE 5: READ ==========
      {
        description: ['2 makes the proper read'],
        positions: {
          1: { x: 360, y: 80 },
          2: { x: 290, y: 210 },
          3: { x: 360, y: 200 },
          4: { x: 170, y: 280 },
          5: { x: 200, y: 100 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 2, to: 5 }
        ]
      }
    ]
  },

  'zone-ball': {
    name: 'Ball',
    chapter: 'zone',
    description: 'Ball screen action with dive cut and rotation',
    phases: [
      // ========== INITIAL POSITIONS ==========
      {
        description: [],
        positions: {
          1: { x: 320, y: 320 },   // PG right side below 3pt (has ball)
          2: { x: 70, y: 230 },    // SG left wing
          3: { x: 360, y: 220 },   // SF right wing
          4: { x: 170, y: 330 },   // PF left low
          5: { x: 290, y: 120 }    // C right block
        },
        ball: 1,
        actions: []
      },
      // ========== PHASE 1: PASS AND CUT ==========
      {
        description: ['1 passes to 3'],
        positions: {
          1: { x: 320, y: 320 },
          2: { x: 70, y: 230 },
          3: { x: 360, y: 220 },
          4: { x: 170, y: 330 },
          5: { x: 290, y: 120 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      {
        description: [],
        positions: {
          1: { x: 200, y: 100 },   // 1 cuts to basket
          2: { x: 70, y: 230 },
          3: { x: 360, y: 220 },
          4: { x: 170, y: 330 },
          5: { x: 290, y: 120 }
        },
        ball: 3,
        actions: [
          // 1 curves down toward basket after passing
          { type: 'cut', player: 1, path: 'M320,320 Q260,280 230,200 Q210,140 200,100' }
        ]
      },
      // ========== PHASE 2: FILL OPEN SPOTS ==========
      {
        description: ['Players all fill the open spots'],
        positions: {
          1: { x: 70, y: 180 },    // 1 fills to left wing
          2: { x: 170, y: 320 },   // 2 rotates to left low
          3: { x: 360, y: 240 },   // 3 stays at right wing
          4: { x: 310, y: 330 },   // 4 moves across to right low
          5: { x: 330, y: 150 }    // 5 drifts up slightly
        },
        ball: 3,
        actions: [
          // 1 fills out to left wing from basket
          { type: 'cut', player: 1, path: 'M200,100 Q140,130 100,160 Q85,170 70,180' },
          // 2 curves down from left wing to left low
          { type: 'cut', player: 2, path: 'M70,230 Q100,270 140,300 Q155,310 170,320' },
          // 4 moves across from left low to right low
          { type: 'cut', player: 4, from: { x: 170, y: 330 }, to: { x: 310, y: 330 } }
        ]
      },
      // ========== PHASE 3: BALL SCREEN ==========
      {
        description: [
          '5 sets a ball screen for 3',
          '5 rolls in this diagram but could also pop to the corner'
        ],
        positions: {
          1: { x: 70, y: 180 },
          2: { x: 170, y: 320 },
          3: { x: 360, y: 240 },
          4: { x: 310, y: 330 },
          5: { x: 340, y: 220 }    // 5 moves to screen position
        },
        ball: 3,
        actions: [
          { type: 'cut', player: 5, from: { x: 330, y: 150 }, to: { x: 340, y: 220 } },
          { type: 'screen', player: 5, angle: 270 }  // Screen faces left for 3 to use
        ]
      },
      {
        description: ['4, 2, and 1 all rotate in the direction of the ball'],
        positions: {
          1: { x: 60, y: 60 },     // 1 rotates to left corner
          2: { x: 70, y: 230 },    // 2 rotates up to left wing
          3: { x: 280, y: 260 },   // 3 dribbles off screen toward paint
          4: { x: 170, y: 320 },   // 4 rotates back left
          5: { x: 340, y: 220 }    // 5 at screen position
        },
        ball: 3,
        actions: [
          // 3 dribbles around the screen
          { type: 'dribble', player: 3, path: 'M360,240 Q340,250 310,260 Q295,260 280,260' },
          // 1 rotates to left corner
          { type: 'cut', player: 1, path: 'M70,180 Q65,120 60,60' },
          // 2 rotates up to left wing
          { type: 'cut', player: 2, path: 'M170,320 Q120,280 70,230' },
          // 4 rotates back left
          { type: 'cut', player: 4, from: { x: 310, y: 330 }, to: { x: 170, y: 320 } }
        ]
      },
      // ========== PHASE 4: ROLL AND FINISH ==========
      {
        description: ['5 rolls to the rim'],
        positions: {
          1: { x: 60, y: 60 },
          2: { x: 70, y: 230 },
          3: { x: 280, y: 260 },
          4: { x: 170, y: 320 },
          5: { x: 260, y: 100 }    // 5 rolls to basket
        },
        ball: 3,
        actions: [
          // 5 rolls hard to the basket
          { type: 'cut', player: 5, path: 'M340,220 Q300,180 280,140 Q270,120 260,100' }
        ]
      },
      {
        description: ['3 looks for 5 on the roll to the rim but also has kickout options in 1, 2, and 4'],
        positions: {
          1: { x: 60, y: 60 },
          2: { x: 70, y: 230 },
          3: { x: 280, y: 260 },
          4: { x: 170, y: 320 },
          5: { x: 260, y: 100 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 3, to: 5 }
        ]
      }
    ]
  },

  'zone-oppo': {
    name: 'Oppo',
    chapter: 'zone',
    description: 'Opposite block cut on ball reversal',
    phases: [
      // ========== INITIAL POSITIONS ==========
      {
        description: [],
        positions: {
          1: { x: 360, y: 320 },   // PG right side with ball
          2: { x: 170, y: 320 },   // SG left side
          3: { x: 380, y: 200 },   // SF right wing
          4: { x: 60, y: 200 },    // PF left wing
          5: { x: 170, y: 80 }     // C LEFT block
        },
        ball: 1,
        actions: []
      },
      // ========== PHASE 1: PASS ==========
      {
        description: [
          '1 passes to 2',
          'As soon as the ball changes sides, 5 goes behind the rim and to the opposite ballside block'
        ],
        positions: {
          1: { x: 360, y: 300 },
          2: { x: 170, y: 320 },
          3: { x: 380, y: 200 },
          4: { x: 60, y: 200 },
          5: { x: 170, y: 80 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      // ========== PHASE 1: 5 CUTS BEHIND RIM ==========
      {
        description: [],
        positions: {
          1: { x: 360, y: 300 },
          2: { x: 170, y: 320 },
          3: { x: 380, y: 200 },
          4: { x: 60, y: 200 },
          5: { x: 350, y: 80 }     // 5 cuts to RIGHT block (opposite of ball)
        },
        ball: 2,
        actions: [
          // 5 cuts from LEFT block, behind rim (baseline), to RIGHT block
          { type: 'cut', player: 5, path: 'M170,80 Q200,30 270,30 Q340,30 350,80' }
        ]
      },
      // ========== PHASE 2: DRIVE ==========
      {
        description: [
          '2 drives to the rim',
          '1, 3, and 4 circle move in the direction of the drive',
          '5 cuts to the opposite block'
        ],
        positions: {
          1: { x: 360, y: 300 },
          2: { x: 280, y: 180 },   // 2 drives to paint
          3: { x: 380, y: 200 },
          4: { x: 60, y: 200 },
          5: { x: 350, y: 80 }
        },
        ball: 2,
        actions: [
          // 2 dribbles hard to the rim
          { type: 'dribble', player: 2, path: 'M170,320 Q200,260 240,200 Q260,180 280,180' }
        ]
      },
      // ========== PHASE 2: CIRCLE MOVEMENT ==========
      {
        description: [],
        positions: {
          1: { x: 380, y: 180 },   // 1 rotates to right wing
          2: { x: 280, y: 180 },
          3: { x: 380, y: 60 },    // 3 rotates to right corner
          4: { x: 170, y: 320 },   // 4 rotates down to left low
          5: { x: 170, y: 80 }     // 5 back to LEFT block (opposite of ball)
        },
        ball: 2,
        actions: [
          // 1 circles to right wing
          { type: 'cut', player: 1, path: 'M360,300 Q370,240 380,180' },
          // 3 circles up to right corner
          { type: 'cut', player: 3, path: 'M380,200 Q380,130 380,60' },
          // 4 circles down to left low
          { type: 'cut', player: 4, path: 'M60,200 Q100,260 170,320' },
          // 5 cuts back behind rim to LEFT block (opposite of where ball went)
          { type: 'cut', player: 5, path: 'M350,80 Q340,30 270,30 Q200,30 170,80' }
        ]
      },
      // ========== FINISH ==========
      {
        description: ['2 makes the read to 5'],
        positions: {
          1: { x: 380, y: 180 },
          2: { x: 280, y: 180 },
          3: { x: 380, y: 60 },
          4: { x: 170, y: 320 },
          5: { x: 170, y: 80 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 2, to: 5 }
        ]
      }
    ]
  },

  'zone-off': {
    name: 'Off',
    chapter: 'zone',
    description: 'Screen away with tight curl to rim',
    phases: [
      // ========== INITIAL POSITIONS ==========
      {
        description: [],
        positions: {
          1: { x: 340, y: 340 },   // PG right side with ball
          2: { x: 200, y: 340 },   // SG left low
          3: { x: 360, y: 240 },   // SF right wing
          4: { x: 60, y: 200 },    // PF left wing
          5: { x: 340, y: 80 }     // C right block
        },
        ball: 1,
        actions: []
      },
      // ========== PHASE 1: PASS ==========
      {
        description: ['1 passes to 2'],
        positions: {
          1: { x: 340, y: 340 },
          2: { x: 200, y: 340 },
          3: { x: 360, y: 240 },
          4: { x: 60, y: 200 },
          5: { x: 340, y: 80 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      // ========== PHASE 2: SCREEN AWAY ==========
      {
        description: [
          'Instead of cutting to the rim, 1 screens away for 2',
          '2 tight curls to the rim'
        ],
        positions: {
          1: { x: 260, y: 290 },   // 1 sets screen
          2: { x: 200, y: 340 },
          3: { x: 360, y: 240 },
          4: { x: 60, y: 200 },
          5: { x: 340, y: 80 }
        },
        ball: 3,
        actions: [
          // 1 moves to set screen for 2
          { type: 'cut', player: 1, from: { x: 340, y: 340 }, to: { x: 260, y: 290 } },
          { type: 'screen', player: 1, angle: 180 }  // Screen faces up for 2 to curl
        ]
      },
      {
        description: [],
        positions: {
          1: { x: 260, y: 290 },
          2: { x: 260, y: 130 },   // 2 curls tight to rim
          3: { x: 360, y: 240 },
          4: { x: 60, y: 200 },
          5: { x: 340, y: 80 }
        },
        ball: 3,
        actions: [
          // 2 curls tight around 1's screen to the rim
          { type: 'cut', player: 2, path: 'M200,340 Q220,310 250,290 Q270,260 270,200 Q265,150 260,130' }
        ]
      },
      // ========== PHASE 3: FILL SPOTS ==========
      {
        description: [
          'Everyone else fills the next open spot',
          '1 comes back to the ball, 4 replaces 1, 2 replaces 4'
        ],
        positions: {
          1: { x: 340, y: 310 },   // 1 comes back to ball (right low)
          2: { x: 60, y: 200 },    // 2 replaces 4 (left wing)
          3: { x: 360, y: 240 },   // 3 stays (ball)
          4: { x: 200, y: 310 },   // 4 replaces 1 (left low)
          5: { x: 340, y: 80 }     // 5 stays (right block)
        },
        ball: 3,
        actions: [
          // 1 comes back to the ball (right side)
          { type: 'cut', player: 1, path: 'M260,290 Q300,300 340,310' },
          // 4 rotates down to replace 1's original spot
          { type: 'cut', player: 4, path: 'M60,200 Q100,260 200,310' },
          // 2 rotates out to replace 4's spot (left wing)
          { type: 'cut', player: 2, path: 'M260,130 Q160,150 60,200' }
        ]
      }
    ]
  },

  // ==========================================
  // CHAPTER 3: INBOUND PLAYS
  // ==========================================

  'inbound-stack': {
    name: 'Stack',
    chapter: 'inbound',
    description: 'Baseline out of bounds - stack',
    phases: [
      {
        positions: {
          1: { x: 280, y: 40 },    // Inbounder
          2: { x: 200, y: 100 },   // Stack
          3: { x: 200, y: 130 },   // Stack
          4: { x: 200, y: 160 },   // Stack
          5: { x: 200, y: 190 }    // Stack top
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 280, y: 40 },
          2: { x: 64, y: 100 },    // Break left
          3: { x: 336, y: 130 },   // Break right
          4: { x: 200, y: 160 },
          5: { x: 200, y: 280 }    // Pop out
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 2, path: 'M200,100 L64,100' },
          { type: 'cut', player: 3, path: 'M200,130 L336,130' },
          { type: 'cut', player: 5, path: 'M200,190 L200,280' }
        ]
      },
      {
        positions: {
          1: { x: 280, y: 40 },
          2: { x: 64, y: 100 },
          3: { x: 336, y: 130 },
          4: { x: 200, y: 160 },
          5: { x: 200, y: 280 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 1, to: 5 }
        ]
      }
    ]
  },

  'inbound-triangle': {
    name: 'Triangle',
    chapter: 'inbound',
    description: 'Baseline out of bounds - triangle',
    phases: [
      {
        positions: {
          1: { x: 200, y: 40 },    // Inbounder
          2: { x: 150, y: 120 },   // Triangle
          3: { x: 250, y: 120 },   // Triangle
          4: { x: 200, y: 180 },   // Triangle point
          5: { x: 200, y: 280 }    // Safety
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 40 },
          2: { x: 100, y: 80 },    // Pop corner
          3: { x: 300, y: 80 },    // Pop corner
          4: { x: 200, y: 180 },
          5: { x: 200, y: 280 }
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 2, path: 'M150,120 L100,80' },
          { type: 'cut', player: 3, path: 'M250,120 L300,80' }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 40 },
          2: { x: 100, y: 80 },
          3: { x: 300, y: 80 },
          4: { x: 200, y: 180 },
          5: { x: 200, y: 280 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      }
    ]
  },

  'inbound-dub': {
    name: 'Dub',
    chapter: 'inbound',
    description: 'Baseline out of bounds - double screen',
    phases: [
      {
        positions: {
          1: { x: 200, y: 40 },    // Inbounder
          2: { x: 280, y: 100 },   // Cutter
          3: { x: 120, y: 140 },   // Screen 1
          4: { x: 120, y: 180 },   // Screen 2
          5: { x: 200, y: 280 }    // Safety
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 40 },
          2: { x: 64, y: 160 },    // Curl off screens
          3: { x: 120, y: 140 },
          4: { x: 120, y: 180 },
          5: { x: 200, y: 280 }
        },
        ball: 1,
        actions: [
          { type: 'screen', player: 3, angle: 90 },  // Screen faces right toward cutter
          { type: 'screen', player: 4, angle: 90 },  // Screen faces right toward cutter
          // Curved cut AROUND the double screen (screens at 120,140 and 120,180)
          { type: 'cut', player: 2, path: 'M280,100 Q180,130 130,160 Q90,170 64,160' }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 40 },
          2: { x: 64, y: 160 },
          3: { x: 120, y: 140 },
          4: { x: 120, y: 180 },
          5: { x: 200, y: 280 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      }
    ]
  }
};
