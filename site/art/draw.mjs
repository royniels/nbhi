// Draws the hero artwork of the site as SVG files, a day and a night version of
// every layer. Run it with `npm run art` after changing anything here. The
// random numbers are seeded, so every run draws exactly the same picture.

import { writeFileSync } from 'node:fs';
import path from 'node:path';

const palettes = {
  day: {
    canopy: {
      back: ['#2c6a3e', '#317544', '#38804a', '#28623a'],
      mid: ['#3f8f3f', '#4a9c42', '#56a847', '#3a853b'],
      front: ['#62b444', '#73c250', '#88cf5a', '#a2dc68', '#58a63e'],
      stem: { back: '#255a33', mid: '#3b6a2e', front: '#6a8f36' },
    },
    cloud: { light: '#ffffff', mid: '#f4f8fe', shade: '#cddbee', base: '#b8cbe6', far: 0.9 },
    bird: '#2f3550',
    island: {
      volcanoFar: ['#a9c7e0', '#d6e9f7'],
      volcanoNear: ['#8db1d1', '#c4ddf1'],
      front: ['#5f87ae', '#98bbd8'], frontShadow: '#3f6488', frontLight: '#d3e5f3',
      beach: '#f6e4b6', surf: '#ffffff',
    },
    sea: { horizon: '#1a5fc4', middle: '#1b8bd2', near: '#1fc0cb', shallow: '#5fe3d3', glint: '#ffffff', reflection: '#164f9e' },
    shore: { foam: '#ffffff', wet: '#dcc188', sand: '#f6e3b3', paper: '#fbf7ee' },
  },
  night: {
    canopy: {
      back: ['#0d1b1f', '#102125', '#12262a', '#0c191c'],
      mid: ['#152c2b', '#18322f', '#1b3833', '#132827'],
      front: ['#1f4137', '#23493c', '#285142', '#2e5948', '#1c3b32'],
      stem: { back: '#0b1618', mid: '#11221f', front: '#18302a' },
    },
    cloud: { light: '#6a70ab', mid: '#4a4f88', shade: '#353a70', base: '#2a2e5e', far: 0.8 },
    moon: { disc: '#f1ecd2', glow: '#8f95c9' },
    moonPath: true,
    bird: '#aeb2e6',
    island: {
      volcanoFar: ['#232e57', '#2a3560'],
      volcanoNear: ['#1e284f', '#26315b'],
      front: ['#19223f', '#202b50'], frontShadow: '#0e1530', frontLight: '#46548a',
      beach: '#26304f', surf: '#c9d8ee',
    },
    sea: { horizon: '#1a2a5c', middle: '#1c3364', near: '#214479', shallow: '#2b5a86', glint: '#c9cbf6', reflection: '#121e45' },
    shore: { foam: '#c9d8ee', wet: '#1d2642', sand: '#26304f', paper: '#0f1830' },
  },
};

const folder = import.meta.dirname;

for (const [theme, colors] of Object.entries(palettes)) {
  write(`canopy-${ theme }.svg`, drawCanopy(colors));
  write(`clouds-${ theme }.svg`, drawClouds(colors));
  write(`coast-${ theme }.svg`, drawCoast(colors, theme));
}
write('stars.svg', drawStars());

function write(name, content) {
  writeFileSync(path.join(folder, name), content);
  console.log(`${ name } ${ Math.round(content.length / 1024) } kB`);
}

function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function svg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ width } ${ height }" width="${ width }" height="${ height }">${ content }</svg>\n`;
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

