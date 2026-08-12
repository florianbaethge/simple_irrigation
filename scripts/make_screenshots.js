#!/usr/bin/env node
/*
 * Regenerate the panel screenshots in ../screenshots.
 *
 * Renders the Simple Irrigation panel headless (system Chrome via puppeteer-core),
 * authenticated with a Home Assistant long-lived access token, and writes tight,
 * sidebar-free PNGs for each tab plus the zone / schedule editors and the cycle
 * wizard.
 *
 * Prerequisites:
 *   - A sandbox HA reachable at HA_URL with a Simple Irrigation entry that has a
 *     few zones and schedule cycles configured.
 *   - Google Chrome installed (override with CHROME_PATH).
 *   - npm i puppeteer-core   (run inside scripts/)
 *
 * Usage:
 *   HA_URL=http://localhost:8123 \
 *   HA_TOKEN=<long-lived-access-token> \
 *   SI_ENTRY=<config-entry-id> \
 *   node scripts/make_screenshots.js [outDir]
 *
 * The config-entry id is the ULID in the panel URL:
 *   /simple-irrigation/<SI_ENTRY>/overview
 */
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.HA_URL || "http://localhost:8123";
const TOKEN = process.env.HA_TOKEN;
const ENTRY = process.env.SI_ENTRY;
const OUT = process.argv[2] || path.join(__dirname, "..", "screenshots");

if (!TOKEN || !ENTRY) {
  console.error("Set HA_TOKEN and SI_ENTRY (see header comment).");
  process.exit(1);
}

