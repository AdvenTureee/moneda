import sharp from 'sharp';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const C = {
  gold: '#FACC15',
  shadow: '#A16207',
  blush: '#F43F5E',
  ink: '#1C1917',
  white: '#FAFAF9',
};

const W = 256, H = 256;
const FPS = 10, DUR = 3;
const N = FPS * DUR;

// --- animation math (matching CSS keyframes) ---
const bodyY = p => -1.5 * Math.sin(p * Math.PI);
const bodyS = p => 1 + 0.025 * Math.sin(p * Math.PI);
const limbY = (p, d) => {
  const t = ((p * DUR + d) % DUR) / DUR * Math.PI;
  return -2.5 * Math.sin(t);
};
const isBlink = p => {
  const t = p * DUR;
  return (t >= 1.0 && t < 1.12) || (t >= 2.3 && t < 2.42);
};

function frameSVG(i) {
  const p = i / N;
  const by = bodyY(p), bs = bodyS(p);
  const t = `translate(${50*(1-bs)},${42*(1-bs)+by})scale(${bs})`;
  const blink = isBlink(p);

  const eyes = blink
    ? `<path d="M 33,36 Q 38,39 43,36" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
       <path d="M 57,36 Q 62,39 67,36" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" fill="none"/>`
    : `<ellipse cx="38" cy="36" rx="7" ry="8.5" fill="${C.white}" stroke="${C.ink}" stroke-width="1.9"/>
       <ellipse cx="62" cy="36" rx="7" ry="8.5" fill="${C.white}" stroke="${C.ink}" stroke-width="1.9"/>
       <circle cx="35.8" cy="33.5" r="1.5" fill="white"/>
       <circle cx="59.8" cy="33.5" r="1.5" fill="white"/>
       <circle cx="38" cy="37.6" r="4" fill="${C.ink}"/>
       <circle cx="62" cy="37.6" r="4" fill="${C.ink}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${W}" height="${H}">
<g transform="${t}">
  <circle cx="55" cy="44" r="32" fill="${C.shadow}" stroke="${C.ink}" stroke-width="2.8"/>
  <g transform="translate(0,${limbY(p,0)})"><path d="M 42,72 Q 38,79 41,83 Q 40,85 40,87" stroke="${C.ink}" stroke-width="6.5" stroke-linecap="round" fill="none"/></g>
  <g transform="translate(0,${limbY(p,.1)})"><path d="M 58,72 Q 62,79 59,83 Q 60,85 60,87" stroke="${C.ink}" stroke-width="6.5" stroke-linecap="round" fill="none"/></g>
  <g transform="translate(0,${limbY(p,.2)})"><path d="M 21,52 Q 16,57 13,61" stroke="${C.ink}" stroke-width="5.5" stroke-linecap="round" fill="none"/></g>
  <g transform="translate(0,${limbY(p,.3)})"><path d="M 79,52 Q 84,57 89,61" stroke="${C.ink}" stroke-width="5.5" stroke-linecap="round" fill="none"/></g>
  <circle cx="50" cy="42" r="32" fill="${C.gold}" stroke="${C.ink}" stroke-width="2.8"/>
  <ellipse cx="28" cy="48" rx="6" ry="4.5" fill="${C.blush}" opacity=".35"/>
  <ellipse cx="72" cy="48" rx="6" ry="4.5" fill="${C.blush}" opacity=".35"/>
  <path d="M 33,25 Q 38,22 43,25" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M 67,25 Q 62,22 57,25" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" fill="none"/>
  ${eyes}
  <path d="M 40,52 Q 50,61 60,52" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M 38,49 Q 42,52 38,54" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M 62,49 Q 58,52 62,54" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" fill="none"/>
</g></svg>`;
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'moico-gif-'));
  console.log(`Generating ${N} frames at ${FPS}fps…`);

  for (let i = 0; i < N; i++) {
    const svg = frameSVG(i);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(join(tmp, `f${String(i).padStart(3,'0')}.png`), png);
  }

  const out = join(process.cwd(), 'public', 'moico.gif');
  const inPattern = join(tmp, 'f%03d.png');

  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${inPattern}" -filter_complex "[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer" -loop 0 "${out}"`,
    { stdio: 'inherit' }
  );

  rmSync(tmp, { recursive: true, force: true });
  console.log(`✅ GIF salvo em ${out}`);
  console.log(`🔗 URL: https://moneda.info/moico.gif`);
}

main().catch(e => { console.error(e); process.exit(1); });
