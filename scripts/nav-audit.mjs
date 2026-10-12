// Records how every route is reached on a served build, then compares two recordings.
//
//   node scripts/nav-audit.mjs record <baseUrl> <distDir> <outDir>
//   node scripts/nav-audit.mjs compare <beforeDir> <afterDir>
//
// Needs the agent-browser CLI on PATH.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , mode, ...args] = process.argv;

function ab(...cmd) {
  const out = execFileSync("agent-browser", ["--json", ...cmd], {
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
  const res = JSON.parse(out.trim().split("\n").pop());
  if (!res.success) throw new Error(`agent-browser ${cmd.join(" ")}: ${res.error}`);
  return res.data;
}

const evalJs = (js) =>
  JSON.parse(ab("eval", "-b", Buffer.from(`JSON.stringify((() => { ${js} })())`).toString("base64")).result ?? "null");

// Runs in the page. Reports only what a user can see.
const EXTRACT = `
  const vis = (el) => !!el && el.checkVisibility({ visibilityProperty: true }) && !el.closest('[hidden]');
  const label = (a) => (a.querySelector('.link-title')?.textContent ?? a.textContent).replace(/\\s+/g, ' ').trim()
    || a.getAttribute('aria-label') || a.querySelector('.sr-only')?.textContent || '';
  const link = (a) => ({ label: label(a), href: a.getAttribute('href') });
  const pane = document.getElementById('starlight__sidebar');
  const roots = pane ? [...pane.querySelectorAll('ul.top-level')].filter((ul) => !ul.closest('[hidden]')) : [];
  const walk = (ul) => [...ul.children].map((li) => {
    const d = li.querySelector(':scope > details');
    if (d) return { group: d.querySelector('summary').textContent.replace(/\\s+/g, ' ').trim(),
      collapsed: !d.hasAttribute('open'), items: walk(d.querySelector(':scope > ul')) };
    const a = li.querySelector(':scope > a');
    return { ...link(a), active: a.getAttribute('aria-current') === 'page' };
  });
  const header = document.querySelector('header');
  const internal = (a) => { try { const u = new URL(a.href); return u.origin === location.origin; } catch { return false; } };
  return {
    url: location.pathname,
    title: document.title,
    h1: document.querySelector('h1')?.textContent.trim(),
    topbar: header ? [...header.querySelectorAll('a[href]')].filter(vis).map(link) : [],
    sidebar: roots.map(walk),
    prev: (() => { const a = document.querySelector('a[rel=prev]'); return a ? link(a) : null; })(),
    next: (() => { const a = document.querySelector('a[rel=next]'); return a ? link(a) : null; })(),
    contentLinks: [...document.querySelectorAll('main a[href]')].filter((a) => internal(a) && !a.closest('.pagination-links') && !a.getAttribute('href').startsWith('#')).map(link),
  };
`;

// Visible links in the mobile menu after a user opens it.
const MOBILE = `
  const vis = (el) => el.checkVisibility({ visibilityProperty: true });
  const header = document.querySelector('header');
  const pane = document.getElementById('starlight__sidebar');
  const txt = (a) => a.textContent.replace(/\\s+/g, ' ').trim() || a.querySelector('.sr-only')?.textContent || '';
  return {
    topbar: [...header.querySelectorAll('a[href]')].filter((a) => vis(a) && !pane?.contains(a)).map((a) => ({ label: txt(a), href: a.getAttribute('href') })),
    menu: pane ? [...pane.querySelectorAll('a[href]')].filter(vis).map((a) => ({ label: txt(a), href: a.getAttribute('href') })) : [],
  };
`;

const norm = (u) => (u.length > 1 ? u.replace(/\/$/, "") : u);

function open(base, route) {
  ab("open", base + route);
  ab("wait", "--load", "load");
}

function clickAndLand(selector) {
  ab("click", selector);
  ab("wait", "--load", "load");
  return evalJs("return { url: location.pathname, title: document.title };");
}

function record(base, distDir, outDir) {
  base = base.replace(/\/$/, "");
  fs.mkdirSync(path.join(outDir, "shots"), { recursive: true });
  const routes = [];
  (function scan(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) scan(path.join(dir, e.name), rel + e.name + "/");
      else if (e.name === "index.html") routes.push("/" + rel);
    }
  })(distDir, "");
  routes.sort();

  const pages = {};
  ab("set", "viewport", "1440", "900");
  for (const r of routes) {
    open(base, r);
    pages[r] = evalJs(EXTRACT);
    const shot = (r === "/" ? "home" : r.slice(1, -1).replace(/\//g, "__")) + ".png";
    ab("screenshot", "--full", path.resolve(outDir, "shots", shot));
    console.log("page", r, pages[r].title);
  }

  ab("set", "viewport", "390", "844");
  for (const r of routes) {
    open(base, r);
    const btn = evalJs(`
      const b = document.querySelector('[aria-controls="starlight__sidebar"], [popovertarget="starlight__sidebar"]');
      if (!b || !b.checkVisibility()) return false;
      b.setAttribute('data-nav-audit', '1');
      return true;
    `);
    if (btn) ab("click", "[data-nav-audit]");
    pages[r].mobile = evalJs(MOBILE);
  }
  ab("set", "viewport", "1440", "900");

  // Click paths, as a user walks them.
  const paths = [];
  const clickNth = (from, sel, i, kind, labelPath) => {
    open(base, from);
    const pre = evalJs(`
      const el = document.querySelectorAll(${JSON.stringify(sel)})[${i}];
      if (!el) return null;
      for (let d = el.closest('details'); d; d = d.parentElement.closest('details')) {
        if (!d.open) d.querySelector('summary').click();
      }
      el.setAttribute('data-nav-audit', '1');
      return el.getAttribute('href');
    `);
    if (pre === null) return null;
    const land = clickAndLand("[data-nav-audit]");
    const p = { from, kind, label: labelPath, href: pre, landed: land.url, title: land.title };
    paths.push(p);
    console.log("path", kind, from, "->", labelPath, "->", land.url);
    return p;
  };

  // 1. Top bar from the homepage.
  const home = pages["/"];
  const topSel = "header a[href]";
  open(base, "/");
  const topHrefs = evalJs(`return [...document.querySelectorAll(${JSON.stringify(topSel)})].map((a) => a.getAttribute('href'));`);
  const projectLandings = [];
  topHrefs.forEach((href, i) => {
    const t = home.topbar.find((l) => l.href === href);
    if (!t || !href.startsWith("/")) return;
    const p = clickNth("/", topSel, i, "topbar", t.label);
    if (p && p.landed !== "/") projectLandings.push(p.landed);
  });

  // 2. Each project's sidebar, clicked one entry after the other.
  const sideSel = "#starlight__sidebar ul.top-level:not([hidden] *) a[href]";
  for (const start of [...new Set(projectLandings)]) {
    open(base, start);
    const entries = evalJs(`return [...document.querySelectorAll(${JSON.stringify(sideSel)})].map((a) => a.textContent.replace(/\\s+/g, ' ').trim());`);
    let from = start;
    entries.forEach((label, i) => {
      const p = clickNth(from, sideSel, i, "sidebar", label);
      if (p) from = p.landed.endsWith("/") ? p.landed : p.landed + "/";
    });
  }

  // 3. Internal links inside page content, and prev/next.
  for (const r of routes) {
    const pg = pages[r];
    const contentSel = "main a[href]";
    open(base, r);
    const all = evalJs(`return [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href'));`);
    pg.contentLinks.forEach((l) => {
      const i = all.indexOf(l.href);
      if (i >= 0) clickNth(r, contentSel, i, "content", l.label);
    });
    for (const rel of ["prev", "next"]) if (pg[rel]) clickNth(r, `a[rel=${rel}]`, 0, rel, pg[rel].label);
  }

  fs.writeFileSync(path.join(outDir, "audit.json"), JSON.stringify({ base, routes, pages, paths }, null, 2));
  console.log(`recorded ${routes.length} routes, ${paths.length} clicks -> ${outDir}`);
}

function compare(aDir, bDir) {
  const A = JSON.parse(fs.readFileSync(path.join(aDir, "audit.json"), "utf8"));
  const B = JSON.parse(fs.readFileSync(path.join(bDir, "audit.json"), "utf8"));
  const diffs = [];
  const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const strip = (s) => JSON.parse(JSON.stringify(s), (k, v) => (k === "href" ? norm(v) : v));

  for (const r of A.routes) if (!B.routes.includes(r)) diffs.push(`route missing: ${r}`);
  for (const r of B.routes) if (!A.routes.includes(r)) diffs.push(`route added: ${r}`);

  for (const r of A.routes.filter((x) => B.pages[x])) {
    const a = A.pages[r], b = B.pages[r];
    for (const f of ["url", "title", "h1"]) if (a[f] !== b[f]) diffs.push(`${r} ${f}: ${JSON.stringify(a[f])} -> ${JSON.stringify(b[f])}`);
    for (const f of ["topbar", "sidebar", "prev", "next", "contentLinks"]) {
      if (!eq(strip(a[f]), strip(b[f]))) diffs.push(`${r} ${f} differs:\n    before ${JSON.stringify(a[f])}\n    after  ${JSON.stringify(b[f])}`);
      else if (!eq(a[f], b[f])) diffs.push(`${r} ${f}: only trailing-slash differences in href`);
    }
    for (const f of ["topbar", "menu"]) {
      if (!eq(strip(a.mobile[f]), strip(b.mobile[f]))) diffs.push(`${r} mobile ${f} differs:\n    before ${JSON.stringify(a.mobile[f])}\n    after  ${JSON.stringify(b.mobile[f])}`);
    }
  }

  const keyed = (X) => {
    const seen = {};
    return X.paths.map((p) => {
      const k = `${p.kind} ${p.from} [${p.label}]`;
      seen[k] = (seen[k] ?? 0) + 1;
      return { ...p, key: seen[k] > 1 ? `${k} #${seen[k]}` : k };
    });
  };
  const key = (p) => p.key;
  A.paths = keyed(A);
  B.paths = keyed(B);
  const bPaths = new Map(B.paths.map((p) => [key(p), p]));
  const aKeys = new Set(A.paths.map(key));
  for (const p of A.paths) {
    const q = bPaths.get(key(p));
    if (!q) diffs.push(`click path missing: ${key(p)} -> ${p.landed}`);
    else if (norm(q.landed) !== norm(p.landed)) diffs.push(`click path lands elsewhere: ${key(p)}: ${p.landed} -> ${q.landed}`);
  }
  for (const p of B.paths) if (!aKeys.has(key(p))) diffs.push(`click path added: ${key(p)} -> ${p.landed}`);

  // Every route must be reached by at least one click, same as before.
  const reached = (X) => new Set(X.paths.map((p) => norm(p.landed)));
  const ra = reached(A), rb = reached(B);
  for (const r of A.routes) if (ra.has(norm(r)) && !rb.has(norm(r))) diffs.push(`no longer reachable by clicking: ${r}`);

  const unreachedBefore = A.routes.filter((r) => !ra.has(norm(r)));
  console.log(`routes: ${A.routes.length} before, ${B.routes.length} after`);
  console.log(`clicks: ${A.paths.length} before, ${B.paths.length} after`);
  console.log(`reachable only by URL (before): ${unreachedBefore.join(", ") || "none"}`);
  console.log(diffs.length ? `\n${diffs.length} differences:\n- ${diffs.join("\n- ")}` : "\nno differences");
  process.exitCode = diffs.length ? 1 : 0;
}

if (mode === "record") record(...args);
else if (mode === "compare") compare(...args);
else console.error("usage: nav-audit.mjs record <baseUrl> <distDir> <outDir> | compare <beforeDir> <afterDir>");
