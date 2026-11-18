// Google Play feature graphic, 1024x500: Turag wordmark + headline on white (left),
// three feature cards on a red panel (right). Theme colours, the app's Satoshi font and icons.
// node feature_graphic.js <out.png>
const sharp = require('D:/TuragAI/Turag/node_modules/sharp');
const icons = require('D:/TuragAI/Turag/src/components/icons/iconPaths.js');
const ICON = icons.default || icons;
const ROOT = 'D:/TuragAI/Turag/src/assets/';
const C = { red: '#E82127', heading: '#111827', body: '#374151', muted: '#6B7280', tint: '#FDE8E8', white: '#FFFFFF' };
const W = 1024;
const H = 500;

const text = async (markup, weight, size) => {
  const file = { Black: 'Satoshi-Black.otf', Bold: 'Satoshi-Bold.otf', Medium: 'Satoshi-Medium.otf' }[weight];
  const { data, info } = await sharp({
    text: { text: markup, font: `Satoshi ${weight} ${size}`, fontfile: ROOT + 'fonts/' + file, rgba: true, dpi: 72 },
  }).png().toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
};
const span = (color, s) => `<span foreground="${color}">${s}</span>`;

// The wordmark from the master SVG, cropped to its edges.
const wordmark = async width => {
  const { data, info } = await sharp(ROOT + 'images/turag_logo.svg', { density: 300 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let [l, t, r, b] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 20) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
  }
  return sharp(data, { raw: info }).extract({ left: l, top: t, width: r - l + 1, height: b - t + 1 }).resize({ width }).png().toBuffer({ resolveWithObject: true });
};

const CARDS = [
  { icon: 'trendUp', title: 'Know the value', sub: 'Instant estimate by car number' },
  { icon: 'camera', title: 'AI Self Inspection', sub: 'Guided photos and checklist' },
  { icon: 'car', title: 'Buy and sell', sub: 'Listings checked before going live' },
];
const CARD = { x: 620, w: 356, h: 92, gap: 22, r: 18 };

(async () => {
  const top = (H - (CARDS.length * CARD.h + (CARDS.length - 1) * CARD.gap)) / 2;
  const shapes = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${C.white}"/>
    <polygon points="612,0 ${W},0 ${W},${H} 548,${H}" fill="${C.red}"/>
    <circle cx="${W - 20}" cy="40" r="150" fill="${C.white}" fill-opacity="0.07"/>
    ${CARDS.map((c, i) => {
      const y = top + i * (CARD.h + CARD.gap);
      const cx = CARD.x + 22 + 24;
      const cy = y + CARD.h / 2;
      return `<rect x="${CARD.x}" y="${y}" width="${CARD.w}" height="${CARD.h}" rx="${CARD.r}" fill="${C.white}"/>
        <circle cx="${cx}" cy="${cy}" r="24" fill="${C.tint}"/>
        <g transform="translate(${cx - 13} ${cy - 13}) scale(${26 / 24})"><path d="${ICON[c.icon]}" fill="none" stroke="${C.red}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }).join('')}
  </svg>`;

  const layers = [];
  const logo = await wordmark(190);
  layers.push({ input: logo.data, left: 72, top: 92 });

  const lines = [
    await text(span(C.heading, 'Buy and sell'), 'Black', 52),
    await text(span(C.red, 'used cars'), 'Black', 52),
    await text(span(C.heading, 'with confidence.'), 'Black', 52),
  ];
  let y = 92 + logo.info.height + 40;
  for (const line of lines) {
    layers.push({ input: line.input, left: 70, top: y });
    y += 60;
  }
  const sub = await text(span(C.body, 'Value, inspect, buy and sell, all in one app.'), 'Medium', 19);
  layers.push({ input: sub.input, left: 72, top: y + 14 });

  for (const [i, c] of CARDS.entries()) {
    const cy = top + i * (CARD.h + CARD.gap);
    const title = await text(span(C.heading, c.title), 'Bold', 21);
    const subtitle = await text(span(C.muted, c.sub), 'Medium', 15);
    const textX = CARD.x + 22 + 48 + 16;
    const block = title.height + 5 + subtitle.height;
    const ty = Math.round(cy + (CARD.h - block) / 2);
    layers.push({ input: title.input, left: textX, top: ty });
    layers.push({ input: subtitle.input, left: textX, top: ty + title.height + 5 });
  }

  await sharp(Buffer.from(shapes)).composite(layers).flatten({ background: C.white }).png().toFile(process.argv[2]);
  const meta = await sharp(process.argv[2]).metadata();
  const edge = 612 - (64 * (y + 14 + sub.height)) / H; console.log('saved', meta.width, 'x', meta.height, 'subline right edge', 72 + sub.width, 'red edge there', Math.round(edge));
})().catch(e => { console.error(e); process.exit(1); });
