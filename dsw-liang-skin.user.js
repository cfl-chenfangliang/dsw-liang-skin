// ==UserScript==
// @name         滑动变祖 · DeepSeek 网页版皮肤
// @name:en      Liang Skin for DeepSeek Web
// @namespace    https://github.com/kingOfSoySauce/dsh-liang-skin
// @version      1.0.0
// @description  为官方网页版 DeepSeek 复刻「滑动变祖」皮肤：右侧立绘随滑块强度切换，局部氛围配色，可选粒子与呼吸动效。纯外观，不改模型设置。
// @description:en Liang-intensity skin ported to chat.deepseek.com: a right-side portrait that shifts with an appearance slider, local ambient coloring, optional particles. Pure visuals.
// @author       kingOfSoySauce (ported to userscript)
// @match        https://chat.deepseek.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @license      MIT
// @homepageURL  https://github.com/cfl-chenfangliang/dsw-liang-skin
// ==/UserScript==

/*
 * 这是把 DeepSeek Harness 原生皮肤插件「滑动变祖」移植到官方网页版的油猴脚本。
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // 常量与资源
  // ---------------------------------------------------------------------------

  const PREVIEW_MAX_FRAME = 240;
  const MAX_LEVEL = 30;
  const STORAGE_KEY = "dsh-liang-skin.userscript.v1";
  const ASSET_BASE =
    "https://cdn.jsdelivr.net/gh/kingOfSoySauce/dsh-liang-skin@main/assets";
  const LIANG_RANKS = ["小难梁", "牢梁", "梁子", "梁圣", "梁神", "梁祖"];

  // 24 个经过审核的立绘锚点：level -> 文件名。移植自 index.tsx 的 PORTRAIT_ANCHORS。
  const PORTRAIT_ANCHORS = [
    { level: 0, file: "stage-00.webp" },
    { level: 1, file: "level-01.webp" },
    { level: 3, file: "level-03.webp" },
    { level: 4, file: "level-04.webp" },
    { level: 6, file: "stage-06.webp" },
    { level: 7, file: "level-07.webp" },
    { level: 9, file: "level-09.webp" },
    { level: 10, file: "level-10.webp" },
    { level: 12, file: "stage-12.webp" },
    { level: 13, file: "level-13.webp" },
    { level: 14, file: "level-14.webp" },
    { level: 15, file: "bridge-15.webp" },
    { level: 16, file: "level-16.webp" },
    { level: 17, file: "level-17.webp" },
    { level: 18, file: "stage-18.webp" },
    { level: 19, file: "level-19.webp" },
    { level: 21, file: "level-21.webp" },
    { level: 22, file: "level-22.webp" },
    { level: 24, file: "stage-24.webp" },
    { level: 25, file: "level-25.webp" },
    { level: 27, file: "bridge-27.webp" },
    { level: 28, file: "level-28.webp" },
    { level: 29, file: "level-29.webp" },
    { level: 30, file: "stage-30.webp" },
  ];

  // logic.ts 的六个 stage 锚点配色。
  const STOPS = [
    { at: 0, page: [232, 233, 229], surface: [248, 248, 245], surface2: [238, 239, 235], ink: [23, 24, 22], secondary: [112, 116, 111], accent: [181, 43, 36] },
    { at: 6, page: [211, 211, 206], surface: [239, 239, 234], surface2: [224, 224, 218], ink: [26, 26, 24], secondary: [101, 101, 96], accent: [181, 43, 36] },
    { at: 12, page: [171, 168, 162], surface: [211, 208, 201], surface2: [190, 186, 179], ink: [27, 26, 24], secondary: [83, 79, 74], accent: [166, 54, 42] },
    { at: 18, page: [117, 112, 106], surface: [154, 148, 140], surface2: [128, 122, 115], ink: [24, 22, 20], secondary: [65, 61, 56], accent: [154, 56, 42] },
    { at: 24, page: [43, 39, 37], surface: [48, 43, 40], surface2: [58, 51, 46], ink: [244, 241, 232], secondary: [184, 180, 169], accent: [181, 92, 54] },
    { at: 30, page: [17, 17, 17], surface: [30, 27, 25], surface2: [41, 35, 30], ink: [244, 241, 232], secondary: [184, 180, 169], accent: [193, 154, 73] },
  ];

  const DEFAULTS = Object.freeze({
    enabled: true,
    frame: PREVIEW_MAX_FRAME, // 默认停在最高档（梁祖），首帧即暗壳
    opacity: 1, // 立绘透明度 0.2–1，面板内可调
    xianxiaPortraits: false,
    maskEnabled: true,
    tintSidebar: true, // 左侧对话历史跟随皮肤底色
    particlesEnabled: false,
    motionEnabled: false,
    idleFade: false,
    hideSlider: false,
  });

  // ---------------------------------------------------------------------------
  // 数学与配色（忠实移植 logic.ts）
  // ---------------------------------------------------------------------------

  const clampFrame = (v) =>
    !Number.isFinite(v) ? 0 : Math.min(PREVIEW_MAX_FRAME, Math.max(0, Math.round(v)));
  const levelForFrame = (frame) =>
    Math.round((clampFrame(frame) / PREVIEW_MAX_FRAME) * MAX_LEVEL);
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
  const rgb = (c, a = 1) =>
    a === 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  function liangRankForFrame(frame) {
    const level = (clampFrame(frame) / PREVIEW_MAX_FRAME) * MAX_LEVEL;
    const index = level >= MAX_LEVEL ? LIANG_RANKS.length - 1 : Math.floor(level / 6);
    return LIANG_RANKS[Math.min(LIANG_RANKS.length - 1, Math.max(0, index))];
  }

  function paletteForFrame(rawFrame) {
    const frame = clampFrame(rawFrame);
    const level = (frame / PREVIEW_MAX_FRAME) * MAX_LEVEL;
    // UI 刻意二元：0–23 保持浅壳，24 进入梁神/梁祖区切黑金。
    const dark = level >= 24;
    const stage = dark ? 5 : 0;
    const ui = dark ? STOPS[5] : STOPS[0];
    const page = ui.page;
    // 侧栏底色：在页面色上叠一层 surface2，和原项目 logic.ts 的 sidebar 一致。
    const sidebar = mix(page, ui.surface2, 0.25);
    const accent = dark ? [193, 154, 73] : [65, 118, 230];
    return {
      level,
      stage,
      dark,
      strength: level / MAX_LEVEL,
      page: rgb(page),
      sidebar: rgb(sidebar),
      ink: rgb(ui.ink),
      scrimStrong: rgb(page, dark ? 0.52 : 0.34),
      scrimSoft: rgb(page, 0.16),
      accent: rgb(accent),
      accentRgb: accent,
    };
  }

  // 就近锚点：给定 level 返回最近的立绘锚点下标。移植 portrait-loader 的 nearestIndex 语义。
  function nearestAnchorIndex(level) {
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < PORTRAIT_ANCHORS.length; i += 1) {
      const d = Math.abs(PORTRAIT_ANCHORS[i].level - level);
      // 距离相等时取更高 level，与原项目一致。
      if (d < best || (d === best && PORTRAIT_ANCHORS[i].level > PORTRAIT_ANCHORS[nearest].level)) {
        best = d;
        nearest = i;
      }
    }
    return nearest;
  }

  // ---------------------------------------------------------------------------
  // 持久化（GM 优先，localStorage 兜底）
  // ---------------------------------------------------------------------------

  const store = {
    read() {
      try {
        if (typeof GM_getValue === "function") {
          const raw = GM_getValue(STORAGE_KEY, null);
          if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
        }
      } catch (_) {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
      } catch (_) {}
      return { ...DEFAULTS };
    },
    write(state) {
      const raw = JSON.stringify(state);
      try {
        if (typeof GM_setValue === "function") GM_setValue(STORAGE_KEY, raw);
      } catch (_) {}
      try {
        localStorage.setItem(STORAGE_KEY, raw);
      } catch (_) {}
    },
  };

  // ---------------------------------------------------------------------------
  // 样式
  // ---------------------------------------------------------------------------

  const CSS = `
  .liang-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    pointer-events: none;
    opacity: 0;
    transition: opacity 240ms ease;
  }
  body[data-liang="on"] .liang-backdrop { opacity: 1; }
  .liang-backdrop__portrait {
    position: absolute;
    top: 50%;
    right: 0;
    width: min(40vw, 680px);
    height: 100%;
    object-fit: cover;
    object-position: 50% 42%;
    transform: translateY(-50%);
    opacity: 0;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.12) 6%, rgba(0,0,0,.55) 16%, #000 34%, #000 100%);
    mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.12) 6%, rgba(0,0,0,.55) 16%, #000 34%, #000 100%);
    transition: opacity 260ms ease;
    user-select: none;
  }
  /* 当前帧用 data-show 点亮，透明度由 --liang-portrait-opacity 控制，切换即交叉淡入。 */
  .liang-backdrop__portrait[data-show="1"] { opacity: var(--liang-portrait-opacity, 1); }
  .liang-backdrop__scrim {
    position: absolute;
    inset: 0;
    display: none;
    background:
      linear-gradient(90deg, var(--liang-scrim-strong, transparent) 0%, var(--liang-scrim-soft, transparent) 38%, transparent 66%);
  }
  .liang-backdrop[data-mask="on"] .liang-backdrop__scrim { display: block; }
  .liang-ambient {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .liang-panel {
    position: fixed;
    right: 20px;
    bottom: 96px;
    z-index: 2147483000;
    width: 260px;
    padding: 14px 16px 16px;
    border-radius: 14px;
    background: rgba(28, 28, 30, .92);
    color: #f2f1ec;
    box-shadow: 0 10px 40px rgba(0,0,0,.4);
    font: 13px/1.5 -apple-system, "PingFang SC", system-ui, sans-serif;
    backdrop-filter: blur(12px);
    display: none;
  }
  .liang-panel[data-open="1"] { display: block; }
  .liang-panel__title { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
  .liang-row { display: flex; align-items: center; justify-content: space-between; margin: 8px 0; }
  .liang-row label { cursor: pointer; }
  .liang-sw {
    position: relative; width: 38px; height: 22px; border-radius: 11px;
    background: rgba(255,255,255,.22); transition: background 160ms; cursor: pointer; flex: none;
  }
  .liang-sw[data-on="1"] { background: #c19a49; }
  .liang-sw::after {
    content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
    border-radius: 50%; background: #fff; transition: transform 160ms;
  }
  .liang-sw[data-on="1"]::after { transform: translateX(16px); }
  .liang-panel__slider { width: 100%; margin: 6px 0 2px; accent-color: #c19a49; }
  .liang-panel__rank { font-size: 12px; opacity: .75; text-align: center; margin-top: 2px; }
  .liang-panel__hr { border: 0; border-top: 1px solid rgba(255,255,255,.12); margin: 12px 0 8px; }
  .liang-panel__field { font-size: 12px; opacity: .8; margin: 10px 0 2px; }

  /* 左侧对话历史跟随皮肤底色（启发式命中的侧栏打上 data-liang-sidebar）。 */
  [data-liang-sidebar] {
    background-color: var(--liang-sidebar, transparent) !important;
    color: var(--liang-ink, inherit) !important;
    transition: background-color 220ms linear;
  }

  /* 常驻形态滑块：悬浮圆圈正下方，横向。不展开面板也能滑动皮肤强度。 */
  .liang-dock {
    position: fixed; right: 20px; bottom: 30px; z-index: 2147483000;
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 20px;
    background: rgba(28,28,30,.82); backdrop-filter: blur(10px);
    box-shadow: 0 6px 24px rgba(0,0,0,.32);
    font: 11px/1.3 -apple-system, "PingFang SC", system-ui, sans-serif; color: #f2f1ec;
  }
  body:not([data-liang="on"]) .liang-dock { display: none; }
  .liang-dock__rail {
    width: 128px; height: 20px; margin: 0; accent-color: #c19a49; cursor: pointer;
  }
  .liang-dock__rank { opacity: .8; letter-spacing: .02em; min-width: 2.6em; text-align: right; }

  .liang-toggle {
    position: fixed; right: 20px; bottom: 80px; z-index: 2147483000;
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(28,28,30,.9); color: #c19a49; border: 1px solid rgba(193,154,73,.4);
    cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 20px rgba(0,0,0,.35);
  }
  .liang-toggle:hover { background: rgba(40,40,44,.95); }
  `;

  // ---------------------------------------------------------------------------
  // 轻量粒子（canvas-2D 版，替代原 WebGL ambient，保持单文件无依赖）
  // ---------------------------------------------------------------------------

  function createAmbient(canvas) {
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let running = false;
    let color = [193, 154, 73];
    let count = 60;
    const particles = [];

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      return {
        x: w * (0.6 + Math.random() * 0.38),
        y: h * (0.2 + Math.random() * 0.7),
        vx: -0.1 - Math.random() * 0.25,
        vy: -0.15 - Math.random() * 0.3,
        life: 0,
        max: 160 + Math.random() * 160,
        size: 1 + Math.random() * 2.4,
      };
    }
    function step() {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      while (particles.length < count) particles.push(spawn());
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        if (p.life > p.max || p.x < 0 || p.y < 0) {
          particles.splice(i, 1);
          continue;
        }
        const fade = Math.sin((p.life / p.max) * Math.PI);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${fade * 0.5})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    }
    return {
      setLevel(level, dark) {
        color = dark ? [193, 154, 73] : [120, 150, 220];
        count = Math.round(30 + (level / MAX_LEVEL) * 70);
      },
      start() {
        if (running) return;
        running = true;
        resize();
        window.addEventListener("resize", resize);
        raf = requestAnimationFrame(step);
      },
      dispose() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        particles.length = 0;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 皮肤呈现器
  // ---------------------------------------------------------------------------

  function assetUrl(file, xianxia) {
    const dir = xianxia ? "portrait-source-xianxia-v2" : "portrait-source-v2";
    return `${ASSET_BASE}/${dir}/${file}`;
  }

  // 预解码缓存：首次用到某套素材时，一次性把 24 张都 decode 进浏览器缓存，
  // 之后切换只是命中缓存 + 换 src，几乎瞬时。原来的卡顿是每次滑动都现拉网络。
  const decodedSets = new Set();
  function preloadSet(xianxia) {
    const key = xianxia ? "xianxia" : "original";
    if (decodedSets.has(key)) return;
    decodedSets.add(key);
    for (const anchor of PORTRAIT_ANCHORS) {
      const img = new Image();
      img.decoding = "async";
      img.src = assetUrl(anchor.file, xianxia);
      if (typeof img.decode === "function") img.decode().catch(() => {});
    }
  }

  function createPresenter(state) {
    const backdrop = document.createElement("div");
    backdrop.className = "liang-backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    // 两层立绘交叉淡入：front 显示当前帧，切换时把新图装进 back 再翻转，
    // 避免单层换 src 时出现空白闪烁。
    const layers = [0, 1].map(() => {
      const el = document.createElement("img");
      el.className = "liang-backdrop__portrait";
      el.alt = "";
      el.draggable = false;
      return el;
    });
    let front = 0;

    const scrim = document.createElement("div");
    scrim.className = "liang-backdrop__scrim";

    backdrop.append(scrim, layers[0], layers[1]);
    document.body.appendChild(backdrop);

    let ambient = null;
    let canvas = null;
    let idleTimer = 0;
    let currentAnchor = -1;
    let currentXianxia = null;
    let sidebarEl = null;

    // 启发式定位左侧对话历史：贴左边、几乎满高、宽度像侧栏、内部链接/条目多的那个。
    // 官方 class 混淆且会变，所以靠几何特征而非选择器，命中后打 data-liang-sidebar。
    const OWN_CLASSES = ["liang-backdrop", "liang-panel", "liang-dock", "liang-toggle"];
    function isOwn(el) {
      return OWN_CLASSES.some((c) => el.classList && el.classList.contains(c));
    }
    function findSidebar() {
      const vh = window.innerHeight;
      let best = null;
      let bestScore = -Infinity;
      const walk = (el, depth) => {
        if (depth > 6 || !el.children) return;
        for (const child of el.children) {
          if (isOwn(child)) continue;
          const r = child.getBoundingClientRect();
          const looksLikeSidebar =
            r.left <= 8 && r.top <= 96 && r.height >= vh * 0.6 && r.width >= 160 && r.width <= 400;
          if (looksLikeSidebar) {
            const items = child.querySelectorAll('a, li, [role="button"]').length;
            const score = items * 10 + r.height;
            if (score > bestScore) {
              bestScore = score;
              best = child;
            }
          }
          walk(child, depth + 1);
        }
      };
      walk(document.body, 0);
      return best;
    }
    function applySidebar() {
      if (!state.enabled || !state.tintSidebar) {
        if (sidebarEl) delete sidebarEl.dataset.liangSidebar;
        sidebarEl = null;
        return;
      }
      const found = findSidebar();
      if (found && found !== sidebarEl) {
        if (sidebarEl) delete sidebarEl.dataset.liangSidebar;
        sidebarEl = found;
      }
      if (sidebarEl) sidebarEl.dataset.liangSidebar = "1";
    }

    // SPA 会重渲染导致属性丢失或侧栏换节点，观察 body 后防抖重试。
    let sidebarTimer = 0;
    const sidebarObserver = new MutationObserver(() => {
      if (!state.enabled || !state.tintSidebar) return;
      if (sidebarTimer) return;
      sidebarTimer = setTimeout(() => {
        sidebarTimer = 0;
        applySidebar();
      }, 300);
    });
    sidebarObserver.observe(document.body, { childList: true, subtree: true });

    function applyMask() {
      backdrop.dataset.mask = state.maskEnabled ? "on" : "off";
    }

    function applyOpacity() {
      const value = String(state.opacity ?? 1);
      for (const el of layers) el.style.setProperty("--liang-portrait-opacity", value);
    }

    function setPortrait(level) {
      const idx = nearestAnchorIndex(level);
      if (idx === currentAnchor && currentXianxia === state.xianxiaPortraits) return;
      currentAnchor = idx;
      currentXianxia = state.xianxiaPortraits;
      const url = assetUrl(PORTRAIT_ANCHORS[idx].file, state.xianxiaPortraits);
      const incoming = layers[front ^ 1];
      const outgoing = layers[front];
      const reveal = () => {
        incoming.style.opacity = "";
        outgoing.style.opacity = "";
        incoming.dataset.show = "1";
        outgoing.dataset.show = "0";
        front ^= 1;
      };
      // 缓存命中时直接显示，不等事件；否则 onload 再翻转，期间旧图保持可见。
      if (incoming.src === url && incoming.complete) {
        reveal();
      } else {
        incoming.onload = reveal;
        incoming.src = url;
        if (incoming.complete && incoming.naturalWidth > 0) reveal();
      }
    }

    function applyFrame() {
      const palette = paletteForFrame(state.frame);
      document.body.dataset.liangStage = String(palette.stage);
      backdrop.style.setProperty("--liang-scrim-strong", palette.scrimStrong);
      backdrop.style.setProperty("--liang-scrim-soft", palette.scrimSoft);
      // 侧栏染色变量挂在根节点，命中的侧栏无论在哪都能读到。
      document.documentElement.style.setProperty("--liang-sidebar", palette.sidebar);
      document.documentElement.style.setProperty("--liang-ink", palette.ink);
      setPortrait(palette.level);
      applySidebar();
      if (ambient) ambient.setLevel(palette.level, palette.dark);
    }

    function syncParticles() {
      if (state.enabled && state.particlesEnabled) {
        if (!ambient) {
          canvas = document.createElement("canvas");
          canvas.className = "liang-ambient";
          backdrop.appendChild(canvas);
          ambient = createAmbient(canvas);
          const palette = paletteForFrame(state.frame);
          ambient.setLevel(palette.level, palette.dark);
          ambient.start();
        }
      } else if (ambient) {
        ambient.dispose();
        ambient = null;
        if (canvas) canvas.remove();
        canvas = null;
      }
    }

    function bumpIdle() {
      const active = layers[front];
      if (!state.idleFade) {
        active.style.opacity = "";
        return;
      }
      active.style.opacity = "";
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        active.style.opacity = "0.35";
      }, 4000);
    }

    function render() {
      if (state.enabled) {
        document.body.dataset.liang = "on";
        preloadSet(state.xianxiaPortraits);
        applyMask();
        applyOpacity();
        applyFrame();
        syncParticles();
        bumpIdle();
      } else {
        delete document.body.dataset.liang;
        delete document.body.dataset.liangStage;
        currentAnchor = -1;
        currentXianxia = null;
        if (sidebarEl) delete sidebarEl.dataset.liangSidebar;
        sidebarEl = null;
        for (const el of layers) {
          el.dataset.show = "0";
          el.removeAttribute("src");
        }
        if (ambient) {
          ambient.dispose();
          ambient = null;
          if (canvas) canvas.remove();
          canvas = null;
        }
      }
    }

    document.addEventListener("pointermove", () => {
      if (state.enabled && state.idleFade) bumpIdle();
    });

    return { render };
  }

  // ---------------------------------------------------------------------------
  // 控制面板 UI
  // ---------------------------------------------------------------------------

  function createPanel(state, onChange) {
    const toggle = document.createElement("button");
    toggle.className = "liang-toggle";
    toggle.title = "滑动变祖";
    toggle.textContent = "梁";

    const panel = document.createElement("div");
    panel.className = "liang-panel";

    function sw(key, labelText) {
      const row = document.createElement("div");
      row.className = "liang-row";
      const label = document.createElement("label");
      label.textContent = labelText;
      const el = document.createElement("div");
      el.className = "liang-sw";
      el.dataset.on = state[key] ? "1" : "0";
      const flip = () => {
        state[key] = !state[key];
        el.dataset.on = state[key] ? "1" : "0";
        onChange();
      };
      el.addEventListener("click", flip);
      label.addEventListener("click", (e) => {
        e.preventDefault();
        flip();
      });
      row.append(label, el);
      return row;
    }

    // --- 常驻滑块槽：悬浮按钮下方，无需展开即可滑动皮肤强度 ---
    const dock = document.createElement("div");
    dock.className = "liang-dock";

    const dockRank = document.createElement("div");
    dockRank.className = "liang-dock__rank";

    const rail = document.createElement("input");
    rail.type = "range";
    rail.className = "liang-dock__rail";
    rail.min = "0";
    rail.max = String(PREVIEW_MAX_FRAME);
    rail.step = "1";
    rail.value = String(state.frame);
    rail.title = "皮肤强度";

    const updateRank = () => {
      dockRank.textContent = liangRankForFrame(state.frame);
    };
    updateRank();

    rail.addEventListener("input", () => {
      state.frame = clampFrame(Number(rail.value));
      updateRank();
      onChange();
    });

    dock.append(rail, dockRank);

    // --- 展开面板：透明度调节 + 可选效果 ---
    const title = document.createElement("h3");
    title.className = "liang-panel__title";
    title.textContent = "滑动变祖";

    const opacityField = document.createElement("div");
    opacityField.className = "liang-panel__field";
    const updateOpacityLabel = () => {
      opacityField.textContent = `立绘透明度 · ${Math.round((state.opacity ?? 1) * 100)}%`;
    };
    updateOpacityLabel();

    const opacity = document.createElement("input");
    opacity.type = "range";
    opacity.className = "liang-panel__slider";
    opacity.min = "20";
    opacity.max = "100";
    opacity.step = "1";
    opacity.value = String(Math.round((state.opacity ?? 1) * 100));
    opacity.addEventListener("input", () => {
      state.opacity = Number(opacity.value) / 100;
      updateOpacityLabel();
      onChange();
    });

    const hr = document.createElement("hr");
    hr.className = "liang-panel__hr";

    panel.append(
      title,
      sw("enabled", "启用皮肤"),
      opacityField,
      opacity,
      hr,
      sw("tintSidebar", "侧栏染色"),
      sw("xianxiaPortraits", "仙侠风立绘"),
      sw("maskEnabled", "氛围遮罩"),
      sw("particlesEnabled", "粒子效果"),
      sw("idleFade", "空闲时淡化"),
    );

    toggle.addEventListener("click", () => {
      panel.dataset.open = panel.dataset.open === "1" ? "0" : "1";
    });

    document.body.append(toggle, dock, panel);
    return {};
  }

  // ---------------------------------------------------------------------------
  // 启动
  // ---------------------------------------------------------------------------

  function boot() {
    if (document.getElementById("liang-skin-style")) return;
    const style = document.createElement("style");
    style.id = "liang-skin-style";
    style.textContent = CSS;
    document.head.appendChild(style);

    const state = store.read();

    const presenter = createPresenter(state);
    const commit = () => {
      store.write(state);
      presenter.render();
    };
    createPanel(state, commit);
    presenter.render();
  }

  if (document.body) boot();
  else window.addEventListener("DOMContentLoaded", boot, { once: true });
})();
