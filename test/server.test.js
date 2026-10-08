const { test, after, before } = require("node:test");
const assert = require("node:assert/strict");
const server = require("../server");
let base;
before(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port;
});
after(() => server.close());
test("serves playable page and both required assets", async () => {
  for (const [file, type, marker] of [
    ["/", "text/html", 'id="world"'],
    ["/game.js", "text/javascript", "WebGLRenderer"],
    ["/boot.js", "text/javascript", "await import"],
    ["/style.css", "text/css", "#overlay"],
    ["/vendor/three.module.js", "text/javascript", "three.core.js"],
    ["/vendor/three.core.js", "text/javascript", "class Vector3"],
  ]) {
    const r = await fetch(base + file);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), new RegExp(type));
    assert.ok((await r.text()).includes(marker));
  }
});
test("rejects paths outside public assets", async () => {
  for (const file of ["/package.json", "/server.js", "/missing"])
    assert.equal((await fetch(base + file)).status, 404);
});
