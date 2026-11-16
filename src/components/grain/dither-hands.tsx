// Copied from Originkit Hero 40's dither-reveal.tsx.
// Grain changes:
//  - the two dither tints are props (`dark`, `light`, RGB 0–1) instead of hard-coded purple;
//  - an opening animation (`intro`): the shader splits the image at the gap between the fingertips,
//    so each hand slides in on its own and they reach toward each other while the dots sharpen;
//  - `cutout`: use the image's own transparency instead of keying out near-white, so bright skin
//    highlights stay solid (keying turned them into see-through holes on the dark theme);
//  - the touch (`scrollRef`, 0–1): as the page scrolls the hands close the gap; on contact a dithered
//    spark flashes, light spills onto both hands, and a ring of ASCII characters ripples outward;
//  - at rest, a living ASCII layer on the hands: a diagonal scan band turns the dither into
//    characters as it sweeps, and random cells flicker into a character and back;
//  - the portal: the ripple opens a hole into the next section. Inside, a living ASCII field seen
//    through a glass lens (bulge, slow undulation, chromatic rim, the scene bending around the edge),
//    using the same techniques as React Bits' WarpText, applied to the hole instead of to text.
/* eslint-disable */
// @ts-nocheck
// Dither Reveal — Originkit
// Originkit — props baked into the default export.
"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const DEFAULT_IMAGE =
  "https://plus.unsplash.com/premium_photo-1726099913477-291d8ca697f8?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YWVzdGhldGljJTIwY29sb3JmdWwlMjBwb3J0cmFpdCUyMGZ1dHVyaXN0aWN8ZW58MHx8MHx8fDA%3D";

const DITHER_INDEX: Record<string, number> = {
  bayer8: 0,
  lines: 1,
  noise: 2,
};

const DEFAULTS = {
  image: { src: DEFAULT_IMAGE },
  fit: "cover" as "cover" | "contain",
  focusY: 50,
  ditherStyle: "bayer8" as "bayer8" | "lines" | "noise",
  dotSize: 5,
  revealRadius: 100,
  revealSoftness: 50,
  wave: true,
  waveSpeed: 82,
  waveDensity: 25,
};

interface DitherRevealProps {
  image?: { src?: string; url?: string; alt?: string } | string;
  fit?: "cover" | "contain";
  focusY?: number;
  ditherStyle?: "bayer8" | "lines" | "noise";
  dotSize?: number;
  revealRadius?: number;
  revealSoftness?: number;
  wave?: boolean;
  waveSpeed?: number;
  waveDensity?: number;
  style?: CSSProperties;
  dark?: [number, number, number];
  light?: [number, number, number];
  /** play the reaching-hands opening animation */
  intro?: boolean;
  /** where the fingertips almost touch, in image UV (0–1, y up) */
  gap?: [number, number];
  /** called once the image has loaded and the opening animation actually starts */
  onIntroStart?: () => void;
  /** the image has a real transparent background (PNG alpha); don't key out near-white */
  cutout?: boolean;
  /** scroll progress through the hero, 0–1 (read every frame, no re-render) */
  scrollRef?: { current: number };
  /** where the fingertips meet, in image UV (0–1, y up) */
  contact?: [number, number];
  /** how far each hand travels to touch, in image units (half the fingertip gap) */
  touchDistance?: number;
  /** spark colours (RGB 0–1): the light itself and its hottest centre */
  sparkColor?: [number, number, number];
  sparkCore?: [number, number, number];
  /** element to receive --rx / --ry / --rr (px): the ripple's centre and radius, so the next
      section can be revealed through it with clip-path: circle(var(--rr) at var(--rx) var(--ry)) */
  revealRef?: { current: HTMLElement | null };
  /** the next section's colours (RGB 0–1): portal background and the ASCII inside it */
  nextBg?: [number, number, number];
  nextGlyph?: [number, number, number];
}

