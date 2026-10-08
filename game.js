import { createStory } from "/story-ui.js";
import { Arena, Fighter, ROSTER, STAGES } from "/engine.mjs";
import { drawPortrait, drawArena, drawFighter } from "/art.js";
import { Tournament } from "/tournament.mjs";
const $ = (s) => document.querySelector(s),
  canvas = $("#arena"),
  ctx = canvas.getContext("2d");
let arena = null,
  selected = "naruto",
  stage = "temple",
  muted = false,
  audio = null,
  accumulator = 0,
  last = performance.now(),
  beat = 0,
  resultShown = false;
let story, adventure;
export function getAdventure() {
  return adventure;
}
export function getStory() {
  return story;
}
let tournament = null,
  socket = null,
  onlineSlot = 0,
  roomCode = "",
  onlineStarted = false;
const displayRoster = [...ROSTER].sort(
  (a, b) =>
    ["naruto", "luffy", "goku", "midoriya", "ryuga", "pikachu"].indexOf(a.id) -
    ["naruto", "luffy", "goku", "midoriya", "ryuga", "pikachu"].indexOf(b.id),
);
$(".roster").innerHTML = displayRoster
  .map(
    (f, i) =>
      `<button class="fighter-card ${f.id === selected ? "selected" : ""}" data-fighter="${f.id}" style="--accent:${f.color}"><span class="card-no">0${i + 1} / ${f.title}</span><canvas data-portrait="${f.id}"></canvas><div class="card-name">${f.name.toUpperCase()} <span>+</span></div><div class="card-details">${f.special.toUpperCase()} <i>${f.tag}</i></div><span class="picked">P1 SELECTED</span></button>`,
  )
  .join("");
$("#opponent").innerHTML = displayRoster
  .map((f) => `<option value="${f.id}">${f.name}</option>`)
  .join("");
