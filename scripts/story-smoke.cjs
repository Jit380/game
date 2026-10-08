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
 away:()=>state.pos.set(39,0,300),
 bossAttack:()=>{const e=enemies.find(e=>e.boss);e.freeze=0;e.attack=.01;state.pos.copy(e.mesh.position).add(new THREE.Vector3(0,0,10));e.warning=new THREE.Mesh(new THREE.RingGeometry(5.8,6.3,20),new THREE.MeshBasicMaterial());e.warning.position.copy(state.pos);scene.add(e.warning);update(.02);},
 health:()=>state.hp,
 phaseTwo:()=>{enemies.find(e=>e.boss).hp=190;update(.02);},
 face:()=>{hero.rotation.y=Math.PI;camera.position.set(state.pos.x,state.pos.y+2.5,state.pos.z+3);camera.lookAt(state.pos.clone().add(new THREE.Vector3(0,2,0)));renderer.render(scene,camera);}

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
    await page.click("#bossRush");
    assert.equal(
      (await page.evaluate(() => storyTest.get())).mission,
      6,
      "direct boss mode",
    );
    const hp = await page.evaluate(() => storyTest.health());
    await page.evaluate(() => storyTest.bossAttack());
    assert.ok(
      (await page.evaluate(() => storyTest.health())) < hp,
      "slam damages inside warning",
    );
    const afterHit = await page.evaluate(() => storyTest.health());
    await page.keyboard.press("c");
    await page.evaluate(() => storyTest.bossAttack());
    assert.equal(
      await page.evaluate(() => storyTest.health()),
      afterHit,
      "dodge avoids slam",
    );
    await page.evaluate(() => storyTest.phaseTwo());
    assert.match(
      await page.locator("#bossPhase").textContent(),
      /PHASE II/,
      "boss enrages",
    );
    if (process.env.ANIME_CAPTURE) {
      await page.evaluate(() => storyTest.face());
      await page.screenshot({ path: process.env.ANIME_CAPTURE });
    }
    assert.deepEqual(errors, [], "no browser runtime errors");
    console.log(
      "Passed: keyboard movement, courier mission, elemental combat, witness rescue, transmitter, Warden fight, ending, rooftop leap, witness failure, direct boss mode, ground strikes, dodge invulnerability, phase two.",
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
