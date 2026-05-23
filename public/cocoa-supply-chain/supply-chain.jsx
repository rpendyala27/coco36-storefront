// supply-chain.jsx — 6s cocoa supply chain animation
// Indonesia → ship → factory → truck → Hyderabad bakery

// ── Brand palette ───────────────────────────────────────────────────────────
const C = {
  primaryRed: '#ef405b',
  brightRed: '#ff1e55',
  softCoral: '#fd535f',
  vibrantYellow: '#ffde2f',
  goldenAmber: '#fab73d',
  paleLemon: '#f7e447',
  deepPurple: '#4b1f64',
  berryPurple: '#730a6b',
  darkIndigo: '#3b0366',
  white: '#ffffff',
  cream: '#faf8f5',
  lightGray: '#f5f5f5',
  charcoal: '#282c3f',
  mediumGray: '#686b78',
};

// Square canvas so the full circle globe is visible (was 1280×720 with
// the wheel half-buried below the canvas — now centered and fully shown).
const STAGE_W = 1280;
const STAGE_H = 1280;
const DUR = 8;

// Wheel geometry — single source of truth.
// Wheel center moved to canvas center so the full 360° globe shows.
const WHEEL = {
  cx: STAGE_W / 2,
  cy: STAGE_H / 2,    // centered (was 760, below canvas)
  rOuter: 480,        // slightly tighter so there's breathing room
  rInner: 340,
};

// Convert angle (degrees, 0=right, -90=top) + radius → x,y
const polar = (angleDeg, r) => {
  const a = (angleDeg * Math.PI) / 180;
  return { x: WHEEL.cx + Math.cos(a) * r, y: WHEEL.cy + Math.sin(a) * r };
};

// Position on the icon-ride radius (just above outer edge)
const RIDE_R = WHEEL.rOuter + 6;
const ridePoint = (angleDeg) => polar(angleDeg, RIDE_R);

