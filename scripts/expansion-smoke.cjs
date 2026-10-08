const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const server = require("../server");
(async () => {
  let browser;
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      headless: true,
      args: ["--no-sandbox"],
    });
    const a = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
      }),
      b = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
    await Promise.all([a.goto(base), b.goto(base)]);
    await a.locator("#start:not([disabled])").waitFor();
    assert.equal(await a.locator("[data-fighter]").count(), 6);
    assert.equal(await a.locator("[data-stage]").count(), 6);
    if (process.env.CAPTURE_DIR)
      await a.screenshot({
        path: process.env.CAPTURE_DIR + "/anime-brawl-expanded-menu.png",
        fullPage: true,
      });
    await a.click('[data-fighter="midoriya"]');
    await a.selectOption("#mode", "tournament");
    await a.click('[data-stage="leaf"]');
    await a.click("#start");
    if (process.env.CAPTURE_DIR)
      await a.screenshot({
        path: process.env.CAPTURE_DIR + "/anime-brawl-hidden-leaf.png",
      });
    for (const round of ["QUARTERFINAL", "SEMIFINAL", "FINAL"]) {
      assert.match(
        await a.locator("#match-description").textContent(),
        new RegExp(round),
      );
      await a.evaluate(async () => {
        const arena = (await import("/game.js")).getArena();
        arena.winner = 0;
      });
      await a.locator("#match-overlay:not([hidden])").waitFor();
      if (round !== "FINAL") await a.click("#rematch");
    }
    assert.equal(
      await a.locator("#overlay-caption").textContent(),
      "CHAMPIONSHIP COMPLETE",
    );
    await a.click("#select-again");
    await a.selectOption("#mode", "online");
    await a.click('[data-fighter="ryuga"]');
    await a.click('[data-stage="namek"]');
    await a.click("#create-room");
    await a.waitForFunction(() =>
      document
        .querySelector("#room-status")
        .textContent.includes("Share this code"),
    );
    const code = (await a.locator("#room-status").textContent()).match(
      /ROOM ([A-F0-9]{6})/,
    )[1];
    await b.selectOption("#mode", "online");
    await b.click('[data-fighter="pikachu"]');
    await b.fill("#room-code", code);
    await b.click("#join-room");
    for (const p of [a, b]) {
      await p.evaluate(
        async () => (window.gameModule = await import("/game.js")),
      );
      await p.waitForFunction(() => {
        const ar = window.gameModule.getArena();
        return ar?.fighters[1].character.id === "pikachu" && ar.countdown === 0;
      });
    }
    const get = (p) =>
      p.evaluate(async () => {
        const ar = (await import("/game.js")).getArena();
        return {
          x: ar.fighters[1].x,
          ids: ar.fighters.map((f) => f.character.id),
          mode: ar.mode,
          stage: ar.stage.id,
        };
      });
    const initial = await get(b);
    assert.deepEqual(initial.ids, ["ryuga", "pikachu"]);
    assert.equal(initial.stage, "namek");
    assert.equal(initial.mode, "online");
    await b.bringToFront();
    await b.click("#arena");
    await b.keyboard.down("a");
    await b.waitForTimeout(280);
    await b.keyboard.up("a");
    await a.waitForTimeout(100);
    const sa = await get(a),
      sb = await get(b);
    assert.ok(sa.x < initial.x - 40, "guest keyboard controls guest fighter");
    assert.ok(
      Math.abs(sa.x - sb.x) < 15,
      "browsers share authoritative positions",
    );
    await b.keyboard.press("k");
    await a.waitForFunction(
      () => window.gameModule.getArena().fighters[1].energy < 90,
    );
    if (process.env.CAPTURE_DIR)
      await a.screenshot({
        path: process.env.CAPTURE_DIR + "/anime-brawl-online-namek.png",
      });
    await b.click("#back");
    await a.locator("#lobby:not([hidden])").waitFor();
    assert.match(await a.locator("#room-status").textContent(), /disconnected/);
    await a.selectOption("#mode", "local");
    await a.click('[data-stage="ring"]');
    await a.selectOption("#opponent", "midoriya");
    await a.click("#start");
    if (process.env.CAPTURE_DIR)
      await a.screenshot({
        path: process.env.CAPTURE_DIR + "/anime-brawl-boxing-ring.png",
      });
    assert.deepEqual(errors, []);
    console.log(
      "Expansion browser checks passed: six fighters/stages, complete tournament, two-browser human movement and specials, synchronized state, disconnect recovery.",
    );
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
