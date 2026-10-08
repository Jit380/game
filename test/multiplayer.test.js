const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { WebSocket } = require("ws");
const server = require("../server");
let url;
const sockets = [];
before(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = "ws://127.0.0.1:" + server.address().port + "/play";
});
after(async () => {
  sockets.forEach((s) => s.terminate());
  await new Promise((r) => server.close(r));
});
async function client() {
  const ws = new WebSocket(url);
  sockets.push(ws);
  ws.inbox = [];
  ws.on("message", (raw) => ws.inbox.push(JSON.parse(raw)));
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  return ws;
}
function send(ws, m) {
  ws.send(JSON.stringify(m));
}
async function take(ws, predicate) {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const i = ws.inbox.findIndex(predicate);
    if (i >= 0) return ws.inbox.splice(i, 1)[0];
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error("Expected room message did not arrive");
}
test("rooms validate join, synchronize human inputs, rematch and disconnect", async () => {
  const host = await client(),
    guest = await client(),
    third = await client();
  send(third, { type: "join", code: "ABCDEF", fighter: "pikachu" });
  assert.match(
    (await take(third, (m) => m.type === "error")).message,
    /not found/,
  );
  send(host, { type: "create", fighter: "missing", stage: "leaf" });
  assert.match(
    (await take(host, (m) => m.type === "error")).message,
    /valid fighter/,
  );
  send(host, { type: "create", fighter: "midoriya", stage: "leaf" });
  const room = await take(host, (m) => m.type === "room");
  assert.match(room.code, /^[A-F0-9]{6}$/);
  send(guest, { type: "join", fighter: "pikachu", code: room.code });
  assert.equal((await take(guest, (m) => m.type === "room")).slot, 1);
  await take(host, (m) => m.type === "start");
  await take(guest, (m) => m.type === "start");
  send(third, { type: "join", fighter: "ryuga", code: room.code });
  assert.match(
    (await take(third, (m) => m.type === "error")).message,
    /two players/,
  );
  const authority = server.multiplayer.rooms.get(room.code).arena;
  authority.countdown = 0;
  const x = authority.fighters[1].x,
    hostX = authority.fighters[0].x;
  send(guest, { type: "input", input: { left: true }, slot: 0 });
  const snapshot = await take(
    host,
    (m) => m.type === "state" && m.arena.fighters[1].x < x - 30,
  );
  assert.equal(snapshot.arena.stage.id, "leaf");
  assert.equal(snapshot.arena.mode, "online");
  assert.equal(snapshot.arena.fighters[0].x, hostX);
  const guestState = await take(
    guest,
    (m) => m.type === "state" && m.arena.elapsed === snapshot.arena.elapsed,
  );
  assert.deepEqual(guestState.arena.fighters, snapshot.arena.fighters);
  send(guest, { type: "input", input: { jump: true } });
  send(guest, { type: "input", input: { jump: false } });
  await take(host, (m) => m.type === "state" && m.arena.fighters[1].vy < 0);
  assert.ok(
    authority.fighters[1].jumps > 0,
    "short jump taps survive between simulation ticks",
  );
  send(guest, { type: "input", input: { up: true, special: true } });
  send(guest, { type: "input", input: { up: false, special: false } });
  await take(host, (m) => m.type === "state" && m.arena.fighters[1].recovery);
  assert.ok(
    authority.fighters[1].recovery,
    "short direction+special taps preserve air recovery",
  );
  authority.fighters[1].stocks = 1;
  authority.fighters[1].y = 900;
  await take(host, (m) => m.type === "state" && m.arena.winner === 0);
  send(host, { type: "rematch" });
  await take(host, (m) => m.type === "notice");
  assert.equal(server.multiplayer.rooms.get(room.code).arena.winner, 0);
  send(guest, { type: "rematch" });
  await take(host, (m) => m.type === "start");
  assert.equal(server.multiplayer.rooms.get(room.code).arena.winner, null);
  guest.close();
  await take(host, (m) => m.type === "left");
  assert.equal(server.multiplayer.rooms.has(room.code), false);
});
