const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const server = require("../server");

async function renderedPixels(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          const canvas = document.querySelector("#adventure-canvas");
          const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
          if (!gl) return resolve({ webgl: false });
          const width = gl.drawingBufferWidth;
          const height = gl.drawingBufferHeight;
          const pixels = new Uint8Array(width * height * 4);
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const colors = new Set();
          let lit = 0;
          let sampled = 0;
          for (let y = 4; y < height; y += 13) {
            for (let x = 4; x < width; x += 13) {
              const i = (y * width + x) * 4;
              const r = pixels[i];
              const g = pixels[i + 1];
              const b = pixels[i + 2];
              colors.add(`${r},${g},${b}`);
              lit += r + g + b > 35 && pixels[i + 3] > 0 ? 1 : 0;
              sampled++;
            }
          }
          resolve({
            webgl: true,
            width,
            height,
            colors: colors.size,
            lit,
            sampled,
            error: gl.getError(),
          });
        }),
      ),
  );
}

async function capture(page, name) {
  if (!process.env.CAPTURE_DIR) return;
  fs.mkdirSync(process.env.CAPTURE_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(process.env.CAPTURE_DIR, name + ".png"),
  });
}

async function checkRendered(page, label, minimumWidth = 600) {
  const pixels = await renderedPixels(page);
  assert.equal(pixels.webgl, true, `${label}: uses an actual WebGL context`);
  assert.equal(pixels.error, 0, `${label}: framebuffer read succeeds`);
  assert.ok(
    pixels.width >= minimumWidth && pixels.height >= 300,
    `${label}: canvas size`,
  );
  assert.ok(pixels.colors > 35, `${label}: scene contains varied drawn pixels`);
  assert.ok(pixels.lit > pixels.sampled * 0.45, `${label}: graded scene is visible`);
  return pixels;
}

