/* Section-variant + theme switching.
   V = next variant of the section in view (Shift+V = previous) · T = next theme (Shift+T = previous)
   State lives in the URL (?hero=2&t=carbon) so a combination can be shared. */
(function () {
  const root = document.documentElement;
  const app = document.getElementById("app");
  const S = window.SECTIONS, T = window.THEMES;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const idx = (raw, n) => { const i = parseInt(raw, 10) - 1; return i >= 0 && i < n ? i : 0; };

  const pick = {};
  S.forEach((s) => { pick[s.id] = idx(params.get(s.id) || store.get("grain." + s.id), s.variants.length); });
  let ti = Math.max(0, T.findIndex((t) => t.id === (params.get("t") || store.get("grain.t"))));
  let current = S[0].id;

  /* ── robotic text decode ── */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_-+[]";
  function scramble(el, text, dur = 600) {
    if (reduce) { el.textContent = text; return; }
    const start = performance.now();
    if (el._scr) cancelAnimationFrame(el._scr);
    const frame = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const n = Math.floor(p * text.length);
      let out = text.slice(0, n);
      for (let i = n; i < text.length; i++) out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (p < 1) el._scr = requestAnimationFrame(frame);
    };
    el._scr = requestAnimationFrame(frame);
  }

  /* ── section mounting ── */
  const mounted = {}; // id -> { el, cleanup }
  function mount(sec, slot) {
    const prev = mounted[sec.id];
    if (prev && prev.cleanup) prev.cleanup();
    const v = sec.variants[pick[sec.id]];
    slot.innerHTML = v.html();
    const el = slot.firstElementChild;
    const ctx = { el, reduce, scramble };
    const cleanup = v.init ? v.init(ctx) : null;
    mounted[sec.id] = { el, cleanup };
    wire(el);
  }

  function wire(scope) {
    // decode labels on entry + on hover
    scope.querySelectorAll("[data-scr]").forEach((el) => {
      const text = el.textContent;
      el.addEventListener("mouseenter", () => scramble(el, text, 420));
      scramble(el, text, 900);
    });
    // reveal
    const els = scope.querySelectorAll(".reveal");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }

  function build() {
    app.innerHTML = window.NAV() + S.map((s) => `<div class="slot" data-slot="${s.id}"></div>`).join("") + `<footer class="foot"><div class="wrap foot-in mono"><span>grain labs</span><span>More sections coming — hero first</span></div></footer>`;
    S.forEach((s) => mount(s, app.querySelector(`[data-slot="${s.id}"]`)));
    wire(app.querySelector(".nav"));
  }

  /* which section is in view */
  function trackCurrent() {
    const mid = window.innerHeight * 0.45;
    let best = S[0].id;
    app.querySelectorAll(".slot").forEach((slot) => { const r = slot.getBoundingClientRect(); if (r.top <= mid) best = slot.dataset.slot; });
    if (best !== current) { current = best; hud(); }
  }

  /* ── clock ── */
  setInterval(() => {
    const d = new Date();
    const s = `UTC ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    document.querySelectorAll("[data-clock]").forEach((el) => (el.textContent = s));
  }, 1000);

  /* ── nav border on scroll ── */
  window.addEventListener("scroll", () => {
    const n = document.getElementById("nav"); if (n) n.classList.toggle("scrolled", window.scrollY > 4);
    trackCurrent();
  }, { passive: true });

  /* ── HUD ── */
  const hudEl = document.getElementById("hud");
  function hud() {
    const sec = S.find((s) => s.id === current);
    const v = sec.variants[pick[sec.id]];
    hudEl.innerHTML = `
      <button type="button" data-act="v"><kbd>V</kbd><span class="h-k">${sec.label}</span><span class="h-v">${pick[sec.id] + 1}/${sec.variants.length} ${v.name}</span></button>
      <button type="button" data-act="t"><kbd>T</kbd><span class="h-k">Theme</span><span class="h-v">${T[ti].name}</span></button>`;
  }
  function sync() {
    const p = new URLSearchParams(location.search);
    S.forEach((s) => { p.set(s.id, pick[s.id] + 1); store.set("grain." + s.id, pick[s.id] + 1); });
    p.set("t", T[ti].id); store.set("grain.t", T[ti].id);
    history.replaceState(null, "", `${location.pathname}?${p}${location.hash}`);
    hud();
  }
  function nextVariant(dir) {
    const sec = S.find((s) => s.id === current);
    pick[sec.id] = (pick[sec.id] + dir + sec.variants.length) % sec.variants.length;
    mount(sec, app.querySelector(`[data-slot="${sec.id}"]`));
    sync();
    const lbl = hudEl.querySelector('[data-act="v"] .h-v'); if (lbl) scramble(lbl, lbl.textContent, 350);
  }
  function nextTheme(dir) {
    ti = (ti + dir + T.length) % T.length;
    root.dataset.theme = T[ti].id;
    sync();
    const lbl = hudEl.querySelector('[data-act="t"] .h-v'); if (lbl) scramble(lbl, lbl.textContent, 350);
  }
  hudEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) b.dataset.act === "v" ? nextVariant(1) : nextTheme(1); });
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === "v") { e.preventDefault(); nextVariant(e.shiftKey ? -1 : 1); }
    if (k === "t") { e.preventDefault(); nextTheme(e.shiftKey ? -1 : 1); }
  });

  root.dataset.theme = T[ti].id;
  build();
  sync();
})();
