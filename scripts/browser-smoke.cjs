const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const server = require("../server");
(async () => {
  let browser;
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.locator("#start:not([disabled])").waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (process.env.CAPTURE_DIR)
      await page.screenshot({
        path: process.env.CAPTURE_DIR + "/anime-brawl-menu.png",
        fullPage: true,
      });
    await page.click('[data-fighter="luffy"]');
    await page.selectOption("#mode", "local");
    await page.selectOption("#opponent", "naruto");
    await page.click('[data-stage="docks"]');
    await page.click("#start");
    const state = () =>
      page.evaluate(async () => {
        const a = (await import("/game.js")).getArena();
        return {
          mode: a.mode,
          stage: a.stage.id,
          winner: a.winner,
          time: a.time,
          paused: a.paused,
          players: a.fighters.map((f) => ({
            x: f.x,
            y: f.y,
            vy: f.vy,
            damage: f.damage,
            energy: f.energy,
            shield: f.shielding,
            id: f.character.id,
            stocks: f.stocks,
          })),
        };
      });
    await page.evaluate(async () => {
      (await import("/game.js")).getArena().countdown = 0;
    });
    let s = await state();
    assert.equal(s.players[0].id, "luffy");
    assert.equal(s.stage, "docks");
    assert.equal(s.mode, "local");
    const before = s.players[0].x;
    await page.keyboard.down("d");
    await page.waitForTimeout(260);
    await page.keyboard.up("d");
    assert.ok((await state()).players[0].x > before + 25, "keyboard moves P1");
    await page.keyboard.down("Space");
    await page.waitForTimeout(70);
    assert.ok((await state()).players[0].vy < 0, "jump launches P1");
    await page.keyboard.up("Space");
    await page.evaluate(async () => {
      const a = (await import("/game.js")).getArena();
      for (const [i, f] of a.fighters.entries()) {
        f.x = 580 + i * 70;
        f.y = a.stage.platforms[0].y - f.h;
        f.vx = f.vy = f.stun = f.invincible = f.cool = 0;
        f.attack = null;
        f.damage = 0;
        f.facing = i === 0 ? 1 : -1;
        f.grounded = true;
      }
    });
    await page.keyboard.down("j");
    await page.waitForTimeout(240);
    await page.keyboard.up("j");
    assert.ok((await state()).players[1].damage > 0, "attack damages opponent");
    await page.evaluate(async () => {
      const a = (await import("/game.js")).getArena();
      for (const [i, f] of a.fighters.entries()) {
        f.x = 580 + i * 70;
        f.y = a.stage.platforms[0].y - f.h;
        f.vx = f.vy = f.stun = f.invincible = f.cool = 0;
        f.attack = null;
        f.damage = 0;
        f.grounded = true;
      }
    });
    await page.keyboard.down("p");
    await page.waitForTimeout(60);
    assert.equal((await state()).players[1].shield, true, "P2 shield works");
    await page.keyboard.down("j");
    await page.waitForTimeout(160);
    await page.keyboard.up("j");
    assert.equal(
      (await state()).players[1].damage,
      0,
      "shield blocks actual keyboard attack",
    );
    await page.keyboard.up("p");
    await page.keyboard.press("Escape");
    s = await state();
    assert.equal(s.paused, true);
    await page.waitForTimeout(130);
    assert.equal((await state()).time, s.time, "pause freezes time");
    await page.click("#resume");
    await page.evaluate(async () => {
      const a = (await import("/game.js")).getArena();
      a.fighters[1].stocks = 1;
      a.fighters[1].respawn = 0;
      a.fighters[1].y = 900;
    });
    await page.getByText("LUFFY WINS", { exact: true }).waitFor();
    await page.click("#rematch");
    assert.equal((await state()).players[1].stocks, 3, "rematch resets stocks");
    await page.click("#back");
    await page.click('[data-fighter="goku"]');
    await page.selectOption("#mode", "cpu");
    await page.selectOption("#difficulty", "easy");
    await page.click('[data-stage="temple"]');
    await page.click("#start");
    await page.evaluate(async () => {
      (await import("/game.js")).getArena().countdown = 0;
    });
    const cpuBefore = (await state()).players[1].x;
    await page.waitForTimeout(450);
    assert.ok((await state()).players[1].x < cpuBefore, "CPU pursues player");
    await page.keyboard.down("k");
    await page.waitForTimeout(450);
    await page.keyboard.up("k");
    assert.ok(
      (await state()).players[0].energy < 95,
      "Goku special spends meter",
    );
    if (process.env.CAPTURE_DIR)
      await page.screenshot({
        path: process.env.CAPTURE_DIR + "/anime-brawl-match.png",
        fullPage: true,
      });
    assert.deepEqual(errors, [], "no JavaScript runtime errors");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click("#back");
    assert.ok(
      await page.locator("#start").isVisible(),
      "small-screen menu works",
    );
    console.log(
      "Browser checks passed: character/stage selection, local controls, movement, jumping, hits, shielding, pause, KO/results, rematch, CPU pursuit, special meter, responsive menu.",
    );
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