// ── Background: transparent so the parent hero gradient bleeds through.
// We keep ONLY the warm sunrise halo + stars (which now glow over the
// hero's purple gradient instead of a separate dark sky).
function SkyBackground() {
  return (
    <>
      {/* Soft warm halo near horizon (sunrise behind globe) */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: 80,
        width: 900, height: 500,
        transform: 'translateX(-50%)',
        background: `radial-gradient(ellipse at center, ${C.goldenAmber}55 0%, ${C.primaryRed}22 40%, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
      {/* Stars */}
      <Stars />
    </>
  );
}

function Stars() {
  // Deterministic star field
  const stars = React.useMemo(() => {
    const out = [];
    let seed = 1;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 60; i++) {
      out.push({
        x: rnd() * STAGE_W,
        y: rnd() * 380,
        r: rnd() * 1.4 + 0.4,
        o: rnd() * 0.6 + 0.2,
        tw: rnd() * 2,
      });
    }
    return out;
  }, []);
  const t = useTime();
  return (
    <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0 }}>
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r={s.r}
          fill={C.paleLemon}
          opacity={s.o * (0.6 + 0.4 * Math.sin(t * 3 + s.tw * Math.PI))}
        />
      ))}
    </svg>
  );
}

// ── Globe / Wheel ───────────────────────────────────────────────────────────
function Globe() {
  const t = useTime();
  const rotation = (t / DUR) * 360 * 0.6; // gentle rotation across full clip

  return (
    <svg
      width={STAGE_W} height={STAGE_H}
      style={{ position: 'absolute', inset: 0 }}
    >
      <defs>
        {/* Ocean gradient */}
        <radialGradient id="oceanGrad" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#7a3a96" />
          <stop offset="60%" stopColor={C.berryPurple} />
          <stop offset="100%" stopColor={C.darkIndigo} />
        </radialGradient>
        {/* Inner ring (annulus) — lighter coral/pink */}
        <radialGradient id="ringGrad" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor={C.softCoral} />
          <stop offset="60%" stopColor={C.primaryRed} />
          <stop offset="100%" stopColor="#b71d3f" />
        </radialGradient>
        {/* Soft drop shadow under wheel */}
        <filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="14" />
          <feOffset dy="8" />
          <feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outer disk — globe */}
      <g filter="url(#wheelShadow)">
        <circle
          cx={WHEEL.cx} cy={WHEEL.cy}
          r={WHEEL.rOuter}
          fill="url(#oceanGrad)"
        />

        {/* Continents — rotating group */}
        <g transform={`rotate(${rotation} ${WHEEL.cx} ${WHEEL.cy})`}>
          <Continents />
          {/* Latitude/longitude lines for "globe" feel */}
          <GlobeGrid />
        </g>

        {/* Inner ring — the "track" the icons ride on (the lighter pink arc) */}
        <circle
          cx={WHEEL.cx} cy={WHEEL.cy}
          r={WHEEL.rInner}
          fill="url(#ringGrad)"
        />

        {/* Inner core — paper cream */}
        <circle
          cx={WHEEL.cx} cy={WHEEL.cy}
          r={WHEEL.rInner - 110}
          fill={C.cream}
        />
      </g>

      {/* Outer rim highlight */}
      <circle
        cx={WHEEL.cx} cy={WHEEL.cy}
        r={WHEEL.rOuter}
        fill="none"
        stroke={C.paleLemon}
        strokeWidth="2"
        opacity="0.35"
      />

      {/* Inner rim ticks — every 30° on the visible top arc */}
      <RimTicks />
    </svg>
  );
}

// Real-ish continent outlines drawn in equirectangular space, then mapped
// onto the sphere. Each continent is a polygon in lat/lon, projected via
// orthographic-ish onto the visible disk via a rotation transform.
function Continents() {
  const land = C.goldenAmber;
  const landDark = C.primaryRed;

  // Continents as simplified polygons in equirectangular coords on the sphere
  // surface — drawn directly in SVG-space relative to the globe center.
  // We map (lon, lat) → cartesian on the disk: x = R*cos(lat)*sin(lon),
  // y = -R*sin(lat). This gives an orthographic look. The whole group
  // rotates around the globe center.
  const R = WHEEL.rOuter - 8;

  // Project a [lon, lat] point (degrees) to globe-disk x,y
  const project = (lon, lat) => {
    const lonR = (lon * Math.PI) / 180;
    const latR = (lat * Math.PI) / 180;
    return [
      WHEEL.cx + R * Math.cos(latR) * Math.sin(lonR),
      WHEEL.cy - R * Math.sin(latR),
    ];
  };

  // Build SVG path from a list of [lon, lat] points
  const buildPath = (pts) => {
    return pts.map((p, i) => {
      const [x, y] = project(p[0], p[1]);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  };

  // Simplified continent outlines (lon, lat) — recognizable silhouettes.
  // Coordinates are approximate — enough that viewers recognize the shapes.

  // EURASIA (Europe + Asia, big landmass)
  const eurasia = [
    [-10, 36], [-5, 43], [0, 45], [5, 50], [10, 55], [20, 60], [30, 65],
    [50, 68], [70, 70], [90, 72], [110, 70], [130, 65], [140, 55],
    [142, 50], [140, 45], [130, 40], [125, 35], [120, 30], [122, 25],
    [115, 22], [108, 18], [105, 12], [100, 8], [98, 14], [92, 22],
    [88, 25], [85, 28], [82, 32], [78, 28], [75, 22], [72, 20],
    [68, 25], [62, 28], [55, 28], [48, 30], [42, 35], [35, 32],
    [30, 30], [28, 35], [25, 38], [20, 40], [15, 38], [10, 36],
    [5, 38], [0, 40], [-5, 38], [-10, 36],
  ];

  // AFRICA
  const africa = [
    [-15, 30], [-10, 32], [-5, 34], [10, 35], [25, 32], [33, 30],
    [38, 18], [42, 12], [45, 5], [48, -5], [42, -12], [38, -20],
    [32, -28], [28, -33], [22, -34], [18, -32], [14, -22],
    [10, -10], [8, 0], [5, 5], [0, 8], [-5, 12], [-10, 18],
    [-15, 22], [-17, 28], [-15, 30],
  ];

  // NORTH AMERICA
  const northAmerica = [
    [-170, 65], [-160, 70], [-140, 70], [-120, 72], [-100, 75],
    [-80, 73], [-65, 68], [-55, 60], [-60, 50], [-65, 42],
    [-72, 38], [-78, 32], [-82, 28], [-90, 25], [-95, 22],
    [-100, 25], [-105, 28], [-110, 30], [-118, 32], [-122, 38],
    [-125, 45], [-130, 52], [-135, 58], [-150, 60], [-160, 60],
    [-170, 65],
  ];

  // SOUTH AMERICA
  const southAmerica = [
    [-72, 12], [-65, 10], [-55, 5], [-48, 0], [-40, -8],
    [-38, -18], [-42, -28], [-50, -38], [-58, -45], [-65, -52],
    [-70, -55], [-72, -50], [-72, -40], [-78, -32], [-80, -22],
    [-78, -10], [-78, -2], [-75, 5], [-72, 12],
  ];

  // AUSTRALIA
  const australia = [
    [115, -22], [120, -18], [130, -14], [140, -16], [148, -22],
    [152, -28], [148, -36], [140, -38], [130, -34], [120, -32],
    [115, -28], [115, -22],
  ];

  // GREENLAND
  const greenland = [
    [-50, 78], [-30, 80], [-22, 76], [-22, 70], [-30, 62],
    [-42, 60], [-50, 65], [-52, 72], [-50, 78],
  ];

  // INDIA peninsula (separate accent piece, sub-shape of eurasia outline)
  const india = [
    [68, 22], [72, 18], [75, 14], [77, 10], [78, 12], [80, 16],
    [85, 18], [88, 22], [82, 24], [76, 26], [70, 24], [68, 22],
  ];

  // INDONESIA (archipelago — multiple small islands)
  const indonesia1 = [[95, -2], [105, -3], [110, -7], [102, -8], [97, -5], [95, -2]];
  const indonesia2 = [[112, -7], [120, -8], [124, -8], [118, -6], [112, -7]];
  const indonesia3 = [[128, -2], [136, -4], [140, -6], [134, -2], [128, -2]];

  // Cull paths that are entirely on the back of the sphere (where
  // sin(lon) flips). With orthographic, the back hemisphere is at
  // |lon| > 90. We render all and rely on the rotation transform to
  // bring them around — but visible arc is roughly only -90 < lon < 90.
  // Since the whole continents group rotates, we still render all and
  // let parts slide off-canvas naturally. To prevent "flipped" rendering
  // on back faces, we clip-mask everything to the globe disk.

  return (
    <g>
      <defs>
        <clipPath id="globeMask">
          <circle cx={WHEEL.cx} cy={WHEEL.cy} r={R}/>
        </clipPath>
      </defs>
      <g clipPath="url(#globeMask)" fill="none" strokeLinejoin="round" strokeLinecap="round">
        {/* Continent outlines — main strokes in golden amber */}
        <g stroke={C.goldenAmber} strokeWidth="2.2" opacity="0.95">
          <path d={buildPath(eurasia)}/>
          <path d={buildPath(africa)}/>
          <path d={buildPath(northAmerica)}/>
          <path d={buildPath(southAmerica)}/>
          <path d={buildPath(australia)}/>
          <path d={buildPath(greenland)}/>
        </g>
        {/* India + Indonesia in brighter red — origin/destination accents */}
        <g stroke={C.brightRed} strokeWidth="2.4">
          <path d={buildPath(india)}/>
          <path d={buildPath(indonesia1)}/>
          <path d={buildPath(indonesia2)}/>
          <path d={buildPath(indonesia3)}/>
        </g>
      </g>
    </g>
  );
}

// (Old abstract continent blobs removed — replaced by Continents() above.)

function GlobeGrid() {
  const lines = [];
  // Longitude lines (vertical ellipses, rotated)
  for (let i = 0; i < 6; i++) {
    const rx = WHEEL.rOuter * Math.cos((i * 30 * Math.PI) / 180);
    lines.push(
      <ellipse
        key={'lon' + i}
        cx={WHEEL.cx} cy={WHEEL.cy}
        rx={Math.abs(rx)} ry={WHEEL.rOuter}
        fill="none"
        stroke={C.paleLemon}
        strokeWidth="1"
        opacity="0.12"
      />
    );
  }
  // Latitude lines
  for (let i = 1; i < 5; i++) {
    const r = (WHEEL.rOuter * i) / 5;
    lines.push(
      <ellipse
        key={'lat' + i}
        cx={WHEEL.cx} cy={WHEEL.cy - (WHEEL.rOuter - r) * 0.2}
        rx={r} ry={r * 0.3}
        fill="none"
        stroke={C.paleLemon}
        strokeWidth="1"
        opacity="0.12"
      />
    );
  }
  return <g>{lines}</g>;
}

function RimTicks() {
  const ticks = [];
  for (let a = -180; a <= 0; a += 15) {
    const p1 = polar(a, WHEEL.rInner - 4);
    const p2 = polar(a, WHEEL.rInner - 14);
    ticks.push(
      <line key={a}
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={C.cream} strokeOpacity="0.4" strokeWidth="2"
      />
    );
  }
  return <g>{ticks}</g>;
}

// ── Travelling icon — rides the top arc ─────────────────────────────────────
// Travels from `fromAngle` to `toAngle` between `start` and `end` (in seconds).
// While travelling, the icon scales up; before/after it stays parked at the
// endpoint (or hidden if not yet "live").
function ArcRider({
  start, end,
  fromAngle, toAngle,
  parkAtEnd = false, // if true, stays at toAngle after end
  parkAtStart = false, // if true, stays at fromAngle before start
  liftY = 0,
  size = 1,
  shrinkParkScale = 0, // if >0 and parkAtEnd, shrinks to this multiplier of size after arrival
  shrinkParkOffset = { x: 0, y: 0 }, // px offset from the arc point when parked-shrunk (in viewport px)
  pulse = false,
  children,
}) {
  const t = useTime();

  let angle, scale = size, opacity = 1;
  let parkedShrunk = false;

  if (t < start) {
    if (!parkAtStart) return null;
    angle = fromAngle;
  } else if (t > end) {
    if (!parkAtEnd) return null;
    angle = toAngle;
    if (shrinkParkScale > 0) {
      // Smooth shrink over 0.4s after arrival
      const since = t - end;
      const k = clamp(since / 0.4, 0, 1);
      const eased = Easing.easeInOutCubic(k);
      scale = size * (1 - eased * (1 - shrinkParkScale));
      parkedShrunk = k > 0;
    }
  } else {
    const local = (t - start) / (end - start);
    const eased = Easing.easeInOutCubic(local);
    angle = fromAngle + (toAngle - fromAngle) * eased;
    // entry pop
    if (local < 0.2) {
      const e = Easing.easeOutBack(local / 0.2);
      scale = size * (0.4 + 0.6 * e);
    }
  }

  const p = ridePoint(angle);
  const tangent = angle + 90; // pointing along arc direction

  // Apply parked offset (so the shrunken icon nestles next to its destination)
  const offX = parkedShrunk ? shrinkParkOffset.x : 0;
  const offY = parkedShrunk ? shrinkParkOffset.y : 0;

  // Pulse on park
  let pulseScale = 1;
  if (pulse && t > end) {
    const since = t - end;
    pulseScale = 1 + Math.sin(since * 8) * 0.05 * Math.exp(-since * 1.5);
  }

  return (
    <div style={{
      position: 'absolute',
      left: p.x + offX, top: p.y - liftY + offY,
      transform: `translate(-50%, -100%) scale(${scale * pulseScale})`,
      transformOrigin: 'center bottom',
      willChange: 'transform',
      opacity,
      // Slight rotation matching the arc tangent so things "stand" on the curve
      // (capped so icons don't lean too hard)
      ['--tangent']: `${clamp((tangent + 90) * 0.4, -25, 25)}deg`,
    }}>
      <div style={{ transform: `rotate(${clamp((tangent + 90) * 0.5, -22, 22)}deg)` }}>
        {children}
      </div>
    </div>
  );
}

// ── Cocoa Grove (background of trees behind Sulawesi pod) ──────────────────
// Renders 3-5 cocoa trees clustered around the harvest start point.
// Each tree has a trunk, canopy, and 1-2 hanging pods.
function CocoaGrove() {
  const t = useTime();
  // Fade in at the very start, then stay visible as a permanent farm scene
  let opacity = 1;
  if (t < 0.1) opacity = 0;
  else if (t < 0.6) opacity = (t - 0.1) / 0.5;

  if (opacity <= 0) return null;

  // Trees positioned along the arc near the start angle (-158°)
  // Each at slightly different angle + radius for depth
  const trees = [
    { angle: -168, r: RIDE_R - 4, scale: 0.85, lift: 0,  flip: 1, sway: 0.0 },
    { angle: -163, r: RIDE_R + 2, scale: 1.0,  lift: 6,  flip: -1, sway: 0.4 },
    { angle: -156, r: RIDE_R - 2, scale: 0.75, lift: -2, flip: 1, sway: 0.2 },
    { angle: -150, r: RIDE_R + 4, scale: 0.9,  lift: 4,  flip: -1, sway: 0.7 },
  ];

  return (
    <div style={{ opacity, transition: 'opacity 0.2s' }}>
      {trees.map((tree, i) => {
        const p = polar(tree.angle, tree.r);
        const sway = Math.sin(t * 1.5 + tree.sway * Math.PI) * 1.5;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: p.x, top: p.y - tree.lift,
            transform: `translate(-50%, -100%) scale(${tree.scale * tree.flip}, ${tree.scale}) rotate(${sway}deg)`,
            transformOrigin: 'center bottom',
          }}>
            <CocoaTree />
          </div>
        );
      })}
    </div>
  );
}

function CocoaTree() {
  return (
    <svg width="80" height="120" viewBox="0 0 80 120">
      {/* Trunk */}
      <path d="M 38 116 Q 36 80 40 50 Q 44 60 42 116 Z" fill={C.darkIndigo}/>
      <path d="M 38 116 Q 36 80 40 50" stroke={C.berryPurple} strokeWidth="0.8" fill="none" opacity="0.5"/>
      {/* Branches */}
      <path d="M 40 60 Q 28 50 18 44" stroke={C.darkIndigo} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 40 56 Q 52 48 64 42" stroke={C.darkIndigo} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 40 50 Q 38 38 36 26" stroke={C.darkIndigo} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Canopy leaves */}
      <ellipse cx="40" cy="28" rx="22" ry="16" fill={C.goldenAmber}/>
      <ellipse cx="22" cy="36" rx="14" ry="12" fill={C.goldenAmber}/>
      <ellipse cx="58" cy="36" rx="14" ry="12" fill={C.goldenAmber}/>
      <ellipse cx="40" cy="22" rx="16" ry="10" fill={C.paleLemon} opacity="0.55"/>
      {/* Leaf veins */}
      <path d="M 22 36 Q 30 30 38 28" stroke={C.primaryRed} strokeWidth="0.6" fill="none" opacity="0.4"/>
      <path d="M 58 36 Q 50 30 42 28" stroke={C.primaryRed} strokeWidth="0.6" fill="none" opacity="0.4"/>
      {/* Hanging cocoa pods */}
      <ellipse cx="26" cy="56" rx="3.5" ry="6" fill={C.primaryRed}/>
      <line x1="26" y1="50" x2="28" y2="46" stroke={C.darkIndigo} strokeWidth="1"/>
      <ellipse cx="52" cy="58" rx="4" ry="7" fill={C.brightRed}/>
      <line x1="52" y1="51" x2="50" y2="48" stroke={C.darkIndigo} strokeWidth="1"/>
      <ellipse cx="38" cy="68" rx="3" ry="5" fill={C.softCoral}/>
      <line x1="38" y1="63" x2="39" y2="60" stroke={C.darkIndigo} strokeWidth="1"/>
      {/* Pod ridges */}
      <line x1="26" y1="50" x2="26" y2="62" stroke={C.berryPurple} strokeWidth="0.6" opacity="0.5"/>
      <line x1="52" y1="51" x2="52" y2="65" stroke={C.berryPurple} strokeWidth="0.6" opacity="0.5"/>
    </svg>
  );
}

// ── QR Code Badge (creative fill for the cream interior) ──────────────────
// A scannable QR code that links to https://coco36.com/shop.
// Renders the QR matrix as SVG modules in the brand's deep purple, with
// a small COCO36 logo plate in the center and a caption underneath.
function QRCodeBadge() {
  const t = useTime();

  // Fade in shortly after start
  let opacity = 1;
  if (t < 0.4) opacity = 0;
  else if (t < 1.2) opacity = (t - 0.4) / 0.8;

  // Generate the QR matrix once. window.qrcode comes from the qrcode-generator
  // CDN script tag in the HTML. typeNumber=0 means auto-pick the smallest size.
  const matrix = React.useMemo(() => {
    if (typeof window === 'undefined' || !window.qrcode) return null;
    const qr = window.qrcode(0, 'M'); // medium error correction
    qr.addData('https://coco36.com/shop');
    qr.make();
    const size = qr.getModuleCount();
    const mods = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        row.push(qr.isDark(r, c));
      }
      mods.push(row);
    }
    return { size, mods };
  }, []);

  if (opacity <= 0) return null;

  // Center the QR badge in the wheel interior (full circle composition).
  const badgeW = 240;
  const badgeH = 320;
  const badgeX = WHEEL.cx - badgeW / 2;
  const badgeY = WHEEL.cy - badgeH / 2;

  // Subtle scan-line animation across the QR (purely decorative)
  const scanY = ((t * 0.4) % 1);

  // Cell size for QR rendering
  const qrSize = 170;
  const cell = matrix ? qrSize / matrix.size : 0;

  return (
    <div style={{
      position: 'absolute',
      left: badgeX, top: badgeY,
      width: badgeW, height: badgeH,
      opacity,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Eyebrow caption */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        letterSpacing: '0.22em',
        color: C.primaryRed,
        textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        <span style={{
          display: 'inline-block', width: 18, height: 1,
          background: C.primaryRed, verticalAlign: 'middle',
          marginRight: 10,
        }}/>
        Trace this lot
      </div>

      {/* QR card */}
      <div style={{
        background: C.white,
        padding: 18,
        borderRadius: 14,
        boxShadow: '0 8px 30px rgba(59,3,102,0.18), 0 2px 6px rgba(59,3,102,0.08)',
        position: 'relative',
        border: `2px solid ${C.darkIndigo}`,
      }}>
        {/* Corner brackets — finder cues */}
        <CornerBrackets/>

        {/* The QR itself */}
        <svg width={qrSize} height={qrSize} viewBox={`0 0 ${qrSize} ${qrSize}`}
          style={{ display: 'block' }}
        >
          {matrix && matrix.mods.map((row, r) =>
            row.map((dark, c) => {
              if (!dark) return null;
              // Slight rounding on each module for warmth
              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * cell + 0.5}
                  y={r * cell + 0.5}
                  width={cell - 1}
                  height={cell - 1}
                  rx={cell * 0.22}
                  fill={C.darkIndigo}
                />
              );
            })
          )}
          {/* Center logo plate */}
          <g>
            <rect
              x={qrSize/2 - 18} y={qrSize/2 - 18}
              width={36} height={36} rx={7}
              fill={C.white}
              stroke={C.darkIndigo} strokeWidth={2}
            />
            <text
              x={qrSize/2} y={qrSize/2 + 2}
              textAnchor="middle"
              fontFamily="DM Sans, sans-serif"
              fontSize={10}
              fontWeight={800}
              fill={C.primaryRed}
              letterSpacing="0.04em"
            >COCO</text>
            <text
              x={qrSize/2} y={qrSize/2 + 12}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize={7}
              fontWeight={600}
              fill={C.darkIndigo}
            >36</text>
          </g>

          {/* Decorative scan line */}
          <rect
            x={0} y={scanY * qrSize - 1}
            width={qrSize} height={2}
            fill={C.primaryRed}
            opacity={0.35}
          />
        </svg>
      </div>

      {/* Caption below */}
      <div style={{
        marginTop: 14,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 18,
          fontWeight: 600,
          color: C.darkIndigo,
          letterSpacing: '-0.01em',
          fontStyle: 'italic',
        }}>
          Shop the harvest
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: C.mediumGray,
          letterSpacing: '0.12em',
          marginTop: 4,
          textTransform: 'uppercase',
        }}>
          coco36.com/shop
        </div>
      </div>
    </div>
  );
}

function CornerBrackets() {
  const c = C.primaryRed;
  const sz = 12;
  const w = 2;
  const off = -8;
  const cornerStyle = (corner) => ({
    position: 'absolute',
    width: sz, height: sz,
    [corner.includes('top') ? 'top' : 'bottom']: off,
    [corner.includes('left') ? 'left' : 'right']: off,
    borderColor: c,
    borderStyle: 'solid',
    borderWidth: 0,
    [`border${corner.includes('top') ? 'Top' : 'Bottom'}Width`]: w,
    [`border${corner.includes('left') ? 'Left' : 'Right'}Width`]: w,
  });
  return (
    <>
      <div style={cornerStyle('topleft')}/>
      <div style={cornerStyle('topright')}/>
      <div style={cornerStyle('bottomleft')}/>
      <div style={cornerStyle('bottomright')}/>
    </>
  );
}


// ── Icon: Cocoa Pod (Indonesia harvest) ─────────────────────────────────────
function CocoaPodIcon({ s = 1 }) {
  return (
    <svg width={90 * s} height={120 * s} viewBox="0 0 90 120">
      {/* Stem */}
      <path d="M 45 8 q 0 8 -6 14" stroke={C.charcoal} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="40" cy="20" rx="6" ry="3" fill={C.goldenAmber}/>
      {/* Pod body */}
      <ellipse cx="45" cy="65" rx="32" ry="48" fill={C.primaryRed}/>
      <ellipse cx="38" cy="60" rx="22" ry="42" fill={C.brightRed} opacity="0.5"/>
      {/* Ridges */}
      <path d="M 45 22 Q 40 65 45 110" stroke={C.berryPurple} strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M 30 28 Q 22 65 30 105" stroke={C.berryPurple} strokeWidth="2" fill="none" opacity="0.4"/>
      <path d="M 60 28 Q 68 65 60 105" stroke={C.berryPurple} strokeWidth="2" fill="none" opacity="0.4"/>
      <path d="M 22 38 Q 14 65 22 95" stroke={C.berryPurple} strokeWidth="1.5" fill="none" opacity="0.3"/>
      <path d="M 68 38 Q 76 65 68 95" stroke={C.berryPurple} strokeWidth="1.5" fill="none" opacity="0.3"/>
      {/* Highlight */}
      <ellipse cx="32" cy="48" rx="6" ry="14" fill={C.paleLemon} opacity="0.45"/>
      {/* Leaf */}
      <path d="M 50 12 q 14 -4 22 6 q -10 8 -22 -2 z" fill={C.goldenAmber}/>
    </svg>
  );
}

// ── Icon: Cargo Ship ────────────────────────────────────────────────────────
function ShipIcon({ s = 1 }) {
  return (
    <svg width={140 * s} height={100 * s} viewBox="0 0 140 100">
      {/* Hull */}
      <path d="M 8 60 L 132 60 L 120 88 L 20 88 Z" fill={C.primaryRed}/>
      <rect x="8" y="58" width="124" height="6" fill={C.brightRed}/>
      {/* Deck containers */}
      <rect x="20" y="32" width="22" height="26" fill={C.vibrantYellow}/>
      <rect x="44" y="32" width="22" height="26" fill={C.goldenAmber}/>
      <rect x="68" y="32" width="22" height="26" fill={C.paleLemon}/>
      <rect x="20" y="14" width="22" height="18" fill={C.softCoral}/>
      <rect x="68" y="14" width="22" height="18" fill={C.vibrantYellow}/>
      {/* Container ridges */}
      {[0,1,2,3].map(i => (
        <line key={i} x1={22+i*5} y1="32" x2={22+i*5} y2="58" stroke={C.charcoal} strokeWidth="0.5" opacity="0.3"/>
      ))}
      {/* Bridge */}
      <rect x="96" y="20" width="22" height="38" fill={C.cream}/>
      <rect x="100" y="26" width="6" height="6" fill={C.deepPurple}/>
      <rect x="108" y="26" width="6" height="6" fill={C.deepPurple}/>
      <rect x="100" y="36" width="6" height="6" fill={C.deepPurple}/>
      <rect x="108" y="36" width="6" height="6" fill={C.deepPurple}/>
      {/* Smokestack */}
      <rect x="118" y="14" width="6" height="20" fill={C.charcoal}/>
      <rect x="116" y="14" width="10" height="3" fill={C.primaryRed}/>
      {/* Hull windows */}
      <circle cx="30" cy="74" r="2.5" fill={C.cream}/>
      <circle cx="50" cy="74" r="2.5" fill={C.cream}/>
      <circle cx="70" cy="74" r="2.5" fill={C.cream}/>
      <circle cx="90" cy="74" r="2.5" fill={C.cream}/>
      <circle cx="110" cy="74" r="2.5" fill={C.cream}/>
    </svg>
  );
}

// ── Icon: Factory ───────────────────────────────────────────────────────────
function FactoryIcon({ s = 1, smokePhase = 0 }) {
  // smokePhase: 0..1, drives smoke billow
  const puffs = [0, 1, 2, 3].map(i => {
    const phase = (smokePhase * 4 + i * 0.7) % 4;
    const y = 14 - phase * 12;
    const o = phase < 0.3 ? phase / 0.3 : phase > 3 ? Math.max(0, 1 - (phase - 3) * 2) : 1 - (phase - 0.3) * 0.25;
    const r = 8 + phase * 3;
    return (
      <circle key={i} cx={62 + Math.sin(phase * 1.5) * 4} cy={y} r={r}
        fill={C.cream} opacity={Math.max(0, o) * 0.85}/>
    );
  });

  return (
    <svg width={130 * s} height={140 * s} viewBox="-10 -30 140 170">
      {/* Smoke (above smokestack) */}
      {puffs}
      {/* Smokestack */}
      <rect x="56" y="16" width="14" height="48" fill={C.softCoral}/>
      <rect x="54" y="14" width="18" height="6" fill={C.primaryRed}/>
      {/* Stack bands */}
      <rect x="56" y="28" width="14" height="3" fill={C.charcoal}/>
      <rect x="56" y="44" width="14" height="3" fill={C.charcoal}/>
      {/* Main building */}
      <rect x="20" y="64" width="80" height="64" fill={C.vibrantYellow}/>
      {/* Sawtooth roof */}
      <path d="M 20 64 L 32 50 L 44 64 L 56 50 L 68 64 L 80 50 L 92 64 L 100 64 L 100 64 Z" fill={C.goldenAmber}/>
      {/* Windows on roof slants */}
      <rect x="35" y="56" width="6" height="6" fill={C.deepPurple}/>
      <rect x="59" y="56" width="6" height="6" fill={C.deepPurple}/>
      <rect x="83" y="56" width="6" height="6" fill={C.deepPurple}/>
      {/* Door */}
      <rect x="54" y="100" width="18" height="28" fill={C.primaryRed}/>
      <rect x="62" y="112" width="2" height="4" fill={C.vibrantYellow}/>
      {/* Windows */}
      <rect x="28" y="78" width="14" height="10" fill={C.deepPurple}/>
      <rect x="80" y="78" width="14" height="10" fill={C.deepPurple}/>
      <line x1="35" y1="78" x2="35" y2="88" stroke={C.vibrantYellow} strokeWidth="1"/>
      <line x1="87" y1="78" x2="87" y2="88" stroke={C.vibrantYellow} strokeWidth="1"/>
      {/* Side annex */}
      <rect x="0" y="86" width="22" height="42" fill={C.softCoral}/>
      <rect x="4" y="92" width="14" height="10" fill={C.deepPurple}/>
      <rect x="4" y="108" width="14" height="10" fill={C.deepPurple}/>
      {/* Crates outside */}
      <rect x="100" y="112" width="20" height="16" fill={C.goldenAmber}/>
      <rect x="100" y="112" width="20" height="3" fill={C.charcoal} opacity="0.3"/>
      <line x1="110" y1="112" x2="110" y2="128" stroke={C.charcoal} strokeWidth="0.6" opacity="0.4"/>
    </svg>
  );
}

// ── Icon: Truck ─────────────────────────────────────────────────────────────
function TruckIcon({ s = 1 }) {
  return (
    <svg width={140 * s} height={92 * s} viewBox="0 0 140 92">
      {/* Cargo box */}
      <rect x="6" y="22" width="80" height="48" fill={C.primaryRed}/>
      <rect x="6" y="22" width="80" height="6" fill={C.brightRed}/>
      {/* Box panels */}
      <line x1="26" y1="28" x2="26" y2="70" stroke={C.berryPurple} strokeWidth="1" opacity="0.4"/>
      <line x1="46" y1="28" x2="46" y2="70" stroke={C.berryPurple} strokeWidth="1" opacity="0.4"/>
      <line x1="66" y1="28" x2="66" y2="70" stroke={C.berryPurple} strokeWidth="1" opacity="0.4"/>
      {/* COCO logo on side */}
      <rect x="32" y="42" width="28" height="14" fill={C.cream}/>
      <text x="46" y="53" fontFamily="DM Sans, sans-serif" fontSize="10" fontWeight="700"
        fill={C.deepPurple} textAnchor="middle">COCO36</text>
      {/* Cab */}
      <path d="M 86 40 L 86 70 L 134 70 L 134 50 L 122 36 L 96 36 Q 86 36 86 40 Z" fill={C.vibrantYellow}/>
      {/* Windshield */}
      <path d="M 100 42 L 120 42 L 130 54 L 100 54 Z" fill={C.deepPurple} opacity="0.85"/>
      <path d="M 102 44 L 118 44 L 124 52 L 102 52 Z" fill={C.softCoral} opacity="0.3"/>
      {/* Cab door */}
      <rect x="92" y="56" width="6" height="12" fill={C.goldenAmber}/>
      {/* Wheels */}
      <circle cx="24" cy="74" r="10" fill={C.charcoal}/>
      <circle cx="24" cy="74" r="4" fill={C.cream}/>
      <circle cx="62" cy="74" r="10" fill={C.charcoal}/>
      <circle cx="62" cy="74" r="4" fill={C.cream}/>
      <circle cx="112" cy="74" r="10" fill={C.charcoal}/>
      <circle cx="112" cy="74" r="4" fill={C.cream}/>
      {/* Headlight */}
      <circle cx="132" cy="62" r="3" fill={C.paleLemon}/>
      {/* Bumper */}
      <rect x="128" y="64" width="6" height="8" fill={C.charcoal}/>
    </svg>
  );
}

// ── Icon: Tractor (Sulawesi farm — first leg) ───────────────────────────────
function TractorIcon({ s = 1 }) {
  return (
    <svg width={120 * s} height={100 * s} viewBox="0 0 120 100">
      {/* Cargo trailer */}
      <rect x="4" y="40" width="50" height="34" fill={C.softCoral}/>
      <rect x="4" y="40" width="50" height="5" fill={C.brightRed}/>
      {/* Cocoa beans piled on trailer */}
      <ellipse cx="14" cy="40" rx="4" ry="3" fill={C.berryPurple}/>
      <ellipse cx="22" cy="38" rx="4" ry="3" fill={C.deepPurple}/>
      <ellipse cx="30" cy="39" rx="4" ry="3" fill={C.berryPurple}/>
      <ellipse cx="38" cy="38" rx="4" ry="3" fill={C.deepPurple}/>
      <ellipse cx="46" cy="40" rx="4" ry="3" fill={C.berryPurple}/>
      <ellipse cx="18" cy="36" rx="3.5" ry="2.5" fill={C.darkIndigo}/>
      <ellipse cx="28" cy="35" rx="3.5" ry="2.5" fill={C.darkIndigo}/>
      <ellipse cx="40" cy="36" rx="3.5" ry="2.5" fill={C.darkIndigo}/>
      {/* Hitch */}
      <rect x="54" y="60" width="10" height="4" fill={C.charcoal}/>
      {/* Cab body */}
      <path d="M 64 38 L 64 76 L 110 76 L 110 56 L 102 50 L 102 38 Q 102 34 98 34 L 68 34 Q 64 34 64 38 Z" fill={C.vibrantYellow}/>
      {/* Cab roof */}
      <rect x="68" y="30" width="32" height="6" fill={C.goldenAmber}/>
      {/* Windshield */}
      <path d="M 70 38 L 100 38 L 100 50 L 70 50 Z" fill={C.deepPurple} opacity="0.85"/>
      <path d="M 72 40 L 98 40 L 98 48 L 72 48 Z" fill={C.softCoral} opacity="0.3"/>
      {/* Exhaust pipe */}
      <rect x="66" y="22" width="4" height="14" fill={C.charcoal}/>
      <ellipse cx="68" cy="22" rx="3" ry="1.5" fill={C.charcoal}/>
      {/* Front big wheel */}
      <circle cx="96" cy="78" r="14" fill={C.charcoal}/>
      <circle cx="96" cy="78" r="6" fill={C.cream}/>
      <circle cx="96" cy="78" r="2" fill={C.charcoal}/>
      {/* Rear small wheels (trailer) */}
      <circle cx="16" cy="78" r="8" fill={C.charcoal}/>
      <circle cx="16" cy="78" r="3" fill={C.cream}/>
      <circle cx="40" cy="78" r="8" fill={C.charcoal}/>
      <circle cx="40" cy="78" r="3" fill={C.cream}/>
      {/* Tractor small front wheel */}
      <circle cx="72" cy="78" r="8" fill={C.charcoal}/>
      <circle cx="72" cy="78" r="3" fill={C.cream}/>
      {/* Headlight */}
      <circle cx="108" cy="60" r="2.5" fill={C.paleLemon}/>
    </svg>
  );
}

// ── Icon: Port crane (India port — receiving leg) ──────────────────────────
function PortIcon({ s = 1 }) {
  return (
    <svg width={130 * s} height={130 * s} viewBox="0 0 130 130">
      {/* Dock base */}
      <rect x="0" y="110" width="130" height="20" fill={C.charcoal}/>
      <line x1="0" y1="114" x2="130" y2="114" stroke={C.paleLemon} strokeWidth="1" opacity="0.5"/>
      {/* Crane vertical pillar */}
      <rect x="24" y="30" width="10" height="82" fill={C.softCoral}/>
      <rect x="22" y="28" width="14" height="4" fill={C.brightRed}/>
      {/* Cross-bracing */}
      <line x1="24" y1="40" x2="34" y2="50" stroke={C.berryPurple} strokeWidth="1.5" opacity="0.6"/>
      <line x1="24" y1="60" x2="34" y2="70" stroke={C.berryPurple} strokeWidth="1.5" opacity="0.6"/>
      <line x1="24" y1="80" x2="34" y2="90" stroke={C.berryPurple} strokeWidth="1.5" opacity="0.6"/>
      <line x1="34" y1="40" x2="24" y2="50" stroke={C.berryPurple} strokeWidth="1.5" opacity="0.6"/>
      <line x1="34" y1="60" x2="24" y2="70" stroke={C.berryPurple} strokeWidth="1.5" opacity="0.6"/>
      <line x1="34" y1="80" x2="24" y2="90" stroke={C.berryPurple} strokeWidth="1.5" opacity="0.6"/>
      {/* Horizontal arm */}
      <rect x="34" y="34" width="82" height="8" fill={C.vibrantYellow}/>
      <rect x="34" y="32" width="82" height="3" fill={C.goldenAmber}/>
      {/* Counterweight (left of pillar) */}
      <rect x="10" y="32" width="14" height="12" fill={C.charcoal}/>
      {/* Cable + hook */}
      <line x1="96" y1="42" x2="96" y2="82" stroke={C.charcoal} strokeWidth="1.5"/>
      <rect x="88" y="82" width="16" height="14" fill={C.softCoral}/>
      <rect x="88" y="82" width="16" height="3" fill={C.brightRed}/>
      {/* Stacked containers on dock */}
      <rect x="54" y="96" width="24" height="14" fill={C.goldenAmber}/>
      <rect x="78" y="96" width="24" height="14" fill={C.paleLemon}/>
      <rect x="42" y="82" width="24" height="14" fill={C.vibrantYellow}/>
      <rect x="66" y="82" width="24" height="14" fill={C.softCoral}/>
      {/* Container ridges */}
      {[0,1,2,3].map(i => (
        <line key={'r1'+i} x1={56+i*5} y1="96" x2={56+i*5} y2="110" stroke={C.charcoal} strokeWidth="0.5" opacity="0.3"/>
      ))}
      {[0,1,2,3].map(i => (
        <line key={'r2'+i} x1={80+i*5} y1="96" x2={80+i*5} y2="110" stroke={C.charcoal} strokeWidth="0.5" opacity="0.3"/>
      ))}
      {/* Operator cab */}
      <rect x="40" y="42" width="10" height="10" fill={C.deepPurple}/>
    </svg>
  );
}

// ── Icon: Bakery (Hyderabad destination) ────────────────────────────────────
function BakeryIcon({ s = 1 }) {
  return (
    <svg width={120 * s} height={130 * s} viewBox="0 0 120 130">
      {/* Awning shadow */}
      <rect x="8" y="40" width="104" height="84" fill={C.softCoral}/>
      {/* Storefront */}
      <rect x="12" y="44" width="96" height="80" fill={C.cream}/>
      {/* Awning stripes */}
      <path d="M 6 30 L 114 30 L 110 46 L 10 46 Z" fill={C.primaryRed}/>
      <path d="M 18 30 L 26 46 L 34 30 Z" fill={C.cream}/>
      <path d="M 42 30 L 50 46 L 58 30 Z" fill={C.cream}/>
      <path d="M 66 30 L 74 46 L 82 30 Z" fill={C.cream}/>
      <path d="M 90 30 L 98 46 L 106 30 Z" fill={C.cream}/>
      {/* Sign */}
      <rect x="20" y="14" width="80" height="18" fill={C.deepPurple}/>
      <text x="60" y="27" fontFamily="DM Sans, sans-serif" fontSize="11" fontWeight="700"
        fill={C.paleLemon} textAnchor="middle">BAKERY</text>
      {/* Window */}
      <rect x="20" y="56" width="40" height="44" fill={C.deepPurple} opacity="0.85"/>
      <line x1="40" y1="56" x2="40" y2="100" stroke={C.cream} strokeWidth="1.5" opacity="0.6"/>
      <line x1="20" y1="78" x2="60" y2="78" stroke={C.cream} strokeWidth="1.5" opacity="0.6"/>
      {/* Cake on display */}
      <ellipse cx="30" cy="72" rx="6" ry="2" fill={C.goldenAmber}/>
      <rect x="24" y="68" width="12" height="6" fill={C.primaryRed}/>
      <circle cx="30" cy="68" r="2" fill={C.vibrantYellow}/>
      {/* Bread loaves */}
      <ellipse cx="50" cy="92" rx="6" ry="3" fill={C.goldenAmber}/>
      <ellipse cx="50" cy="91" rx="5" ry="2" fill={C.paleLemon} opacity="0.7"/>
      {/* Door */}
      <rect x="68" y="56" width="32" height="68" fill={C.berryPurple}/>
      <rect x="72" y="60" width="24" height="40" fill={C.deepPurple} opacity="0.7"/>
      <line x1="84" y1="60" x2="84" y2="100" stroke={C.cream} strokeWidth="1" opacity="0.5"/>
      <circle cx="94" cy="92" r="1.5" fill={C.vibrantYellow}/>
      {/* Door step */}
      <rect x="64" y="120" width="40" height="4" fill={C.charcoal} opacity="0.4"/>
    </svg>
  );
}

// ── Location pin marker ─────────────────────────────────────────────────────
function PinMarker({ angle, label, color = C.vibrantYellow, sublabel, liftY = 14 }) {
  const p = ridePoint(angle);
  return (
    <div style={{
      position: 'absolute',
      left: p.x, top: p.y - liftY,
      transform: 'translate(-50%, -100%)',
      pointerEvents: 'none',
      zIndex: 20,
    }}>
      {/* Spec-compliant pill: dark bg + white text + yellow border + square radius */}
      <div style={{
        background: 'rgba(30, 8, 60, 0.85)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        color: '#FFFFFF',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '0.04em',
        padding: '4px 10px',
        borderRadius: 5,
        border: `1px solid ${C.vibrantYellow}80`,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}>
        {label}
        {sublabel && (
          <span style={{
            fontWeight: 400,
            color: '#F5C842D9',
            fontSize: 10,
            letterSpacing: '0.03em',
          }}>
            · {sublabel}
          </span>
        )}
      </div>
      {/* Connector line down to globe */}
      <div style={{
        width: 1, height: 22,
        margin: '0 auto',
        background: `linear-gradient(to bottom, ${C.vibrantYellow}99, ${C.vibrantYellow}00)`,
      }}/>
    </div>
  );
}

// Animated pin that pops in then stays
function PoppingPin({ start, hold = 1.5, ...props }) {
  const t = useTime();
  if (t < start) return null;
  const local = t - start;
  let scale = 1, opacity = 1;
  if (local < 0.4) {
    const e = Easing.easeOutBack(local / 0.4);
    scale = 0.3 + 0.7 * e;
    opacity = local / 0.4;
  }
  // Lift bob
  const bob = Math.sin(local * 4) * 1.5;
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      transform: `translateY(${bob - 4}px) scale(${scale})`,
      opacity,
      transformOrigin: 'center bottom',
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      <PinMarker {...props} />
    </div>
  );
}

// ── Trail of dashes that draws along the arc as the rider moves ─────────────
function ArcTrail({ start, end, fromAngle, toAngle, color = C.vibrantYellow }) {
  const t = useTime();
  if (t < start) return null;

  const local = clamp((t - start) / (end - start), 0, 1);
  const eased = Easing.easeInOutCubic(local);
  const currentAngle = fromAngle + (toAngle - fromAngle) * eased;

  // Draw an arc path from fromAngle to currentAngle
  const startPt = polar(fromAngle, RIDE_R);
  const endPt = polar(currentAngle, RIDE_R);
  const sweep = currentAngle > fromAngle ? 1 : 0;
  const largeArc = Math.abs(currentAngle - fromAngle) > 180 ? 1 : 0;

  return (
    <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <path
        d={`M ${startPt.x} ${startPt.y} A ${RIDE_R} ${RIDE_R} 0 ${largeArc} ${sweep} ${endPt.x} ${endPt.y}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray="2 8"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

// ── Ocean wave hint behind ship ─────────────────────────────────────────────
function ShipWake({ atAngle, start, end }) {
  const t = useTime();
  if (t < start || t > end) return null;
  const local = (t - start) / (end - start);
  const eased = Easing.easeInOutCubic(local);
  // Anchored at fromAngle, sliding pos
  // Caller passes a function for atAngle? simpler: just pass current angle.
  const p = ridePoint(atAngle);
  // 3 small wake puffs trailing
  return (
    <>
      {[0, 1, 2].map(i => {
        const offset = (i + 1) * 18;
        const o = 0.4 - i * 0.1;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: p.x - offset, top: p.y - 10,
            width: 14 - i * 3, height: 4,
            background: C.cream,
            borderRadius: 999,
            opacity: o,
            transform: 'translate(-50%, 0)',
          }}/>
        );
      })}
    </>
  );
}

