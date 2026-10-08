const { WebSocketServer, WebSocket } = require("ws");
const { randomBytes } = require("node:crypto");
module.exports = function attachMultiplayer(server) {
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  let engine;
  const ready = import("./engine.mjs").then((e) => (engine = e));
  const send = (ws, data) => {
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 256000)
      ws.send(JSON.stringify(data));
  };
  const broadcast = (r, data) => r.players.forEach((p) => send(p.ws, data));
  function cleanup(ws) {
    const r = ws.room;
    if (!r) return;
    ws.room = null;
    rooms.delete(r.code);
    for (const p of r.players)
      if (p.ws !== ws) {
        p.ws.room = null;
        send(p.ws, {
          type: "left",
          message: "Your opponent disconnected. Create or join another room.",
        });
      }
  }
  function begin(r) {
    r.arena = new engine.Arena({
      p1: r.players[0].fighter,
      p2: r.players[1].fighter,
      stage: r.stage,
      mode: "online",
    });
    for (const f of r.arena.fighters) {
      f.y = r.arena.stage.platforms[0].y - f.h;
      f.grounded = true;
      f.platform = r.arena.stage.platforms[0];
    }
    r.players.forEach((p) => {
      p.input = {};
      p.pending = {};
      p.rematch = false;
    });
    broadcast(r, { type: "start", code: r.code });
  }
  server.on("upgrade", (req, socket, head) => {
    const origin = req.headers.origin;
    let allowed = true;
    if (origin) {
      try {
        allowed = new URL(origin).host === req.headers.host;
      } catch {
        allowed = false;
      }
    }
    if (req.url !== "/play" || !allowed || wss.clients.size >= 128) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  wss.on("connection", (ws) => {
    ws.alive = true;
    ws.on("pong", () => (ws.alive = true));
    let windowStart = Date.now(),
      count = 0;
    ws.on("error", () => {});
    ws.on("message", async (raw) => {
      if (Date.now() - windowStart > 1000) {
        windowStart = Date.now();
        count = 0;
      }
      if (++count > 90) {
        ws.close(1008, "Too many messages");
        return;
      }
      let m;
      try {
        m = JSON.parse(raw);
      } catch {
        return;
      }
      if (!m || typeof m !== "object") return;
      await ready;
      const fail = (message) => send(ws, { type: "error", message });
      if (m.type === "create" || m.type === "join") {
        if (ws.room) return fail("Leave your current room first.");
        if (!engine.ROSTER.some((f) => f.id === m.fighter))
          return fail("Choose a valid fighter.");
        if (m.type === "create") {
          if (rooms.size >= 64)
            return fail("All rooms are busy. Try again shortly.");
          if (!engine.STAGES.some((s) => s.id === m.stage))
            return fail("Choose a valid stage.");
          let code;
          do {
            code = randomBytes(3).toString("hex").toUpperCase();
          } while (rooms.has(code));
          const r = {
            code,
            stage: m.stage,
            players: [
              { ws, fighter: m.fighter, input: {}, lastInput: Date.now() },
            ],
            created: Date.now(),
          };
          rooms.set(code, r);
          ws.room = r;
          send(ws, { type: "room", code, slot: 0 });
        } else {
          const code =
            typeof m.code === "string" ? m.code.trim().toUpperCase() : "";
          const r = rooms.get(code);
          if (!r)
            return fail(
              "Room not found. Check the code or ask your friend to create a room.",
            );
          if (r.players.length >= 2)
            return fail("This room already has two players.");
          r.players.push({
            ws,
            fighter: m.fighter,
            input: {},
            lastInput: Date.now(),
          });
          ws.room = r;
          send(ws, { type: "room", code, slot: 1 });
          begin(r);
        }
      } else if (m.type === "input" && ws.room?.arena) {
        const p = ws.room.players.find((p) => p.ws === ws);
        const old = p.input;
        p.input = {};
        p.pending ??= {};
        for (const key of [
          "left",
          "right",
          "up",
          "down",
          "jump",
          "attack",
          "special",
          "shield",
          "dodge",
        ]) {
          p.input[key] = m.input?.[key] === true;
          if (
            ["jump", "attack", "special", "dodge"].includes(key) &&
            p.input[key] &&
            !old[key]
          ) {
            p.pending[key] = true;
            if (m.input?.up === true) p.pending.up = true;
            if (m.input?.down === true) p.pending.down = true;
          }
        }
        p.lastInput = Date.now();
      } else if (
        m.type === "rematch" &&
        ws.room?.arena?.winner !== null &&
        ws.room?.arena
      ) {
        const r = ws.room;
        r.players.find((p) => p.ws === ws).rematch = true;
        if (r.players.every((p) => p.rematch)) begin(r);
        else
          broadcast(r, {
            type: "notice",
            message: "Rematch requested. Both players must press Rematch.",
          });
      } else if (m.type === "leave") cleanup(ws);
    });
    ws.on("close", () => cleanup(ws));
  });
  let ticks = 0,
    last = performance.now(),
    accumulator = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    accumulator += Math.min(0.15, (now - last) / 1000);
    last = now;
    while (accumulator >= 1 / 60) {
      accumulator -= 1 / 60;
      ticks++;
      for (const r of rooms.values()) {
        if (!r.arena) {
          if (Date.now() - r.created > 10 * 60 * 1000) {
            send(r.players[0].ws, {
              type: "left",
              message: "Waiting room expired. Create a new room.",
            });
            r.players[0].ws.room = null;
            rooms.delete(r.code);
          }
          continue;
        }
        r.arena.update(
          1 / 60,
          r.players.map((p) =>
            Date.now() - p.lastInput < 500 ? { ...p.input, ...p.pending } : {},
          ),
        );
        r.players.forEach((p) => (p.pending = {}));
        if (ticks % 3 === 0) {
          broadcast(r, { type: "state", arena: r.arena });
          r.arena.events = [];
        }
      }
    }
  }, 1000 / 60);
  timer.unref();
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
  }, 30000);
  heartbeat.unref();
  server.on("close", () => {
    clearInterval(timer);
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    rooms.clear();
  });
  return { rooms, wss };
};
