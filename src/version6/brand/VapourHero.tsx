// v6 hero stage (2026-11-23): a straight port of the "Volumetric Dry-Ice Vapour" WebGL2 demo (the DeepMind "4"),
// with the Grain mark as the glyph. Kept close to the demo on purpose (same puffs, same numbers), except:
//   · logo colours (2026-11-23): the vapour is the mark in its own ring colours (rust outer, coral middle, peach
//     inner), on a dark warm stage with a soft ember light top-right instead of the navy → azure sky. The mask carries
//     one ring per channel (R rust, G coral, B peach), so the shader and the puffs know which colour each patch is.
//   · the glyph is the Grain mark (a white silhouette of the logo) instead of the "4", and the micro-glyphs are tiny marks
//   · canvases fill their host (the hero stage), not the window, and the pointer is read relative to the host
//   · no controls panel, toast or gust button (the demo's tuning UI); the "subtle" preset is baked in
//   · hover = one round blob of mist (2026-11-23, after the DeepMind recording): while the pointer is over the mark a
//     soft circular patch under it boils (domain-warped noise, edges spilling out in soft lumps), follows the pointer
//     smoothly and fades out when it leaves the mark. No trails: no smoke sprays, no smears left along the path. The
//     blob is drawn straight from the pointer each frame (no disturbance field), so nothing lingers behind it.
//   · scroll hand-off into How it runs (`progress`, 0 → 1 through the pinned hero): the whole mark takes the hover's
//     fog (blur + wisps), the mist turns to rise and the mark thins away; meanwhile its smoke puffs lift off and fly,
//     staggered, along arcs onto the letters of the How it runs heading, and the heading condenses out of the mist
//     (a text mask drawn word by word where the real heading lands, `textRef`, going from heavy wispy fog to sharp).
//     The atmosphere turns into How it runs' surface in the shader; the real heading then takes over (CSS) and the
//     canvas fades. Drawing stops once it's gone.
//   · it pauses while off screen; reduced motion gets a still frame
//   · no WebGL2: the host's CSS gradient (the same atmosphere) stays visible
// Layers inside the host: the GL canvas (backdrop + vapour glyph + anchor puffs), then the micro-glyph 2D canvas.
import { useEffect, useRef, type RefObject } from "react";
import { CORE, RINGS, rectPath } from "./grainMark";

type Props = {
  /** scroll progress through the pinned hero, 0 → 1: the mark dissolves into rising mist */
  progress?: RefObject<number>;
  /** the heading the mist condenses into: an invisible copy laid out where the real one lands (measured word by word) */
  textRef?: RefObject<HTMLElement | null>;
  /** the mark's size (share of its mask square, ~0.9 × that of the stage height on wide screens) and centre (0 top → 1) */
  markSize?: number;
  markY?: number;
  /** how strongly the mark shows, 0–1; 0 = atmosphere and drifting marks only (the Articles header) */
  markAlpha?: number;
  className?: string;
  /** radius of the hover mist blob, in stage heights (the palette picker's "Mist" slider) */
  blobSize?: number;
};

// the demo's "subtle" preset (recondense slowed so the anchor puffs settle softly)
// blur is far lower than the demo's 12: on a mark this big that read as out of focus, and the reference "4" is crisp
const S = { density: 0.78, expansion: 1.05, turbulence: 0.85, recondense: 0.011, blur: 4, force: 1.0 };

// where the mark sits in its mask square (fractions of the square, y down) and the hover blob's radius (stage heights)
// (MARK_SIZE 0.71 ≈ 65% of the stage height on wide screens; 0.8 felt too big, 0.62 too small)
// BLOB_R is the default blob radius; the live one comes from the blobSize prop
const MARK_CY = 0.46, MARK_SIZE = 0.71, BLOB_R = 0.14;
// the hover mist's flow, in noise units per second: a soft drift left → right, turning into an equally slow sink
// once the pointer has rested on the mark for HEAVY_AFTER seconds. The mist pattern moves opposite to these offsets,
// so −x = flows right and +y = falls.
const DRIFT: [number, number] = [-0.4, 0], SINK: [number, number] = [0, 0.4];
const HEAVY_AFTER = 7.5, HEAVY_RAMP = 2.5;   // seconds of hover before it starts sinking, and how long the turn takes
// while the mark dissolves on scroll the mist rises instead (pattern moves up)
const RISE: [number, number] = [0.2, -2.6];
const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** the Grain mark centred on (cx, cy), `size` px square. `colors` gives the outer, middle and inner ring (the core
 *  takes the outer ring's); left out, the mark draws in its own logo colours. */
function drawMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colors?: [string, string, string]) {
  const k = size / 320;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(k, k);
  RINGS.forEach((r, i) => {
    const c = colors ? colors[i] : r.color;
    ctx.strokeStyle = c; ctx.fillStyle = c;
    ctx.lineWidth = r.stroke.width; ctx.lineJoin = r.stroke.join; ctx.lineCap = "butt";
    ctx.stroke(new Path2D(r.stroke.d));
    ctx.fill(new Path2D(r.fillets));
    ctx.fill(new Path2D(rectPath(r.dot)));
  });
  ctx.fillStyle = colors ? colors[0] : CORE.color;
  ctx.fill(new Path2D(rectPath(CORE)));
  ctx.restore();
}

// logo colours as linear 0–1 RGB (for the CPU side: puff tints)
const RUST: [number, number, number] = [0.784, 0.337, 0.212];   // #C85636
const CORAL: [number, number, number] = [0.886, 0.478, 0.373];  // #E27A5F
const PEACH: [number, number, number] = [0.941, 0.749, 0.655];  // #F0BFA7

/* ───────────── shaders (from the demo, unchanged) ───────────── */
const QUAD_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Pass 2: dark warm atmosphere + the soft, self-healing vapour glyph in the logo's ring colours
const BASE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D uMask; uniform vec2 uAspect, uMaskScale; uniform float uTime;
uniform vec2 uBlobPt, uFlow; uniform float uBlob, uBlobR, uHeavy, uDissolve, uFade;
// hand-off: the heading's mask, how far it has condensed, and the surface it lands on
uniform float uMarkAlpha;
uniform sampler2D uText; uniform float uTextIn, uTextForm, uTextOut, uTextH, uStageOut; uniform vec3 uInk, uSurface;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0; float a = 0.5; mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = rot * p * 2.04 + vec2(13.2, 7.8); a *= 0.5; } return v; }
vec3 sampleMaskLod(vec2 uv, float lod) { vec2 mUv = (uv - 0.5) * uMaskScale + 0.5;
  if (mUv.x < 0.0 || mUv.x > 1.0 || mUv.y < 0.0 || mUv.y > 1.0) return vec3(0.0); return textureLod(uMask, mUv, lod).rgb; }
