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
    description: 'Drive and kick for layup',
    // Phase-based animation with player movement
    phases: [
      {
        // Phase 1: Starting positions
        positions: {
          1: { x: 200, y: 370 },   // PG at half-court center
          2: { x: 75, y: 250 },    // SG left wing
          3: { x: 340, y: 160 },   // SF right wing (not corner yet)
          4: { x: 125, y: 105 },   // PF left elbow
          5: { x: 245, y: 75 }     // C right edge of paint, near rim
        },
        ball: 1,
        actions: []
      },
      {
        // Phase 2: Player 1 dribbles to right wing, Player 3 cuts to corner
        positions: {
          1: { x: 310, y: 250 },   // PG moved to right wing
          2: { x: 75, y: 250 },
          3: { x: 365, y: 55 },    // SF cuts to corner
          4: { x: 125, y: 105 },
          5: { x: 245, y: 75 }
        },
        ball: 1,
        actions: [
          { type: 'dribble', player: 1, from: { x: 200, y: 370 }, to: { x: 310, y: 250 } },
          { type: 'cut', player: 3, from: { x: 340, y: 160 }, to: { x: 365, y: 55 } }
        ]
      },
      {
        // Phase 3: Player 1 passes to Player 3 in corner
        positions: {
          1: { x: 310, y: 250 },
          2: { x: 75, y: 250 },
          3: { x: 365, y: 55 },
          4: { x: 125, y: 105 },
          5: { x: 245, y: 75 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      {
        // Phase 4: Player 3 passes to Player 5
        positions: {
          1: { x: 310, y: 250 },
          2: { x: 75, y: 250 },
          3: { x: 365, y: 55 },
          4: { x: 125, y: 105 },
          5: { x: 245, y: 75 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 3, to: 5 }
        ]
      },
      {
        // Phase 5: Player 5 shoots from position
        positions: {
          1: { x: 310, y: 250 },
          2: { x: 75, y: 250 },
          3: { x: 365, y: 55 },
          4: { x: 125, y: 105 },
          5: { x: 245, y: 75 }
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
    description: 'Wing entry with down screen',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 280, y: 196 },   // SF uses screen
          4: { x: 280, y: 240 },   // PF sets down screen
          5: { x: 280, y: 116 }
        },
        ball: 2,
        actions: [
          { type: 'screen', player: 4 },
          { type: 'cut', player: 3, path: 'M336,300 L280,196' }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 280, y: 196 },
          4: { x: 336, y: 300 },   // PF pops out
          5: { x: 280, y: 116 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 2, to: 3 },
          { type: 'cut', player: 4, path: 'M280,240 L336,300' }
        ]
      }
    ]
  },

  'man-3': {
    name: 'Play #3',
    chapter: 'man',
    description: 'Pick and roll action',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 340 }    // C comes up to set screen
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 5, path: 'M280,116 L200,340' }
        ]
      },
      {
        positions: {
          1: { x: 280, y: 300 },   // PG uses screen, drives right
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 340 }    // Screen position
        },
        ball: 1,
        actions: [
          { type: 'screen', player: 5 },
          { type: 'dribble', player: 1, path: 'M200,380 L280,300' }
        ]
      },
      {
        positions: {
          1: { x: 280, y: 300 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 180 }    // C rolls to basket
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 5, path: 'M200,340 L200,180' }
        ]
      }
    ]
  },

  'man-4': {
    name: 'Play #4',
    chapter: 'man',
    description: 'Flex cut action',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 200, y: 100 },   // SG flex cuts across
          3: { x: 336, y: 300 },
          4: { x: 130, y: 180 },   // PF sets flex screen
          5: { x: 280, y: 116 }
        },
        ball: 3,
        actions: [
          { type: 'screen', player: 4 },
          { type: 'cut', player: 2, path: 'M64,300 L130,180 L200,100' }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 200, y: 100 },
          3: { x: 336, y: 300 },
          4: { x: 64, y: 300 },    // PF pops out
          5: { x: 280, y: 116 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 3, to: 2 },
          { type: 'cut', player: 4, path: 'M130,180 L64,300' }
        ]
      }
    ]
  },

  'man-5': {
    name: 'Play #5',
    chapter: 'man',
    description: 'Horns set entry',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 260 },
          3: { x: 336, y: 260 },
          4: { x: 136, y: 240 },   // Horns - left elbow
          5: { x: 264, y: 240 }    // Horns - right elbow
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 264, y: 300 },   // PG uses screen right
          2: { x: 64, y: 260 },
          3: { x: 336, y: 260 },
          4: { x: 136, y: 240 },
          5: { x: 264, y: 240 }
        },
        ball: 1,
        actions: [
          { type: 'screen', player: 5 },
          { type: 'dribble', player: 1, path: 'M200,380 L264,300' }
        ]
      },
      {
        positions: {
          1: { x: 264, y: 300 },
          2: { x: 64, y: 260 },
          3: { x: 336, y: 260 },
          4: { x: 136, y: 240 },
          5: { x: 264, y: 140 }    // C rolls to basket
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 5, path: 'M264,240 L264,140' }
        ]
      }
    ]
  },

  'man-6': {
    name: 'Play #6',
    chapter: 'man',
    description: 'High post handoff',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 196 }    // C at high post
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 196 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 1, to: 5 }
        ]
      },
      {
        positions: {
          1: { x: 260, y: 240 },   // PG handoff
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 196 }
        },
        ball: 1,
        actions: [
          { type: 'handoff', from: 5, to: 1 },
          { type: 'cut', player: 1, path: 'M200,380 L200,220 L260,240' }
        ]
      },
      {
        positions: {
          1: { x: 260, y: 240 },
          2: { x: 64, y: 300 },
          3: { x: 336, y: 300 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 120 }    // C rolls to basket
        },
        ball: 1,
        actions: [
          { type: 'cut', player: 5, path: 'M200,196 L200,120' }
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
    description: 'Attack zone from high post',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 260 },
          3: { x: 336, y: 260 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 196 }    // High post
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 260 },
          3: { x: 336, y: 260 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 196 }
        },
        ball: 5,
        actions: [
          { type: 'pass', from: 1, to: 5 }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 140 },    // SG baseline cut
          3: { x: 336, y: 260 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 196 }
        },
        ball: 5,
        actions: [
          { type: 'cut', player: 2, path: 'M64,260 L64,140' }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 140 },
          3: { x: 336, y: 260 },
          4: { x: 120, y: 116 },
          5: { x: 200, y: 196 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 5, to: 2 }
        ]
      }
    ]
  },

  'zone-dive': {
    name: 'Dive',
    chapter: 'zone',
    description: 'Attack gaps with dive cuts',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 200, y: 120 },   // SF dives to gap
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 2,
        actions: [
          { type: 'cut', player: 3, path: 'M336,280 L200,120' }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 200, y: 120 },
          4: { x: 120, y: 116 },
          5: { x: 280, y: 116 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 2, to: 3 }
        ]
      }
    ]
  },

  'zone-ball': {
    name: 'Ball',
    chapter: 'zone',
    description: 'Ball reversal attack',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 280, y: 140 }
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 280, y: 140 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 1, to: 2 }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 280, y: 140 }
        },
        ball: 1,
        actions: [
          { type: 'pass', from: 2, to: 1 }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 280, y: 140 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      }
    ]
  },

  'zone-oppo': {
    name: 'Oppo',
    chapter: 'zone',
    description: 'Opposite action',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 200, y: 180 }
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 200, y: 180 }
        },
        ball: 3,
        actions: [
          { type: 'pass', from: 1, to: 3 }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 336, y: 140 },   // SG opposite cut
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 200, y: 180 }
        },
        ball: 3,
        actions: [
          { type: 'cut', player: 2, path: 'M64,280 L200,200 L336,140' }
        ]
      },
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 336, y: 140 },
          3: { x: 336, y: 280 },
          4: { x: 120, y: 140 },
          5: { x: 200, y: 180 }
        },
        ball: 2,
        actions: [
          { type: 'pass', from: 3, to: 2 }
        ]
      }
    ]
  },

  'zone-off': {
    name: 'Off',
    chapter: 'zone',
    description: 'Offset overload',
    phases: [
      {
        positions: {
          1: { x: 200, y: 380 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 64, y: 140 },
          5: { x: 200, y: 160 }
        },
        ball: 1,
        actions: []
      },
      {
        positions: {
          1: { x: 100, y: 340 },   // PG overload left
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 64, y: 140 },
          5: { x: 200, y: 160 }
        },
        ball: 1,
        actions: [
          { type: 'dribble', player: 1, path: 'M200,380 L100,340' }
        ]
      },
      {
        positions: {
          1: { x: 100, y: 340 },
          2: { x: 64, y: 280 },
          3: { x: 336, y: 280 },
          4: { x: 64, y: 140 },
          5: { x: 200, y: 160 }
        },
        ball: 4,
        actions: [
          { type: 'pass', from: 1, to: 4 }
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
          { type: 'screen', player: 3 },
          { type: 'screen', player: 4 },
          { type: 'cut', player: 2, path: 'M280,100 L120,140 L64,160' }
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