// Palm fronds hanging from above: a curved stem with tapered leaflets on both
// sides that droop under their own weight
function drawCanopy(colors) {
  const random = seeded(11);
  const width = 1600;
  const height = 560;
  const lift = 140;
  const fronds = [
    { x: -60, y: -60, angle: 30, length: 560, layer: 'back' },
    { x: -40, y: -90, angle: 58, length: 520, layer: 'back' },
    { x: 120, y: -120, angle: 76, length: 430, layer: 'back' },
    { x: 610, y: -175, angle: 82, length: 300, layer: 'back' },
    { x: 800, y: -185, angle: 97, length: 290, layer: 'back' },
    { x: 1230, y: -150, angle: 108, length: 390, layer: 'back' },
    { x: 1640, y: -90, angle: 122, length: 520, layer: 'back' },
    { x: 1660, y: -60, angle: 150, length: 560, layer: 'back' },
    { x: -80, y: -40, angle: 14, length: 600, layer: 'mid' },
    { x: -60, y: -120, angle: 44, length: 600, layer: 'mid' },
    { x: 60, y: -150, angle: 68, length: 480, layer: 'mid' },
    { x: 300, y: -180, angle: 84, length: 350, layer: 'mid' },
    { x: 930, y: -200, angle: 108, length: 280, layer: 'mid' },
    { x: 1540, y: -150, angle: 112, length: 480, layer: 'mid' },
    { x: 1660, y: -120, angle: 136, length: 600, layer: 'mid' },
    { x: 1680, y: -40, angle: 166, length: 600, layer: 'mid' },
    { x: -100, y: -20, angle: 22, length: 640, layer: 'front' },
    { x: -90, y: -110, angle: 50, length: 640, layer: 'front' },
    { x: 180, y: -210, angle: 80, length: 380, layer: 'front' },
    { x: 1420, y: -210, angle: 100, length: 380, layer: 'front' },
    { x: 1690, y: -110, angle: 130, length: 640, layer: 'front' },
    { x: 1700, y: -20, angle: 158, length: 640, layer: 'front' },
  ];

  const content = ['back', 'mid', 'front'].map(layer => {
    return fronds.filter(frond => frond.layer === layer).map(frond => drawFrond({ ...frond, y: frond.y - lift })).join('');
  }).join('');

  return svg(width, height, content);

  function drawFrond({ x, y, angle, length, layer }) {
    const radians = angle * Math.PI / 180;
    const direction = [Math.cos(radians), Math.sin(radians)];
    const points = [
      [x, y],
      [x + direction[0] * length * 0.4, y + direction[1] * length * 0.4],
      [x + direction[0] * length * 0.75, y + direction[1] * length * 0.75 + length * 0.16],
      [x + direction[0] * length * 0.9, y + direction[1] * length * 0.9 + length * 0.4],
    ];
    const leaflets = new Map();
    const count = Math.round(length / 11);

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      const t = 0.1 + 0.9 * progress;
      const [pointX, pointY] = bezier(points, t);
      const [tangentX, tangentY] = bezierTangent(points, t);
      const profile = Math.sin(Math.PI * Math.pow(progress, 0.7));
      const leafLength = length * 0.36 * (0.2 + 0.8 * profile) * (0.85 + random() * 0.3);

      for (const side of [-1, 1]) {
        const spread = (62 - 32 * t + (random() - 0.5) * 14) * Math.PI / 180 * side;
        const leafX = tangentX * Math.cos(spread) - tangentY * Math.sin(spread);
        const leafY = tangentX * Math.sin(spread) + tangentY * Math.cos(spread);
        const end = [pointX + leafX * leafLength, pointY + leafY * leafLength + leafLength * (0.35 + random() * 0.25)];
        const control = [pointX + leafX * leafLength * 0.55, pointY + leafY * leafLength * 0.55];
        const chordX = end[0] - pointX;
        const chordY = end[1] - pointY;
        const chord = Math.hypot(chordX, chordY) || 1;
        const normal = [-chordY / chord, chordX / chord];
        const leafWidth = leafLength * 0.07 + 1.2;
        const d = `M${ round(pointX) } ${ round(pointY) }`
          + `Q${ round(control[0] + normal[0] * leafWidth) } ${ round(control[1] + normal[1] * leafWidth) } ${ round(end[0]) } ${ round(end[1]) }`
          + `Q${ round(control[0] - normal[0] * leafWidth) } ${ round(control[1] - normal[1] * leafWidth) } ${ round(pointX) } ${ round(pointY) }Z`;
        const color = pick(random, colors.canopy[layer]);
        leaflets.set(color, (leaflets.get(color) ?? '') + d);
      }
    }

    const stem = `<path d="M${ points.map(point => point.map(round).join(' ')).join(' ').replace(/^(\S+ \S+) /, '$1C') }" fill="none" stroke="${ colors.canopy.stem[layer] }" stroke-width="3" stroke-linecap="round"/>`;
    const paths = [...leaflets].map(([color, d]) => `<path fill="${ color }" d="${ d }"/>`).join('');
    return `<g>${ paths }${ stem }</g>`;
  }
}