void main() {
  // the demo's sky, re-coloured: near-black warm night, a deep rust-brown body, an ember light (dim coral) and a peach bloom
  vec3 colNight  = vec3(0.051, 0.035, 0.027);   // #0d0907
  vec3 colCobalt = vec3(0.165, 0.078, 0.051);   // #2a140d
  vec3 colAzure  = vec3(0.470, 0.200, 0.125);   // dim rust ember
  vec3 colBloom  = vec3(0.941, 0.749, 0.655);   // peach
  vec3 colRust   = vec3(0.784, 0.337, 0.212);
  vec3 colCoral  = vec3(0.886, 0.478, 0.373);
  vec3 colPeach  = vec3(0.941, 0.749, 0.655);
  vec2 lightPos = vec2(0.92, 0.82);
  float lightDist = length((vUv - lightPos) * uAspect);
  float azureGlow = exp(-lightDist * lightDist * 0.82);
  float azureCore = exp(-lightDist * lightDist * 2.85);
  float diag = smoothstep(0.02, 1.04, vUv.y * 0.68 + vUv.x * 0.42);
  vec3 bg = mix(colNight, colCobalt, diag * 0.94);
  bg = mix(bg, colAzure, azureGlow * 0.62);
  bg += colBloom * azureCore * 0.06;
  float floorVig = smoothstep(0.0, 0.28, vUv.y) * 0.76 + 0.24;
  float leftDepth = smoothstep(-0.18, 0.72, vUv.x + vUv.y * 0.36) * 0.34 + 0.66;
  bg *= floorVig * leftDepth;
  // hand-off: the atmosphere turns into How it runs' surface
  bg = mix(bg, uSurface, uStageOut);

  // the hover blob (after the DeepMind recording): the mark is never moved or warped. Under the pointer it is seen
  // through fog instead: a real gaussian blur whose radius is largest at the pointer and falls off smoothly to nothing
  // at the blob's edge, a slow soft mottling of mist over it, and a slight thinning right at the pointer.
  vec2 bd = (vUv - uBlobPt) * uAspect;
  // heavy hover: the fog sags, so the blob reaches further below the pointer than above it
  if (bd.y < 0.0) bd.y /= 1.0 + uHeavy * 1.2;
  float bd2 = dot(bd, bd), br2 = uBlobR * uBlobR;
  float f = exp(-bd2 / br2) * uBlob;                       // blob strength here, 0–1, gaussian falloff
  // on scroll the whole mark takes the fog (fd), not just the patch under the pointer
  float fd = max(f, uDissolve);
  vec3 mist3 = sampleMaskLod(vUv, 0.0);
  float sum0 = mist3.r + mist3.g + mist3.b;
  // the costly parts (blur, mist noise) only run within reach of the mark: a very coarse mask level (64px texels,
  // bilinear) says whether any of it is close enough to matter
  vec3 nearM = sampleMaskLod(vUv, 6.0);
  bool nearMark = uMarkAlpha > 0.0 && nearM.r + nearM.g + nearM.b > 0.002;   // no mark shown: skip it all
  float fog = 0.0, wisps = 0.0;
  float cloudTex = 0.5;
  if (nearMark) {
    if (fd > 0.004) {
      // blur radius in stage heights; the mask is mipmapped, so each tap reads an already-softened level. Taps on a
      // golden-angle spiral, gaussian-weighted, turned per pixel so coarse texels never line up into blocks. The
      // hover needs 32 to stay smooth; the scroll dissolve is broad and soft, so 12 coarser taps do.
      float R = 0.045 * fd + 0.03 * uDissolve;   // enough to melt edges, little enough that the mist still reads
      float rPx = R * uMaskScale.y / uAspect.y * 768.0;
      bool fine = f > 0.02;
      float taps = fine ? 32.0 : 12.0;
      float lod = log2(max(1.0, rPx / (fine ? 12.0 : 6.0)));
      float spin = hash12(gl_FragCoord.xy) * 6.2831853;
      vec3 acc = mist3; float wsum = 1.0;
      for (int i = 0; i < 32; i++) {
        if (float(i) >= taps) break;
        float fi = float(i) + 0.5;
        float rr = sqrt(fi / taps);
        float a = fi * 2.39996323 + spin;
        float w = exp(-rr * rr * 2.0);
        acc += sampleMaskLod(vUv + vec2(cos(a), sin(a)) * rr * R / uAspect, lod) * w;
        wsum += w;
      }
      mist3 = mix(mist3, acc / wsum, smoothstep(0.0, 0.35, fd));
      // mist over the fog: big slow patches of thicker and thinner fog, and through them finer wisps that drift and
      // curl (domain-warped noise). They only change how dense the mist is, never where the mark is. uFlow is the
      // flow offset integrated on the CPU (drift → sink when the hover is heavy → rise on scroll), so changing
      // direction never makes the pattern jump. Sinking wisps stretch into vertical streaks, which reads as falling.
      fog = smoothstep(0.2, 0.8, fbm(vUv * uAspect * 2.2 + uFlow * 0.06));
      vec2 wp = vUv * uAspect * 7.0;
      wp.y *= mix(1.0, 0.6, uHeavy);
      vec2 wq = vec2(fbm(wp * 0.5 + uFlow * 0.08), fbm(wp * 0.5 + vec2(3.1, 0.0) + uFlow * 0.07 + uTime * 0.02));
      wisps = smoothstep(0.38, 0.86, fbm(wp + wq * 1.8 + uFlow * 0.15));
    }
    // the vapour's own slow breathing (from the demo); only where the mark is
    if (sum0 > 0.002 || fd > 0.004) cloudTex = fbm(vUv * uAspect * 3.8 + vec2(uTime * 0.035, -uTime * 0.028));
  }
  float sum = mist3.r + mist3.g + mist3.b;
  // which ring this patch belongs to decides its colour; where rings blur into each other the colours blend
  vec3 tint = (mist3.r * colRust + mist3.g * colCoral + mist3.b * colPeach) / max(sum, 1e-4);
  float baseMist = clamp(sum, 0.0, 1.0);
  baseMist *= 0.92 + cloudTex * 0.16;
  baseMist *= mix(1.0, (0.8 + fog * 0.3) * (0.62 + wisps * 0.85), fd);
  // a slight thinning right at the pointer, as the reference does
  baseMist *= 1.0 - 0.26 * exp(-bd2 / (br2 * 0.3)) * uBlob;
  baseMist *= smoothstep(0.0, 0.14, vUv.y) * 0.70 + 0.30;   // gentler than the demo: the big mark reaches low
  baseMist *= uMarkAlpha;
  // scroll hand-off: the mark thins away into the mist (thinnest wisps last)
  baseMist *= clamp(1.0 - uFade * (1.25 - wisps * 0.5), 0.0, 1.0) * (1.0 - smoothstep(0.7, 1.0, uFade));   // fully gone at the end

  // shadow side a little deeper, the side facing the light lifted a touch toward white
  float lightTerm = clamp(azureGlow * 0.82 + vUv.y * 0.24, 0.0, 1.0);
  vec3 mistColor  = mix(tint * 0.84, mix(tint, vec3(1.0), 0.18), lightTerm);
  // the thicker fog patches catch a touch more light
  // the wisps and thicker fog catch a touch more light, so they read as vapour in front of the mark
  mistColor = mix(mistColor, mix(tint, vec3(1.0), 0.3), clamp(fog * 0.3 + wisps * 0.45, 0.0, 1.0) * fd);
  // the colours need more body than the demo's white mist to read on the dark stage
  vec3 color = mix(bg, mistColor, clamp(baseMist * 0.66, 0.0, 0.8));
  color += colBloom * baseMist * azureGlow * 0.04;
  // the heading condensing out of the mist: its mask, blurred heavily at first and tightening to sharp, broken up by
  // drifting wisps early on, tinted from peach mist to the heading's ink as it forms
  if (uTextIn > 0.001) {
    float tR = mix(0.05, 0.0015, uTextForm);             // blur radius, stage heights
    float tl = log2(max(1.0, tR * uTextH / 4.0));
    float ts = textureLod(uText, vUv, tl).r;
    if (tR > 0.004) {
      float spin = hash12(gl_FragCoord.yx) * 6.2831853;
      float tacc = ts, twsum = 1.0;
      for (int i = 0; i < 8; i++) {
        float fi = float(i) + 0.5, rr = sqrt(fi / 8.0), a = fi * 2.39996323 + spin, w = exp(-rr * rr * 2.0);
        tacc += textureLod(uText, vUv + vec2(cos(a), sin(a)) * rr * tR / uAspect, tl).r * w;
        twsum += w;
      }
      ts = tacc / twsum;
    }
    float tw = smoothstep(0.3, 0.85, fbm(vUv * uAspect * 7.0 + uFlow * 0.15));
    float td = ts * uTextIn * mix(0.3 + tw * 1.4, 1.0, uTextForm) * (1.0 - uTextOut);
    vec3 tc = mix(mix(colPeach, uInk, 0.45), uInk, uTextForm);
    color = mix(color, tc, clamp(td, 0.0, 1.0) * 0.95);
  }
  float n1 = hash12(gl_FragCoord.xy + fract(uTime * 0.37) * 71.0);
  float n2 = hash12(gl_FragCoord.xy + vec2(17.3, 41.9) + fract(uTime * 0.59) * 53.0);
  color = clamp(color + (n1 + n2 - 1.0) * (1.5 / 255.0), 0.0, 1.0);
  fragColor = vec4(color, 1.0);
}`;

// Pass 3: instanced rotating smoke puffs, one draw call
const PUFF_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aInstA;   // xy = screen uv, z = size, w = rotation
layout(location = 2) in vec4 aInstB;   // x = alpha, y = tile, z = litBoost, w = softBias
layout(location = 3) in vec4 aInstC;   // rgb = the ring colour the puff came off
uniform vec2 uAspect;
out vec2 vTileUv; out vec2 vScreenUv; out float vAlpha; out float vRot; out float vLitBoost; out float vSoftBias; out vec3 vCol;
void main() {
  float c = cos(aInstA.w); float s = sin(aInstA.w);
  vec2 rotated = mat2(c, -s, s, c) * aCorner;
  vec2 uvPos = aInstA.xy + (rotated * aInstA.z) / uAspect;
  gl_Position = vec4(uvPos * 2.0 - 1.0, 0.0, 1.0);
  float tile = floor(aInstB.y + 0.5);
  vTileUv = vec2(mod(tile, 2.0), floor(tile * 0.5)) * 0.5 + (aCorner + 0.5) * 0.5;
  vScreenUv = uvPos; vAlpha = aInstB.x; vRot = aInstA.w; vLitBoost = aInstB.z; vSoftBias = aInstB.w; vCol = aInstC.rgb;
}`;

