/* Sections, each with variants. V cycles the variant of the section in view.
   Each variant: { name, html(), init(ctx) } — init may return a cleanup fn. */
(function () {
  const G = window.GRAIN;
  const STEPS = ["Intake", "Route", "Execute", "Approve", "Inspect"];

  const nav = () => `
    <header class="nav" id="nav">
      <div class="wrap nav-in">
        <a class="wordmark" href="#top" aria-label="Grain home">grain<span class="mono">labs</span></a>
        <nav class="nav-links mono" aria-label="Sections">
          <a href="#how" data-scr>How it runs</a>
          <a href="#capabilities" data-scr>Capabilities</a>
          <a href="#uses" data-scr>Use cases</a>
          <a href="#trust" data-scr>Trust</a>
        </nav>
        <a class="btn btn-sm" href="#start">Start a workflow</a>
      </div>
    </header>`;

  const ctas = () => `
    <div class="ctas">
      <a class="btn" href="#start">Start a workflow <span class="arr">→</span></a>
      <a class="btn line" href="#how">See how it runs</a>
    </div>`;

  const h1 = () => `AI operations your team can <span class="sig">trust to run.</span>`;

  /* ───────── HERO A · SPEC SHEET ───────── */
  const heroA = {
    name: "Spec sheet",
    html: () => `
      <section class="hero heroA" data-section="hero" id="top">
        <div class="wrap">
          <div class="meta-row mono">
            <span data-scr>[ Grain ] Governed AI execution</span>
            <span class="clock" data-clock>UTC 00:00:00</span>
          </div>
          <h1 class="display reveal">${h1()}</h1>
          <div class="heroA-mid">
            <p class="lead reveal">${G.hero.sub}</p>
            ${ctas()}
          </div>
          <ol class="spec mono">
            ${G.hero.chips.map((c, i) => `<li class="reveal" style="--d:${i * 90}ms"><span class="mute">0${i + 1}</span><b data-scr>${c}</b></li>`).join("")}
          </ol>
        </div>
        <div class="ticker mono" id="ticker">
          <div class="wrap ticker-in">
            <span class="t-id">Run ${G.run.id}</span>
            <div class="t-steps">${STEPS.map((s, i) => `<span data-i="${i}">${s}</span>${i < STEPS.length - 1 ? '<i></i>' : ""}`).join("")}</div>
            <span class="t-time" id="t-time">00:00.0</span>
          </div>
        </div>
      </section>`,
    init(ctx) {
      const root = ctx.el;
      const spans = [...root.querySelectorAll(".t-steps span")], lines = [...root.querySelectorAll(".t-steps i")];
      const time = root.querySelector("#t-time");
      let i = 0, t0 = performance.now(), hold = 0, raf;
      const paint = () => {
        spans.forEach((s, k) => { s.classList.toggle("done", k < i); s.classList.toggle("on", k === i); });
        lines.forEach((l, k) => l.classList.toggle("done", k < i));
        spans[3].textContent = i === 3 ? "Awaiting approval" : "Approve";
      };
      const loop = (now) => {
        const el = (now - t0) / 1000;
        time.textContent = `00:${String(Math.floor(el)).padStart(2, "0")}.${Math.floor((el % 1) * 10)}`;
        raf = requestAnimationFrame(loop);
      };
      const step = () => {
        i = i + 1;
        if (i > STEPS.length) { i = 0; t0 = performance.now(); }
        paint();
        hold = setTimeout(step, i === 3 ? 3200 : i === STEPS.length ? 2400 : 1300);
      };
      paint();
      if (!ctx.reduce) { raf = requestAnimationFrame(loop); hold = setTimeout(step, 1300); }
      return () => { cancelAnimationFrame(raf); clearTimeout(hold); };
    }
  };

  /* ───────── HERO B · RUN LOG ───────── */
  const LOG = [
    ["00.04", "task.created", "TASK-2841 · durable"],
    ["00.31", "files.attached", "rfp-halvorsen.pdf, pricing-matrix.xlsx, rules.md"],
    ["01.12", "profile.selected", "rfp-response@12 · 4 tool grants"],
    ["02.48", "tool.call", "drive.read → 48 pages indexed"],
    ["03.90", "tool.call", "crm.read → account history"],
    ["05.02", "checkpoint.saved", "cp-03 · resumable"],
    ["06.77", "draft.assembled", "response.md · pricing.md"],
    ["07.15", "approval.requested", "pricing.md → s.whitfield", "gate"],
    ["—", "approval.granted", "s.whitfield", "ok"],
    ["09.40", "packet.ready", "6 artifacts · lineage verified", "ok"]
  ];
  const heroB = {
    name: "Run log",
    html: () => `
      <section class="hero heroB" data-section="hero" id="top">
        <div class="wrap heroB-grid">
          <div class="heroB-copy">
            <span class="label mono" data-scr>Governed AI execution</span>
            <h1 class="display reveal">${h1()}</h1>
            <p class="lead reveal">${G.hero.sub}</p>
            ${ctas()}
          </div>
          <div class="log reveal" id="log">
            <div class="log-head mono">
              <span>TASK-2841 / RUN ${G.run.id}</span>
              <span class="log-state" id="log-state">Running</span>
            </div>
            <div class="log-req">
              <span class="mono mute">Request</span>
              <p>${G.run.request}</p>
            </div>
            <ol class="log-lines mono" id="log-lines"></ol>
          </div>
        </div>
      </section>`,
    init(ctx) {
      const list = ctx.el.querySelector("#log-lines"), state = ctx.el.querySelector("#log-state");
      let k = 0, timer, typing;
      const setState = (s, cls = "") => { state.textContent = s; state.className = "log-state " + cls; };
      const addLine = ([ts, ev, detail, kind]) => {
        const li = document.createElement("li");
        if (kind) li.className = kind;
        li.innerHTML = `<span class="ts">${ts}</span><span class="ev"></span><span class="dt">${detail}</span>`;
        list.appendChild(li);
        const evEl = li.querySelector(".ev");
        ctx.scramble(evEl, ev, 380);
        while (list.children.length > 9) list.firstChild.remove();
      };
      const gate = () => {
        setState("Needs input", "warn");
        const li = document.createElement("li");
        li.className = "prompt";
        li.innerHTML = `<span class="ts">&gt;</span><span>Approve pricing.md?</span><span class="prompt-btns"><button type="button" data-a="y">[ Approve ]</button><button type="button" data-a="n">[ Hold ]</button></span>`;
        list.appendChild(li);
        const go = (approved) => {
          clearTimeout(timer);
          li.remove();
          if (!approved) { setState("On hold", "warn"); timer = setTimeout(reset, 3500); return; }
          setState("Running");
          next();
        };
        li.querySelector('[data-a="y"]').onclick = () => go(true);
        li.querySelector('[data-a="n"]').onclick = () => go(false);
        timer = setTimeout(() => go(true), 6000);
      };
      const next = () => {
        if (k >= LOG.length) { setState("Complete", "ok"); timer = setTimeout(reset, 4000); return; }
        const line = LOG[k++];
        addLine(line);
        if (line[3] === "gate") { timer = setTimeout(gate, 500); return; }
        timer = setTimeout(next, 650 + Math.random() * 450);
      };
      const reset = () => { list.innerHTML = ""; k = 0; setState("Running"); next(); };
      if (ctx.reduce) { LOG.forEach((l) => { const li = document.createElement("li"); li.innerHTML = `<span class="ts">${l[0]}</span><span class="ev">${l[1]}</span><span class="dt">${l[2]}</span>`; list.appendChild(li); }); setState("Complete", "ok"); }
      else timer = setTimeout(reset, 700);
      return () => { clearTimeout(timer); clearTimeout(typing); };
    }
  };

  /* ───────── HERO C · WORK LINE ───────── */
  const heroC = {
    name: "Work line",
    html: () => `
      <section class="hero heroC" data-section="hero" id="top">
        <div class="wrap">
          <div class="heroC-top">
            <span class="label mono" data-scr>Governed AI execution</span>
            <h1 class="display reveal">${h1()}</h1>
            <div class="heroC-sub">
              <p class="lead reveal">${G.hero.sub}</p>
              ${ctas()}
            </div>
          </div>
          <div class="line-wrap reveal" id="line">
            <div class="line-head mono">
              <span>${G.how.caseName.replace("Example run · ", "Live case · ")}</span>
              <span class="line-status" id="line-status">In transit</span>
            </div>
            <div class="line-track">
              <div class="rail"><div class="rail-fill" id="rail-fill"></div></div>
              <div class="unit" id="unit"><span class="mono">TASK</span></div>
              ${G.how.steps.map((s, i) => `
                <button type="button" class="station" data-i="${i}" style="--x:${(i / (G.how.steps.length - 1)) * 100}%">
                  <span class="st-box"></span>
                  <span class="st-n mono">${s.n}</span>
                  <span class="st-t">${s.t}</span>
                  <span class="st-d mono">${s.ex}</span>
                </button>`).join("")}
            </div>
          </div>
        </div>
      </section>`,
    init(ctx) {
      const root = ctx.el;
      const unit = root.querySelector("#unit"), fill = root.querySelector("#rail-fill"), status = root.querySelector("#line-status");
      const stations = [...root.querySelectorAll(".station")];
      const N = stations.length;
      let i = 0, timer;
      const go = (k) => {
        i = k;
        const pct = (k / (N - 1)) * 100;
        unit.style.left = pct + "%";
        fill.style.transform = `scaleX(${k / (N - 1)})`;
        stations.forEach((s, j) => { s.classList.toggle("done", j < k); s.classList.toggle("on", j === k); });
        if (k === 3) { status.textContent = "Awaiting human · s.whitfield"; status.className = "line-status warn"; unit.classList.add("hold"); }
        else if (k === N - 1) { status.textContent = "Packet delivered"; status.className = "line-status ok"; unit.classList.remove("hold"); }
        else { status.textContent = "In transit"; status.className = "line-status"; unit.classList.remove("hold"); }
      };
      const tick = () => {
        const nextK = i >= N - 1 ? 0 : i + 1;
        go(nextK);
        timer = setTimeout(tick, nextK === 3 ? 3400 : nextK === N - 1 ? 3000 : 1500);
      };
      stations.forEach((s, j) => s.addEventListener("click", () => { clearTimeout(timer); go(j); timer = setTimeout(tick, 4000); }));
      go(0);
      if (!ctx.reduce) timer = setTimeout(tick, 1500); else go(N - 1);
      return () => clearTimeout(timer);
    }
  };

  window.NAV = nav;
  window.SECTIONS = [
    { id: "hero", label: "Hero", variants: [heroA, heroB, heroC] }
    // next: how-it-runs, packet, capabilities, use cases, trust, cta
  ];
  window.THEMES = [
    { id: "bone", name: "Bone" },
    { id: "carbon", name: "Carbon" },
    { id: "peach", name: "Peach" }
  ];
})();