// ── Title overlay (intro + outro) ───────────────────────────────────────────
function Title() {
  const t = useTime();

  // Intro sprites disabled — the hero already shows the brand tagline and
  // "36 Steps" label as React components outside the iframe, so we don't
  // duplicate that messaging inside the animation loop.
  return (
    <>
      {/* Step counter overlay top-right */}
      <StepCounter />

      {/* Final tagline */}
      <Sprite start={6.4} end={8.0}>
        <div style={{
          position: 'absolute',
          right: 80, top: 90,
          textAlign: 'right',
        }}>
          <FadeSlide>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              letterSpacing: '0.2em',
              color: C.vibrantYellow,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              ─── SHIPPED 26 APR
            </div>
            <div style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 56,
              fontWeight: 600,
              color: C.cream,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}>
              Origin,<br/>
              <span style={{ color: C.vibrantYellow, fontStyle: 'italic' }}>delivered.</span>
            </div>
          </FadeSlide>
        </div>
      </Sprite>
    </>
  );
}

function FadeSlide({ children, delay = 0 }) {
  const { localTime } = useSprite();
  const t = clamp((localTime - delay) / 0.4, 0, 1);
  const eased = Easing.easeOutCubic(t);
  return (
    <span style={{
      display: 'inline-block',
      opacity: eased,
      transform: `translateY(${(1 - eased) * 14}px)`,
    }}>
      {children}
    </span>
  );
}