const PUFF_FRAG = `#version 300 es
precision highp float;
in vec2 vTileUv; in vec2 vScreenUv; in float vAlpha; in float vRot; in float vLitBoost; in float vSoftBias; in vec3 vCol;
uniform sampler2D uAtlas; uniform vec2 uAspect;
out vec4 fragColor;
void main() {
  vec4 tex = texture(uAtlas, vTileUv);
  float cloudAlpha = tex.a;
  if (cloudAlpha < 0.004 || vAlpha < 0.002) discard;
  float shapedAlpha = pow(cloudAlpha, mix(0.88, 1.25, vSoftBias)) * vAlpha;
  vec2 localN = (tex.gb - 0.5) * 2.0;
  float c = cos(vRot); float s = sin(vRot);
  vec2 worldN = mat2(c, -s, s, c) * localN;
  vec2 lightPos = vec2(0.92, 0.82);
  vec2 toLight = (lightPos - vScreenUv) * uAspect;
  float lightDist = length(toLight);
  vec2 lightDir = toLight / max(lightDist, 1e-4);
  float azureField = exp(-lightDist * lightDist * 0.82);
  float ndotl = clamp(dot(worldN, lightDir) * 0.85 + 0.5, 0.0, 1.0);
  vec3 shadowCol = vCol * 0.74;
  vec3 litCol    = mix(vCol, vec3(1.0), 0.3);
  float shade = clamp(azureField * 0.62 + ndotl * 0.42 + vLitBoost * 0.18 + vScreenUv.y * 0.10, 0.0, 1.0);
  vec3 puffCol = mix(shadowCol, litCol, shade);
  float floorFade = smoothstep(0.0, 0.22, vScreenUv.y) * 0.76 + 0.24;
  fragColor = vec4(puffCol, clamp(shapedAlpha * floorFade * 1.25, 0.0, 0.62));
}`;

