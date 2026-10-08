const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const server = require("../server");
(async () => {
  let browser;
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    const executablePath =
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const source = fs.readFileSync(path.join(__dirname, "../game.js"), "utf8");
    // Inject controls only into this test response. They never ship to game clients.
    await page.route("**/game.js", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body:
          source.replace(
            "if (active && !paused && !ended) {",
            "if (active && !paused && !ended && !window.testFreeze) {",
          ) +
          `
window.testFreeze=true;
window.storyTest={
 get:()=>({mission,ended,position:state.pos.toArray(),enemies:enemies.length,bossDefeated,zipReady:zipCooldown===0}),
 step:(n=1)=>{cinematic=0;for(let i=0;i<n;i++)update(.02)},
 target:()=>state.pos.copy(missionTargets[mission]),
 courier:()=>state.pos.copy(criminal.position),
 fight:()=>{select(2);keys.add('f');for(let i=0;i<800&&!ended;i++)update(.02);keys.delete('f')},
 away:()=>state.pos.set(39,0,300)
};`,
      }),
    );
    await page.goto(base);
    await page.locator("#begin:not([disabled])").waitFor();
    await page.click("#begin");
    await page.keyboard.press("Enter");
    await page.keyboard.down("w");
    await page.evaluate(() => storyTest.step(20));
    await page.keyboard.up("w");
    assert.ok(
      (await page.evaluate(() => storyTest.get())).position[2] < 39,
      "movement",
    );
    if (process.env.VISUAL_CAPTURE)
      await page.screenshot({ path: process.env.VISUAL_CAPTURE });
    await page.evaluate(() => {
      storyTest.target();
      storyTest.step();
    });
    assert.equal(
      (await page.evaluate(() => storyTest.get())).mission,
      1,
      "distress response",
    );
    await page.evaluate(() => {
      storyTest.target();
      storyTest.step();
    });
    assert.equal(
      (await page.evaluate(() => storyTest.get())).mission,
      2,
      "robbery starts chase",
    );
    const before = (await page.evaluate(() => storyTest.get())).mission;
    await page.evaluate(() => storyTest.step(20));
    assert.equal(before, 2);
    await page.evaluate(() => {
      storyTest.courier();
      storyTest.step();
    });
    assert.equal(
      (await page.evaluate(() => storyTest.get())).mission,
      3,
      "courier caught",
    );
    assert.equal(
      (await page.evaluate(() => storyTest.get())).enemies,
      4,
      "ambush",
    );
    await page.evaluate(() => {
      storyTest.target();
      storyTest.fight();
    });
    assert.equal(
      (await page.evaluate(() => storyTest.get())).mission,
      4,
      "elemental combat protects witnesses",
    );
    await page.evaluate(() => storyTest.target());
    await page.keyboard.press("e");
    assert.equal(
      (await page.evaluate(() => storyTest.get())).mission,
      5,
      "transmitter interaction",
    );
    await page.evaluate(() => {
      storyTest.target();
      storyTest.step();
    });
    assert.equal(
      (await page.evaluate(() => storyTest.get())).mission,
      6,
      "confrontation",
    );
    await page.keyboard.press("r");
    await page.evaluate(() => storyTest.fight());
    assert.equal(
      (await page.evaluate(() => storyTest.get())).bossDefeated,
      true,
      "Warden combat",
    );
    assert.equal(
      (await page.evaluate(() => storyTest.get())).ended,
      true,
      "chapter ending",
    );
    assert.match(
      await page.locator("#story").textContent(),
      /End of playable Chapter One/,
    );
    await page.click("#begin");
    await page.keyboard.press("Enter");
    await page.keyboard.press("q");
    await page.evaluate(() => storyTest.step(60));
    assert.ok(
      (await page.evaluate(() => storyTest.get())).position[1] > 10,
      "rooftop leap",
    );
    await page.keyboard.press("p");
    await page.keyboard.press("p");
    await page.evaluate(() => {
      storyTest.target();
      storyTest.step();
      storyTest.target();
      storyTest.step();
      storyTest.courier();
      storyTest.step();
      storyTest.away();
      storyTest.step(1000);
    });
    assert.equal(
      (await page.evaluate(() => storyTest.get())).ended,
      true,
      "witness loss ends chapter",
    );
    assert.deepEqual(errors, [], "no browser runtime errors");
    console.log(
      "Passed: keyboard movement, courier mission, elemental combat, witness rescue, transmitter, Warden fight, ending, rooftop leap, witness failure.",
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
