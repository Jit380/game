const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const server = require("../server");
let base;
before(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port;
});
after(() => server.close());
test("delivers fighter menu, simulation, renderer, and styles", async () => {
  for (const [file, type, marker] of [
    ["/", "text/html", "ANIME"],
    ["/engine.mjs", "text/javascript", "class Arena"],
    ["/art.js", "text/javascript", "drawFighter"],
    ["/game.js", "text/javascript", "startMatch"],
    ["/style.css", "text/css", ".fighter-card"],
    ["/story.mjs", "text/javascript", "class Campaign"],
    ["/story-ui.js", "text/javascript", "createStory"],
    ["/story-art.js", "text/javascript", "drawWorld"],
    ["/villains.js", "text/javascript", "drawVillain"],
    ["/adventure/client.js", "text/javascript", "createAdventure"],
    ["/adventure/core.mjs", "text/javascript", "class Adventure"],
    ["/adventure/world.js", "text/javascript", "createRegion"],
    ["/adventure/characters.js", "text/javascript", "createCharacter"],
    ["/vendor/three.module.js", "text/javascript", "REVISION"],
  ]) {
    const r = await fetch(base + file);
    assert.equal(r.status, 200);
    assert.ok(r.headers.get("content-type").startsWith(type));
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.ok((await r.text()).includes(marker));
  }
});
test("does not expose project files or removed game routes", async () => {
  for (const file of [
    "/server.js",
    "/package.json",
    "/native/project.godot",
    "/node_modules/three/package.json",
    "/missing",
  ])
    assert.equal((await fetch(base + file)).status, 404);
});