/* ───────────── procedural 2×2 smoke-puff atlas (from the demo) ───────────── */
let atlasCanvas: HTMLCanvasElement | null = null;
function smokeAtlas() {
  if (atlasCanvas) return atlasCanvas;
  const TILE = 256, SIZE = TILE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(SIZE, SIZE), data = img.data;
  const hash2 = (ix: number, iy: number, seed: number) => { const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123; return n - Math.floor(n); };
  const vnoise = (x: number, y: number, seed: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (x: number, y: number, seed: number) => {
    let v = 0, amp = 0.52, freq = 1.0;
    for (let i = 0; i < 5; i++) {
      v += amp * vnoise(x * freq, y * freq, seed + i * 19.3);
      const nx = x * 0.8 - y * 0.6, ny = x * 0.6 + y * 0.8; x = nx; y = ny;
      freq *= 2.04; amp *= 0.5;
    }
    return v;
  };
  const smoothstep = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const lobeSets = [
    [[0.0, 0.0, 0.64, 0.85], [-0.22, -0.1, 0.48, 0.55], [0.24, 0.12, 0.46, 0.52], [-0.06, 0.24, 0.42, 0.46]],
    [[0.02, -0.02, 0.6, 0.8], [0.22, -0.18, 0.45, 0.56], [-0.2, 0.14, 0.5, 0.54], [0.08, 0.22, 0.4, 0.42]],
    [[-0.03, 0.03, 0.62, 0.82], [-0.25, -0.14, 0.44, 0.5], [0.18, -0.2, 0.46, 0.48], [0.2, 0.16, 0.44, 0.52]],
    [[0.0, 0.02, 0.58, 0.78], [-0.18, 0.2, 0.46, 0.52], [0.24, -0.06, 0.48, 0.56], [-0.16, -0.2, 0.42, 0.48]],
  ];
  const tileAlpha = new Float32Array(TILE * TILE);
  for (let q = 0; q < 4; q++) {
    const qx = q % 2, qy = Math.floor(q / 2), seed = 11.7 + q * 37.3, lobes = lobeSets[q];
    for (let y = 0; y < TILE; y++) {
      const ny = (y / (TILE - 1)) * 2.0 - 1.0;
      for (let x = 0; x < TILE; x++) {
        const nx = (x / (TILE - 1)) * 2.0 - 1.0;
        const wx = (fbm(nx * 1.9 + 2.3, ny * 1.9 + 1.1, seed) - 0.5) * 0.46;
        const wy = (fbm(nx * 1.9 - 1.7, ny * 1.9 + 3.4, seed + 7.1) - 0.5) * 0.46;
        let lobeSum = 0;
        for (const [lx, ly, lr, lw] of lobes) {
          const d = Math.hypot(nx + wx * 0.55 - lx, ny + wy * 0.55 - ly) / lr;
          if (d < 1.0) { const fall = 1.0 - d * d; lobeSum += fall * fall * lw; }
        }
        const outerMask = 1.0 - smoothstep(0.46, 0.95, Math.hypot(nx, ny));
        const nMain = fbm((nx + wx) * 2.4 + 4.0, (ny + wy) * 2.4 + 4.0, seed + 13.5);
        const nFine = fbm(nx * 5.2 - wy * 1.1, ny * 5.2 + wx * 1.1, seed + 29.2);
        const cloud = smoothstep(0.18, 0.88, nMain * 0.72 + nFine * 0.28);
        const density = Math.min(1.0, lobeSum * 0.78) * outerMask * (0.42 + 0.88 * cloud);
        tileAlpha[y * TILE + x] = Math.max(0.0, Math.min(1.0, density));
      }
    }
    for (let y = 0; y < TILE; y++) {
      const y0 = Math.max(0, y - 2), y1 = Math.min(TILE - 1, y + 2);
      for (let x = 0; x < TILE; x++) {
        const x0 = Math.max(0, x - 2), x1 = Math.min(TILE - 1, x + 2);
        const c = tileAlpha[y * TILE + x];
        const gx = (tileAlpha[y * TILE + x1] - tileAlpha[y * TILE + x0]) * 2.6;
        const gy = (tileAlpha[y1 * TILE + x] - tileAlpha[y0 * TILE + x]) * 2.6;
        const idx = ((qy * TILE + y) * SIZE + (qx * TILE + x)) * 4;
        data[idx] = Math.round(Math.min(1, c * 1.15) * 255);
        data[idx + 1] = Math.round(Math.max(0, Math.min(1, 0.5 - gx * 0.5)) * 255);
        data[idx + 2] = Math.round(Math.max(0, Math.min(1, 0.5 + gy * 0.5)) * 255);
        data[idx + 3] = Math.round(c * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  atlasCanvas = canvas;
  return canvas;
}

type Anchor = {
  /** its spot on the heading (screen uv), when the stagger lets it leave (0–1), and how high its flight arcs */
  tx: number; ty: number; stag: number; arc: number;
  homeMx: number; homeMy: number; x: number; y: number; vx: number; vy: number; rot: number; baseSpin: number; spin: number;
  baseSize: number; sizeBoost: number; baseAlpha: number; excite: number; tile: number; phase: number; col: [number, number, number] };
type Micro = { x: number; y: number; size: number; opacity: number; depth: number; vy: number; vx: number; phase: number; twinkleFreq: number; swayFreq: number;
  /** nudge away from the pointer, px (eased) */
  ox: number; oy: number };

export default function VapourHero({
  className = "vapour-hero", blobSize = BLOB_R, progress, textRef, markSize = MARK_SIZE, markY = MARK_CY, markAlpha = 1,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  // read every frame, so the slider changes the blob without rebuilding the GL scene
  const blobR = useRef(blobSize);
  useEffect(() => { blobR.current = blobSize; }, [blobSize]);
  const alphaRef = useRef(markAlpha);
  useEffect(() => { alphaRef.current = markAlpha; }, [markAlpha]);
  const glRef = useRef<HTMLCanvasElement>(null);
  const glyphRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = root.current, glCanvas = glRef.current, glyphCanvas = glyphRef.current;
    if (!host || !glCanvas || !glyphCanvas) return;
    const gl = glCanvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) { host.classList.add("no-gl"); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;

    /* ── programs ── */
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("GLSL compile error:\n" + gl.getShaderInfoLog(s));
      return s;
    };
    const program = (vs: string, fs: string, names: string[]) => {
      const p = gl.createProgram()!;
      const v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
      gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); gl.deleteShader(v); gl.deleteShader(f);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("GLSL link error:\n" + gl.getProgramInfoLog(p));
      const u: Record<string, WebGLUniformLocation | null> = {};
      for (const n of names) u[n] = gl.getUniformLocation(p, n);
      return { prog: p, u };
    };
    let baseProg: ReturnType<typeof program>, puffProg: ReturnType<typeof program>;
    try {
      baseProg = program(QUAD_VERT, BASE_FRAG, ["uMask", "uAspect", "uMaskScale", "uTime", "uBlobPt", "uBlob", "uBlobR", "uFlow", "uHeavy", "uDissolve", "uFade",
        "uText", "uTextIn", "uTextForm", "uTextOut", "uTextH", "uStageOut", "uInk", "uSurface", "uMarkAlpha"]);
      puffProg = program(PUFF_VERT, PUFF_FRAG, ["uAtlas", "uAspect"]);
    } catch (e) {
      console.error(e); host.classList.add("no-gl"); return;
    }

    /* ── textures & buffers ── */
    const texParams = (mipmap = false) => {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    const atlasTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, smokeAtlas());
    gl.generateMipmap(gl.TEXTURE_2D);
    texParams(true);

    const screenVao = gl.createVertexArray()!;
    gl.bindVertexArray(screenVao);
    const screenVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, screenVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const MAX_PUFFS = 640, FPI = 12;
    const instanceData = new Float32Array(MAX_PUFFS * FPI);
    const puffVao = gl.createVertexArray()!;
    gl.bindVertexArray(puffVao);
    const cornerVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const instanceVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVbo);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, FPI * 4, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, FPI * 4, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, FPI * 4, 32);
    gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);

    /* ── glyph mask: the Grain mark, blurred like the demo's "4" ── */
    const MASK_SIZE = 768, MASK_GRID = 128;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = maskCanvas.height = MASK_SIZE;
    const maskCtx = maskCanvas.getContext("2d")!;
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleCanvas.height = MASK_GRID;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true })!;
    const maskGrid = new Float32Array(MASK_GRID * MASK_GRID);        // density (rings summed)
    const maskRGB = new Float32Array(MASK_GRID * MASK_GRID * 3);     // per-ring weights: rust, coral, peach
    const supportsFilter = (() => { try { maskCtx.filter = "blur(2px)"; const ok = maskCtx.filter === "blur(2px)"; maskCtx.filter = "none"; return ok; } catch { return false; } })();
    // the heading's mask (screen-aligned, host px, mipmapped for the blur) and the spots on it the puffs fly to
    const textCanvas = document.createElement("canvas");
    const tctx = textCanvas.getContext("2d", { willReadFrequently: true })!;
    const textTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    texParams();
    let textPts: number[] = [], textH = 1;
    let ink: [number, number, number] = [0.97, 0.95, 0.93], surface: [number, number, number] = [0.12, 0.1, 0.09];
    const parseRgb = (c: string): [number, number, number] | null => {
      const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
      return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : null;
    };
    // the heading's ink and How it runs' surface follow the theme and palette, so they're re-read now and then
    const readColours = () => {
      const el = textRef?.current;
      if (el) ink = parseRgb(getComputedStyle(el).color) ?? ink;
      const stage = host.closest<HTMLElement>(".hero");
      if (stage) surface = parseRgb(getComputedStyle(stage).backgroundColor) ?? surface;
    };
    const pickTextSpot = (p: Anchor) => {
      if (!textPts.length) return;
      const k = Math.floor(Math.random() * (textPts.length / 2)) * 2;
      p.tx = textPts[k]; p.ty = textPts[k + 1];
    };
    /** draw the heading word by word exactly where the (invisible) copy lays it out, then find spots on its letters */
    const buildText = () => {
      const el = textRef?.current;
      if (!el) return;
      const hr = host.getBoundingClientRect();
      const W = Math.max(1, Math.round(hr.width)), H = Math.max(1, Math.round(hr.height));
      textCanvas.width = W; textCanvas.height = H; textH = H;
      tctx.clearRect(0, 0, W, H);
      const cs = getComputedStyle(el);
      tctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      tctx.fillStyle = "#fff";
      tctx.textBaseline = "alphabetic";
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const txt = n.textContent ?? "", re = /\S+/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(txt))) {
          range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
          const r = range.getBoundingClientRect();
          if (!r.width) continue;
          const mt = tctx.measureText(m[0]);
          const asc = mt.fontBoundingBoxAscent || r.height * 0.8, desc = mt.fontBoundingBoxDescent || r.height * 0.2;
          // the word's box is the font's ascent + descent: centre the drawn font box in it, and squeeze it to the
          // box's width (the heading's negative letter-spacing)
          const baseline = r.top - hr.top + (r.height - (asc + desc)) / 2 + asc;
          tctx.save();
          tctx.translate(r.left - hr.left, baseline);
          tctx.scale(r.width / Math.max(1, mt.width), 1);
          tctx.fillText(m[0], 0, 0);
          tctx.restore();
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, textTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      texParams(true);
      const d = tctx.getImageData(0, 0, W, H).data, step = Math.max(2, Math.round(W / 260));
      textPts = [];
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) textPts.push(x / W, 1 - y / H);
      for (const p of anchorPuffs) pickTextSpot(p);
      readColours();
    };
    const maskTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    texParams(true);   // mipmapped: the hover blur reads softer levels as its radius grows

    let viewW = 1, viewH = 1, dpr = 1;
    let aspectVec: [number, number] = [1, 1];
    let maskScaleVec: [number, number] = [1, 1];

    /** the colour of the ring(s) under a mask cell: the three logo colours weighted by the cell's ring channels */
    const tintOf = (i: number): [number, number, number] => {
      if (i < 0) return CORAL;
      const r = maskRGB[i * 3], g = maskRGB[i * 3 + 1], b = maskRGB[i * 3 + 2], t = Math.max(1e-4, r + g + b);
      return [0, 1, 2].map((k) => (r * RUST[k] + g * CORAL[k] + b * PEACH[k]) / t) as [number, number, number];
    };

    /* ── puffs ── */
    const ANCHOR_COUNT = 115;
    const anchorPuffs: Anchor[] = [];
    const airDrift = (x: number, y: number, t: number) => {
      const a = Math.sin(x * 7.3 + t * 0.55) * Math.cos(y * 6.8 - t * 0.42);
      const b = Math.cos(x * 6.1 - t * 0.48) * Math.sin(y * 7.9 + t * 0.38);
      return { vx: (a - b * 0.6) * 0.045, vy: 0.022 + (b + a * 0.5) * 0.042 };
    };

    const rebuildAnchorPuffs = () => {
      anchorPuffs.length = 0;
      const cells: { mx: number; my: number; val: number; i: number }[] = [];
      for (let gy = 0; gy < MASK_GRID; gy++) for (let gx = 0; gx < MASK_GRID; gx++) {
        const i = gy * MASK_GRID + gx, val = maskGrid[i];
        if (val > 0.24) cells.push({ mx: (gx + 0.5) / MASK_GRID, my: 1.0 - (gy + 0.5) / MASK_GRID, val, i });
      }
      if (!cells.length) return;
      for (let i = 0; i < ANCHOR_COUNT; i++) {
        const cell = cells[Math.floor(Math.random() * cells.length)];
        const homeMx = cell.mx + (Math.random() - 0.5) * 0.018, homeMy = cell.my + (Math.random() - 0.5) * 0.018;
        anchorPuffs.push({
          tx: 0.5, ty: 0.5, stag: Math.random(), arc: 0.04 + Math.random() * 0.1,
          homeMx, homeMy,
          x: (homeMx - 0.5) / maskScaleVec[0] + 0.5, y: (homeMy - 0.5) / maskScaleVec[1] + 0.5,
          vx: 0, vy: 0, rot: Math.random() * Math.PI * 2, baseSpin: (Math.random() - 0.5) * 0.22, spin: 0,
          baseSize: 0.085 + Math.random() * 0.095, sizeBoost: 0,
          baseAlpha: (0.042 + Math.random() * 0.036) * Math.min(1, cell.val * 1.15),
          excite: 0, tile: Math.floor(Math.random() * 4), phase: Math.random() * Math.PI * 2, col: tintOf(cell.i),
        });
      }
      for (const p of anchorPuffs) pickTextSpot(p);
    };

    const updateGlyphMask = () => {
      maskCtx.save();
      maskCtx.globalCompositeOperation = "source-over";
      maskCtx.filter = "none"; maskCtx.shadowBlur = 0;
      maskCtx.fillStyle = "#000"; maskCtx.fillRect(0, 0, MASK_SIZE, MASK_SIZE);
      // the mark owns the stage (Shiva, 2026-11-23): 80% of the mask square, about 73% of the stage height on wide
      // screens, centred a little above the middle so the one line of text fits under it
      const cx = MASK_SIZE * 0.5, cy = MASK_SIZE * markY, size = MASK_SIZE * markSize;
      const blur = S.blur * (MASK_SIZE / 1024);
      // one ring per channel (R outer/rust, G middle/coral, B inner/peach), added so blurred edges keep both rings
      const chans = (a: number): [string, string, string] => [`rgba(255,0,0,${a})`, `rgba(0,255,0,${a})`, `rgba(0,0,255,${a})`];
      maskCtx.globalCompositeOperation = "lighter";
      if (supportsFilter) {
        maskCtx.filter = `blur(${blur.toFixed(1)}px)`;
        drawMark(maskCtx, cx, cy, size, chans(0.96));
        maskCtx.filter = `blur(${(blur * 3).toFixed(1)}px)`;   // a faint glow just outside the crisp body
        drawMark(maskCtx, cx, cy, size, chans(0.12));
      } else {
        maskCtx.shadowColor = "rgba(255,255,255,0.95)";
        maskCtx.shadowBlur = blur * 1.4;
        for (let i = 0; i < 3; i++) drawMark(maskCtx, cx, cy, size, chans(0.25));
        maskCtx.shadowBlur = blur * 0.7;
        drawMark(maskCtx, cx, cy, size, chans(0.85));
      }
      // no bottom dissolve: the demo's faded the "4"'s stem, here it would eat the mark's bottom ring and dots
      maskCtx.globalCompositeOperation = "source-over";
      maskCtx.filter = "none"; maskCtx.shadowBlur = 0;
      maskCtx.restore();

      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      sampleCtx.clearRect(0, 0, MASK_GRID, MASK_GRID);
      sampleCtx.drawImage(maskCanvas, 0, 0, MASK_GRID, MASK_GRID);
      const px = sampleCtx.getImageData(0, 0, MASK_GRID, MASK_GRID).data;
      for (let i = 0; i < MASK_GRID * MASK_GRID; i++) {
        const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
        maskRGB[i * 3] = r; maskRGB[i * 3 + 1] = g; maskRGB[i * 3 + 2] = b;
        maskGrid[i] = Math.min(1, r + g + b);
      }
      rebuildAnchorPuffs();
    };

    /* ── micro-glyphs: tiny drifting marks ── */
    const glyphCtx = glyphCanvas.getContext("2d")!;
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 48;
    drawMark(sprite.getContext("2d")!, 24, 24, 44);
    const MICRO_COUNT = 56;
    const NUDGE = 16, NUDGE_R = 110;   // the pointer's push on the tiny marks: max px, reach px
    const micro: Micro[] = [];
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    const initMicro = () => {
      micro.length = 0;
      for (let i = 0; i < MICRO_COUNT; i++) {
        const depth = 0.25 + Math.random() * 0.75;
        micro.push({ x: Math.random() * viewW, y: Math.random() * viewH, size: 7.5 + Math.random() * 3.8, opacity: 0.2 + Math.random() * 0.54, depth,
          vy: -(0.06 + depth * 0.16), vx: (Math.random() - 0.35) * 0.08, phase: Math.random() * Math.PI * 2,
          twinkleFreq: 0.35 + Math.random() * 0.75, swayFreq: 0.22 + Math.random() * 0.35, ox: 0, oy: 0 });
      }
    };
    const renderMicro = (t: number, k: number) => {
      glyphCtx.clearRect(0, 0, viewW, viewH);
      parallax.x += (parallax.tx - parallax.x) * Math.min(1, 0.055 * k);
      parallax.y += (parallax.ty - parallax.y) * Math.min(1, 0.055 * k);
      const pad = 26;
      for (const p of micro) {
        p.x += (p.vx + Math.sin(t * p.swayFreq + p.phase) * 0.05) * k;
        p.y += p.vy * k;
        if (p.y < -pad) { p.y = viewH + pad; p.x = Math.random() * viewW; }
        if (p.x < -pad) p.x = viewW + pad;
        if (p.x > viewW + pad) p.x = -pad;
        let x = p.x + parallax.x * p.depth * 14.0, y = p.y + parallax.y * p.depth * 14.0;
        // the pointer nudges nearby marks aside: up to NUDGE px straight away from it, fading out by NUDGE_R; they ease
        // there and glide back when it leaves
        let tx = 0, ty = 0;
        if (pointer.has) {
          const dx = x - pointer.x * viewW, dy = y - (1 - pointer.y) * viewH, d = Math.hypot(dx, dy);
          if (d < NUDGE_R) { const fall = 1 - d / NUDGE_R, push = NUDGE * fall * fall * (3 - 2 * fall); tx = (dx / (d || 1)) * push; ty = (dy / (d || 1)) * push; }
        }
        const ease = 1 - Math.pow(0.86, k);
        p.ox += (tx - p.ox) * ease; p.oy += (ty - p.oy) * ease;
        x += p.ox; y += p.oy;
        const floorFade = Math.min(1, Math.max(0.22, (viewH - y) / (viewH * 0.2)));
        glyphCtx.globalAlpha = p.opacity * (0.78 + 0.22 * Math.sin(t * p.twinkleFreq + p.phase)) * floorFade * (1 - stageOut);
        // a "4" at this font size is about 0.7× as tall as its size: the mark matches it
        const s = p.size * 0.72;
        glyphCtx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
      }
      glyphCtx.globalAlpha = 1;
    };

    /* ── sizing ── */
    const resizeAll = () => {
      const r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // soft content: 1.5× is plenty, and the boil is per pixel
      viewW = Math.max(1, r.width); viewH = Math.max(1, r.height);
      glCanvas.width = Math.round(viewW * dpr); glCanvas.height = Math.round(viewH * dpr);
      glyphCanvas.width = Math.round(viewW * dpr); glyphCanvas.height = Math.round(viewH * dpr);
      glyphCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const aspect = viewW / viewH;
      aspectVec = aspect >= 1 ? [aspect, 1] : [1, 1 / aspect];
      maskScaleVec = aspect >= 1 ? [aspect * 1.1, 1.1] : [1.18, (1 / aspect) * 1.18];
      for (const p of anchorPuffs) {
        p.x = (p.homeMx - 0.5) / maskScaleVec[0] + 0.5; p.y = (p.homeMy - 0.5) / maskScaleVec[1] + 0.5;
        p.vx = 0; p.vy = 0; p.excite = 0;
      }
      if (!micro.length) initMicro();
      else for (const p of micro) { p.x = Math.min(viewW, p.x); p.y = Math.min(viewH, p.y); }
    };

    /* ── pointer (relative to the host): only its position; moving it leaves nothing behind ── */
    const pointer = { x: 0.5, y: 0.5, has: false };
    const blob = { x: 0.5, y: 0.5, a: 0 };   // the hover blob: eased position and strength 0–1
    // how much hover the mark has had: dwell builds while over it (faster while stirring), heavy (0–1) follows it and
    // turns the mist's drift into a sink; flow is the integrated offset the shader reads
    let dwell = 0, heavy = 0;
    let dissolve = 0, fade = 0;   // scroll hand-off: the fog over the whole mark, and how far it has thinned away
    let morph = 0, puffOut = 0, stageOut = 0;   // puffs flying to the heading, fading once it's formed; atmosphere → surface
    const flow = [0, 0];
    /** is the pointer over the mark (its whole square, gaps between rings included, so the blob doesn't flicker)? */
    const overMark = (u: number, v: number) => {
      const mx = (u - 0.5) * maskScaleVec[0] + 0.5, my = (v - 0.5) * maskScaleVec[1] + 0.5;
      const half = markSize / 2 + 0.02;
      return Math.abs(mx - 0.5) < half && Math.abs(my - (1 - markY)) < half;
    };
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) { pointer.has = false; return; }
      const nx = (e.clientX - r.left) / viewW, ny = 1.0 - (e.clientY - r.top) / viewH;
      pointer.x = nx; pointer.y = ny; pointer.has = true;
      parallax.tx = (pointer.x - 0.5) * -1.0;
      parallax.ty = (1.0 - pointer.y - 0.5) * -1.0;
    };
    const onLeave = () => { pointer.has = false; };
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave, { passive: true });

    /* ── simulation & render ── */
    const updatePuffs = (dt: number, t: number) => {
      const dt60 = dt * 60.0;
      let count = 0;
      const springK = 0.016 + S.recondense * 1.4;
      const dampAnchor = Math.pow(0.925, dt60), exciteDecay = Math.pow(1.0 - S.recondense * 1.1, dt60);
      for (const p of anchorPuffs) {
        if (count >= MAX_PUFFS) break;
        const homeX = (p.homeMx - 0.5) / maskScaleVec[0] + 0.5, homeY = (p.homeMy - 0.5) / maskScaleVec[1] + 0.5;
        const bx = (Math.sin(t * 0.42 + p.phase) * 0.008) / aspectVec[0], by = (Math.cos(t * 0.36 + p.phase * 1.3) * 0.008) / aspectVec[1];
        // hand-off: once its turn comes (staggered), the puff flies from its spot on the mark to its spot on the
        // heading along a rising arc; scrolling back flies it home the same way
        const mv = smoothstep(0, 1, (morph - p.stag * 0.35) / 0.65);
        if (mv > 0.001) {
          const ease = mv * mv * (3 - 2 * mv);
          p.x = homeX + (p.tx - homeX) * ease + bx * (1 - mv);
          p.y = homeY + (p.ty - homeY) * ease + Math.sin(mv * Math.PI) * p.arc + by * (1 - mv);
          p.vx = 0; p.vy = 0;
        } else {
          p.vx += (homeX + bx - p.x) * aspectVec[0] * springK * dt60 * 0.14;
          p.vy += (homeY + by - p.y) * aspectVec[1] * springK * dt60 * 0.14;
          const dr = airDrift(p.x * aspectVec[0], p.y * aspectVec[1], t);
          p.vx += dr.vx * p.excite * 0.25 * S.turbulence * dt;
          p.vy += dr.vy * p.excite * 0.25 * S.turbulence * dt;
          p.vx *= dampAnchor; p.vy *= dampAnchor;
          p.x += (p.vx * dt) / aspectVec[0]; p.y += (p.vy * dt) / aspectVec[1];
        }
        p.spin *= Math.pow(0.95, dt60);
        p.rot += (p.baseSpin * S.turbulence + p.spin) * dt;
        p.excite *= exciteDecay;
        p.sizeBoost *= Math.pow(0.965, dt60);
        // under the hover blob the puffs wake up: brighter, a little bigger, drifting on the air current (they keep
        // their spring home, so they churn in place); at rest they stay faint so the mark reads clean
        const ox = (p.x - blob.x) * aspectVec[0], oy = (p.y - blob.y) * aspectVec[1];
        const w = Math.exp(-(ox * ox + oy * oy) / (blobR.current * blobR.current)) * blob.a;
        p.excite = Math.max(p.excite, w, dissolve);
        if (mv <= 0.001) p.vy += dissolve * 0.06 * dt60;   // the puffs lift with the rising mist (their spring keeps them near)
        p.sizeBoost = Math.max(p.sizeBoost, w * 0.5);
        const o = count * FPI;
        instanceData[o] = p.x; instanceData[o + 1] = p.y;
        // in flight they shrink toward the size of a letter stroke and brighten; once the heading has formed they go
        const travel = mv * (1 - mv) * 4;
        instanceData[o + 2] = p.baseSize * (1.0 + p.sizeBoost * 0.95 * S.expansion) * (1 - mv * 0.7);
        instanceData[o + 3] = p.rot;
        instanceData[o + 4] = p.baseAlpha * S.density * (0.35 + p.excite * 0.6 + w * 1.6 + travel * 1.4) * Math.max(1 - fade, mv) * (1 - puffOut) * alphaRef.current;
        instanceData[o + 5] = p.tile; instanceData[o + 6] = p.excite * 0.55; instanceData[o + 7] = 0.25 + p.sizeBoost * 0.45;
        // and they take on the heading's ink as they land
        const ci = mv * 0.85;
        instanceData[o + 8] = p.col[0] + (ink[0] - p.col[0]) * ci;
        instanceData[o + 9] = p.col[1] + (ink[1] - p.col[1]) * ci;
        instanceData[o + 10] = p.col[2] + (ink[2] - p.col[2]) * ci;
        count++;
      }
      return count;
    };

    const bindTex = (unit: number, tex: WebGLTexture) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); };

    let colourTick = 0;
    const frame = (dt: number, t: number) => {
      const sp = progress?.current ?? 0;
      dissolve = smoothstep(0.02, 0.35, sp);
      fade = smoothstep(0.18, 0.48, sp);
      morph = smoothstep(0.22, 0.6, sp);
      puffOut = smoothstep(0.6, 0.8, sp);
      stageOut = smoothstep(0.3, 0.6, sp);
      const textIn = smoothstep(0.34, 0.56, sp), textForm = smoothstep(0.42, 0.8, sp), textOut = smoothstep(0.78, 0.9, sp);
      // past the hand-off the real heading has taken over and the canvas is faded (CSS): nothing to draw
      if (sp > 0.97) return;
      if (++colourTick % 30 === 0) readColours();
      // the hover blob: shows only over the mark, follows the pointer with a little ease, fades in and out
      const over = pointer.has && alphaRef.current > 0 && overMark(pointer.x, pointer.y);
      if (blob.a < 0.01) { blob.x = pointer.x; blob.y = pointer.y; }   // it appears where the pointer is
      const follow = 1 - Math.pow(0.78, dt * 60);
      blob.x += (pointer.x - blob.x) * follow; blob.y += (pointer.y - blob.y) * follow;
      blob.a += ((over ? 1 : 0) - blob.a) * (1 - Math.pow(over ? 0.9 : 0.92, dt * 60));
      // a long hover (over HEAVY_AFTER seconds on the mark): the mist slowly turns to sink, at the same gentle speed;
      // once the pointer leaves it eases back to drifting right
      dwell = over ? Math.min(HEAVY_AFTER + HEAVY_RAMP + 1, dwell + dt) : Math.max(0, dwell - dt * 3);
      const ht = Math.min(1, Math.max(0, (dwell - HEAVY_AFTER) / HEAVY_RAMP)), heavyT = ht * ht * (3 - 2 * ht);
      heavy += (heavyT - heavy) * (1 - Math.pow(0.96, dt * 60));
      const fx = DRIFT[0] + (SINK[0] - DRIFT[0]) * heavy, fy = DRIFT[1] + (SINK[1] - DRIFT[1]) * heavy;
      flow[0] += (fx + (RISE[0] - fx) * dissolve) * dt;
      flow[1] += (fy + (RISE[1] - fy) * dissolve) * dt;

      // pass 2: atmosphere + vapour glyph
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      gl.useProgram(baseProg.prog);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(screenVao);
      bindTex(0, maskTex);
      gl.uniform1i(baseProg.u.uMask, 0);
      gl.uniform2f(baseProg.u.uBlobPt, blob.x, blob.y);
      gl.uniform1f(baseProg.u.uBlob, blob.a);
      gl.uniform1f(baseProg.u.uBlobR, blobR.current);
      gl.uniform2f(baseProg.u.uFlow, flow[0], flow[1]);
      gl.uniform1f(baseProg.u.uHeavy, heavy);
      gl.uniform1f(baseProg.u.uDissolve, dissolve);
      gl.uniform1f(baseProg.u.uFade, fade);
      bindTex(1, textTex);
      gl.uniform1i(baseProg.u.uText, 1);
      gl.uniform1f(baseProg.u.uTextIn, textIn);
      gl.uniform1f(baseProg.u.uTextForm, textForm);
      gl.uniform1f(baseProg.u.uTextOut, textOut);
      gl.uniform1f(baseProg.u.uTextH, textH);
      gl.uniform1f(baseProg.u.uStageOut, stageOut);
      gl.uniform3f(baseProg.u.uInk, ink[0], ink[1], ink[2]);
      gl.uniform3f(baseProg.u.uSurface, surface[0], surface[1], surface[2]);
      gl.uniform1f(baseProg.u.uMarkAlpha, alphaRef.current);
      gl.uniform2f(baseProg.u.uAspect, aspectVec[0], aspectVec[1]);
      gl.uniform2f(baseProg.u.uMaskScale, maskScaleVec[0], maskScaleVec[1]);
      gl.uniform1f(baseProg.u.uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // pass 3: puffs
      const n = updatePuffs(dt, t);
      if (n > 0) {
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(puffProg.prog);
        bindTex(0, atlasTex);
        gl.uniform1i(puffProg.u.uAtlas, 0);
        gl.uniform2f(puffProg.u.uAspect, aspectVec[0], aspectVec[1]);
        gl.bindVertexArray(puffVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceVbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData.subarray(0, n * FPI));
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
      }

      renderMicro(t, dt * 60.0);
    };

    // run only while the stage is on screen
    let raf = 0, visible = true, last = performance.now();
    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.033, Math.max(0.004, (now - last) / 1000));
      last = now;
      frame(dt, now * 0.001);
      if (visible && !reduce) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(host);

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { resizeAll(); buildText(); if (reduce) kick(); }, 90);
    });
    ro.observe(host);

    resizeAll();
    updateGlyphMask();
    buildText();
    // the heading's font may still be loading: redraw its mask once it's in
    document.fonts?.ready.then(() => { if (alive) buildText(); });
    kick();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      io.disconnect(); ro.disconnect();
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gl.deleteProgram(baseProg.prog); gl.deleteProgram(puffProg.prog);
      alive = false;
      for (const t of [atlasTex, maskTex, textTex]) gl.deleteTexture(t);
      for (const b of [screenVbo, cornerVbo, instanceVbo]) gl.deleteBuffer(b);
      gl.deleteVertexArray(screenVao); gl.deleteVertexArray(puffVao);
    };
  }, [markSize, markY]);

  return (
    <div ref={root} className={className} aria-hidden="true">
      <canvas ref={glRef} className="vapour-hero-gl" />
      <canvas ref={glyphRef} className="vapour-hero-glyphs" />
    </div>
  );
}
