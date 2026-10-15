/* Arhiva Moldovan: generic engine.
   It holds no case content. Every text the players see is encrypted in data/vault.js
   (AES-GCM, keys derived with PBKDF2-SHA-256) and is opened with the answers they find. */
(function () {
  "use strict";

  const V = window.VAULT;
  const te = new TextEncoder();
  const td = new TextDecoder();
  const STORE = "arhiva-moldovan:v1";
  const app = document.getElementById("app");

  // ---------- small helpers

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function fromB64(s) {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  // ---------- saved progress (per device)

  function blankState() { return { keys: {}, hints: {}, wrong: {}, start: null, gaveUp: false }; }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && s.keys) return Object.assign(blankState(), s);
    } catch (e) { /* storage blocked or empty */ }
    return blankState();
  }
  let state = load();
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  // ---------- crypto

  const norms = {
    raw: (s) => s,
    digits: (s) => s.replace(/\D/g, ""),
    login: (s) => s.split("/")[0].replace(/\D/g, ""),
    text: (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, ""),
    time: (s) => {
      const d = s.replace(/\D/g, "");
      return d.length === 3 ? "0" + d : d;
    },
  };

  const keyCache = new Map();
  async function derive(pass, salt) {
    const id = salt + "\n" + pass;
    if (keyCache.has(id)) return keyCache.get(id);
    const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: fromB64(salt), iterations: V.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    keyCache.set(id, key);
    return key;
  }

  async function decryptBox(key, box) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.ct));
    return JSON.parse(td.decode(pt));
  }

  // Returns {k} when the answer opens the gate, {m} for a known near miss, null otherwise.
  async function tryGate(gateId, answer, normName) {
    const g = V.gates[gateId];
    if (!g) return null;
    const pass = (norms[normName || g.norm] || norms.raw)(String(answer).trim());
    if (!pass) return null;
    const key = await derive(pass, g.salt);
    for (const w of g.wraps) {
      try { return await decryptBox(key, w); } catch (e) { /* not this one */ }
    }
    return null;
  }

  async function openPayload(gateId, ck) {
    const key = await crypto.subtle.importKey("raw", fromB64(ck), "AES-GCM", false, ["decrypt"]);
    return decryptBox(key, V.payloads[gateId]);
  }

  // ---------- unlocked content

  const data = { app: {}, sections: [], content: {}, hints: [], milestones: [], rewards: {}, accuse: null, final: null, phone: null, phoneLock: null };

  function merge(p) {
    if (p.app) Object.assign(data.app, p.app);
    if (p.sections) data.sections.push(...p.sections);
    if (p.content) Object.assign(data.content, p.content);
    if (p.hints) data.hints.push(...p.hints);
    if (p.milestones) data.milestones.push(...p.milestones);
    if (p.rewards) Object.assign(data.rewards, p.rewards);
    for (const k of ["accuse", "final", "phone", "phoneLock"]) if (p[k]) data[k] = p[k];
    data.sections.sort((a, b) => a.order - b.order);
    data.hints.sort((a, b) => a.order - b.order);
    data.milestones.sort((a, b) => a.order - b.order);
  }

  const opened = new Set();
  async function unlock(gateId, ck) {
    if (opened.has(gateId)) return;
    merge(await openPayload(gateId, ck));
    opened.add(gateId);
    if (state.keys[gateId] !== ck) {
      state.keys[gateId] = ck;
      save();
    }
  }

  async function submitGate(gateId, answer, normName) {
    const r = await tryGate(gateId, answer, normName);
    if (r && r.k) {
      await unlock(gateId, r.k);
      return { ok: true };
    }
    state.wrong[gateId] = (state.wrong[gateId] || 0) + 1;
    save();
    return { ok: false, msg: r && r.m };
  }

  // ---------- rendering

  function setView(html) {
    app.innerHTML = html;
    window.scrollTo(0, 0);
    enhance(app);
  }

  // Generic behaviours for content HTML: tabs and table filters.
  function enhance(root) {
    $$("[data-tabs]", root).forEach((box) => {
      const btns = $$(":scope > .tab-bar > button", box);
      const panes = $$(":scope > .tab-pane", box);
      const show = (i) => {
        btns.forEach((b, j) => b.classList.toggle("on", i === j));
        panes.forEach((p, j) => { p.hidden = i !== j; });
      };
      btns.forEach((b, i) => b.addEventListener("click", () => show(i)));
      show(0);
    });
    $$("[data-filter]", root).forEach((tbl) => {
      const inp = document.createElement("input");
      inp.type = "search";
      inp.className = "filter";
      inp.placeholder = tbl.getAttribute("data-filter") || "Caută în tabel";
      const box = tbl.closest(".scroll") || tbl;
      box.parentNode.insertBefore(inp, box);
      const rows = $$("tbody tr", tbl);
      inp.addEventListener("input", () => {
        const q = norms.text(inp.value);
        rows.forEach((r) => { r.hidden = q && !norms.text(r.textContent).includes(q); });
      });
    });
    // Checkbox that toggles a class on a target, e.g. to hide routine rows of a log.
    $$("input[data-toggle-class]", root).forEach((cb) => {
      const target = $(cb.dataset.target, root);
      const apply = () => target && target.classList.toggle(cb.dataset.toggleClass, cb.checked);
      cb.addEventListener("change", apply);
      apply();
    });
  }

  function header(title, back) {
    return `<header class="top">
      ${back ? `<a class="back" href="#/">‹ Arhivă</a>` : ""}
      <div class="brand">${esc(data.app.title || "Arhiva")}</div>
      ${title ? `<h1>${title}</h1>` : ""}
    </header>`;
  }

  function viewLogin(msg) {
    setView(`<main class="login">
      <div class="folder">
        <div class="tab-label">ARHIVĂ PRIVATĂ</div>
        <h1>Arhiva Moldovan</h1>
        <form id="f">
          <label for="p">Parola de intrare</label>
          <input id="p" autocomplete="off" inputmode="numeric" autofocus>
          <button>Intră</button>
          <p class="msg">${msg || ""}</p>
        </form>
      </div>
    </main>`);
    $("#f").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#f button");
      btn.disabled = true;
      const r = await submitGate("login", $("#p").value);
      if (r.ok) {
        if (!state.start) { state.start = Date.now(); save(); }
        route();
      } else {
        btn.disabled = false;
        $("#f .msg").textContent = "Parola nu e bună.";
      }
    });
  }

  function lockState(s) {
    if (!s.gate || state.keys[s.gate]) return "open";
    return s.lock || "password";
  }

  function viewHome() {
    const cards = data.sections.map((s) => {
      const st = lockState(s);
      const badge = st === "open" ? "" : st === "milestone" ? `<span class="lock">🔒 ${esc(s.lockLabel || "încuiat")}</span>` : `<span class="lock">🔒 parolă</span>`;
      return `<a class="card ${st === "open" ? "" : "locked"}" href="#/s/${s.id}">
        <span class="code">${esc(s.code)}</span>
        <span class="t">${esc(s.title)}</span>
        <span class="sub">${esc(s.sub || "")}</span>${badge}
      </a>`;
    }).join("");
    const done = data.milestones.filter((m) => state.keys[m.gate]).length;
    setView(`${header("", false)}
      <main>
        <section class="intro">${data.app.intro || ""}</section>
        <nav class="grid">${cards}</nav>
        <nav class="grid big">
          <a class="card office" href="#/birou"><span class="t">Biroul lui Aurel</span><span class="sub">Verificări: ${done} din ${data.app.totalMilestones || data.milestones.length}</span></a>
          <a class="card" href="#/indicii"><span class="t">Indicii</span><span class="sub">Când chiar nu mai merge</span></a>
          <a class="card accuse" href="#/acuzare"><span class="t">Acuzarea</span><span class="sub">Cine, de ce și cum</span></a>
        </nav>
        <footer class="foot">${timer()}<button id="reset" class="link">Șterge progresul de pe acest telefon</button></footer>
      </main>`);
    $("#reset").addEventListener("click", () => {
      if (!confirm("Ștergi tot progresul salvat pe acest telefon? Va trebui să introduceți din nou parolele și răspunsurile.")) return;
      try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
      location.hash = "";
      location.reload();
    });
  }

  function timer() {
    if (!state.start) return "";
    const min = Math.floor((Date.now() - state.start) / 60000);
    return `<span>Lucrați de ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min.</span>`;
  }

  function viewSection(id) {
    const s = data.sections.find((x) => x.id === id);
    if (!s) return viewHome();
    if (s.type === "phone") return viewPhone(s);
    const st = lockState(s);
    let body;
    if (st === "open") {
      body = (data.content[id] && data.content[id].html) || "<p>Gol.</p>";
    } else if (st === "milestone") {
      body = `<div class="locked-box"><p>${s.prompt || "Secțiunea se deschide din Biroul lui Aurel."}</p><a class="btn" href="#/birou">Biroul lui Aurel</a></div>`;
    } else {
      body = `<form class="locked-box" id="f">
        <p>${s.prompt || "Secțiune încuiată."}</p>
        <input id="p" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Parola">
        <button>Deschide</button><p class="msg"></p></form>`;
    }
    setView(`${header(`<span class="code">${esc(s.code)}</span> ${esc(s.title)}`, true)}<main class="section">${body}</main>`);
    const f = $("#f");
    if (f) {
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        f.querySelector("button").disabled = true;
        const r = await submitGate(s.gate, $("#p").value);
        if (r.ok) return viewSection(id);
        f.querySelector("button").disabled = false;
        $(".msg", f).innerHTML = r.msg || "Nu se deschide.";
      });
    }
  }

  function viewPhone(s) {
    setView(`<div id="phone-host"></div>`);
    window.Phone.mount($("#phone-host"), {
      lock: data.phoneLock,
      remembered: !!state.keys[s.gate],
      exitHref: "#/",
      tryPin: async (pin) => {
        if (pin === "__remembered__") return state.keys[s.gate] ? data.phone : null;
        const r = await submitGate(s.gate, pin);
        return r.ok ? data.phone : null;
      },
    });
  }

  // Forms used by milestones and the accusation.
  function formHtml(fields) {
    return fields.map((f, i) => {
      const name = `f${i}`;
      if (f.type === "choice") {
        return `<fieldset><legend>${f.label}</legend>${f.options.map((o) =>
          `<label class="opt"><input type="radio" name="${name}" value="${esc(o.id)}"><span>${o.label}</span></label>`).join("")}</fieldset>`;
      }
      const mode = f.type === "time" || f.type === "number" ? "numeric" : "text";
      return `<label class="field"><span>${f.label}</span><input name="${name}" inputmode="${mode}" autocomplete="off" placeholder="${esc(f.placeholder || "")}"></label>`;
    }).join("");
  }

  function readForm(form, fields) {
    const vals = [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      let v;
      if (f.type === "choice") {
        const c = form.querySelector(`input[name=f${i}]:checked`);
        v = c ? c.value : "";
      } else {
        v = (norms[f.norm || (f.type === "time" ? "time" : f.type === "number" ? "digits" : "text")])(form.elements[`f${i}`].value.trim());
      }
      if (!v) return null;
      vals.push(v);
    }
    return vals;
  }

  async function checkForm(form, fields, gateId) {
    const vals = readForm(form, fields);
    if (!vals) return { ok: false, msg: "Completați tot." };
    const r = await submitGate(gateId, vals.join("|"), "raw");
    if (r.ok) return r;
    // Near misses are checked field by field, without saying which field is right.
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].near) continue;
      const n = await tryGate(fields[i].near, vals[i], "raw");
      if (n && n.m) return { ok: false, msg: n.m };
    }
    return r;
  }

  function viewOffice() {
    const items = data.milestones.map((m) => {
      if (state.keys[m.gate]) {
        return `<article class="ms done"><h2>${m.title}</h2>${data.rewards[m.id] || ""}</article>`;
      }
      return `<article class="ms"><h2>${m.title}</h2>${m.intro || ""}
        <form data-ms="${m.id}">${formHtml(m.fields)}<button>Verifică</button><p class="msg"></p></form></article>`;
    }).join("");
    setView(`${header("Biroul lui Aurel", true)}<main class="office">${data.app.office || ""}${items}${data.milestones.length < (data.app.totalMilestones || 0) ? (data.app.officeMore || "") : ""}</main>`);
    $$("form[data-ms]").forEach((form) => {
      const m = data.milestones.find((x) => x.id === form.dataset.ms);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = $("button", form);
        btn.disabled = true;
        $(".msg", form).textContent = "Aurel citește...";
        const r = await checkForm(form, m.fields, m.gate);
        if (r.ok) return viewOffice();
        btn.disabled = false;
        $(".msg", form).innerHTML = r.msg || (data.app.wrong || "Nu.");
      });
    });
  }

  function viewHints() {
    const total = Object.values(state.hints).reduce((a, b) => a + b, 0);
    const list = data.hints.map((t) => {
      const n = state.hints[t.id] || 0;
      const shown = t.levels.slice(0, n).map((l, i) => `<div class="hint"><b>${i + 1}.</b> ${l}</div>`).join("");
      const more = n < t.levels.length ? `<button data-h="${t.id}">${n ? "Încă un indiciu" : "Arată primul indiciu"}</button>` : "";
      return `<article class="topic"><h2>${t.title}</h2>${t.sub ? `<p class="sub">${t.sub}</p>` : ""}${shown}${more}</article>`;
    }).join("");
    setView(`${header("Indicii", true)}<main class="hints">${data.app.hintsIntro || ""}<p class="sub">Indicii folosite până acum: ${total}</p>${list}</main>`);
    $$("button[data-h]").forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Sigur vreți indiciul? Aurel o să țină minte.")) return;
      state.hints[b.dataset.h] = (state.hints[b.dataset.h] || 0) + 1;
      save();
      viewHints();
    }));
  }

  function viewAccuse() {
    const a = data.accuse;
    if (state.keys.final && data.final) {
      return setView(`${header("Acuzarea", true)}<main class="accuse">${data.final.html}${stats()}</main>`);
    }
    if (state.gaveUp) {
      return setView(`${header("Acuzarea", true)}<main class="accuse">${a.gaveUp}${stats()}</main>`);
    }
    const wrong = state.wrong.final || 0;
    setView(`${header("Acuzarea", true)}<main class="accuse">${a.intro}
      <form id="f">${formHtml(a.fields)}<button>Îl acuzăm</button><p class="msg"></p></form>
      ${wrong ? `<p class="sub">Acuzații respinse până acum: ${wrong}</p>` : ""}
      <div class="giveup">${a.giveUpPrompt}<button id="gu" class="link">Ne dăm bătuți</button></div></main>`);
    $("#f").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!confirm(a.confirm || "Sunteți siguri?")) return;
      const btn = $("#f button");
      btn.disabled = true;
      $("#f .msg").textContent = "Aurel citește...";
      const r = await checkForm($("#f"), a.fields, "final");
      if (r.ok) return viewAccuse();
      btn.disabled = false;
      $("#f .msg").innerHTML = r.msg || a.wrong;
    });
    $("#gu").addEventListener("click", () => {
      if (!confirm("Sigur? După asta nu mai puteți face acuzarea.")) return;
      if (!confirm("Chiar sigur? Ultima întrebare.")) return;
      state.gaveUp = true;
      save();
      viewAccuse();
    });
  }

  function stats() {
    const hints = Object.values(state.hints).reduce((a, b) => a + b, 0);
    const wrongMs = data.milestones.reduce((a, m) => a + (state.wrong[m.gate] || 0), 0);
    return `<div class="stats"><h2>Cum ați lucrat</h2><ul>
      <li>${timer() || "Timp necunoscut."}</li>
      <li>Indicii folosite: ${hints}</li>
      <li>Răspunsuri greșite în Biroul lui Aurel: ${wrongMs}</li>
      <li>Acuzații respinse: ${state.wrong.final || 0}</li></ul></div>`;
  }

  // ---------- routing

  function route() {
    if (!state.keys.login) return viewLogin();
    const h = location.hash.replace(/^#\/?/, "");
    if (h.startsWith("s/")) return viewSection(decodeURIComponent(h.slice(2)));
    if (h === "birou") return viewOffice();
    if (h === "indicii") return viewHints();
    if (h === "acuzare") return viewAccuse();
    return viewHome();
  }

  async function start() {
    if (!window.crypto || !crypto.subtle) {
      app.innerHTML = `<main class="login"><p>Browserul acesta nu poate deschide arhiva. Încercați Chrome, Safari sau Firefox, într-o versiune recentă.</p></main>`;
      return;
    }
    // Optional quick unlock for testing and for sharing a link: ?unlock=gate:answer;gate:answer
    const q = new URLSearchParams(location.search).get("unlock");
    if (q) {
      for (const pair of q.split(";")) {
        const i = pair.indexOf(":");
        if (i > 0) await submitGate(pair.slice(0, i), pair.slice(i + 1)).catch(() => {});
      }
    }
    // Reopen what this device already unlocked. Login first, it carries the structure.
    const order = Object.keys(state.keys).sort((a, b) => (a === "login" ? -1 : b === "login" ? 1 : 0));
    for (const g of order) {
      try { await unlock(g, state.keys[g]); } catch (e) { delete state.keys[g]; save(); }
    }
    if (state.keys.login && !state.start) { state.start = Date.now(); save(); }
    window.addEventListener("hashchange", route);
    route();
  }

  window.addEventListener("unhandledrejection", (e) => { app.insertAdjacentHTML("beforeend", `<p class="msg" style="padding:16px">Eroare: ${esc(e.reason && e.reason.message || e.reason)}</p>`); });
  start();
})();