function clamp(n: any, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : parseFloat(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function imageURL(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.src || value.url || "";
}

function settings(p: DitherRevealProps) {
  const waveOn = p?.wave ?? DEFAULTS.wave;
  const speed = waveOn
    ? clamp(p?.waveSpeed, 1, 100, DEFAULTS.waveSpeed) / 100
    : 0;
  return {
    fit: (p?.fit ?? DEFAULTS.fit) === "contain" ? 1 : 0,
    focusY: clamp(p?.focusY, 0, 100, DEFAULTS.focusY) / 100,
    ditherStyle: p?.ditherStyle ?? DEFAULTS.ditherStyle,
    pixelSize: clamp(p?.dotSize, 1, 20, DEFAULTS.dotSize) / 2,
    revealRadius: clamp(p?.revealRadius, 20, 600, DEFAULTS.revealRadius),
    revealSoftness:
      clamp(p?.revealSoftness, 0, 100, DEFAULTS.revealSoftness) / 100,
    waveSpeed: speed,
    waveFrequency: clamp(p?.waveDensity, 5, 100, DEFAULTS.waveDensity) / 10,
    waveAmplitude: speed * 0.4,
    waveMargin: speed * 0.4 * 0.15,
  };
}

function __OriginkitBase_DitherReveal(props: DitherRevealProps) {
  const {
    image = DEFAULTS.image,
    fit = DEFAULTS.fit,
    focusY = DEFAULTS.focusY,
    ditherStyle = DEFAULTS.ditherStyle,
    dotSize = DEFAULTS.dotSize,
    revealRadius = DEFAULTS.revealRadius,
    revealSoftness = DEFAULTS.revealSoftness,
    wave = DEFAULTS.wave,
    waveSpeed = DEFAULTS.waveSpeed,
    waveDensity = DEFAULTS.waveDensity,
    style,
    dark = [0.2, 0.06, 0.38],
    light = [0.73, 0.57, 0.93],
    intro = false,
    gap = [0.4753, 0.511],
    onIntroStart,
    cutout = false,
    scrollRef,
    contact = [0.4744, 0.522],
    touchDistance = 0.0198,
    sparkColor = [1.0, 0.62, 0.5],
    sparkCore = [1.0, 0.95, 0.9],
    revealRef,
    nextBg = [0.165, 0.082, 0.071],
    nextGlyph = [0.84, 0.56, 0.49],
  } = props;
  const introRef = useRef({ intro, gap, onIntroStart, cutout });
  introRef.current = { intro, gap, onIntroStart, cutout };
  const fxRef = useRef({ scrollRef, contact, touchDistance, sparkColor, sparkCore, revealRef, nextBg, nextGlyph });
  fxRef.current = { scrollRef, contact, touchDistance, sparkColor, sparkCore, revealRef, nextBg, nextGlyph };
  const tintRef = useRef({ dark, light });
  tintRef.current = { dark, light };

  const S = settings({
    fit,
    focusY,
    ditherStyle,
    dotSize,
    revealRadius,
    revealSoftness,
    wave,
    waveSpeed,
    waveDensity,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const liveRef = useRef(S);
  liveRef.current = S;
  const inViewRef = useRef(true);

  const imgUrl = imageURL(image) || DEFAULT_IMAGE;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    function compile(type: number, source: string) {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, source);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        console.warn("DitherReveal shader:", gl!.getShaderInfoLog(sh));
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("DitherReveal link:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uTime = u("uTime");
    const uMouse = u("uMouse");
    const uMouseActive = u("uMouseActive");
    const uRevealRadius = u("uRevealRadius");
    const uRevealSoftness = u("uRevealSoftness");
    const uPixelSize = u("uPixelSize");
    const uDitherStyle = u("uDitherStyle");
    const uWaveSpeed = u("uWaveSpeed");
    const uWaveFrequency = u("uWaveFrequency");
    const uWaveAmplitude = u("uWaveAmplitude");
    const uWaveMargin = u("uWaveMargin");
    const uCanvasAspect = u("uCanvasAspect");
    const uImageAspect = u("uImageAspect");
    const uResolution = u("uResolution");
    const uFit = u("uFit");
    const uFocusY = u("uFocusY");
    const uDark = u("uDark");
    const uLight = u("uLight");
    const uReachL = u("uReachL");
    const uReachR = u("uReachR");
    const uPixelBoost = u("uPixelBoost");
    const uFade = u("uFade");
    const uBead = u("uBead");
    const uGap = u("uGap");
    const uCutout = u("uCutout");
    const uSpark = u("uSpark");
    const uBurst = u("uBurst");
    const uWaveR = u("uWaveR");
    const uContact = u("uContact");
    const uCanvasPx = u("uCanvasPx");
    const uSparkColor = u("uSparkColor");
    const uSparkCore = u("uSparkCore");
    const uMotion = u("uMotion");
    const uHoleR = u("uHoleR");
    const uNextBg = u("uNextBg");
    const uNextGlyph = u("uNextGlyph");
    const uAsciiAmt = u("uAsciiAmt");
    const uRingIn = u("uRingIn");
    const uHoleIn = u("uHoleIn");
    gl.uniform1i(u("uTexture"), 0);
    gl.uniform1i(u("uGlyphs"), 1);

    // ASCII glyph atlas: one row of characters, light to dense. Drawn on a 2D canvas, used by the ripple.
    const GLYPHS = " .:-=+*#%@";
    const glyphTex = gl.createTexture();
    function drawGlyphs(font: string) {
      const S = 48;
      const c = document.createElement("canvas");
      c.width = S * GLYPHS.length; c.height = S;
      const g = c.getContext("2d")!;
      g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `${Math.round(S * 0.78)}px ${font}`;
      for (let i = 0; i < GLYPHS.length; i++) g.fillText(GLYPHS[i], i * S + S / 2, S / 2 + 2);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, glyphTex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, c);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.activeTexture(gl!.TEXTURE0);
    }
    // touch timeline state
    let touchedAt = 0;          // when the fingertips last met (ms); 0 = not touching
    const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // opening timeline (seconds)
    const REACH = 0.62;          // how far apart the hands start, as a share of the image height
    const DUR = 2.4;
    const RING_REACH = 0.62;     // ring radius at the end of the scroll, in image-height units (must match lightAt)
    const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([20, 20, 20, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    drawGlyphs('"Disket Mono", ui-monospace, monospace');
    document.fonts?.load('40px "Disket Mono"').then(() => drawGlyphs('"Disket Mono", ui-monospace, monospace')).catch(() => {});

    let imgAspect = 1.5;
    let introStart = 0; // 0 = image not loaded yet
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalHeight > 0)
        imgAspect = img.naturalWidth / img.naturalHeight;
      // the opening starts only once there is something to show
      introStart = performance.now();
      introRef.current.onIntroStart?.();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      try {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img,
        );
      } catch {
        // A host without CORS headers taints the upload — keep the
        // placeholder rather than tearing the effect down.
      }
    };
    img.onerror = () =>
      console.warn("DitherReveal: image failed to load:", imgUrl);
    img.src = imgUrl;

    const mouse = { x: 0.5, y: 0.5, active: 0, target: 0, entered: false };

    function onMove(e: PointerEvent) {
      const r = container!.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
      mouse.entered = true;
      mouse.target = 1;
    }
    const onEnter = () => (mouse.target = 1);
    const onLeave = () => (mouse.target = 0);
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerenter", onEnter);
    container.addEventListener("pointerleave", onLeave);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas!.width = Math.max(1, Math.floor(container!.clientWidth * dpr));
      canvas!.height = Math.max(1, Math.floor(container!.clientHeight * dpr));
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const io = new IntersectionObserver(
      ([entry]) => (inViewRef.current = entry.isIntersecting),
      { threshold: 0.01 },
    );
    io.observe(container);

    const start = performance.now();
    let raf = 0;
    function render() {
      raf = requestAnimationFrame(render);
      const L = liveRef.current;
      if (!inViewRef.current) return;

      const now = performance.now();
      mouse.active += (mouse.target - mouse.active) * 0.08;

      gl!.uniform1f(uTime, (now - start) / 1000);
      gl!.uniform2f(uMouse, mouse.x, mouse.y);
      gl!.uniform1f(uMouseActive, mouse.entered ? mouse.active : 0);
      gl!.uniform1f(uRevealRadius, L.revealRadius);
      gl!.uniform1f(uRevealSoftness, L.revealSoftness);
      gl!.uniform1f(uPixelSize, L.pixelSize);
      gl!.uniform1f(uDitherStyle, DITHER_INDEX[L.ditherStyle] ?? 0);
      gl!.uniform1f(uWaveSpeed, L.waveSpeed);
      gl!.uniform1f(uWaveFrequency, L.waveFrequency);
      gl!.uniform1f(uWaveAmplitude, L.waveAmplitude);
      gl!.uniform1f(uWaveMargin, L.waveMargin);
      gl!.uniform1f(uCanvasAspect, canvas!.width / canvas!.height);
      gl!.uniform1f(uImageAspect, imgAspect);
      gl!.uniform2f(
        uResolution,
        container!.clientWidth || 1,
        container!.clientHeight || 1,
      );
      gl!.uniform1f(uFit, L.fit);
      gl!.uniform1f(uFocusY, L.focusY);
      gl!.uniform3fv(uDark, tintRef.current.dark);
      gl!.uniform3fv(uLight, tintRef.current.light);
      {
        const I = introRef.current;
        const t = introStart ? (now - introStart) / 1000 : 0;
        const play = I.intro && !reduceMotion;
        const eL = play ? easeOut((t - 0.15) / DUR) : 1;          // robot hand
        const eR = play ? easeOut((t - 0.45) / DUR) : 1;          // human hand answers a beat later
        // Scroll-driven touch, staged so nothing pops in:
        //   0 → 0.26   the hands close the gap (a faint charge builds as they near)
        //   0.22 → 0.36 the spark swells in, flares gently, settles
        //   0.30 → 0.42 the ripple fades in while it starts to spread
        //   0.42 → 1    the portal opens from a pinpoint (slow start), rim and ASCII fade in
        const F = fxRef.current;
        const p = Math.min(1, Math.max(0, F.scrollRef?.current ?? 0));
        const TOUCH = 0.26;
        const touch = smooth(0, TOUCH, p);
        if (p >= TOUCH && !touchedAt) touchedAt = now;
        if (p < TOUCH - 0.02) touchedAt = 0;      // scroll back up and it can happen again
        const tt = touchedAt ? (now - touchedAt) / 1000 : 0;
        const burst = touchedAt ? (1 - Math.exp(-tt * 4)) * Math.exp(-tt * 1.1) : 0;   // rises over ~0.4s, fades over ~1s
        const sparkIn = smooth(TOUCH - 0.04, TOUCH + 0.1, p);
        const charge = 0.16 * smooth(TOUCH - 0.1, TOUCH, p);
        const glow = Math.max(charge, sparkIn * (0.6 + 0.4 * burst)) * (1 - 0.45 * smooth(0.8, 1, p));
        gl!.uniform1f(uRingIn, smooth(0.3, 0.42, p));
        gl!.uniform1f(uHoleIn, smooth(0.42, 0.56, p));
        const holeP = Math.min(1, Math.max(0, (p - 0.42) / 0.58));
        const holeE = holeP * holeP * (3 - 2 * holeP);           // slow start, always inside the ring
        const waveP = Math.min(1, Math.max(0, (p - 0.3) / 0.7));
        gl!.uniform1f(uReachL, REACH * (1 - eL) - F.touchDistance * touch);
        gl!.uniform1f(uReachR, REACH * (1 - eR) - F.touchDistance * touch);
        // the light between the fingertips waits for both hands to arrive, then fades in slowly from a blur
        const bk = Math.min(1, Math.max(0, (t - (0.45 + DUR) + 0.1) / 2.0));
        const beadIn = play ? bk * bk * (3 - 2 * bk) : 1;     // slow in, slow out
        gl!.uniform1f(uBead, Math.min(1, Math.max(0, beadIn)));
        gl!.uniform1f(uSpark, glow);
        gl!.uniform1f(uBurst, burst);
        const waveR = waveP * waveP * (3 - 2 * waveP);          // ring progress, eased in and out
        gl!.uniform1f(uWaveR, waveR);
        gl!.uniform1f(uHoleR, holeE * RING_REACH * 0.97);        // portal radius: trails the ring (same as the clip circle)
        gl!.uniform3fv(uNextBg, F.nextBg);
        gl!.uniform3fv(uNextGlyph, F.nextGlyph);
        gl!.uniform1f(uAsciiAmt, 1 - smooth(0.8, 0.96, p));     // ASCII clears away so the section's text reads cleanly

        // Tell the page where the ring is on screen, using the same mapping as fitUv() in the shader,
        // so the next section opens through exactly that circle.
        const el = F.revealRef?.current;
        if (el) {
          const cA = canvas!.width / canvas!.height;
          const k = 1 + 2 * L.waveMargin;
          const sx = (cA < imgAspect ? cA / imgAspect : 1) / k;
          const sy = (cA < imgAspect ? 1 : imgAspect / cA) / k;
          const cw = container!.clientWidth, ch = container!.clientHeight;
          const cr = container!.getBoundingClientRect(), er = el.getBoundingClientRect();
          const x = ((F.contact[0] - 0.5) / sx + 0.5) * cw + (cr.left - er.left);
          const y = (1 - ((F.contact[1] - 0.5) / sy + 0.5)) * ch + (cr.top - er.top);
          const r = holeE * RING_REACH * (ch / sy) * 0.97;       // same radius the shader uses for the portal
          el.style.setProperty("--rx", `${x.toFixed(1)}px`);
          el.style.setProperty("--ry", `${y.toFixed(1)}px`);
          el.style.setProperty("--rr", `${Math.max(0, r).toFixed(1)}px`);
        }
        gl!.uniform2f(uContact, F.contact[0], F.contact[1]);
        gl!.uniform2f(uCanvasPx, canvas!.width, canvas!.height);
        gl!.uniform3fv(uSparkColor, F.sparkColor);
        gl!.uniform3fv(uSparkCore, F.sparkCore);
        gl!.uniform1f(uMotion, reduceMotion ? 0 : 1);
        gl!.uniform1f(uPixelBoost, 1 + 3 * (1 - Math.min(eL, eR)));  // coarse dots that sharpen on arrival
        gl!.uniform1f(uFade, play ? (introStart ? Math.min(1, t / 0.7) : 0) : 1);
        gl!.uniform2f(uGap, I.gap[0], I.gap[1]);
        gl!.uniform1f(uCutout, I.cutout ? 1 : 0);
      }
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      img.onload = null;
      img.onerror = null;
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerenter", onEnter);
      container.removeEventListener("pointerleave", onLeave);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteTexture(glyphTex);
    };
  }, [imgUrl]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uRevealRadius;
uniform float uRevealSoftness;
uniform float uPixelSize;
uniform float uDitherStyle;

uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uWaveMargin;

uniform float uCanvasAspect;
uniform float uImageAspect;
uniform vec2 uResolution;
uniform float uFit;
uniform float uFocusY;
uniform vec3 uDark;
uniform vec3 uLight;
uniform float uReachL;
uniform float uReachR;
uniform float uPixelBoost;
uniform float uFade;
uniform float uBead;      // 0→1: the fingertip light fading in after the intro
uniform vec2 uGap;
uniform float uCutout;
uniform sampler2D uGlyphs;
uniform float uSpark;      // steady light at the touch point
uniform float uBurst;      // flash at the moment of contact, decays
uniform float uWaveR;      // scroll-driven ripple radius, 0–1
uniform vec2 uContact;     // touch point, image UV
uniform vec2 uCanvasPx;    // canvas size in device pixels
uniform vec3 uSparkColor;
uniform vec3 uSparkCore;
uniform float uMotion;     // 0 when the visitor prefers reduced motion
uniform float uHoleR;      // portal radius, image-height units
uniform vec3 uNextBg;      // next section background
uniform vec3 uNextGlyph;   // ASCII colour inside the portal
uniform float uAsciiAmt;   // 1 = full ASCII field, 0 = plain (end of the scroll)
uniform float uRingIn;     // ripple fade-in
uniform float uHoleIn;     // portal fade-in

// value noise + fbm (the glass undulation, as in WarpText)
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm2(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
    return v;
}
// one ASCII character from a drifting noise field, at pixel position pos
float asciiField(vec2 pos, float cs, float t) {
    vec2 cell = floor(pos / cs);
    vec2 local = fract(pos / cs);
    float n = fbm2(cell * 0.085 + vec2(t * 0.16, -t * 0.12));
    n += (hash21(cell + floor(t * 7.0)) - 0.5) * 0.18;           // a little flicker
    float level = clamp((n - 0.3) * 2.1, 0.0, 1.0);
    float idx = floor(level * 9.99);
    return texture2D(uGlyphs, vec2((idx + local.x) / 10.0, local.y)).r;
}

// direction the hands reach along (image space, aspect-corrected): bottom-left -> top-right
const vec2 REACH_DIR = vec2(0.8762, 0.4819);

// sample one hand: transparent white wherever the sample falls outside the image or on the other hand's side of the gap
vec4 sampleHand(vec2 uv, float side) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(1.0, 1.0, 1.0, 0.0);
    vec2 q = vec2(uv.x * uImageAspect, uv.y);
    vec2 q0 = vec2(uGap.x * uImageAspect, uGap.y);
    if (dot(q - q0, REACH_DIR) * side < 0.0) return vec4(1.0, 1.0, 1.0, 0.0);
    return texture2D(uTexture, uv);
}

varying vec2 vUv;

float Bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x * 0.5 + a.y * a.y * 0.75);
}
float Bayer4(vec2 a) { return Bayer2(a * 0.5) * 0.25 + Bayer2(a); }
float Bayer8(vec2 a) { return Bayer4(a * 0.5) * 0.25 + Bayer2(a); }