(async () => {
  let browser;
  const errors = [];
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      headless: true,
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--use-gl=angle",
        "--use-angle=swiftshader",
      ],
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error")
        errors.push(`${message.text()} (${message.location().url})`);
    });
    await page.goto(base);
    await page.locator("#start:not([disabled])").waitFor();
    assert.equal(await page.locator("[data-fighter]").count(), 6);
    await page.evaluate(
      async () => (window.gameModule = await import("/game.js")),
    );

    await page.click("#adventure-start");
    await page.waitForFunction(() => window.gameModule.getAdventure()?.active);
    const dismissDialogue = async () => {
      for (let i = 0; i < 12; i++) {
        const state = await page.evaluate(
          () => window.gameModule.getAdventure().state,
        );
        if (state === "cinematic") {
          await page.evaluate(() => {
            const button = document.querySelector("#adventure-skip");
            if (window.gameModule.getAdventure().state === "cinematic") button.click();
          });
          continue;
        }
        if (state !== "dialogue") return;
        await page.locator("#adventure-actions button").first().click();
      }
      assert.fail("3D dialogue did not finish after twelve pages");
    };
    await dismissDialogue();
    await page.locator("#adventure:not([hidden])").waitFor();
    const setQuality = async (quality) => {
      for (let attempts = 0; attempts < 4; attempts++) {
        if (await page.evaluate(
          (quality) => window.gameModule.getAdventure().visuals.quality === quality,
          quality,
        )) break;
        await page.click("#adventure-quality");
      }
      await page.waitForFunction(
        (quality) => window.gameModule.getAdventure().visuals.info.quality === quality,
        quality,
      );
      assert.match(await page.locator("#adventure-quality").textContent(),
        new RegExp(quality, "i"), "quality button names the active preset");
    };
    await page.click("#adventure-pause");
    const gameplaySnapshot = () => page.evaluate(() => {
      const controller = window.gameModule.getAdventure();
      const player = controller.game.player;
      return {
        state: controller.state,
        hero: controller.game.hero,
        region: controller.game.region.id,
        progress: controller.game.progress,
        player: { x: player.x, y: player.y, z: player.z, hp: player.hp, energy: player.energy },
      };
    });
    const beforeQuality = await gameplaySnapshot();
    const qualityInfo = {};
    for (const quality of ["cinematic", "balanced", "fast"]) {
      await setQuality(quality);
      await checkRendered(page, quality + " preset");
      qualityInfo[quality] = await page.evaluate(() =>
        window.gameModule.getAdventure().visuals.info,
      );
      assert.deepEqual(await gameplaySnapshot(), beforeQuality,
        "changing render quality preserves the paused character and story");
      assert.ok(qualityInfo[quality].calls > 0 && qualityInfo[quality].triangles > 0,
        "quality diagnostics describe an actual rendered scene");
      assert.ok(qualityInfo[quality].pixelRatio > 0,
        "quality diagnostics expose the active render scale");
    }
    assert.equal(qualityInfo.cinematic.effects.bloom, true);
    assert.equal(qualityInfo.cinematic.effects.contactAO, true);
    assert.equal(qualityInfo.fast.effects.contactAO, false);
    assert.ok(qualityInfo.cinematic.passes.length > qualityInfo.fast.passes.length,
      "cinematic quality adds real lighting and composite passes");
    await setQuality("cinematic");
    await page.locator("#adventure-actions button").first().click();
    await checkRendered(page, "cinematic Leaf");
    await capture(page, "worlds-collide-cinematic-leaf");
    await setQuality("fast");
    await page.waitForTimeout(250);
    const leafPixels = await checkRendered(page, "Hidden Leaf");
    assert.equal(
      await page.evaluate(
        () => window.gameModule.getAdventure().game.region.id,
      ),
      "leaf",
    );
    assert.equal(
      await page.evaluate(() => window.gameModule.getAdventure().game.hero),
      "naruto",
    );
    const geometry = await page.evaluate(() => {
      const game = window.gameModule.getAdventure().game;
      const shapes = [...game.world.colliders, ...game.world.platforms];
      return {
        colliders: game.world.colliders.length,
        platforms: game.world.platforms.length,
        spanX:
          Math.max(...shapes.map((shape) => shape.x)) -
          Math.min(...shapes.map((shape) => shape.x)),
        spanZ:
          Math.max(...shapes.map((shape) => shape.z)) -
          Math.min(...shapes.map((shape) => shape.z)),
      };
    });
    assert.ok(geometry.colliders >= 12, "village has solid 3D buildings");
    assert.ok(
      geometry.spanX > 80 && geometry.spanZ > 80,
      "exploration world spans both horizontal axes",
    );

    await page.click("#adventure-canvas");
    const before = await page.evaluate(() => {
      const player = window.gameModule.getAdventure().game.player;
      return { x: player.x, y: player.y, z: player.z };
    });
    await page.keyboard.down("d");
    await page.waitForFunction((before) => {
      const player = window.gameModule.getAdventure().game.player;
      return Math.hypot(player.x - before.x, player.z - before.z) > 1.5;
    }, before);
    await page.keyboard.up("d");
    const afterD = await page.evaluate(() => {
      const player = window.gameModule.getAdventure().game.player;
      return { x: player.x, y: player.y, z: player.z };
    });
    assert.ok(
      Math.hypot(afterD.x - before.x, afterD.z - before.z) > 1.2,
      "actual D key moves the third-person character",
    );
    await page.keyboard.down("w");
    await page.waitForFunction((before) => {
      const player = window.gameModule.getAdventure().game.player;
      return Math.hypot(player.x - before.x, player.z - before.z) > 1.5;
    }, afterD);
    await page.keyboard.up("w");
    const afterW = await page.evaluate(() => {
      const player = window.gameModule.getAdventure().game.player;
      return { x: player.x, y: player.y, z: player.z };
    });
    const d = { x: afterD.x - before.x, z: afterD.z - before.z };
    const w = { x: afterW.x - afterD.x, z: afterW.z - afterD.z };
    assert.ok(Math.hypot(w.x, w.z) > 1.2, "actual W key moves the character");
    assert.ok(
      Math.abs(d.x * w.z - d.z * w.x) > 1,
      "W and D explore separate world directions",
    );
    await page.keyboard.down("Space");
    await page.waitForFunction(
      () => window.gameModule.getAdventure().game.player.y > 0.4,
    );
    assert.equal(
      await page.evaluate(
        () => window.gameModule.getAdventure().game.player.grounded,
      ),
      false,
      "Space produces a real airborne jump",
    );
    await page.keyboard.up("Space");
    await capture(page, "worlds-collide-3d-leaf");

    // At this south wall the default orbit direction crosses a village house.
    const originalPlayerPosition = await page.evaluate(() => {
      const player = window.gameModule.getAdventure().game.player;
      const original = {
        x: player.x,
        y: player.y,
        z: player.z,
        vx: player.vx,
        vy: player.vy,
        vz: player.vz,
        grounded: player.grounded,
        jumps: player.jumps,
        yaw: player.yaw,
      };
      Object.assign(player, {
        x: 17,
        y: 0,
        z: 29.1,
        vx: 0,
        vy: 0,
        vz: 0,
        grounded: true,
        jumps: 0,
      });
      return original;
    });
    const cameraCollisions = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let frames = 0;
          const collisions = [];
          const sample = () => {
            const controller = window.gameModule.getAdventure();
            const camera = controller.camera.position;
            const tolerance = 0.015;
            for (const shape of controller.game.world.colliders) {
              if (
                camera.x > shape.x - shape.w / 2 + tolerance &&
                camera.x < shape.x + shape.w / 2 - tolerance &&
                camera.z > shape.z - shape.d / 2 + tolerance &&
                camera.z < shape.z + shape.d / 2 - tolerance &&
                camera.y > tolerance &&
                camera.y < shape.h - tolerance
              ) {
                collisions.push({
                  frame: frames,
                  camera: { x: camera.x, y: camera.y, z: camera.z },
                  wall: {
                    x: shape.x,
                    z: shape.z,
                    w: shape.w,
                    d: shape.d,
                    h: shape.h,
                  },
                });
              }
            }
            if (++frames < 30) requestAnimationFrame(sample);
            else resolve(collisions);
          };
          requestAnimationFrame(sample);
        }),
    );
    await page.evaluate((original) => {
      Object.assign(window.gameModule.getAdventure().game.player, original);
    }, originalPlayerPosition);
    assert.deepEqual(
      cameraCollisions,
      [],
      "the orbit camera stays outside solid buildings throughout its wall adjustment",
    );

    await page.click("#adventure-map");
    const namek = page.locator("#adventure-actions button").filter({
      hasText: /NAMEK/i,
    });
    assert.equal(
      await namek.isDisabled(),
      true,
      "Namek stays locked before Pain is defeated",
    );
    await page.locator("#adventure-actions button").last().click();

    for (let index = 0; index < 3; index++) {
      await page.evaluate((index) => {
        const game = window.gameModule.getAdventure().game;
        const fragment = game.fragments[index];
        Object.assign(game.player, {
          x: fragment.x,
          y: 0,
          z: fragment.z,
          vx: 0,
          vy: 0,
          vz: 0,
          grounded: true,
        });
      }, index);
      await page.waitForFunction(
        (index) =>
          window.gameModule.getAdventure().game.fragments[index].collected,
        index,
      );
    }
    await page.evaluate(() => {
      const game = window.gameModule.getAdventure().game;
      Object.assign(game.player, game.region.camp, {
        vx: 0,
        vy: 0,
        vz: 0,
        grounded: true,
      });
    });
    await page.keyboard.press("e");
    await page.waitForFunction(
      () => window.gameModule.getAdventure().state === "camp",
    );
    await page
      .locator("#adventure-actions button")
      .filter({
        hasText: /POWER/i,
      })
      .click();
    assert.equal(
      await page.evaluate(
        () => window.gameModule.getAdventure().game.upgrades.power,
      ),
      1,
      "collected fragments purchase a camp power upgrade",
    );
    await page.locator("#adventure-actions button").last().click();

    // Place the player near a real roaming enemy; keyboard attacks must disperse it.
    const echo = await page.evaluate(() => {
      const controller = window.gameModule.getAdventure();
      const enemy = controller.game.enemies[0];
      Object.assign(controller.game.player, {
        x: enemy.x + 2,
        y: 0,
        z: enemy.z,
        vx: 0,
        vy: 0,
        vz: 0,
        grounded: true,
      });
      enemy.cooldown = 10;
      controller.game.attackCooldown = 0;
      const model = controller.scene.children.find(
        (child) =>
          child.name === "fighter-" + enemy.hero &&
          Math.hypot(child.position.x - enemy.x, child.position.z - enemy.z) <
            1,
      );
      return { id: enemy.id, hp: enemy.hp, uuid: model?.uuid };
    });
    assert.ok(echo.uuid, "roaming echo has a visible 3D character model");
    await page.keyboard.down("j");
    await page.waitForFunction((echo) => {
      const enemy = window.gameModule
        .getAdventure()
        .game.enemies.find((enemy) => enemy.id === echo.id);
      return !enemy || enemy.hp < echo.hp;
    }, echo);
    await page.keyboard.up("j");
    await page.evaluate((id) => {
      const game = window.gameModule.getAdventure().game;
      const enemy = game.enemies.find((enemy) => enemy.id === id);
      if (enemy) enemy.hp = 1;
      game.attackCooldown = 0;
    }, echo.id);
    await page.keyboard.down("j");
    await page.waitForFunction(
      (id) =>
        !window.gameModule
          .getAdventure()
          .game.enemies.some((enemy) => enemy.id === id),
      echo.id,
    );
    await page.keyboard.up("j");
    assert.equal(
      await page.evaluate((uuid) => {
        const model = window.gameModule
          .getAdventure()
          .scene.getObjectByProperty("uuid", uuid);
        return !!model?.visible;
      }, echo.uuid),
      false,
      "defeated echoes disappear from the rendered world",
    );

    for (const id of ["sasuke", "pain", "frieza", "broly"]) {
      if (id === "frieza") {
        await page.click("#adventure-map");
        const travel = page.locator("#adventure-actions button").filter({
          hasText: /NAMEK/i,
        });
        assert.equal(
          await travel.isDisabled(),
          false,
          "beating Pain unlocks world travel",
        );
        await page.locator("#adventure-actions button").last().click();
        await page.evaluate(() => {
          const game = window.gameModule.getAdventure().game;
          Object.assign(game.player, game.region.gate, {
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
          });
        });
        await page.keyboard.press("e");
        await dismissDialogue();
        await page.waitForFunction(
          () => window.gameModule.getAdventure().game.region.id === "namek",
        );
        assert.equal(
          await page.evaluate(() => window.gameModule.getAdventure().game.hero),
          "goku",
          "Namek changes the playable hero to Goku",
        );
        assert.equal(
          await page.evaluate(
            () => window.gameModule.getAdventure().world.group.name,
          ),
          "region-namek",
          "the physical world gate swaps the rendered world too",
        );
        await page.waitForTimeout(250);
        const namekPixels = await checkRendered(page, "Namek");
        assert.notDeepEqual(
          namekPixels,
          leafPixels,
          "travel renders another scene rather than the same village",
        );
        await capture(page, "worlds-collide-3d-namek");
        await setQuality("cinematic");
        await checkRendered(page, "cinematic Namek");
        await capture(page, "worlds-collide-cinematic-namek");
        await setQuality("fast");
      }
      if (id === "sasuke") await setQuality("cinematic");
      const approach = await page.evaluate((id) => {
        const controller = window.gameModule.getAdventure();
        const game = controller.game;
        const quest = game.nextQuest;
        if (quest?.id !== id) throw new Error(`Expected next quest ${id}`);
        const actor = controller.scene.children.find((child) =>
          child.userData.id === id &&
          Math.hypot(child.position.x - quest.x, child.position.z - quest.z) < 1,
        );
        if (id === "sasuke") {
          window.qaBossStartCount = 0;
          window.qaOriginalBossStart = game.startBoss;
          game.startBoss = function (...args) {
            const started = window.qaOriginalBossStart.apply(this, args);
            if (started) window.qaBossStartCount++;
            return started;
          };
        }
        Object.assign(game.player, {
          x: quest.x, y: 0, z: id === "sasuke" ? quest.z + 15 : quest.z,
          vx: 0, vy: 0, vz: 0, grounded: true,
        });
        return {
          actorFound: !!actor,
          actorVisible: !!actor?.visible,
          camera: { x: controller.camera.position.x, y: controller.camera.position.y, z: controller.camera.position.z },
        };
      }, id);
      assert.equal(approach.actorFound, true, `${id}: cinematic rival exists`);
      assert.equal(approach.actorVisible, false,
        `${id}: rival is hidden before the scripted arrival`);
      if (id === "sasuke") {
        assert.equal(
          await page.evaluate(() => window.gameModule.getAdventure().game.currentBoss),
          null,
          "standing outside the approach radius does not start Sasuke",
        );
        await page.keyboard.down("w");
      }
      await page.waitForFunction(
        (id) => window.gameModule.getAdventure().game.currentBoss?.id === id,
        id,
      );
      if (id === "sasuke") await page.keyboard.up("w");
      await page.waitForFunction(
        () => window.gameModule.getAdventure().state === "cinematic",
      );
      if (id === "sasuke") {
        assert.equal(
          await page.evaluate(() => window.gameModule.getAdventure().director.id),
          id,
          "approaching the crisis automatically starts the named intro without E",
        );
        const introTime = await page.evaluate(
          () => window.gameModule.getAdventure().game.time,
        );
        await page.waitForFunction(
          () => window.gameModule.getAdventure().cinematicFrame?.rival.visible,
          null,
          { timeout: 60000 },
        );
        const intro = await page.evaluate(() => {
          const controller = window.gameModule.getAdventure();
          return {
            camera: { x: controller.camera.position.x, y: controller.camera.position.y, z: controller.camera.position.z },
            time: controller.game.time,
            text: document.querySelector("#adventure-cinematic").textContent,
          };
        });
        assert.notDeepEqual(intro.camera, approach.camera,
          "the entry sequence moves the actual scene camera");
        assert.equal(intro.time, introTime,
          "the entry sequence freezes combat while the crisis unfolds");
        assert.ok(intro.text.trim().length > 30,
          "the sequence displays its scene caption and subtitles");
        await checkRendered(page, "Sasuke arrival cinematic");
        await capture(page, "worlds-collide-cinematic-sasuke");
      } else if (id === "pain") {
        const openingHP = await page.evaluate(
          () => window.gameModule.getAdventure().game.currentBoss.hp,
        );
        await page.waitForFunction(
          () => window.gameModule.getAdventure().state === "dialogue",
          null,
          { timeout: 30000 },
        );
        assert.equal(
          await page.evaluate(() => window.gameModule.getAdventure().game.currentBoss.hp),
          openingHP,
          "the entry scene completes naturally without combat running underneath",
        );
      }
      await dismissDialogue();
      assert.equal(
        await page.evaluate(() => window.gameModule.getAdventure().state),
        "combat",
        "skipping the entry scene and advancing dialogue hands control to combat",
      );
      if (id === "sasuke") {
        assert.equal(await page.evaluate(() => window.qaBossStartCount), 1,
          "one approach starts exactly one encounter");
        await page.evaluate(() => {
          window.gameModule.getAdventure().game.startBoss = window.qaOriginalBossStart;
          delete window.qaOriginalBossStart;
          delete window.qaBossStartCount;
        });
        await setQuality("fast");
      }
      await page.evaluate(() => {
        const game = window.gameModule.getAdventure().game;
        const boss = game.currentBoss;
        Object.assign(game.player, {
          x: boss.x + 2,
          y: 0,
          z: boss.z,
          vx: 0,
          vy: 0,
          vz: 0,
          grounded: true,
        });
        boss.cooldown = 10;
        game.attackCooldown = 0;
      });
      const hp = await page.evaluate(
        () => window.gameModule.getAdventure().game.currentBoss.hp,
      );
      await page.keyboard.down("j");
      await page.waitForFunction(
        (hp) => window.gameModule.getAdventure().game.currentBoss.hp < hp,
        hp,
      );
      await page.keyboard.up("j");
      if (id === "sasuke") {
        const energy = await page.evaluate(
          () => window.gameModule.getAdventure().game.player.energy,
        );
        await page.keyboard.down("k");
        await page.waitForFunction(
          (energy) =>
            window.gameModule.getAdventure().game.player.energy < energy - 10,
          energy,
        );
        await page.keyboard.up("k");
        assert.ok(
          await page.evaluate(
            (energy) =>
              window.gameModule.getAdventure().game.player.energy < energy - 10,
            energy,
          ),
          "Naruto's actual special spends energy",
        );
      }
      if (id === "broly") {
        await page.evaluate(() => {
          const game = window.gameModule.getAdventure().game;
          game.currentBoss.hp = game.currentBoss.maxHp * 0.49;
          game.currentBoss.cooldown = 0;
        });
        await page.waitForFunction(
          () => window.gameModule.getAdventure().game.currentBoss.phase === 2,
        );
        await checkRendered(page, "Broly encounter");
        await capture(page, "worlds-collide-3d-broly");
        await setQuality("cinematic");
        await checkRendered(page, "cinematic Broly encounter");
        await capture(page, "worlds-collide-cinematic-broly");
        await setQuality("fast");
        await page.evaluate(() => {
          const game = window.gameModule.getAdventure().game;
          game.player.energy = 100;
          game.resonance = 100;
          game.riftCooldown = 0;
        });
        await page.keyboard.down("r");
        await page.waitForFunction(
          () => window.gameModule.getAdventure().game.riftCooldown > 0,
        );
        await page.keyboard.up("r");
        assert.ok(
          await page.evaluate(
            () => window.gameModule.getAdventure().game.riftCooldown > 0,
          ),
          "Riftbreak uses the crossover attack",
        );
      }
      // The real attack above checks combat. Reduced HP only expedites chapter flow.
      await page.evaluate(() => {
        const game = window.gameModule.getAdventure().game;
        const boss = game.currentBoss;
        boss.hp = 1;
        boss.cooldown = 10;
        boss.telegraph = null;
        Object.assign(game.player, {
          x: boss.x + 2,
          y: 0,
          z: boss.z,
          vx: 0,
          vy: 0,
          vz: 0,
          grounded: true,
        });
        game.attackCooldown = 0;
      });
      await page.keyboard.down("j");
      await page.waitForFunction(
        (id) =>
          window.gameModule.getAdventure().game.progress.completed.includes(id),
        id,
      );
      await page.keyboard.up("j");
      await dismissDialogue();
    }

    assert.equal(
      await page.evaluate(() => window.gameModule.getAdventure().game.ending),
      true,
      "all four chapters reach the saved ending",
    );
    await page.click("#adventure-exit");
    await page.locator("#lobby:not([hidden])").waitFor();
    await page.reload();
    await page.locator("#start:not([disabled])").waitFor();
    await page.evaluate(
      async () => (window.gameModule = await import("/game.js")),
    );
    await page.click("#adventure-start");
    await page.waitForFunction(() => window.gameModule.getAdventure()?.active);
    await dismissDialogue();
    assert.deepEqual(
      await page.evaluate(
        () => window.gameModule.getAdventure().game.progress.completed,
      ),
      ["sasuke", "pain", "frieza", "broly"],
      "fresh page restores the independent 3D campaign save",
    );
    assert.equal(
      await page.evaluate(() => window.gameModule.getAdventure().game.hero),
      "goku",
    );
    assert.equal(
      await page.evaluate(
        () => window.gameModule.getAdventure().game.upgrades.power,
      ),
      1,
      "camp upgrade survives a fresh page",
    );
    await page.click("#adventure-map");
    await page
      .locator("#adventure-actions button")
      .filter({
        hasText: /HIDDEN LEAF/i,
      })
      .click();
    assert.equal(
      await page.evaluate(
        () => window.gameModule.getAdventure().world.group.name,
      ),
      "region-leaf",
      "the atlas independently travels back to the village",
    );
    await page.click("#adventure-map");
    await page
      .locator("#adventure-actions button")
      .filter({
        hasText: /NAMEK/i,
      })
      .click();
    await page.waitForTimeout(200);
    await checkRendered(page, "restored Namek");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);
    await checkRendered(page, "phone-sized Namek", 280);
    const withinPhone = async (selector, label) => {
      const rectangles = await page.locator(selector).evaluateAll((elements) =>
        elements.map((element) => {
          const rectangle = element.getBoundingClientRect();
          return {
            x: rectangle.x,
            y: rectangle.y,
            width: rectangle.width,
            height: rectangle.height,
          };
        }),
      );
      assert.ok(rectangles.length > 0, `${label}: controls exist`);
      for (const rectangle of rectangles) {
        assert.ok(
          rectangle.width > 0 &&
            rectangle.height > 0 &&
            rectangle.x >= -1 &&
            rectangle.y >= -1 &&
            rectangle.x + rectangle.width <= 391 &&
            rectangle.y + rectangle.height <= 845,
          `${label}: fully reachable in a 390 by 844 viewport`,
        );
      }
    };
    await page.click("#adventure-pause");
    assert.equal(
      await page.evaluate(() => window.gameModule.getAdventure().state),
      "pause",
    );
    await withinPhone(
      "#adventure-overlay .adventure-dialog",
      "phone pause panel",
    );
    await withinPhone("#adventure-actions button", "phone pause actions");
    const pausedTime = await page.evaluate(
      () => window.gameModule.getAdventure().game.time,
    );
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(() => window.gameModule.getAdventure().game.time),
      pausedTime,
      "phone pause stops the campaign simulation",
    );
    await page.locator("#adventure-actions button").first().click();
    await page.evaluate(() => {
      const game = window.gameModule.getAdventure().game;
      Object.assign(game.player, game.region.npc, {
        vx: 0,
        vy: 0,
        vz: 0,
        grounded: true,
      });
    });
    await page.keyboard.press("e");
    await page.waitForFunction(
      () => window.gameModule.getAdventure().state === "dialogue",
    );
    await withinPhone(
      "#adventure-overlay .adventure-dialog",
      "phone dialogue panel",
    );
    await withinPhone("#adventure-actions button", "phone dialogue actions");
    await dismissDialogue();
    await page.click("#adventure-map");
    await withinPhone(
      "#adventure-overlay .adventure-dialog",
      "phone atlas panel",
    );
    await withinPhone("#adventure-actions button", "phone atlas actions");
    await capture(page, "worlds-collide-3d-phone");
    await page.locator("#adventure-actions button").last().click();
    await withinPhone("#adventure-exit", "phone save and exit");
    await page.click("#adventure-exit");
    await page.locator("#lobby:not([hidden])").waitFor();
    assert.equal(
      await page.locator("[data-fighter]").count(),
      6,
      "the original six-fighter brawler remains available",
    );

    assert.deepEqual(errors, [], "no JavaScript or browser console errors");
    console.log(
      "3D story browser checks passed: actual WebGL scenes, three render presets with stable story state, " +
      "cinematic Leaf/Namek/boss rendering, automatic approach intro with moving camera, skip and natural dialogue handoffs, " +
      "WASD movement and jumping, camera wall collision, " +
        "dialogue, fragments and camp upgrades, roaming echo removal, physical gates and atlas travel, " +
        "Naruto/Goku hero change, four boss attacks, " +
        "specials, second phase, Riftbreak, ending, exit and save reload, plus phone-sized WebGL, " +
        "pause, dialogue, map and exit controls. " +
        "Boss HP was reduced only to expedite chapter progression; each encounter first " +
        "received damage from actual keyboard combat.",
    );
  } finally {
    if (errors.length) console.error("Captured browser errors:", errors);
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