// The outline of a volcanic cone: concave slopes and a flattened crater, slightly
// irregular so no two look the same
function volcanoRidge({ x, width, height, horizon }) {
  const random = seeded(Math.round(x));
  const lean = (random() - 0.5) * 0.1;
  const crater = 0.06 + random() * 0.03;
  const phase = random() * 10;
  const steps = Math.round(width / 4);
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const distance = Math.min(1, Math.abs(u - 0.5 - lean) * 2);
    let value = Math.pow(1 - Math.max(distance, crater), 1.8);
    if (distance < crater) {
      value -= (crater - distance) * 0.18;
    }
    value *= 1 + Math.sin(u * 23 + phase) * 0.015 + Math.sin(u * 61 + phase * 2) * 0.008;
    points.push([x - width / 2 + u * width, horizon - Math.max(0, value) * height]);
  }
  return points;
}

function bezier([a, b, c, d], t) {
  const u = 1 - t;
  return [0, 1].map(axis => u * u * u * a[axis] + 3 * u * u * t * b[axis] + 3 * u * t * t * c[axis] + t * t * t * d[axis]);
}

function bezierTangent([a, b, c, d], t) {
  const u = 1 - t;
  const tangent = [0, 1].map(axis => 3 * u * u * (b[axis] - a[axis]) + 6 * u * t * (c[axis] - b[axis]) + 3 * t * t * (d[axis] - c[axis]));
  const length = Math.hypot(...tangent) || 1;
  return tangent.map(value => value / length);
}

