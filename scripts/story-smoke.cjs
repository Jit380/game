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
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator("#start:not([disabled])").waitFor();
    await page.evaluate(async () => (window.game = await import("/game.js")));
    const dismiss = async () => {
      for (let i = 0; i < 12; i++) {
        if (
          !(await page.evaluate(
            () => window.game.getStory().state === "dialogue",
          ))
        )
          break;
        await page.locator("#story-actions button").first().click();
      }
    };
    await page.click("#story-start");
    assert.equal(await page.locator("#story-title").textContent(), "NARUTO");
    await dismiss();
    assert.equal(
      await page.evaluate(() => window.game.getStory().state),
      "world",
    );
    const x = await page.evaluate(
      () => window.game.getStory().campaign.player.x,
    );
    await page.keyboard.down("d");
    await page.waitForTimeout(300);
    await page.keyboard.up("d");
    assert.ok(
      await page.evaluate(
        (x) => window.game.getStory().campaign.player.x > x + 50,
        x,
      ),
    );
    await page.keyboard.down("Space");
    await page.waitForTimeout(70);
    assert.ok(
      await page.evaluate(() => window.game.getStory().campaign.player.vy < 0),
    );
    await page.keyboard.up("Space");
    if (process.env.CAPTURE_DIR)
      await page.screenshot({
        path: process.env.CAPTURE_DIR + "/worlds-collide-leaf.png",
      });
    await page.evaluate(() => {
      const c = window.game.getStory().campaign;
      c.player.x = c.patrols[0].x - 65;
      c.player.y = c.region.ground;
      c.player.facing = 1;
      c.attackCooldown = 0;
    });
    await page.keyboard.press("k");
    await page.waitForFunction(
      () => window.game.getStory().campaign.patrols.length === 2,
    );
    await page.evaluate(() => {
      const c = window.game.getStory().campaign;
      c.player.x = 220;
      c.player.y = c.region.ground;
      c.player.vy = 0;
      c.collect(0);
      c.collect(1);
      c.collect(2);
    });
    await page.keyboard.press("e");
    await page.waitForFunction(() => window.game.getStory().state === "camp");
    await page
      .locator("#story-actions button")
      .filter({ hasText: "POWER" })
      .click();
    assert.equal(
      await page.evaluate(
        () => window.game.getStory().campaign.save.upgrades.power,
      ),
      1,
    );
    await page.locator("#story-actions button").last().click();
    for (const id of ["sasuke", "pain", "frieza", "broly"]) {
      await page.evaluate((id) => {
        const c = window.game.getStory().campaign;
        const region = {
          sasuke: "leaf",
          pain: "leaf",
          frieza: "namek",
          broly: "rift",
        }[id];
        if (c.region.id !== region) c.travel(region);
        const gate = c.region.gates.find((g) => g.boss === id);
        c.player.x = gate.x;
        c.player.y = c.region.ground;
        c.player.vy = 0;
      }, id);
      await page.keyboard.press("e");
      await page.waitForFunction(
        () => window.game.getStory().state === "dialogue",
      );
      await dismiss();
      assert.equal(
        await page.evaluate(() => window.game.getStory().arena.bossId),
        id,
      );
      await page.evaluate(() => {
        window.game.getStory().arena.countdown = 0;
      });
      if (id === "sasuke") {
        await page.evaluate(() => {
          const a = window.game.getStory().arena;
          a.fighters[0].invincible = 0;
          a.fighters[1].invincible = 0;
          a.fighters[0].x = 520;
          a.fighters[1].x = 590;
          a.fighters[1].aiTimer = 10;
          a.fighters[1].aiInput = {};
        });
        await page.keyboard.down("j");
        await page.waitForTimeout(180);
        await page.keyboard.up("j");
        assert.ok(
          await page.evaluate(
            () => window.game.getStory().arena.fighters[1].damage > 0,
          ),
        );
        await page.evaluate(() => {
          const a = window.game.getStory().arena;
          a.resonance = 100;
          a.fighters[1].invincible = 0;
        });
        await page.keyboard.press("r");
        await page.waitForTimeout(100);
        assert.ok(
          await page.evaluate(() => window.game.getStory().arena.riftUsed),
        );
        if (process.env.CAPTURE_DIR)
          await page.screenshot({
            path: process.env.CAPTURE_DIR + "/worlds-collide-riftbreak.png",
          });
      }
      if (id === "sasuke") {
        await page.evaluate(() => (window.game.getStory().arena.winner = 1));
        await page.waitForFunction(
          () => window.game.getStory().state === "result",
        );
        assert.equal(
          await page.locator("#story-title").textContent(),
          "GET BACK UP.",
        );
        await page.locator("#story-actions button").first().click();
        assert.equal(
          await page.evaluate(
            () => window.game.getStory().arena.fighters[0].stocks,
          ),
          3,
        );
      }
      if (id === "broly") {
        await page.evaluate(() => {
          const a = window.game.getStory().arena;
          a.fighters[1].damage = 90;
          a.patternTimer = 0;
        });
        await page.waitForTimeout(150);
        if (process.env.CAPTURE_DIR)
          await page.screenshot({
            path: process.env.CAPTURE_DIR + "/worlds-collide-broly.png",
          });
      }
      await page.evaluate(() => (window.game.getStory().arena.winner = 0));
      await page.waitForFunction(
        () => window.game.getStory().state === "result",
      );
      await page.locator("#story-actions button").first().click();
      await dismiss();
    }
    assert.equal(
      await page.locator("#story-title").textContent(),
      "COURAGE TRAVELS.",
    );
    await page.locator("#story-actions button").first().click();
    await page.click("#story-exit");
    await page.reload();
    await page.locator("#start:not([disabled])").waitFor();
    await page.evaluate(async () => (window.game = await import("/game.js")));
    await page.click("#story-start");
    assert.equal(
      await page.evaluate(() => window.game.getStory().campaign.nextBoss),
      null,
    );
    await page.click("#story-new");
    await page.locator("#story-actions button").first().click();
    assert.equal(
      await page.evaluate(
        () => window.game.getStory().campaign.save.defeated.length,
      ),
      4,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click("#story-map");
    assert.ok(await page.locator("#story-actions button").first().isVisible());
    await page.locator("#story-actions button").last().click();
    if (process.env.CAPTURE_DIR)
      await page.screenshot({
        path: process.env.CAPTURE_DIR + "/worlds-collide-mobile.png",
      });
    assert.deepEqual(errors, []);
    console.log(
      "Story browser checks passed: prologue, world movement/jump, upgrades, all four encounter transitions, melee, Riftbreak, ending, persistence, reset cancellation and mobile atlas. Boss outcomes were forced only to validate chapter flow.",
    );
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
