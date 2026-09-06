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
          { type: 'dribble', player: 1, from: { x: 200, y: 370 }, to: { x: 340, y: 200 } },
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
          { type: 'dribble', player: 1, from: { x: 200, y: 370 }, to: { x: 60, y: 200 } },
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
          { type: 'screen', player: 5 }
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
          { type: 'cut', player: 3, path: 'M340,200 Q350,150 300,120 Q250,90 220,100' }
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
          { type: 'screen', player: 4 }
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
          { type: 'cut', player: 2, path: 'M60,200 Q50,150 100,120 Q150,90 180,100' }
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
