/* Generic smartphone UI used by the archive. It renders whatever data it gets after the
   passcode opens it; nothing about the case is written here.

   Page types:
     {type:"list", title, theme, groups:[{name, items:[{title, sub, meta, badge, avatar, icon, strong, red, page}]}]}
     {type:"chat", title, sub, theme, input, messages:[{day} | {from:"me"|"them"|"sys", t, text, who, read}]}
     {type:"html", title, html, full}   full: no title, html fills the screen (e.g. a camera view)
     {type:"grid", title, note, items:[{label, art, page}]}
   App: {id, name, icon, bg, badge, dock, page}
   theme: "wa" gives the WhatsApp look (style:"wa" on chats still works).
   icon: a name from TILES/GLYPHS below, a known emoji (mapped to the same SVGs), or raw HTML. */
(function () {
  "use strict";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- icons

  const HANDSET = "M24.5 22.5c.6-.6 1.6-.6 2 .2l1.4 2.6c.3.6.2 1.3-.3 1.7l-.9.8c.8 1.9 2.4 3.6 4.4 4.5l.8-.9c.4-.5 1.1-.6 1.7-.3l2.6 1.4c.7.4.8 1.4.2 2l-1.2 1.2c-1 1-2.5 1.3-3.8.8-4.2-1.6-7.4-4.8-9-9-.5-1.3-.2-2.8.8-3.8z";
  const grad = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="60" height="60" fill="url(#${id})"/>`;
  const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i * 360 / n)).join("");
  const tile = (body) => `<svg viewBox="0 0 60 60" aria-hidden="true">${body}</svg>`;

  // Full app tiles (draw their own background).
  const TILES = {
    messages: tile(grad("gm", "#67f27f", "#0cbd2a") + `<ellipse cx="30" cy="28" rx="18" ry="14.5" fill="#fff"/><path d="M17.5 36c-.4 4.5-2.6 7-5.5 8.4 5.2.3 9.4-1.4 12-4z" fill="#fff"/>`),
    phone: tile(grad("gp", "#67f27f", "#0cbd2a") + `<g transform="translate(30 30) scale(1.9) translate(-30 -30)"><path d="${HANDSET}" fill="#fff"/></g>`),
    whatsapp: tile(grad("gw", "#5ff57d", "#1dbf4e") + `<path d="M30 13.5a15.5 15.5 0 1 1-7.9 28.8L14.5 44.5l2.3-7.2A15.5 15.5 0 0 1 30 13.5z" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/><path d="${HANDSET}" fill="#fff" transform="translate(30 29) scale(1.05) translate(-30 -29)"/>`),
    photos: tile(`<rect width="60" height="60" fill="#fff"/><g style="mix-blend-mode:multiply">${["#f9b42d", "#f47c20", "#e8414a", "#c4359c", "#8a4bd1", "#3a7bf2", "#33b6c9", "#6cc04a"].map((c, i) => `<ellipse cx="30" cy="19" rx="6" ry="11" fill="${c}" opacity=".8" transform="rotate(${i * 45} 30 30)"/>`).join("")}</g>`),
    camera: tile(grad("gc", "#ededf0", "#a9a9ae") + `<rect x="23" y="16" width="14" height="6" rx="2" fill="#1c1c1e"/><rect x="10" y="20" width="40" height="25" rx="5" fill="#1c1c1e"/><circle cx="30" cy="32.5" r="8.5" fill="#3a3a3c" stroke="#8e8e93" stroke-width="1.5"/><circle cx="30" cy="32.5" r="4" fill="#111"/><circle cx="43" cy="25" r="1.6" fill="#ffd60a"/>`),
    notes: tile(`<rect width="60" height="60" fill="#fff"/><rect width="60" height="15" fill="#f8cd45"/>${[25, 33, 41, 49].map((y) => `<line x1="9" y1="${y}" x2="51" y2="${y}" stroke="#d1d1d6" stroke-width="1.6"/>`).join("")}<line x1="9" y1="15.8" x2="51" y2="15.8" stroke="#000" stroke-opacity=".08"/>`),
    settings: tile(grad("gs", "#d1d1d6", "#8e8e93") + `<g fill="#48484a">${ring(10, (a) => `<rect x="27" y="9" width="6" height="9" rx="1.5" transform="rotate(${a} 30 30)"/>`)}<circle cx="30" cy="30" r="15"/></g><circle cx="30" cy="30" r="9" fill="#b9b9be"/><circle cx="30" cy="30" r="5.5" fill="#48484a"/>`),
    mail: tile(grad("ge", "#4fb4ff", "#1572f0") + `<rect x="11" y="18" width="38" height="25" rx="3" fill="#fff"/><path d="M12 20l18 13 18-13" fill="none" stroke="#2f8af8" stroke-width="2.4" stroke-linejoin="round"/>`),
    calendar: tile(`<rect width="60" height="60" fill="#fff"/><rect x="0" y="0" width="60" height="15" fill="#ff3b30"/>${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${9 + c * 9}" y="${21 + r * 8.5}" width="6" height="5.5" rx="1" fill="${r === 1 && c === 2 ? "#ff3b30" : "#c7c7cc"}"/>`).join("")).join("")}`),
    clock: tile(`<rect width="60" height="60" fill="#000"/><circle cx="30" cy="30" r="23" fill="#fff"/>${ring(12, (a) => `<line x1="30" y1="9.5" x2="30" y2="12.5" stroke="#000" stroke-width="1.6" transform="rotate(${a} 30 30)"/>`)}<line x1="30" y1="30" x2="30" y2="15" stroke="#000" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="30" x2="40" y2="35" stroke="#000" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="34" x2="23" y2="17" stroke="#ff9500" stroke-width="1.2"/><circle cx="30" cy="30" r="1.8" fill="#ff9500"/>`),
    maps: tile(`<rect width="60" height="60" fill="#cfe8b0"/><path d="M0 38l60-16v16L0 54z" fill="#f2e9d8"/><path d="M-4 47C18 38 36 32 64 12" stroke="#fff" stroke-width="8" fill="none"/><path d="M38 -4C34 20 40 40 34 64" stroke="#ffd25a" stroke-width="5" fill="none"/><path d="M22 14a7 7 0 0 1 14 0c0 6-7 13-7 13s-7-7-7-13z" fill="#ff3b30"/><circle cx="29" cy="14" r="2.6" fill="#fff"/>`),
    contacts: tile(grad("gk", "#d8d8dc", "#9c9ca1") + `<circle cx="30" cy="24" r="9.5" fill="#fff"/><ellipse cx="30" cy="50" rx="17" ry="12" fill="#fff"/>`),
    browser: tile(`<rect width="60" height="60" fill="#fff"/>` + `<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2bb2ff"/><stop offset="1" stop-color="#1360e0"/></linearGradient></defs><circle cx="30" cy="30" r="22" fill="url(#gb)"/>${ring(36, (a) => `<line x1="30" y1="10" x2="30" y2="12" stroke="#fff" stroke-opacity=".7" stroke-width=".8" transform="rotate(${a} 30 30)"/>`)}<g transform="rotate(45 30 30)"><path d="M30 13l4 17h-8z" fill="#ff3b30"/><path d="M30 47l4-17h-8z" fill="#fff"/></g>`),
    bank: tile(grad("gn", "#1d5bbf", "#0b2f73") + `<path d="M11 25L30 13l19 12z" fill="#fff"/>${[15, 23.5, 32, 40.5].map((x) => `<rect x="${x}" y="27" width="4.5" height="14" fill="#fff"/>`).join("")}<rect x="11" y="43" width="38" height="4" fill="#fff"/>`),
    music: tile(grad("gu", "#fd6684", "#f6203e") + `<path d="M26 40V20l16-4v20" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="22.5" cy="40.5" r="4.8" fill="#fff"/><circle cx="38.5" cy="36.5" r="4.8" fill="#fff"/>`),
    weather: tile(grad("gt", "#55aef5", "#1d67cf") + `<circle cx="24" cy="23" r="8" fill="#ffd60a"/><g fill="#fff"><circle cx="27" cy="38" r="7"/><circle cx="36" cy="33" r="9"/><circle cx="44" cy="39" r="6"/><rect x="27" y="38" width="17" height="7"/></g>`),
    files: tile(`<rect width="60" height="60" fill="#fff"/><path d="M10 20a3 3 0 0 1 3-3h10l4 4h20a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#1a8cff"/><path d="M10 26h40v15a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#46a6ff"/>`),
  };

  // Line glyphs (take the colour of their container).
  const glyph = (body, fill) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill ? "currentColor" : "none"}" stroke="${fill ? "none" : "currentColor"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const GLYPHS = {
    wifi: glyph(`<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>`),
    battery: glyph(`<rect x="2" y="7" width="18" height="10" rx="2.5"/><path d="M23 10.5v3"/><rect x="4.5" y="9.5" width="9" height="5" rx="1" fill="currentColor" stroke="none"/>`),
    bluetooth: glyph(`<path d="M7 7l10 10-5 5V2l5 5L7 17"/>`),
    airplane: glyph(`<path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-4.5z"/>`, true),
    bell: glyph(`<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0"/>`),
    lock: glyph(`<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`),
    user: glyph(`<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`),
    moon: glyph(`<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`),
    location: glyph(`<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>`),
    hourglass: glyph(`<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>`),
    faceid: glyph(`<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M9 9v1.5M15 9v1.5M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0"/>`),
    medical: glyph(`<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>`, true),
    gear: glyph(`<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>`),
  };

  const EMOJI = {
    "💬": "messages", "🗨️": "messages", "📞": "phone", "☎️": "phone", "📱": "phone", "📷": "camera", "📸": "camera",
    "🖼️": "photos", "🖼": "photos", "🌄": "photos", "📝": "notes", "🗒️": "notes", "⚙️": "settings", "⚙": "settings",
    "✉️": "mail", "✉": "mail", "📧": "mail", "📨": "mail", "📅": "calendar", "📆": "calendar", "⏰": "clock", "🕒": "clock",
    "🗺️": "maps", "🗺": "maps", "📍": "maps", "👤": "contacts", "📇": "contacts", "🌐": "browser", "🧭": "browser",
    "🏦": "bank", "💳": "bank", "🎵": "music", "🎶": "music", "🌤️": "weather", "⛅": "weather", "📁": "files", "📂": "files",
    "⏳": "hourglass", "☺": "faceid", "✚": "medical", "▮": "battery", "📶": "wifi", "🔋": "battery", "🔒": "lock", "🔔": "bell", "✈️": "airplane", "🌙": "moon",
  };

  // Returns [html, isTile]. Unknown values are passed through untouched.
  function iconHtml(v) {
    const k = String(v == null ? "" : v).trim();
    const name = EMOJI[k] || k;
    if (TILES[name]) return [TILES[name], true];
    if (GLYPHS[name]) return [GLYPHS[name], false];
    return [v == null ? "" : String(v), false];
  }

  const SYS = {
    signal: `<svg viewBox="0 0 18 12" aria-hidden="true"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></g></svg>`,
    wifi: `<svg viewBox="0 0 16 12" aria-hidden="true"><path fill="currentColor" d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .4 10.4 10.4 0 0 0 .8 3.3L2 4.6a8.6 8.6 0 0 1 6-2.4zm0 3.5c1.4 0 2.6.5 3.6 1.4l1.2-1.3A7 7 0 0 0 8 3.9a7 7 0 0 0-4.8 1.9l1.2 1.3c1-.9 2.2-1.4 3.6-1.4zM8 9.2l-2.4-.1L8 11.7l2.4-2.6z"/></svg>`,
    face: `<svg viewBox="0 0 60 60" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18v-8a6 6 0 0 1 6-6h8M42 4h8a6 6 0 0 1 6 6v8M56 42v8a6 6 0 0 1-6 6h-8M18 56h-8a6 6 0 0 1-6-6v-8M20 22v5M40 22v5M30 22v11h-3M21 41c5 4 13 4 18 0"/></svg>`,
    del: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M9 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-7-7zM12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>`,
    ticks: `<svg class="ph-ticks" viewBox="0 0 18 11" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6l3 3 6.5-7.5M8 8.5l.8.8 6.7-7.8"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
    cam: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>`,
    mic: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>`,
    up: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`,
  };
  const WHO_COLORS = ["#1f7aec", "#c2410c", "#7c3aed", "#0f8a5f", "#d6336c", "#b7791f", "#0e7490"];
  const WA_TABS = [
    ["Actualizări", `<circle cx="12" cy="12" r="8.5" stroke-dasharray="4 2.2"/><circle cx="12" cy="12" r="4.5"/>`],
    ["Apeluri", `<path d="M6.5 3.5c.8-.8 2.1-.7 2.7.3l1.6 2.8c.4.7.3 1.6-.3 2.1l-1 .9c1 2.3 2.9 4.2 5.2 5.2l.9-1c.5-.6 1.4-.7 2.1-.3l2.8 1.6c1 .6 1.1 1.9.3 2.7l-1.3 1.3c-1.2 1.2-3 1.6-4.6 1-5-1.9-8.8-5.7-10.7-10.7-.6-1.6-.2-3.4 1-4.6z"/>`],
    ["Comunități", `<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0M3 14.5a4 4 0 0 1 3-3.8M21 14.5a4 4 0 0 0-3-3.8"/>`],
    ["Chaturi", `<path d="M12 3.5a8.5 8.5 0 1 1-4.4 15.8L3.5 20.5l1.2-4A8.5 8.5 0 0 1 12 3.5z"/>`],
    ["Setări", `<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>`],
  ];

  function mount(host, opts) {
    const lock = opts.lock || {};
    host.innerHTML = `
      <div class="ph-wrap">
        <a class="ph-exit" href="${opts.exitHref || "#/"}">‹ Înapoi la arhivă</a>
        ${lock.caption ? `<p class="ph-caption">${lock.caption}</p>` : ""}
        <div class="ph">
          <div class="ph-status"><span>${esc(lock.time || "")}</span><span class="ph-island"></span><span class="ph-batt"><span class="ph-sig">${SYS.signal}</span><span class="ph-wf">${SYS.wifi}</span>${esc(lock.battery || "")}<i style="--b:${Number(lock.battery) || 50}%"></i></span></div>
          <div class="ph-screen"></div>
          <div class="ph-homebar" title="Acasă"></div>
        </div>
      </div>`;
    const screen = host.querySelector(".ph-screen");
    const homebar = host.querySelector(".ph-homebar");
    const frame = host.querySelector(".ph");
    const light = (on) => frame.classList.toggle("light", on);
    let phoneData = null;
    let stack = [];
    let wrong = 0;
    let disabledUntil = 0;

    // ---------- lock screen

    function showLock() {
      light(false);
      screen.className = "ph-screen ph-wall";
      screen.innerHTML = `
        <div class="ph-lock">
          <div class="ph-padlock">${GLYPHS.lock}</div>
          <div class="ph-date">${esc(lock.date || "")}</div>
          <div class="ph-time">${esc(lock.time || "")}</div>
          <div class="ph-notifs">${(lock.notifs || []).map((n) => {
            const [ic, isTile] = iconHtml(n.icon);
            return `
            <div class="ph-notif"><div class="ph-notif-h"><span class="ph-mini ${isTile ? "tile" : ""}" style="background:${esc(n.bg || "#666")}">${ic}</span>${esc(n.app)}<span>${esc(n.t || "")}</span></div>
            <b>${esc(n.title || "")}</b><div>${esc(n.body || "")}</div></div>`;
          }).join("")}</div>
          <div class="ph-swipe">Glisați în sus pentru a deschide</div>
        </div>`;
      screen.onclick = () => { screen.onclick = null; faceId(); };
    }

    function faceId() {
      screen.innerHTML = `<div class="ph-face"><div class="ph-face-icon">${SYS.face}</div><div>Face ID</div></div>`;
      setTimeout(() => {
        screen.innerHTML = `<div class="ph-face fail"><div class="ph-face-icon">${SYS.face}</div><div>Fața nu a fost recunoscută</div></div>`;
        setTimeout(showPasscode, 900);
      }, 900);
    }

    function showPasscode() {
      screen.className = "ph-screen ph-wall dim";
      let code = "";
      const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
      const subs = { 2: "ABC", 3: "DEF", 4: "GHI", 5: "JKL", 6: "MNO", 7: "PQRS", 8: "TUV", 9: "WXYZ" };
      screen.innerHTML = `
        <div class="ph-pass">
          <div class="ph-pass-t">Introduceți codul de acces</div>
          <div class="ph-dots"><i></i><i></i><i></i><i></i></div>
          <div class="ph-pass-msg"></div>
          <div class="ph-keys">${keys.map((k) => k === "" ? "<span></span>" :
            `<button data-k="${k}" class="${k === "⌫" ? "del" : ""}" aria-label="${k === "⌫" ? "Ștergeți" : k}">${k === "⌫" ? SYS.del : k}${subs[k] ? `<small>${subs[k]}</small>` : ""}</button>`).join("")}</div>
          <div class="ph-pass-foot">
            <button class="ph-cancel">Anulați</button>
            ${opts.remembered ? `<button class="ph-remember">Codul e salvat pe acest telefon</button>` : ""}
          </div>
        </div>`;
      const dots = screen.querySelectorAll(".ph-dots i");
      const msg = screen.querySelector(".ph-pass-msg");
      const paint = () => dots.forEach((d, i) => d.classList.toggle("on", i < code.length));
      const busy = () => Date.now() < disabledUntil;

      async function submit(pin) {
        const d = await opts.tryPin(pin);
        if (d) { phoneData = d; return showHome(); }
        wrong++;
        const box = screen.querySelector(".ph-dots");
        box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
        code = ""; paint();
        if (wrong >= 6) {
          disabledUntil = Date.now() + 60000;
          wrong = 0;
          msg.textContent = "Telefon indisponibil. Reîncercați peste 1 minut.";
          setTimeout(() => { msg.textContent = ""; }, 60000);
        }
      }

      screen.querySelectorAll(".ph-keys button").forEach((b) => b.addEventListener("click", () => {
        if (busy()) return;
        const k = b.dataset.k;
        if (k === "⌫") code = code.slice(0, -1);
        else if (code.length < 4) code += k;
        paint();
        if (code.length === 4) setTimeout(() => submit(code), 150);
      }));
      screen.querySelector(".ph-cancel").onclick = showLock;
      const rem = screen.querySelector(".ph-remember");
      if (rem) rem.onclick = () => submit("__remembered__");
    }

    // ---------- home and apps

    function showHome() {
      stack = [];
      light(false);
      screen.className = "ph-screen ph-wall";
      const apps = phoneData.apps.filter((a) => !a.dock);
      const dock = phoneData.apps.filter((a) => a.dock);
      const icon = (a) => {
        const [ic, isTile] = iconHtml(a.icon);
        return `<button class="ph-app" data-app="${esc(a.id)}">
          <span class="ph-icon ${isTile ? "tile" : ""}" style="background:${esc(a.bg)}">${ic}${a.badge ? `<em>${esc(a.badge)}</em>` : ""}</span>
          <span class="ph-app-n">${esc(a.name)}</span></button>`;
      };
      screen.innerHTML = `<div class="ph-home"><div class="ph-apps">${apps.map(icon).join("")}</div>
        <div class="ph-dock">${dock.map(icon).join("")}</div></div>`;
      screen.querySelectorAll(".ph-app").forEach((b) => b.addEventListener("click", () => {
        const a = phoneData.apps.find((x) => x.id === b.dataset.app);
        push(Object.assign({ title: a.name }, a.page), a.name);
      }));
    }

    homebar.addEventListener("click", () => { if (phoneData) showHome(); });

    function push(page) {
      stack.push(page);
      renderPage();
    }
    function pop() {
      stack.pop();
      if (!stack.length) return showHome();
      renderPage();
    }

    const themeOf = (p) => p.theme || (p.style === "wa" ? "wa" : "");

    function renderPage() {
      const page = stack[stack.length - 1];
      const prev = stack.length > 1 ? stack[stack.length - 2].title : "Acasă";
      const theme = themeOf(page);
      screen.className = "ph-screen ph-appview" + (page.dark ? " dark" : "") + (theme ? " th-" + theme : "");
      light(!page.dark);
      let body = "";
      if (page.type === "list") body = listHtml(page, theme);
      else if (page.type === "chat") body = chatHtml(page, theme);
      else if (page.type === "grid") body = gridHtml(page);
      else body = `<div class="ph-html">${page.html || ""}</div>`;
      const waRoot = theme === "wa" && page.type === "list" && stack.length === 1;
      screen.innerHTML = `
        <div class="ph-nav"><button class="ph-back">‹ ${esc(prev)}</button></div>
        <div class="ph-scroll${page.full ? " full" : ""}">
          ${page.type === "chat" || page.full ? "" : `<h2 class="ph-title">${esc(page.title || "")}</h2>`}
          ${waRoot ? waTopHtml() : ""}
          ${body}
        </div>
        ${page.type === "chat" ? inputHtml(page, theme) : ""}
        ${waRoot ? waTabsHtml() : ""}`;
      screen.querySelector(".ph-back").onclick = pop;
      screen.querySelectorAll("[data-i]").forEach((el) => el.addEventListener("click", () => {
        const [g, i] = el.dataset.i.split(".").map(Number);
        const it = page.type === "grid" ? page.items[i] : page.groups[g].items[i];
        if (it.page) push(Object.assign({ title: it.title || it.label }, it.page));
      }));
      const sc = screen.querySelector(".ph-scroll");
      sc.scrollTop = page.type === "chat" ? sc.scrollHeight : 0;
    }

    function listHtml(page, theme) {
      return (page.top || "") + page.groups.map((g, gi) => `
        ${g.name ? `<div class="ph-group">${esc(g.name)}</div>` : ""}
        <div class="ph-list">${g.items.map((it, i) => {
          const [ic] = it.icon ? iconHtml(it.icon) : [""];
          return `
          <div class="ph-row ${it.page ? "tap" : ""} ${it.strong ? "strong" : ""} ${it.red ? "red" : ""} ${it.badge ? "unread" : ""}" ${it.page ? `data-i="${gi}.${i}"` : ""}>
            ${it.avatar ? `<span class="ph-av" style="background:${esc(it.avbg || "#8e8e93")}">${esc(it.avatar)}</span>` : ""}
            ${it.icon ? `<span class="ph-rowicon" style="background:${esc(it.iconbg || "#8e8e93")}">${ic}</span>` : ""}
            <span class="ph-row-main"><span class="ph-row-t">${esc(it.title)}</span>${it.sub ? `<span class="ph-row-s">${it.subHtml ? it.sub : esc(it.sub)}</span>` : ""}</span>
            ${theme === "wa" ? `<span class="ph-row-side">${it.meta ? `<span class="ph-row-m">${esc(it.meta)}</span>` : ""}${it.badge ? `<span class="ph-row-b">${esc(it.badge)}</span>` : ""}</span>` : `
            ${it.meta ? `<span class="ph-row-m">${esc(it.meta)}</span>` : ""}
            ${it.badge ? `<span class="ph-row-b">${esc(it.badge)}</span>` : ""}
            ${it.page ? `<span class="ph-chev">›</span>` : ""}`}
          </div>`;
        }).join("")}</div>`).join("") + (page.bottom || "");
    }

    function chatHtml(page, theme) {
      const wa = theme === "wa";
      const who = {};
      return `<div class="ph-chat-h"><span class="ph-av" style="background:${esc(page.avbg || "#8e8e93")}">${esc(page.avatar || (page.title || "?")[0])}</span>
          <div><b>${esc(page.title)}</b>${page.sub ? `<small>${esc(page.sub)}</small>` : ""}</div></div>
        <div class="ph-chat ${wa ? "wa" : page.style || ""}">${page.messages.map((m) => {
          if (m.day) return `<div class="ph-day">${esc(m.day)}</div>`;
          if (m.from === "sys") return `<div class="ph-sys">${esc(m.text)}</div>`;
          const ticks = m.from !== "me" ? "" : wa ? `<i class="${m.read ? "read" : ""}">${SYS.ticks}</i>` : m.read ? " ✓✓" : "";
          if (m.who && !(m.who in who)) who[m.who] = WHO_COLORS[Object.keys(who).length % WHO_COLORS.length];
          const whoStyle = wa && m.who ? ` style="color:${who[m.who]}"` : "";
          return `<div class="ph-msg ${m.from}">${m.who ? `<span class="ph-who"${whoStyle}>${esc(m.who)}</span>` : ""}${esc(m.text).replace(/\n/g, "<br>")}<span class="ph-t">${esc(m.t || "")}${ticks}</span></div>`;
        }).join("")}</div>`;
    }

    // Decorative message bar; it does not send anything.
    function inputHtml(page, theme) {
      if (theme === "wa") return `<div class="ph-input wa"><span class="ph-in-ic">${SYS.plus}</span><span class="ph-in-field"></span><span class="ph-in-ic">${SYS.cam}</span><span class="ph-in-ic">${SYS.mic}</span></div>`;
      return `<div class="ph-input"><span class="ph-in-ic round">${SYS.plus}</span><span class="ph-in-field">${esc(page.input || "Mesaj")}</span></div>`;
    }

    function waTopHtml() {
      return `<div class="ph-wa-top"><div class="ph-wa-search">${SYS.search}<span>Căutați</span></div>
        <div class="ph-wa-chips"><span class="on">Toate</span><span>Necitite</span><span>Favorite</span><span>Grupuri</span></div></div>`;
    }

    function waTabsHtml() {
      return `<div class="ph-tabs">${WA_TABS.map(([n, d]) => `<span class="${n === "Chaturi" ? "on" : ""}">${glyph(d)}${n}</span>`).join("")}</div>`;
    }

    function gridHtml(page) {
      return `${page.note ? `<div class="ph-note">${page.note}</div>` : ""}<div class="ph-grid">${page.items.map((it, i) => `
        <button class="ph-thumb" data-i="0.${i}">${it.art || ""}<span>${esc(it.label || "")}</span></button>`).join("")}</div>${page.bottom || ""}`;
    }

    showLock();
  }

  window.Phone = { mount };
})();