float ign(vec2 p) {
    return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

float ordered3(float gray, float thr) {
    float adj = gray + (thr - 0.5) * 0.5;
    return adj < 0.33 ? 0.0 : (adj < 0.66 ? 0.5 : 1.0);
}

float ditherTone(float gray, float ps) {
    vec2 fc = gl_FragCoord.xy / ps;
    if (uDitherStyle < 0.5) {
        return ordered3(gray, Bayer8(fc));
    } else if (uDitherStyle < 1.5) {
        float period = ps * 4.0;
        float v = fract((gl_FragCoord.x + gl_FragCoord.y) / period);
        return 1.0 - step(v, 1.0 - gray);
    }
    return step(ign(fc), gray);
}

vec2 fitUv(vec2 uv);

// Siri-style colour: cyan, raspberry and violet lobes that turn slowly around a point
vec3 siriAt(vec2 d, float t) {
    float a = atan(d.y, d.x);
    vec3 cyan = vec3(0.13, 0.83, 0.93), magenta = vec3(0.91, 0.14, 0.44), violet = vec3(0.69, 0.55, 1.0);
    // every lobe always contributes a little, and the mix is normalised by the true total, so between
    // lobes the colour is a blend of them, never a dark gap
    float w1 = 0.12 + pow(max(cos(a - 2.3 - t * 0.55), 0.0), 2.0);
    float w2 = 0.12 + pow(max(cos(a + 1.7 + t * 0.45), 0.0), 2.0);
    float w3 = 0.12 + pow(max(cos(a - 0.2 - t * 0.65), 0.0), 2.0);
    return (cyan * w1 + magenta * w2 + violet * w3) / (w1 + w2 + w3);
}

// both hands sampled at image point b (same split + reach offsets as the main pass)
vec4 handAt(vec2 b) {
    vec2 offUv = vec2(REACH_DIR.x / uImageAspect, REACH_DIR.y);
    vec4 a = sampleHand(b + offUv * uReachL, -1.0);
    vec4 c = sampleHand(b - offUv * uReachR, 1.0);
    float sa = mix(1.0 - dot(a.rgb, vec3(0.333)), a.a, uCutout);
    float sc = mix(1.0 - dot(c.rgb, vec3(0.333)), c.a, uCutout);
    return sa >= sc ? a : c;
}

// light from the touch point at image-space point sUv. Returns the glow; ringOut gets the ripple.
float lightAt(vec2 sUv, out float ringOut) {
    vec2 d = (sUv - uContact) * vec2(uImageAspect, 1.0);
    float r = length(d);
    float core = uSpark * exp(-r * r / (0.0004 + 0.0028 * uBurst));
    float halo = uSpark * 0.45 * exp(-r * 15.0) + uBurst * 0.4 * exp(-r * 6.0);
    // the big ripple, pushed outward by scrolling
    float R = uWaveR * 0.62;               // ~0.62 image units reaches the screen corners (RING_REACH in JS)
    float w = 0.028 + 0.06 * uWaveR;
    float ring = 0.0;
    if (uWaveR > 0.001) {
        ring += exp(-pow((r - R) / w, 2.0)) * (1.0 - 0.5 * uWaveR) * uRingIn;
        ring += 0.55 * exp(-pow((r - R * 0.62) / (w * 0.6), 2.0)) * (1.0 - uWaveR) * uRingIn;   // echo
    }
    // small rings that keep pulsing from the touch point while the hands are together
    float rip = 0.0;
    for (int k = 0; k < 3; k++) {
        float rr = fract(uTime * 0.26 * uMotion + float(k) / 3.0) * 0.3;
        rip += exp(-pow((r - rr) / 0.011, 2.0)) * (1.0 - rr / 0.3);
    }
    ring += rip * uSpark * 0.35;            // softer pulse rings
    ringOut = ring;
    return core + halo;
}

vec2 fitUv(vec2 uv) {
    vec2 cover = uCanvasAspect < uImageAspect
        ? vec2(uCanvasAspect / uImageAspect, 1.0)
        : vec2(1.0, uImageAspect / uCanvasAspect);
    vec2 s = uFit > 0.5 ? 1.0 / cover : cover / (1.0 + 2.0 * uWaveMargin);
    vec2 out_ = (uv - 0.5) * s + 0.5;
    out_.y += (1.0 - s.y) * (0.5 - uFocusY) * step(s.y, 1.0);
    return out_;
}

void main() {
    vec2 uv = vUv;
    float time = uTime;
    float waveStrength = uWaveAmplitude * 0.1;
    float revealNorm = uRevealRadius / max(min(uResolution.x, uResolution.y), 1.0);

    float wave1 = sin(uv.y * uWaveFrequency + time * uWaveSpeed) * waveStrength;
    float wave2 = sin(uv.x * uWaveFrequency * 0.7 + time * uWaveSpeed * 0.8) * waveStrength * 0.5;

    vec2 distortedUv = uv;
    distortedUv.x += wave1;
    distortedUv.y += wave2;

    // ── portal geometry, in device pixels ──
    vec2 sc = (uCanvasAspect < uImageAspect
        ? vec2(uCanvasAspect / uImageAspect, 1.0)
        : vec2(1.0, uImageAspect / uCanvasAspect)) / (1.0 + 2.0 * uWaveMargin);
    vec2 cPx = ((uContact - 0.5) / sc + 0.5) * uCanvasPx;      // touch point on the canvas
    float holeR = uHoleR * uCanvasPx.y / sc.y;                  // portal radius in pixels
    float dprE = uCanvasPx.x / max(uResolution.x, 1.0);
    vec2 dP = gl_FragCoord.xy - cPx;
    float rP = length(dP);
    vec2 dirP = rP > 0.001 ? dP / rP : vec2(0.0);
    // glass lens just outside the rim: the hands and the ripple bend around the portal
    float band = holeR * 0.22 + 26.0 * dprE;
    if (holeR > 1.0 && rP > holeR && rP < holeR + band) {
        float k = (rP - holeR) / band;
        float bend = sin(3.14159 * k) * (1.0 - k) * band * 0.45 * uHoleIn;
        distortedUv -= dirP * bend / uCanvasPx;
    }

    if (uMouseActive > 0.01) {
        float dist = distance(uv, uMouse);
        float mouseInfluence = smoothstep(revealNorm, 0.0, dist);
        float ripple = sin(dist * uWaveFrequency * 5.0 - time * uWaveSpeed)
            * uWaveAmplitude * 0.05 * mouseInfluence * uMouseActive;
        distortedUv.x += ripple;
        distortedUv.y += ripple;
    }

    vec2 baseUv = fitUv(distortedUv);
    vec2 offUv = vec2(REACH_DIR.x / uImageAspect, REACH_DIR.y);
    vec4 cL = sampleHand(baseUv + offUv * uReachL, -1.0);   // robot hand, held back toward bottom-left
    vec4 cR = sampleHand(baseUv - offUv * uReachR, 1.0);    // human hand, held back toward top-right
    // where the two hands overlap (during the intro), show whichever is more solid there.
    // With a cutout image, use alpha; with a keyed (white-background) image, the darker one is the hand.
    float solidL = mix(1.0 - dot(cL.rgb, vec3(0.333)), cL.a, uCutout);
    float solidR = mix(1.0 - dot(cR.rgb, vec3(0.333)), cR.a, uCutout);
    vec4 color = solidL >= solidR ? cL : cR;

    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float ps = max(uPixelSize * uPixelBoost, 0.25);
    float tone = ditherTone(gray, ps);
    vec3 ditherColor = mix(uDark, uLight, tone);

    float revealDist = distance(uv * uResolution, uMouse * uResolution);
    float innerRadius = max(0.0, uRevealRadius * (1.0 - uRevealSoftness));
    float outerRadius = uRevealRadius * (1.0 + uRevealSoftness) + 0.001;
    float revealAmount = (1.0 - smoothstep(innerRadius, outerRadius, revealDist)) * uMouseActive;

    // Remove the source image's white studio background, keep the resting
    // hand purple, and reveal the untouched source colour under the pointer.
    // keyed: near-white counts as background. cutout: trust the PNG's alpha so highlights stay solid.
    float keyed = smoothstep(0.035, 0.16, 1.0 - gray);
    float subjectAlpha = mix(keyed, 1.0, uCutout) * color.a;
    // resting opacity: Originkit draws the hands at 58% (fine on a keyed white photo); with a real cutout
    // they stay nearly solid so the big GRAIN word passes cleanly behind them instead of showing through.
    float restA = mix(0.58, 0.92, uCutout);
    float finalAlpha = mix(subjectAlpha * restA, subjectAlpha, revealAmount) * uFade;
    vec3 rgb = mix(ditherColor, color.rgb, revealAmount);

    // ── living ASCII on the hands at rest ──
    // A diagonal band sweeps across every ~9s and turns the dither into characters picked from the
    // hand's own shading (dense in shadow, light in highlights); a few random cells flicker too.
    {
        float dprA = uCanvasPx.x / max(uResolution.x, 1.0);
        float acs = 11.0 * dprA;
        vec2 acell = floor(gl_FragCoord.xy / acs);
        vec2 alocal = fract(gl_FragCoord.xy / acs);
        vec4 hc = handAt(fitUv((acell + 0.5) * acs / uCanvasPx));
        float handC = mix(smoothstep(0.035, 0.16, 1.0 - dot(hc.rgb, vec3(0.299, 0.587, 0.114))), 1.0, uCutout) * hc.a;
        if (handC > 0.5 && subjectAlpha > 0.01) {
            vec2 sp = (acell * acs) / uCanvasPx;                         // 0–1 across the canvas
            float t = uTime * uMotion;
            float d = dot(sp, vec2(0.62, 0.38)) - (fract(t / 9.0) * 1.9 - 0.45);
            float band = exp(-d * d / 0.012);                             // soft scan band
            float trail = exp(-max(d, 0.0) * 9.0) * step(0.0, d) * 0.35;  // a faint tail behind it
            float spark = step(0.982, ign(acell * 1.31 + floor(t * 5.0) * 7.0));
            float amt = clamp(max(band + trail, spark), 0.0, 1.0)
                * (1.0 - revealAmount) * (1.0 - clamp(uSpark * 2.0, 0.0, 1.0)) * uMotion;
            if (amt > 0.02) {
                float g = dot(hc.rgb, vec3(0.299, 0.587, 0.114));
                float lvl = clamp((1.0 - g) * 1.25 + (ign(acell + floor(t * 9.0)) - 0.5) * 0.18, 0.0, 1.0);
                float idx = max(1.0, floor(lvl * 9.99));
                float gl = texture2D(uGlyphs, vec2((idx + alocal.x) / 10.0, alocal.y)).r;
                // each character sits on the hand's own shading, in the contrasting tint:
                // light skin → dark characters, shadow → light characters (no dark blotch)
                vec3 base = mix(uDark, uLight, smoothstep(0.12, 0.8, g));
                vec3 ink = g > 0.42 ? uDark : uLight;
                vec3 asciiCol = mix(base, ink, gl);
                // in the bright part of the band the characters glow in Siri colours, which drift
                // across the hand; the faint tail behind stays in the hand's own greys
                vec3 sCol = siriAt((sp - 0.5) * vec2(uCanvasPx.x / uCanvasPx.y, 1.0), t * 0.5);
                sCol = mix(sCol, ink, 0.1);
                asciiCol = mix(asciiCol, sCol, gl * clamp(band * 1.5 + spark, 0.0, 1.0));
                rgb = mix(rgb, asciiCol, amt);
            }
        }
    }

    // ── before the touch: a small breathing glow of Siri light in the gap between the fingertips ──
    {
        vec2 dI = (baseUv - uContact) * vec2(uImageAspect, 1.0);
        float rI = length(dI);
        float breathe = 0.82 + 0.18 * sin(uTime * uMotion * 1.3);
        float idle = (1.0 - clamp(uSpark * 4.0, 0.0, 1.0)) * (1.0 - revealAmount);
        // a small, smooth bead of light (not dithered), white at the heart, Siri colours at the edge
        // while it fades in it starts wide and soft (blurred) and tightens into focus
        float gI = exp(-rI * rI / (0.0010 * breathe * (1.0 + (1.0 - uBead) * 3.5))) * idle * uBead * uBead;
        float aI = clamp(gI * 0.85, 0.0, 1.0);
        vec3 cI = mix(siriAt(dI, uTime * uMotion * 0.7), uSparkCore, smoothstep(0.45, 1.0, gI) * 0.7);
        rgb = mix(rgb, cI, finalAlpha > 0.01 ? aI : 1.0);       // off the hands, the bead is the only colour
        finalAlpha = max(finalAlpha, aI * uFade);
    }

    // ── the touch: light, spark and ASCII ripple ──
    float ringP;
    float lightP = lightAt(baseUv, ringP);
    // light spills onto the hands near the contact point
    float handLight = clamp(lightP * 1.3 + ringP * 0.35, 0.0, 1.0);
    vec3 siriP = siriAt((baseUv - uContact) * vec2(uImageAspect, 1.0), uTime * uMotion);
    rgb = mix(rgb, mix(siriP, uSparkCore, 0.45), handLight * 0.75 * step(0.01, subjectAlpha));
    finalAlpha = max(finalAlpha, handLight * subjectAlpha * uFade);
    // the spark itself, drawn with the same dither dots
    float sparkA = ditherTone(clamp(lightP, 0.0, 1.0), ps) * step(0.02, lightP);
    rgb = mix(rgb, mix(siriP, uSparkCore, clamp(lightP * 1.2 - 0.25, 0.0, 1.0)), sparkA);   // coloured lobes, white-hot centre
    finalAlpha = max(finalAlpha, sparkA * uFade);
    // ASCII ripple: the ring is sampled once per character cell and drawn as a glyph
    float dpr = uCanvasPx.x / max(uResolution.x, 1.0);
    float cs = 14.0 * dpr;
    vec2 cell = floor(gl_FragCoord.xy / cs);
    vec2 local = fract(gl_FragCoord.xy / cs);
    vec2 cellS = fitUv((cell + 0.5) * cs / uCanvasPx);
    float ringC;
    float lightC = lightAt(cellS, ringC);
    float shimmer = 0.5 + ign(cell * 1.37 + floor(uTime * 12.0 * uMotion) * 17.0);
    float level = clamp(ringC * shimmer * 0.8 + lightC * 0.12, 0.0, 1.0);   // lighter: fewer, sparser characters
    float glyph = 0.0;
    if (level > 0.16) {
        float idx = floor(level * 9.99);
        glyph = texture2D(uGlyphs, vec2((idx + local.x) / 10.0, local.y)).r;
    }
    rgb = mix(rgb, mix(siriAt((cellS - uContact) * vec2(uImageAspect, 1.0), uTime * uMotion), uSparkCore, level * 0.35), glyph);
    glyph *= 0.7;                                   // fainter characters
    finalAlpha = max(finalAlpha, glyph);

    // ── the portal: a living ASCII field seen through a glass lens ──
    if (holeR > 1.0 && rP < holeR + 8.0 * dpr) {
        float tn = clamp(rP / holeR, 0.0, 1.0);
        float tm = uTime * uMotion;
        float pcs = 12.0 * dpr;
        // slow glass undulation
        vec2 nq = dP / (holeR * 0.55 + 1.0);
        vec2 amb = (vec2(fbm2(nq * 1.7 + tm * 0.09), fbm2(nq * 1.7 + 19.0 - tm * 0.08)) - 0.5) * pcs * 1.8 * uMotion;
        // bulge lens: magnified at the centre, compressed toward the rim, with each colour channel
        // bent slightly differently near the edge (chromatic fringing)
        float spread = 0.07 * tn * tn;
        float rR = holeR * pow(tn, 1.42 - spread);
        float rG = holeR * pow(tn, 1.42);
        float rB = holeR * pow(tn, 1.42 + spread);
        vec2 drift = vec2(0.0, tm * 9.0 * dpr);                 // the field drifts gently upward
        vec3 g = vec3(
            asciiField(cPx + dirP * rR + amb + drift, pcs, tm),
            asciiField(cPx + dirP * rG + amb + drift, pcs, tm),
            asciiField(cPx + dirP * rB + amb + drift, pcs, tm));
        // chromatic fringing kept in the brand palette (no RGB rainbow / no blue): the main glyph layer
        // in the glyph colour, the lens-shifted copies as warm coral and pale-hot fringes
        float amt = uAsciiAmt * uHoleIn * (0.5 + 0.5 * tn);         // stronger toward the rim; fades in
        vec3 inner = uNextBg
            + (uNextGlyph - uNextBg) * g.g * amt
            + (siriAt(dirP, tm) - uNextBg) * max(g.r - g.g, 0.0) * amt * 0.85
            + (uSparkCore - uNextBg) * max(g.b - g.g, 0.0) * amt * 0.55;
        float insideM = (1.0 - smoothstep(holeR - dpr, holeR + dpr, rP)) * uHoleIn;
        rgb = mix(rgb, inner, insideM);
        finalAlpha = max(finalAlpha, insideM);
        // glass rim, split into three offset rings
        float rw = 2.0 * dpr;
        vec3 rim = vec3(
            exp(-pow((rP - holeR + 3.0 * dpr) / rw, 2.0)),
            exp(-pow((rP - holeR) / rw, 2.0)),
            exp(-pow((rP - holeR - 3.0 * dpr) / rw, 2.0))) * (0.35 + 0.65 * uAsciiAmt) * uHoleIn;
        rgb += (uSparkCore - rgb) * rim.g * 0.9;                      // hot centre line
        rgb += (siriAt(dirP, tm) - rgb) * max(rim.r, rim.b) * 0.8;    // Siri-coloured fringes either side
        finalAlpha = max(finalAlpha, max(rim.r, max(rim.g, rim.b)) * 0.9);
    }

    gl_FragColor = vec4(rgb, finalAlpha);
}
`;

const __originkitPresetProps = {
  "dotSize": 7,
  "revealRadius": 98,
  "revealSoftness": 59
};

export default function DitherHands(props: Record<string, unknown>) {
  return <__OriginkitBase_DitherReveal {...(__originkitPresetProps as Record<string, unknown>)} {...props} />;
}