// Towering cumulus clouds with flat bottoms resting just above the horizon,
// which is the bottom edge of this layer
function drawClouds(colors) {
  const random = seeded(23);
  const width = 2400;
  const height = 460;
  const horizon = 460;
  const clouds = [
    { x: 1490, width: 560, height: 360, base: horizon - 10 },
    { x: 990, width: 400, height: 120, base: horizon - 12 },
    { x: 2060, width: 460, height: 270, base: horizon - 10 },
    { x: 340, width: 340, height: 170, base: horizon - 12 },
    { x: 1150, width: 170, height: 70, base: horizon - 8, far: true },
    { x: 620, width: 150, height: 60, base: horizon - 8, far: true },
    { x: 1800, width: 140, height: 55, base: horizon - 8, far: true },
  ];
  const definitions = [];
  const drawn = [];
  const moon = { x: 1740, y: 230, radius: 30 };

  if (colors.moon) {
    definitions.push(`<radialGradient id="glow"><stop offset="0" stop-color="${ colors.moon.glow }" stop-opacity="0.9"/><stop offset="1" stop-color="${ colors.moon.glow }" stop-opacity="0"/></radialGradient>`);
    drawn.push(`<circle cx="${ moon.x }" cy="${ moon.y }" r="${ moon.radius * 4 }" fill="url(#glow)"/>`);
    drawn.push(`<circle cx="${ moon.x }" cy="${ moon.y }" r="${ moon.radius }" fill="${ colors.moon.disc }"/>`);
  }

  [
    { x: 1960, width: 780, height: 300, layer: 'Far' },
    { x: 820, width: 900, height: 285, layer: 'Near' },
  ].forEach(volcano => drawVolcano(volcano));
  clouds.forEach((cloud, index) => drawCloud(cloud, index));
  drawn.push(drawBirds());

  return svg(width, height, `<defs>${ definitions.join('') }</defs>${ drawn.join('') }`);

  // A hazy cone with concave slopes and a flattened crater, fading towards the
  // horizon like a mountain far away
  function drawVolcano({ x, width: baseWidth, height: peak, layer }) {
    const points = volcanoRidge({ x, width: baseWidth, height: peak, horizon });
    const [top, base] = colors.island[`volcano${ layer }`];
    const id = `volcano${ x }`;
    definitions.push(`<linearGradient id="${ id }" gradientUnits="userSpaceOnUse" x1="0" y1="${ horizon - peak }" x2="0" y2="${ horizon }"><stop offset="0" stop-color="${ top }"/><stop offset="1" stop-color="${ base }"/></linearGradient>`);
    drawn.push(`<path d="M${ points.map(([pointX, pointY]) => `${ round(pointX) } ${ round(pointY) }`).join(' L') } Z" fill="url(#${ id })"/>`);
  }

  function drawCloud({ x, width: cloudWidth, height: cloudHeight, base, far = false }, index) {
    const puffs = [];
    const levels = far ? 3 : 6;

    for (let level = 0; level < levels; level++) {
      const share = level / levels;
      const levelWidth = cloudWidth * (1 - share * 0.8) * (0.9 + random() * 0.2);
      const levelCenter = x + (random() - 0.5) * cloudWidth * 0.12;
      const radius = cloudHeight / levels * (0.95 + 0.4 * (1 - share));
      const levelY = base - cloudHeight / levels * (level + 0.45);
      const count = Math.max(2, Math.round(levelWidth / (radius * 0.85)));
      for (let i = 0; i < count; i++) {
        const offset = count === 1 ? 0.5 : i / (count - 1);
        puffs.push([
          levelCenter - levelWidth / 2 + radius * 0.6 + (levelWidth - radius * 1.2) * offset + (random() - 0.5) * radius * 0.4,
          levelY + (random() - 0.5) * radius * 0.35,
          radius * (0.75 + random() * 0.5),
        ]);
      }
    }

    const shape = puffs.map(([cx, cy, r]) => `<circle cx="${ round(cx) }" cy="${ round(cy) }" r="${ round(r) }"/>`).join('');
    const baseRect = `<rect x="${ round(x - cloudWidth * 0.36) }" y="${ round(base - cloudHeight * 0.14) }" width="${ round(cloudWidth * 0.72) }" height="${ round(cloudHeight * 0.14) }" rx="12"/>`;
    const top = base - cloudHeight - 40;

    definitions.push(`<clipPath id="flat${ index }"><rect x="0" y="0" width="2400" height="${ base }"/></clipPath>`);
    definitions.push(`<clipPath id="shape${ index }">${ shape }${ baseRect }</clipPath>`);
    definitions.push(`<linearGradient id="body${ index }" gradientUnits="userSpaceOnUse" x1="0" y1="${ round(top) }" x2="0" y2="${ base }"><stop offset="0" stop-color="${ colors.cloud.light }"/><stop offset="0.55" stop-color="${ colors.cloud.mid }"/><stop offset="1" stop-color="${ colors.cloud.base }"/></linearGradient>`);

    const creases = puffs.map(([cx, cy, r]) => `<circle cx="${ round(cx + r * 0.18) }" cy="${ round(cy + r * 0.3) }" r="${ round(r * 0.92) }"/>`).join('');
    const highlights = puffs.map(([cx, cy, r]) => `<circle cx="${ round(cx - r * 0.16) }" cy="${ round(cy - r * 0.2) }" r="${ round(r * 0.74) }"/>`).join('');
    const opacity = far ? ` opacity="${ colors.cloud.far }"` : '';

    drawn.push(`<g clip-path="url(#flat${ index })"${ opacity }>`
      + `<g fill="url(#body${ index })">${ shape }${ baseRect }</g>`
      + `<g clip-path="url(#shape${ index })">`
      + `<g fill="${ colors.cloud.shade }" opacity="0.45">${ creases }</g>`
      + `<g fill="${ colors.cloud.light }" opacity="0.85">${ highlights }</g>`
      + `<rect x="${ round(x - cloudWidth) }" y="${ round(base - cloudHeight * 0.07) }" width="${ round(cloudWidth * 2) }" height="${ round(cloudHeight * 0.07) }" fill="${ colors.cloud.base }" opacity="0.35"/>`
      + '</g></g>');
  }

  function drawBirds() {
    const wings = {
      up: 'M0 0C-5 -4 -13 -10 -26 -10C-18 -6 -10 -1 -3 3C-1 4 1 4 3 3C10 -1 18 -6 26 -10C13 -10 5 -4 0 0Z',
      glide: 'M0 0C-8 -3 -17 -2 -28 4C-17 1 -9 2 -2 4C0 5 1 5 2 4C9 2 17 1 28 4C17 -2 8 -3 0 0Z',
      tilt: 'M0 0C-6 -6 -12 -14 -22 -16C-15 -9 -9 -2 -3 3C-1 4 1 4 3 3C12 0 22 -1 32 2C20 -4 8 -3 0 0Z',
    };
    const flock = [
      [660, 210, 1, 'glide', -4], [712, 245, 0.8, 'up', 6], [610, 260, 0.7, 'tilt', 2],
      [760, 190, 0.6, 'up', -8], [805, 232, 0.55, 'glide', 4], [560, 200, 0.5, 'glide', 10],
      [1690, 140, 0.9, 'tilt', -6], [1745, 170, 0.65, 'up', 3], [1800, 128, 0.5, 'glide', 8],
      [420, 300, 0.6, 'glide', 0], [455, 318, 0.45, 'up', -5],
    ];
    return `<g fill="${ colors.bird }">${ flock.map(([cx, cy, scale, shape, angle]) => {
      return `<path transform="translate(${ cx } ${ cy }) rotate(${ angle }) scale(${ scale })" d="${ wings[shape] }"/>`;
    }).join('') }</g>`;
  }
}