const walkSrc = `function* walk(root){const els=root.querySelectorAll('*');for(const e of els){yield e;if(e.shadowRoot)yield* walk(e.shadowRoot);}}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForView(page, tag, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await page.evaluate(
      (t, ws) => {
        eval(ws);
        for (const e of walk(document)) if (e.tagName === t) return true;
        return false;
      },
      tag,
      walkSrc
    );
    if (ok) return true;
    await sleep(250);
  }
  return false;
}

// Clip to the panel header + the tallest card (no trailing whitespace).
async function clipToContent(page, file) {
  const box = await page.evaluate((ws) => {
    eval(ws);
    let panel = null,
      view = null;
    for (const e of walk(document)) {
      if (e.tagName === "SIMPLE-IRRIGATION-PANEL") panel = e;
      if (e.tagName && e.tagName.startsWith("SI-VIEW-")) view = e;
    }
    let bottom = 112;
    const hdr = panel && panel.shadowRoot && panel.shadowRoot.querySelector(".header");
    if (hdr) bottom = Math.max(bottom, hdr.getBoundingClientRect().bottom);
    if (view && view.shadowRoot) {
      for (const c of view.shadowRoot.querySelectorAll("ha-card")) {
        const r = c.getBoundingClientRect();
        if (r.height > 8) bottom = Math.max(bottom, r.bottom);
      }
    }
    const w = Math.round(panel.getBoundingClientRect().width);
    return { x: 0, y: 0, width: w, height: Math.round(bottom + 16) };
  }, walkSrc);
  await page.screenshot({ path: path.join(OUT, file), clip: box });
  return box;
}

// Clip to the open native <dialog> (HA ha-dialog), unlocking inner scroll so
// tall forms are captured in full.
async function clipToDialog(page, file) {
  // Unlock scroll first, then let it reflow.
  await page.evaluate((ws) => {
    eval(ws);
    for (const e of walk(document)) {
      if (e.tagName === "DIALOG") {
        const r = e.getBoundingClientRect();
        if (r.width > 200 && r.height > 120) {
          e.style.maxHeight = "none";
          for (const c of e.querySelectorAll("*")) {
            const cls = "" + (c.className || "");
            if (/\bbody\b|content-wrapper|ha-scrollbar|scroll/.test(cls)) {
              c.style.maxHeight = "none";
              c.style.overflow = "visible";
            }
          }
        }
      }
    }
  }, walkSrc);
  await sleep(300);
  const box = await page.evaluate((ws) => {
    eval(ws);
    let best = null;
    for (const e of walk(document)) {
      if (e.tagName === "DIALOG") {
        const r = e.getBoundingClientRect();
        if (r.width > 200 && r.height > 120 && (!best || r.width * r.height > best.a))
          best = { left: r.left, top: r.top, width: r.width, height: r.height, a: r.width * r.height };
      }
    }
    if (!best) return null;
    return {
      x: Math.max(0, Math.round(best.left) - 10),
      y: Math.max(0, Math.round(best.top) - 10),
      width: Math.round(best.width) + 20,
      height: Math.round(best.height) + 20,
    };
  }, walkSrc);
  if (!box) {
    await page.screenshot({ path: path.join(OUT, file) });
    return "full";
  }
  await page.screenshot({ path: path.join(OUT, file), clip: box });
  return box;
}

async function gotoTab(page, tab, view, w = 1180, h = 1100) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/simple-irrigation/${ENTRY}/${tab}`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await waitForView(page, view);
  await sleep(1300);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1180, height: 1000, deviceScaleFactor: 2 });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(
    (base, token) => {
      localStorage.setItem(
        "hassTokens",
        JSON.stringify({
          access_token: token,
          token_type: "Bearer",
          expires_in: 315360000,
          hassUrl: base,
          clientId: null,
          expires: 4102444800000,
          refresh_token: null,
        })
      );
      localStorage.setItem("dockedSidebar", '"always_hidden"');
      localStorage.setItem("selectedLanguage", '"en"');
    },
    BASE,
    TOKEN
  );

  // --- Tab screenshots ---------------------------------------------------
  const tabs = [
    { file: "overview.png", page: "overview", view: "SI-VIEW-OVERVIEW" },
    { file: "zones.png", page: "zones", view: "SI-VIEW-ZONES" },
    { file: "timetable.png", page: "timetable", view: "SI-VIEW-TIMETABLE" },
    { file: "settings.png", page: "settings", view: "SI-VIEW-SETTINGS" },
  ];
  for (const t of tabs) {
    await gotoTab(page, t.page, t.view, 1180, 1200);
    console.log(t.file, JSON.stringify(await clipToContent(page, t.file)));
  }

  // Schedule tab — expand the "every 2 days" cycle to show the 14-day strip.
  await gotoTab(page, "schedule", "SI-VIEW-SCHEDULE", 1180, 1400);
  await page.evaluate((ws) => {
    eval(ws);
    let view = null;
    for (const e of walk(document)) if (e.tagName === "SI-VIEW-SCHEDULE") view = e;
    const row = [...view.shadowRoot.querySelectorAll(".compact-row")].find((r) =>
      /Every 2 days/.test(r.textContent)
    );
    if (row) row.querySelector(".icon-group button:last-child")?.click();
  }, walkSrc);
  await sleep(700);
  console.log("schedule.png", JSON.stringify(await clipToContent(page, "schedule.png")));

  // --- Zone editor (Drip Orchard: exclusive + valve output) --------------
  await gotoTab(page, "zones", "SI-VIEW-ZONES", 1180, 2200);
  await page.evaluate((ws) => {
    eval(ws);
    let view = null;
    for (const e of walk(document)) if (e.tagName === "SI-VIEW-ZONES") view = e;
    const rows = view._zonesFromInstallation();
    const z = rows.find((r) => r.name === "Drip Orchard") || rows[0];
    view._editDraft = view._cloneZone(z);
    view.requestUpdate();
  }, walkSrc);
  await sleep(1000);
  console.log("zone_edit.png", JSON.stringify(await clipToDialog(page, "zone_edit.png")));

  // --- Zone editor, advanced start settings expanded ---------------------
  // Left empty on purpose: the point of the shot is the section and its wording,
  // not one vendor's values.
  await gotoTab(page, "zones", "SI-VIEW-ZONES", 1180, 2200);
  await page.evaluate((ws) => {
    eval(ws);
    let view = null;
    for (const e of walk(document)) if (e.tagName === "SI-VIEW-ZONES") view = e;
    const rows = view._zonesFromInstallation();
    const z = rows.find((r) => r.name === "Front Lawn") || rows[0];
    view._editDraft = view._cloneZone(z);
    view.requestUpdate();
  }, walkSrc);
  await sleep(1000);
  await page.evaluate((ws) => {
    eval(ws);
    for (const e of walk(document)) {
      if (e.tagName === "DETAILS" && /start service/i.test(e.textContent)) e.open = true;
    }
  }, walkSrc);
  await sleep(600);
  console.log(
    "zone_edit_advanced.png",
    JSON.stringify(await clipToDialog(page, "zone_edit_advanced.png"))
  );

  // --- Schedule slot editor (Morning lawns: weekday picker + run order) --
  await gotoTab(page, "schedule", "SI-VIEW-SCHEDULE", 1180, 2200);
  await page.evaluate((ws) => {
    eval(ws);
    let view = null;
    for (const e of walk(document)) if (e.tagName === "SI-VIEW-SCHEDULE") view = e;
    const s = view._slots().find((x) => x.name === "Morning lawns") || view._slots()[0];
    view._addZonePick = "";
    view._slotEditDraft = view._cloneSlot(s);
    view.requestUpdate();
  }, walkSrc);
  await sleep(1000);
  console.log("schedule_edit.png", JSON.stringify(await clipToDialog(page, "schedule_edit.png")));

  // --- Cycle wizard (step 2 with the live 14-day strip) ------------------
  await gotoTab(page, "schedule", "SI-VIEW-SCHEDULE", 1180, 2200);
  await page.evaluate((ws) => {
    eval(ws);
    let wiz = null;
    for (const e of walk(document)) if (e.tagName === "SI-CYCLE-WIZARD") wiz = e;
    wiz.start({ optionId: "every_2_days", step: 2 });
  }, walkSrc);
  await sleep(1200);
  console.log("cycle_wizard.png", JSON.stringify(await clipToDialog(page, "cycle_wizard.png")));

  await browser.close();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