// Step counter — counts up across animation
function StepCounter() {
  const t = useTime();
  // Fade in 0.3 → 0.7s, fade out 7.4 → 8.0s
  let opacity = 1;
  if (t < 0.3) opacity = 0;
  else if (t < 0.7) opacity = (t - 0.3) / 0.4;
  else if (t > 7.4) opacity = clamp(1 - (t - 7.4) / 0.6, 0, 1);

  // Step counter: 1 → 36 across 0.6 → 7.4s
  const progress = clamp((t - 0.6) / (7.4 - 0.6), 0, 1);
  const step = Math.floor(1 + progress * 35);

  return (
    <div style={{
      position: 'absolute',
      right: 60, bottom: 60,
      opacity,
      fontFamily: 'JetBrains Mono, monospace',
      color: C.cream,
      textAlign: 'right',
    }}>
      <div style={{
        fontSize: 12, letterSpacing: '0.2em',
        color: C.paleLemon, opacity: 0.7,
        marginBottom: 4,
        textTransform: 'uppercase',
      }}>
        STEP
      </div>
      <div style={{
        fontFamily: 'Fraunces, serif',
        fontSize: 72,
        fontWeight: 600,
        color: C.vibrantYellow,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {String(step).padStart(2, '0')}<span style={{ color: C.softCoral, opacity: 0.5 }}>/36</span>
      </div>
    </div>
  );
}

// ── Stage label updater for comments ────────────────────────────────────────
function ScreenLabel() {
  const t = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-screen-label]');
    if (root) {
      const sec = Math.floor(t);
      root.setAttribute('data-screen-label', `t=${sec}s`);
    }
  }, [Math.floor(t)]);
  return null;
}