// The sea from the horizon (y 120) to the beach, with islands on the horizon
function drawCoast(colors, theme) {
  const random = seeded(37);
  const width = 2400;
  const height = 340;
  const horizon = 120;
  const shore = 262;
  const glitterX = 1740;
  const definitions = [];
  const back = [];
  const front = [];

  definitions.push(gradient('sea', [[0, colors.sea.horizon], [0.45, colors.sea.middle], [1, colors.sea.near]], horizon, shore + 20));
  definitions.push(gradient('sand', [[0, colors.shore.sand], [0.5, colors.shore.sand], [1, colors.shore.paper]], shore, height));
  definitions.push(gradient('shallow', [[0, colors.sea.shallow, 0], [1, colors.sea.shallow, 0.75]], shore - 30, shore));

  back.push(`<rect x="0" y="${ horizon }" width="${ width }" height="${ height - horizon }" fill="url(#sea)"/>`);
  back.push(`<rect x="0" y="${ horizon - 1 }" width="${ width }" height="5" fill="#ffffff" opacity="${ theme === 'day' ? 0.25 : 0.08 }"/>`);

  const islands = [
    { x: 1180, width: 400, height: 68 },
    { x: 1820, width: 720, height: 114 },
  ];
  islands.forEach(island => drawIsland(island));
  drawGlints();

  front.push(`<path d="${ wave(shore - 28, 6, 0) } L ${ width } ${ shore + 10 } L 0 ${ shore + 10 } Z" fill="url(#shallow)"/>`);
  front.push(`<path d="${ wave(shore, 7, 0.4) } L ${ width } ${ height } L 0 ${ height } Z" fill="${ colors.shore.wet }"/>`);
  front.push(`<path d="${ wave(shore + 9, 7, 0.4) } L ${ width } ${ height } L 0 ${ height } Z" fill="url(#sand)"/>`);
  front.push(`<path d="${ wave(shore, 7, 0.4) }" fill="none" stroke="${ colors.shore.foam }" stroke-width="3" stroke-linecap="round"/>`);
  front.push(`<path d="${ wave(shore - 10, 4, 1.3) }" fill="none" stroke="${ colors.shore.foam }" stroke-width="5" opacity="0.18" stroke-linecap="round"/>`);

  return svg(width, height, `<defs>${ definitions.join('') }</defs>${ back.join('') }${ front.join('') }`);

  function gradient(id, stops, y1, y2) {
    return `<linearGradient id="${ id }" gradientUnits="userSpaceOnUse" x1="0" y1="${ y1 }" x2="0" y2="${ y2 }">${ stops.map(([offset, color, opacity = 1]) => `<stop offset="${ offset }" stop-color="${ color }" stop-opacity="${ opacity }"/>`).join('') }</linearGradient>`;
  }

  function wave(y, amplitude, phase) {
    const points = [];
    for (let x = 0; x <= width; x += 40) {
      points.push(`${ x } ${ round(y + Math.sin(x / 190 + phase) * amplitude + Math.sin(x / 67 + phase * 2) * amplitude * 0.35) }`);
    }
    return `M${ points.join(' L') }`;
  }

  // A volcanic island like the ones in the back, closer and darker: the left
  // flank catches the light, the right flank is in shade
  function drawIsland({ x, width: baseWidth, height: peak }) {
    const ridge = volcanoRidge({ x, width: baseWidth, height: peak, horizon });
    const outline = `M${ ridge.map(([pointX, pointY]) => `${ round(pointX) } ${ round(pointY) }`).join(' L') } Z`;
    const top = Math.min(...ridge.map(([, pointY]) => pointY));
    const peakIndex = ridge.findIndex(([, pointY]) => pointY === top);
    const id = `island${ x }`;
    const [topColor, baseColor] = colors.island.front;
    definitions.push(gradient(id, [[0, topColor], [1, baseColor]], round(top), horizon));
    definitions.push(gradient(`${ id }Shade`, [[0, colors.island.frontShadow, 0.75], [1, colors.island.frontShadow, 0.35]], round(top), horizon));

    back.push(`<path d="${ outline }" fill="url(#${ id })"/>`);

    const flank = ridge.slice(peakIndex);
    const foot = ridge[peakIndex][0] + baseWidth * 0.06;
    back.push(`<path d="M${ flank.map(([pointX, pointY]) => `${ round(pointX) } ${ round(pointY) }`).join(' L') } L${ round(foot) } ${ horizon } Z" fill="url(#${ id }Shade)"/>`);

    const litSide = ridge.slice(0, peakIndex + 1).filter(([, pointY]) => horizon - pointY > 3);
    back.push(`<path d="M${ litSide.map(([pointX, pointY]) => `${ round(pointX) } ${ round(pointY + 1.5) }`).join(' L') }" fill="none" stroke="${ colors.island.frontLight }" stroke-width="2" opacity="0.45" stroke-linejoin="round"/>`);

    const beachStart = x - baseWidth * 0.36;
    const beachEnd = x + baseWidth * 0.4;
    back.push(`<path d="M${ round(beachStart) } ${ horizon } Q${ round(x) } ${ horizon - 4 } ${ round(beachEnd) } ${ horizon } Z" fill="${ colors.island.beach }"/>`);
    back.push(`<path d="M${ round(beachStart - 10) } ${ horizon + 1 } L${ round(beachEnd + 10) } ${ horizon + 1 }" stroke="${ colors.island.surf }" stroke-width="1.2" opacity="0.8"/>`);
  }

  // Faint long streaks of light instead of individual glints, and a path of
  // moonlight at night
  function drawGlints() {
    const streaks = [];
    for (let i = 0; i < 70; i++) {
      const depth = Math.pow(random(), 1.5);
      const y = horizon + 3 + depth * (shore - horizon - 36);
      const length = 40 + depth * 260 * random();
      const x = random() * width;
      streaks.push(`<path d="M${ round(x) } ${ round(y) }h${ round(length) }" stroke-width="${ round(0.6 + depth * 1.2) }" opacity="${ round(0.06 + random() * 0.14) }"/>`);
    }
    if (colors.moonPath) {
      for (let i = 0; i < 60; i++) {
        const depth = Math.pow(random(), 1.3);
        const y = horizon + 3 + depth * (shore - horizon - 30);
        const spread = 10 + depth * 90;
        const length = 6 + depth * 34 * random();
        const x = glitterX + (random() - 0.5) * spread * 2 - length / 2;
        streaks.push(`<path d="M${ round(x) } ${ round(y) }h${ round(length) }" stroke-width="${ round(0.8 + depth * 1.6) }" opacity="${ round(0.3 + random() * 0.45) }"/>`);
      }
    }
    back.push(`<g stroke="${ colors.sea.glint }" stroke-linecap="round">${ streaks.join('') }</g>`);
  }
}

function drawStars() {
  const random = seeded(5);
  const stars = [];
  for (let i = 0; i < 140; i++) {
    const x = random() * 1600;
    const y = Math.pow(random(), 1.3) * 620;
    const radius = 0.6 + Math.pow(random(), 3) * 1.6;
    stars.push(`<circle cx="${ round(x) }" cy="${ round(y) }" r="${ round(radius) }" opacity="${ round(0.4 + random() * 0.6) }"/>`);
  }
  return svg(1600, 620, `<g fill="#ffffff">${ stars.join('') }</g>`);
}