$("#opponent").value = "goku";
$(".stages").innerHTML = STAGES.map(
  (s) =>
    `<button data-stage="${s.id}" class="${s.id === stage ? "active" : ""}">${s.name.toUpperCase()}</button>`,
).join("");
function roomStatus(message) {
  $("#room-status").textContent = message;
}
function disconnectOnline() {
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  roomCode = "";
  onlineStarted = false;
  $("#leave-room").hidden = true;
  $("#create-room").disabled = false;
  $("#join-room").disabled = false;
}
function onlineRoom(type) {
  openAudio();
  disconnectOnline();
  roomStatus("Connecting…");
  const ws = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/play`,
  );
  socket = ws;
  ws.onopen = () =>
    ws.send(
      JSON.stringify({
        type,
        fighter: selected,
        stage,
        code: $("#room-code").value,
      }),
    );
  ws.onerror = () =>
    roomStatus(
      "Could not connect. Check that both players opened the same running game server.",
    );
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    onlineStarted = false;
    arena = null;
    $("#lobby").hidden = false;
    $("#match").hidden = true;
    $("#leave-room").hidden = true;
    $("#create-room").disabled = false;
    $("#join-room").disabled = false;
    roomStatus("Connection closed. Create or join a room to reconnect.");
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "room") {
      roomCode = m.code;
      onlineSlot = m.slot;
      $("#leave-room").hidden = false;
      $("#create-room").disabled = true;
      $("#join-room").disabled = true;
      roomStatus(
        `ROOM ${m.code} · You are Player ${m.slot + 1}. ${m.slot === 0 ? "Share this code and wait for your friend." : "Joining match…"}`,
      );
    } else if (m.type === "start") {
      onlineStarted = true;
      startMatch({ network: true });
    } else if (m.type === "state") {
      if (!onlineStarted) return;
      const camera = arena?.camera;
      const state = Object.assign(Object.create(Arena.prototype), m.arena);
      state.fighters = state.fighters.map((f, i) => {
        const previous = arena?.fighters[i];
        const target = { x: f.x, y: f.y };
        if (
          previous &&
          Math.abs(previous.x - f.x) < 150 &&
          Math.abs(previous.y - f.y) < 150
        ) {
          f.x = previous.x;
          f.y = previous.y;
        }
        return Object.assign(Object.create(Fighter.prototype), f, {
          renderTarget: target,
        });
      });
      state.camera = camera;
      arena = state;
      $("#match-description").textContent =
        `${arena.fighters[0].character.name.toUpperCase()} VS ${arena.fighters[1].character.name.toUpperCase()} · ONLINE · ROOM ${roomCode} · YOU: P${onlineSlot + 1}`;
    } else if (m.type === "error" || m.type === "notice") {
      roomStatus(m.message);
      if (arena?.mode === "online" && resultShown)
        $("#overlay-detail").textContent = m.message;
    } else if (m.type === "left") {
      returnToSelect();
      roomStatus(m.message);
    }
  };
}
function sendOnlineInput() {
  if (socket?.readyState === WebSocket.OPEN && onlineStarted)
    socket.send(JSON.stringify({ type: "input", input: inputs()[0] }));
}
setInterval(sendOnlineInput, 1000 / 30);
$("#create-room").onclick = () => onlineRoom("create");
$("#join-room").onclick = () => onlineRoom("join");
$("#leave-room").onclick = () => {
  disconnectOnline();
  roomStatus("Room closed.");
};
const keys = new Set(),
  touch = new Set();
let mouseAttack = false;
const controls = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "KeyJ",
  "KeyK",
  "KeyL",
  "ShiftLeft",
  "ShiftRight",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyI",
  "KeyO",
  "KeyP",
]);
const down = (...codes) => codes.some((c) => keys.has(c));
function inputs() {
  return [
    {
      left: down("KeyA") || touch.has("left"),
      right: down("KeyD") || touch.has("right"),
      up: down("KeyW") || touch.has("up"),
      down: down("KeyS"),
      jump: down("KeyW", "Space") || touch.has("jump") || touch.has("up"),
      attack: down("KeyJ") || touch.has("attack") || mouseAttack,
      special: down("KeyK") || touch.has("special"),
      shield: down("KeyL") || touch.has("shield"),
      dodge: down("ShiftLeft"),
    },
    {
      left: down("ArrowLeft"),
      right: down("ArrowRight"),
      up: down("ArrowUp"),
      down: down("ArrowDown"),
      jump: down("ArrowUp"),
      attack: down("KeyI"),
      special: down("KeyO"),
      shield: down("KeyP"),
      dodge: down("ShiftRight"),
    },
  ];
}
function sound(
  freq = 220,
  length = 0.12,
  type = "square",
  volume = 0.035,
  end = freq * 0.5,
) {
  if (muted || !audio || audio.state !== "running") return;
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(25, end),
    audio.currentTime + length,
  );
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + length);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + length);
}
function openAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
  } catch {
    muted = true;
    $("#audio").textContent = "SOUND OFF";
  }
}
setInterval(() => {
  if (!arena || arena.paused || arena.winner !== null || muted || !audio)
    return;
  const melody = [
    262, 0, 392, 466, 523, 466, 392, 0, 311, 0, 392, 523, 587, 523, 466, 392,
  ];
  const n = melody[beat % 16];
  if (n) sound(n, 0.13, "triangle", 0.015, n);
  if (beat % 4 === 0) sound(65, 0.09, "sine", 0.07, 30);
  if (beat % 2 === 0) sound(131, 0.13, "triangle", 0.018, 131);
  beat++;
}, 190);
function events() {
  if (!arena) return;
  for (const e of arena.events.splice(0)) {
    if (e.type === "hit")
      sound(e.strong ? 110 : 175, e.strong ? 0.18 : 0.1, "sawtooth", 0.04, 40);
    else if (e.type === "jump") sound(380, 0.1, "square", 0.018, 800);
    else if (e.type === "swing") sound(250, 0.08, "triangle", 0.022, 80);
    else if (e.type === "special")
      sound(
        e.character === "goku" ? 220 : 600,
        0.3,
        "sawtooth",
        0.025,
        e.character === "goku" ? 900 : 130,
      );
    else if (e.type === "block") sound(900, 0.08, "sine", 0.03, 480);
    else if (e.type === "ko") sound(120, 0.5, "sawtooth", 0.05, 25);
    else if (e.type === "go") sound(700, 0.3, "square", 0.02, 1100);
    else if (e.type === "break") sound(1400, 0.35, "triangle", 0.035, 90);
  }
}
export function getArena() {
  return arena;
}
export function startMatch(options = {}) {
  const network = options?.network === true;
  if ($("#mode").value === "online" && !network) {
    if (onlineStarted && socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ type: "rematch" }));
    else onlineRoom("create");
    return;
  }
  if ($("#mode").value === "tournament" && (!tournament || tournament.finished))
    tournament = new Tournament(selected);

  openAudio();
  keys.clear();
  touch.clear();
  mouseAttack = false;
  resultShown = false;
  accumulator = 0;
  beat = 0;
  $("#pause").textContent = "PAUSE · ESC";
  arena = new Arena({
    p1: selected,
    p2:
      $("#mode").value === "tournament"
        ? tournament.opponent
        : $("#opponent").value,
    mode: network
      ? "online"
      : $("#mode").value === "tournament"
        ? "cpu"
        : $("#mode").value,
    difficulty: $("#difficulty").value,
    stage,
  });
  // Start with both fighters grounded, so the countdown is a clean ready pose.
  for (const f of arena.fighters) {
    f.y = arena.stage.platforms[0].y - f.h;
    f.grounded = true;
    f.platform = arena.stage.platforms[0];
  }
  $("#lobby").hidden = true;
  $("#match").hidden = false;
  $("#match-overlay").hidden = true;
  $("#match-description").textContent =
    arena.fighters[0].character.name.toUpperCase() +
    " VS " +
    arena.fighters[1].character.name.toUpperCase() +
    " · " +
    (arena.mode === "cpu"
      ? "CPU " + arena.difficulty.toUpperCase()
      : "LOCAL 2P");
  $("#match-controls").textContent =
    arena.mode === "local"
      ? "P1: A/D · W/SPACE · J/K/L · LEFT SHIFT  |  P2: ←/→ · ↑ JUMP · I ATTACK · O SPECIAL · P SHIELD · RIGHT SHIFT DODGE"
      : "A/D MOVE · W/SPACE DOUBLE JUMP · J ATTACK · K SPECIAL · L SHIELD · SHIFT DODGE · W+K AIR RECOVERY";
  $("#pause").disabled = network;
  $("#rematch").textContent = "REMATCH ↻";
  if (network)
    $("#match-controls").textContent =
      "YOUR CONTROLS: A/D MOVE · W/SPACE JUMP · J ATTACK · K SPECIAL · L SHIELD · LEFT SHIFT DODGE · W+K AIR RECOVERY";
  if ($("#mode").value === "tournament")
    $("#match-description").textContent += " · " + tournament.label;
  canvas.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
  drawArena(ctx, arena);
}
export function returnToSelect() {
  if (adventure?.active) adventure.exit();
  if (story?.active) story.exit();
  disconnectOnline();
  tournament = null;
  arena = null;
  keys.clear();
  touch.clear();
  mouseAttack = false;
  $("#lobby").hidden = false;
  $("#match").hidden = true;
  $("#match-overlay").hidden = true;
}
function pause() {
  if (!arena || arena.winner !== null || arena.mode === "online") return;
  arena.paused = !arena.paused;
  keys.clear();
  touch.clear();
  mouseAttack = false;
  $("#match-overlay").hidden = !arena.paused;
  $("#overlay-caption").textContent = "TAKE A BREATHER";
  $("#overlay-title").textContent = "PAUSED";
  $("#overlay-detail").textContent =
    "Your rival can wait. Resume when you’re ready.";
  $("#resume").hidden = false;
  $("#rematch").hidden = true;
  $("#pause").textContent = arena.paused ? "RESUME · ESC" : "PAUSE · ESC";
}
function showResult() {
  resultShown = true;
  $("#match-overlay").hidden = false;
  const draw = arena.winner === "draw";
  const winner = draw ? null : arena.fighters[arena.winner];
  $("#overlay-caption").textContent = draw ? "WHAT A MATCH" : "GAME!";
  $("#overlay-title").textContent = draw
    ? "DRAW"
    : winner.character.name.toUpperCase() + " WINS";
  $("#overlay-detail").textContent = draw
    ? "An even score. Settle it with a rematch."
    : `${arena.winner === 0 ? "Player 1" : arena.mode === "cpu" ? "CPU" : "Player 2"} takes the match with ${winner.stocks} stock${winner.stocks === 1 ? "" : "s"} remaining.`;
  if ($("#mode").value === "tournament") {
    if (!draw) tournament.advance(arena.winner === 0);
    $("#overlay-caption").textContent = draw
      ? "TIE · REPLAY THIS ROUND"
      : tournament.champion
        ? "CHAMPIONSHIP COMPLETE"
        : tournament.finished
          ? "TOURNAMENT ELIMINATION"
          : tournament.label + " UP NEXT";
    $("#overlay-detail").textContent =
      tournament.history
        .map((m) => `${m.a} vs ${m.b}: ${m.winner}`)
        .join(" · ") || "Replay to decide the round.";
    $("#rematch").textContent = tournament.champion
      ? "DEFEND YOUR TITLE →"
      : tournament.finished
        ? "NEW TOURNAMENT →"
        : draw
          ? "REPLAY ROUND →"
          : "NEXT ROUND →";
  }
  if (arena.mode === "online")
    $("#overlay-detail").textContent +=
      " Both players must press Rematch to play again.";
  $("#resume").hidden = true;
  $("#rematch").hidden = false;
  sound(523, 0.16, "square", 0.03, 523);
  setTimeout(() => sound(784, 0.22, "square", 0.025, 784), 160);
}
$("#start").onclick = startMatch;
$("#back").onclick = returnToSelect;
$("#select-again").onclick = returnToSelect;
$("#pause").onclick = pause;
$("#resume").onclick = pause;
$("#rematch").onclick = startMatch;
$(".logo").onclick = (e) => {
  e.preventDefault();
  returnToSelect();
};
$("#audio").onclick = () => {
  muted = !muted;
  $("#audio").textContent = muted ? "SOUND OFF" : "SOUND ON";
  if (!muted) openAudio();
};
for (const card of document.querySelectorAll("[data-fighter]")) {
  card.onclick = () => {
    selected = card.dataset.fighter;
    document.querySelectorAll("[data-fighter]").forEach((c) => {
      c.classList.toggle("selected", c === card);
      c.setAttribute("aria-pressed", String(c === card));
    });
    $("#selection-label").textContent = "PLAYER 1 · " + selected.toUpperCase();
  };
  card.setAttribute("aria-pressed", String(card.dataset.fighter === selected));
}
for (const button of document.querySelectorAll("[data-stage]"))
  button.onclick = () => {
    stage = button.dataset.stage;
    document
      .querySelectorAll("[data-stage]")
      .forEach((b) => b.classList.toggle("active", b === button));
  };
$("#mode").onchange = () => {
  disconnectOnline();
  tournament = null;
  const mode = $("#mode").value;
  $("#difficulty").disabled = mode === "local" || mode === "online";
  $("#opponent").disabled = mode === "online" || mode === "tournament";
  $("#online-settings").hidden = mode !== "online";
  $("#tournament-info").hidden = mode !== "tournament";
  $("#start").hidden = mode === "online";
  roomStatus("Create a room or join your friend’s room.");
};
for (const portrait of document.querySelectorAll("[data-portrait]"))
  drawPortrait(portrait, portrait.dataset.portrait);
addEventListener("keydown", (e) => {
  if (arena && controls.has(e.code)) e.preventDefault();
  keys.add(e.code);
  if (!e.repeat) sendOnlineInput();
  if (e.repeat) return;
  if (e.code === "Escape") pause();
  if (e.code === "KeyR" && arena?.winner !== null && arena) startMatch();
});
addEventListener("keyup", (e) => {
  keys.delete(e.code);
  sendOnlineInput();
});
addEventListener("blur", () => {
  keys.clear();
  touch.clear();
  mouseAttack = false;
  sendOnlineInput();
  if (arena && !arena.paused && arena.winner === null) pause();
});
canvas.tabIndex = 0;
canvas.onpointerdown = (e) => {
  if (e.pointerType === "mouse") {
    mouseAttack = true;
    sendOnlineInput();
    canvas.focus();
  }
};
addEventListener("pointerup", () => {
  mouseAttack = false;
  sendOnlineInput();
});
for (const button of document.querySelectorAll("[data-touch]")) {
  button.onpointerdown = (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    touch.add(button.dataset.touch);
    sendOnlineInput();
  };
  button.onpointerup = button.onpointercancel = () => {
    touch.delete(button.dataset.touch);
    sendOnlineInput();
  };
}
story = createStory({
  sound,
  onExit: () => {
    $("#lobby").hidden = false;
  },
});
$("#adventure-start").onclick = async () => {
  const button = $("#adventure-start");
  button.disabled = true;
  $("#adventure-error").hidden = true;
  try {
    openAudio();
    disconnectOnline();
    arena = null;
    tournament = null;
    if (story.active) story.exit();
    if (!adventure) {
      const { createAdventure } = await import("/adventure/client.js");
      adventure = createAdventure({
        sound,
        onExit: () => {
          $("#lobby").hidden = false;
        },
      });
    }
    $("#lobby").hidden = true;
    $("#match").hidden = true;
    adventure.start();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    if (adventure?.active) adventure.exit();
    $("#lobby").hidden = false;
    $("#adventure").hidden = true;
    $("#adventure-error").hidden = false;
    $("#adventure-error").textContent =
      "The 3D adventure could not start: " +
      error.message +
      " Enable browser hardware acceleration and use a browser with WebGL 2.";
  } finally {
    button.disabled = false;
  }
};
$("#story-start").onclick = () => {
  openAudio();
  disconnectOnline();
  arena = null;
  tournament = null;
  $("#lobby").hidden = true;
  $("#match").hidden = true;
  story.start();
  window.scrollTo({ top: 0, behavior: "smooth" });
};
const storyArt = $("#story-hero-art").getContext("2d");
drawFighter(storyArt, "goku", 310, 285, 2.7, { facing: -1 });
drawFighter(storyArt, "naruto", 145, 290, 2.8, { facing: 1 });
function frame(now) {
  const dt = Math.min(0.15, (now - last) / 1000);
  last = now;
  if (story?.active) story.tick(dt);
  if (adventure?.active) adventure.tick(dt);
  if (arena) {
    if (arena.mode !== "online") {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= 1 / 60 && steps++ < 10) {
        arena.update(1 / 60, inputs());
        accumulator -= 1 / 60;
      }
    }
    if (arena.mode === "online")
      for (const f of arena.fighters) {
        if (f.renderTarget) {
          const blend = 1 - Math.exp(-35 * dt);
          f.x += (f.renderTarget.x - f.x) * blend;
          f.y += (f.renderTarget.y - f.y) * blend;
        }
      }
    events();
    drawArena(ctx, arena);
    if (arena.winner !== null && !resultShown) showResult();
  }
  requestAnimationFrame(frame);
}
$("#start").disabled = false;
window.brawlReady = true;
requestAnimationFrame(frame);