// ── Main scene: the supply chain choreography ───────────────────────────────
//
// Choreography across 8s — 6 stages on the arc.
// Angles: -180=left, -90=top, 0=right.
//
//   Sulawesi pin       : parked  -158        (pops 0.3s)
//   Cocoa pod harvest  : -158 → -135  (0.5s → 1.4s)
//   TRACTOR farm→port  : -135 → -110  (1.4s → 2.4s)
//   FACTORY (process)  : parked at -90       (pops 2.0s, smoke after)
//   SHIP   port→port   : -110 → -55   (3.0s → 4.4s)   passes under factory at top
//   INDIA PORT (crane) : parked at -45       (pops 4.2s)
//   TRUCK  port→bakery : -45 → -22   (5.0s → 6.4s)
//   BAKERY destination : parked at -18       (pops 6.2s)
//   Hyderabad pin      : parked  -18         (pops 6.5s)
//
function Scene() {
  const t = useTime();
  // Smoke begins when factory appears
  const smokeActive = t > 2.0;
  const smokePhase = smokeActive ? ((t - 2.0) * 0.4) % 1 : 0;

  return (
    <>
      <SkyBackground />
      <Globe />

      {/* Origin & destination pins — yellow with deep-purple text */}
      <PoppingPin start={0.3} angle={-158} label="Sulawesi" sublabel="Indonesia" color={C.vibrantYellow} liftY={140}/>
      <PoppingPin start={6.5} angle={-18} label="Hyderabad" sublabel="India" color={C.vibrantYellow} liftY={150}/>

      {/* Trails — one per leg, color-coded.
         Stage layout (5 parked stages, equally-spread):
            Sulawesi origin  -158
            Factory (ID)     -130
            Port Indonesia   -100   (with flag)
            Port India        -55   (with flag)
            Bakery (Hyderabad) -18
       */}
      <ArcTrail start={0.5} end={1.4} fromAngle={-158} toAngle={-132} color={C.softCoral}/>
      <ArcTrail start={2.4} end={3.3} fromAngle={-130} toAngle={-102} color={C.goldenAmber}/>
      <ArcTrail start={3.5} end={4.8} fromAngle={-100} toAngle={-57}  color={C.paleLemon}/>
      <ArcTrail start={5.3} end={6.3} fromAngle={-55}  toAngle={-20}  color={C.softCoral}/>

      {/* Sulawesi cocoa grove — cluster of cocoa trees behind the harvest pod */}
      <CocoaGrove />

      {/* Stage 1 — COCOA POD (harvest moves out of grove → toward factory; vanishes on arrival) */}
      <ArcRider start={0.5} end={1.4} fromAngle={-158} toAngle={-132} size={0.9}>
        <CocoaPodIcon s={0.9}/>
      </ArcRider>

      {/* Stage 2 — FACTORY (Indonesia, processing the beans) */}
      <ArcRider start={1.6} end={DUR} fromAngle={-130} toAngle={-130}
        parkAtEnd={true} size={1.05}>
        <Sprite start={1.6} end={DUR}>
          <FactoryAppear smokePhase={smokePhase} />
        </Sprite>
      </ArcRider>

      {/* Stage 3 — TRACTOR (factory → Indonesia port) */}
      <ArcRider start={2.4} end={3.3} fromAngle={-130} toAngle={-102} size={0.9}
        parkAtEnd={true} shrinkParkScale={0.7}>
        <TractorIcon s={0.9}/>
      </ArcRider>

      {/* Stage 4 — PORT INDONESIA (with Indonesian flag) */}
      <ArcRider start={3.0} end={DUR} fromAngle={-100} toAngle={-100}
        parkAtEnd={true} size={0.85}>
        <Sprite start={3.0} end={DUR}>
          <PortAppear flag="indonesia"/>
        </Sprite>
      </ArcRider>

      {/* Stage 5 — SHIP (port Indonesia → port India, sea voyage; vanishes on arrival) */}
      <ArcRider start={3.5} end={4.8} fromAngle={-100} toAngle={-57} size={1}>
        <ShipIcon s={1}/>
      </ArcRider>

      {/* Stage 6 — PORT INDIA (with Indian flag) */}
      <ArcRider start={4.6} end={DUR} fromAngle={-55} toAngle={-55}
        parkAtEnd={true} size={0.85}>
        <Sprite start={4.6} end={DUR}>
          <PortAppear flag="india"/>
        </Sprite>
      </ArcRider>

      {/* Stage 7 — TRUCK (port India → bakery, last mile; vanishes on arrival) */}
      <ArcRider start={5.3} end={6.3} fromAngle={-55} toAngle={-20} size={0.85}>
        <TruckIcon s={0.85}/>
      </ArcRider>

      {/* Stage 7 — BAKERY (final destination) */}
      <ArcRider start={6.2} end={DUR} fromAngle={-18} toAngle={-18}
        parkAtEnd={true} pulse={true} size={1}>
        <Sprite start={6.2} end={DUR}>
          <BakeryAppear />
        </Sprite>
      </ArcRider>

      <Title />
      <QRCodeBadge />
      <ScreenLabel />
    </>
  );
}

function PortAppear({ flag }) {
  const { localTime } = useSprite();
  const t = clamp(localTime / 0.4, 0, 1);
  const e = Easing.easeOutBack(t);
  return (
    <div style={{
      transform: `scale(${0.4 + 0.6 * e}) translateY(${(1 - e) * 14}px)`,
      transformOrigin: 'center bottom',
      opacity: t,
      position: 'relative',
    }}>
      <PortIcon s={1}/>
      {flag && (
        <div style={{
          position: 'absolute',
          top: -6, left: 14,
        }}>
          <FlagIcon kind={flag}/>
        </div>
      )}
    </div>
  );
}

// ── Country flag on a flagpole (mini, for ports) ──────────────────────────
function FlagIcon({ kind }) {
  // Two horizontal bands, on a small pole
  const w = 22, h = 14;
  return (
    <svg width="30" height="44" viewBox="0 0 30 44" style={{ display: 'block' }}>
      {/* Pole */}
      <rect x="2" y="2" width="2" height="40" fill={C.cream}/>
      {/* Knob */}
      <circle cx="3" cy="2" r="2" fill={C.vibrantYellow}/>
      {/* Flag */}
      {kind === 'indonesia' && (
        <g>
          <rect x="4" y="4" width={w} height={h/2} fill="#ce1126"/>
          <rect x="4" y={4 + h/2} width={w} height={h/2} fill={C.cream}/>
          <rect x="4" y="4" width={w} height={h} fill="none" stroke={C.darkIndigo} strokeWidth="0.5"/>
        </g>
      )}
      {kind === 'india' && (
        <g>
          <rect x="4" y="4" width={w} height={h/3} fill="#ff9933"/>
          <rect x="4" y={4 + h/3} width={w} height={h/3} fill={C.cream}/>
          <rect x="4" y={4 + 2*h/3} width={w} height={h/3} fill="#138808"/>
          {/* tiny chakra */}
          <circle cx={4 + w/2} cy={4 + h/2} r="1.6" fill="none" stroke="#000080" strokeWidth="0.5"/>
          <rect x="4" y="4" width={w} height={h} fill="none" stroke={C.darkIndigo} strokeWidth="0.5"/>
        </g>
      )}
      {/* Subtle wave shadow under flag */}
      <path d={`M 4 ${4+h+1} L ${4+w} ${4+h+1}`} stroke={C.darkIndigo} strokeWidth="0.8" opacity="0.3"/>
    </svg>
  );
}

// Wrappers that handle entry pop for parked icons
function FactoryAppear({ smokePhase }) {
  const { localTime } = useSprite();
  const t = clamp(localTime / 0.4, 0, 1);
  const e = Easing.easeOutBack(t);
  return (
    <div style={{
      transform: `scale(${0.4 + 0.6 * e}) translateY(${(1 - e) * 12}px)`,
      transformOrigin: 'center bottom',
      opacity: t,
    }}>
      <FactoryIcon s={1.05} smokePhase={smokePhase}/>
    </div>
  );
}

function BakeryAppear() {
  const { localTime } = useSprite();
  const t = clamp(localTime / 0.4, 0, 1);
  const e = Easing.easeOutBack(t);
  // Subtle bob after entry
  const bob = localTime > 0.4 ? Math.sin((localTime - 0.4) * 3) * 1.5 : 0;
  return (
    <div style={{
      transform: `scale(${0.3 + 0.7 * e}) translateY(${(1 - e) * 18 + bob}px)`,
      transformOrigin: 'center bottom',
      opacity: t,
    }}>
      <BakeryIcon s={1}/>
    </div>
  );
}

// ── Mount ───────────────────────────────────────────────────────────────────
// Production embed: no playback chrome, transparent background, auto-loop.
// (The original `Stage` component is preserved in the design folder.)
function CleanStage({ children }) {
  const [time, setTime] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const wrapRef = React.useRef(null);

  // Auto-loop timeline at 60fps
  React.useEffect(() => {
    let raf, last;
    const step = (ts) => {
      if (last == null) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      setTime((t) => (t + dt) % DUR);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Contain-fit, centered. The whole 1280×720 canvas stays visible; the
  // hero gradient fills any letterbox space. Outer React wrapper applies
  // an additional 0.85 scale for breathing room.
  React.useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = wrapRef.current.clientHeight;
      setScale(Math.min(w / STAGE_W, h / STAGE_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  return (
    <TimelineContext.Provider value={{ time, duration: DUR, playing: true }}>
      <div ref={wrapRef} style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        background: 'transparent',
      }}>
        <div style={{
          width: STAGE_W, height: STAGE_H,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          overflow: 'visible',
        }}>
          {children}
        </div>
      </div>
    </TimelineContext.Provider>
  );
}

function App() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <CleanStage>
        <Scene />
      </CleanStage>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
