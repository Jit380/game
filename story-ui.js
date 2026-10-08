import { Campaign, BossArena, BOSSES, REGIONS, SAVE_KEY } from "./story.mjs";
import { drawPortrait } from "./art.js";
import { drawWorld, drawBoss } from "./story-art.js";
export function createStory({ sound, onExit }) {
  const $ = (s) => document.querySelector(s),
    canvas = $("#story-canvas"),
    ctx = canvas.getContext("2d");
  let storage;
  try {
    storage = localStorage;
  } catch {}
  const keys = new Set(),
    touch = new Set();
  let accumulator = 0,
    previousInteract = false,
    pending = {};
  const controller = {
    active: false,
    campaign: null,
    arena: null,
    state: "world",
    scene: "world",
    dialogue: null,
  };
  const held = (...codes) => codes.some((c) => keys.has(c));
  const inputs = () => ({
    left: held("KeyA", "ArrowLeft") || touch.has("left"),
    right: held("KeyD", "ArrowRight") || touch.has("right"),
    up: held("KeyW", "ArrowUp") || touch.has("up"),
    down: held("KeyS", "ArrowDown"),
    jump: held("Space", "KeyW", "ArrowUp") || touch.has("up"),
    attack: held("KeyJ") || touch.has("attack"),
    special: held("KeyK") || touch.has("special"),
    shield: held("KeyL") || touch.has("shield"),
    dodge: held("ShiftLeft", "ShiftRight") || touch.has("dodge"),
    rift: held("KeyR") || touch.has("rift"),
  });
  function overlay(caption, title, detail, actions, portrait = null) {
    keys.clear();
    touch.clear();
    pending = {};
    $("#story-overlay").hidden = false;
    $("#story-caption").textContent = caption;
    $("#story-title").textContent = title;
    $("#story-detail").textContent = detail;
    const art = $("#story-portrait");
    art.hidden = !portrait;
    if (portrait) drawPortrait(art, portrait);
    $("#story-actions").replaceChildren();
    for (const action of actions) {
      const b = document.createElement("button");
      b.textContent = action.label;
      b.disabled = !!action.disabled;
      b.onclick = action.run;
      $("#story-actions").append(b);
    }
  }
  function resume() {
    controller.state = controller.scene;
    $("#story-overlay").hidden = true;
    keys.clear();
    touch.clear();
    pending = {};
    canvas.focus();
  }
  function dialogue(lines, onEnd, caption) {
    controller.state = "dialogue";
    let index = 0;
    controller.dialogue = { lines, index };
    const advance = () => {
      if (index >= lines.length) {
        controller.dialogue = null;
        onEnd();
        return;
      }
      const [speaker, line] = lines[index++];
      controller.dialogue.index = index;
      const known = [
        "naruto",
        "goku",
        "sasuke",
        "pain",
        "frieza",
        "broly",
      ].includes(speaker.toLowerCase());
      overlay(
        caption || "WORLDS COLLIDE",
        speaker.toUpperCase(),
        line,
        [
          {
            label: index === lines.length ? "CONTINUE →" : "NEXT →",
            run: advance,
          },
        ],
        known ? speaker.toLowerCase() : null,
      );
      sound(440, 0.04, "triangle", 0.015, 550);
    };
    advance();
  }
  function goWorld() {
    controller.arena = null;
    controller.scene = "world";
    controller.campaign.persist();
    resume();
  }
  function map() {
    controller.state = "map";
    const c = controller.campaign;
    overlay(
      "WORLD ATLAS",
      "THREE WORLDS. ONE THREAD.",
      "Travel between unlocked homelands. Each gate opens after its chapter is resolved.",
      [
        ...REGIONS.map((r) => ({
          label: r.name + (c.unlock(r.id) ? " →" : " · LOCKED"),
          disabled: !c.unlock(r.id),
          run: () => {
            c.travel(r.id);
            c.camera = c.player.x;
            controller.scene = "world";
            resume();
          },
        })),
        { label: "BACK", run: resume },
      ],
    );
  }
  function camp(
    message = "Fragments turn courage into lasting strength. Upgrades apply to every boss attempt.",
  ) {
    controller.state = "camp";
    const c = controller.campaign,
      u = c.save.upgrades;
    overlay(
      "RIFT CAMP · " + c.save.shards + " FRAGMENTS",
      "MAKE YOUR NEXT FIGHT COUNT.",
      message,
      [
        ...Object.entries({
          power: "POWER · stronger hits",
          focus: "FOCUS · faster special energy",
          vitality: "VITALITY · an extra stock",
        }).map(([key, label]) => ({
          label:
            label +
            "  " +
            u[key] +
            "/3 · " +
            (u[key] === 3 ? "MAX" : 3 + u[key] + " fragments"),
          disabled: u[key] === 3,
          run: () => {
            const okay = c.purchase(key);
            if (okay) sound(650, 0.18, "triangle", 0.03, 1100);
            camp(
              okay
                ? "UPGRADE UNLOCKED. Your next encounter starts stronger."
                : "Find more fragments on the rooftops and islands.",
            );
          },
        })),
        { label: "RETURN TO THE WORLD →", run: resume },
      ],
    );
    c.persist();
  }
  function beginBoss(id) {
    controller.scene = "fight";
    controller.arena = new BossArena(id, controller.campaign.save.upgrades);
    controller.state = "fight";
    $("#story-overlay").hidden = true;
    keys.clear();
    touch.clear();
    pending = {};
    previousInteract = false;
    canvas.focus();
    sound(150, 0.3, "sawtooth", 0.03, 500);
  }
  function encounter(id) {
    const c = controller.campaign;
    if (c.save.defeated.includes(id)) {
      c.message("This fracture is healed. Look for the next violet gate.");
      return;
    }
    if (c.nextBoss !== id) {
      c.message("SEALED · Resolve " + c.nextBoss.toUpperCase() + " first.");
      return;
    }
    const b = BOSSES[id];
    dialogue(b.intro, () => beginBoss(id), b.chapter + " · " + b.title);
  }
  function interact() {
    const c = controller.campaign,
      o = c.interact();
    if (!o) {
      c.message("Find a camp, guide, rival or world gate. M opens the atlas.");
      return;
    }
    if (o.kind === "camp") camp();
    else if (o.kind === "portal") map();
    else if (o.kind === "gate") encounter(o.boss);
    else
      dialogue(
        o.text.map((t) => [o.name, t]),
        resume,
        "A VOICE IN THE WORLD",
      );
  }
  function result() {
    const a = controller.arena,
      c = controller.campaign,
      id = a.bossId,
      b = BOSSES[id];
    controller.state = "result";
    if (a.winner === 0) {
      c.complete(id);
      sound(600, 0.3, "triangle", 0.04, 1000);
      overlay(
        "FRACTURE HEALED · +3 FRAGMENTS",
        id.toUpperCase() + " RESOLVED",
        id === "pain"
          ? "The world gate to Namek is now open."
          : id === "frieza"
            ? "The In-Between is now reachable. One last heartbeat waits."
            : id === "broly"
              ? "The worlds begin to separate safely. Hear the final conversation."
              : "A familiar rival becomes an ally. Pain waits beyond the village.",
        [
          {
            label: "HEAR THE NEXT CHAPTER →",
            run: () =>
              dialogue(
                b.outro,
                () => {
                  if (id === "broly") {
                    controller.scene = "world";
                    controller.arena = null;
                    controller.state = "ending";
                    overlay(
                      "WORLDS COLLIDE · COMPLETE",
                      "COURAGE TRAVELS.",
                      "Four fractures healed. Two homelands protected. One impossible friendship. Explore the worlds at peace, or return to Versus and make your own rivalries.",
                      [
                        { label: "EXPLORE THE HEALED WORLDS →", run: goWorld },
                        {
                          label: "RETURN TO CHARACTER SELECT",
                          run: controller.exit,
                        },
                      ],
                    );
                  } else goWorld();
                },
                "AFTER THE STORM",
              ),
          },
        ],
      );
    } else {
      sound(110, 0.3, "sawtooth", 0.035, 40);
      overlay(
        "A SETBACK. NOT THE END.",
        a.winner === "draw" ? "THE FRACTURE HOLDS" : "GET BACK UP.",
        "Your fragments and upgrades are safe. Watch the red danger zones, use shields, recover with W + K in the air, and press R when Riftbreak is charged.",
        [
          { label: "RETRY ENCOUNTER →", run: () => beginBoss(id) },
          {
            label: "RETURN TO CAMP",
            run: () => {
              c.player.x = c.checkpoint;
              c.player.y = c.region.ground;
              goWorld();
            },
          },
        ],
      );
    }
  }
  controller.start = () => {
    controller.active = true;
    controller.campaign = new Campaign(storage);
    controller.arena = null;
    controller.scene = "world";
    controller.state = "world";
    $("#story").hidden = false;
    $("#story-overlay").hidden = true;
    accumulator = 0;
    keys.clear();
    touch.clear();
    pending = {};
    previousInteract = false;
    const c = controller.campaign;
    if (!c.save.introSeen) {
      dialogue(
        [
          [
            "Naruto",
            "The sky over the village split like glass. On the other side, someone was fighting beneath a green sun.",
          ],
          [
            "Goku",
            "I felt it too. A power made of memories, pulling our worlds together.",
          ],
          [
            "Naruto",
            "Then we stop it. Find the fragments. Find our friends. Bring everyone home.",
          ],
        ],
        () => {
          c.save.introSeen = true;
          c.persist();
          resume();
        },
        "PROLOGUE · THE SKY BETWEEN US",
      );
    } else resume();
  };
  controller.exit = () => {
    controller.campaign?.persist();
    controller.active = false;
    keys.clear();
    touch.clear();
    pending = {};
    $("#story").hidden = true;
    $("#story-overlay").hidden = true;
    onExit();
  };
  controller.tick = (dt) => {
    if (!controller.active) return;
    const c = controller.campaign;
    $("#story-location").textContent =
      controller.scene === "fight"
        ? BOSSES[controller.arena.bossId].chapter +
          " · " +
          controller.arena.bossId.toUpperCase()
        : c.region.name.toUpperCase();
    const status =
      controller.scene === "fight" && controller.arena
        ? `${controller.arena.fighters[0].character.name} ${Math.floor(controller.arena.fighters[0].damage)}% · ${controller.arena.fighters[0].stocks} stocks / ${controller.arena.fighters[1].character.name} ${Math.floor(controller.arena.fighters[1].damage)}% · Riftbreak ${Math.floor(controller.arena.resonance)}%${controller.arena.warning ? " · GET CLEAR!" : ""}`
        : `${c.nextBoss ? "Find " + c.nextBoss.toUpperCase() : "All chapters complete"} · ${c.save.shards} fragments · Vitality ${c.worldHP}%${c.interact() ? " · TALK to interact" : ""}`;
    if ($("#story-status").textContent !== status)
      $("#story-status").textContent = status;
    $("#story-map").disabled =
      controller.scene === "fight" || controller.state !== "world";
    if (controller.state === "world" || controller.state === "fight") {
      accumulator = Math.min(0.15, accumulator + dt);
      while (accumulator >= 1 / 60) {
        accumulator -= 1 / 60;
        const input = { ...inputs(), ...pending };
        pending = {};
        if (controller.state === "world") c.update(1 / 60, input);
        else controller.arena.update(1 / 60, [input, {}]);
      }
      if (controller.state === "world") {
        const press = touch.has("interact");
        if (press && !previousInteract) interact();
        previousInteract = press;
      } else {
        for (const e of controller.arena.events.splice(0)) {
          if (e.type === "hit")
            sound(e.strong ? 130 : 220, 0.1, "sawtooth", 0.025, 50);
          else if (e.type === "warning")
            sound(450, 0.25, "triangle", 0.02, 100);
          else if (e.type === "riftbreak")
            sound(190, 0.5, "sawtooth", 0.04, 1200);
          else if (e.type === "ko") sound(100, 0.3, "sawtooth", 0.025, 30);
          else if (e.type === "jump") sound(400, 0.06, "triangle", 0.012, 650);
        }
        if (controller.arena.winner !== null) result();
      }
    } else accumulator = 0;
    if (controller.scene === "fight" && controller.arena)
      drawBoss(ctx, controller.arena);
    else drawWorld(ctx, c);
  };
  $("#story-exit").onclick = controller.exit;
  $("#story-map").onclick = () => {
    if (controller.scene === "world") map();
  };
  $("#story-pause").onclick = () => {
    if (controller.state === "world" || controller.state === "fight") {
      controller.state = "pause";
      overlay(
        "TIME TO BREATHE",
        "PAUSED",
        "Your adventure is saved when you collect, upgrade, travel, finish a chapter, or exit.",
        [
          { label: "RESUME →", run: resume },
          { label: "RETURN TO CHARACTER SELECT", run: controller.exit },
        ],
      );
    } else if (controller.state === "pause") resume();
  };
  $("#story-new").onclick = () => {
    controller.state = "confirm";
    overlay(
      "START A NEW JOURNEY?",
      "A FRESH FRACTURE.",
      "This clears story progress in this browser. Versus and online modes are unaffected.",
      [
        { label: "KEEP MY SAVE", run: resume },
        {
          label: "RESET STORY PROGRESS",
          run: () => {
            try {
              storage?.removeItem(SAVE_KEY);
            } catch {}
            controller.start();
          },
        },
      ],
    );
  };
  canvas.tabIndex = 0;
  addEventListener("keydown", (e) => {
    if (!controller.active) return;
    if (
      [
        "KeyA",
        "KeyD",
        "KeyW",
        "KeyS",
        "Space",
        "KeyJ",
        "KeyK",
        "KeyL",
        "KeyR",
        "KeyE",
        "KeyM",
        "Escape",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ShiftLeft",
        "ShiftRight",
      ].includes(e.code)
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    const action = {
      KeyW: "jump",
      ArrowUp: "jump",
      Space: "jump",
      KeyJ: "attack",
      KeyK: "special",
      KeyR: "rift",
      ShiftLeft: "dodge",
      ShiftRight: "dodge",
    }[e.code];
    if (action) {
      pending[action] = true;
      if (held("KeyW", "ArrowUp")) pending.up = true;
      if (held("KeyS", "ArrowDown")) pending.down = true;
    }
    if (
      (e.code === "KeyE" || e.code === "Enter") &&
      controller.state === "world"
    )
      interact();
    if (
      e.code === "KeyM" &&
      controller.scene === "world" &&
      controller.state === "world"
    )
      map();
    if (e.code === "Escape") $("#story-pause").click();
    if (e.code === "Enter" && controller.state === "dialogue")
      $("#story-actions button").click();
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", () => {
    keys.clear();
    touch.clear();
    pending = {};
    if (
      controller.active &&
      (controller.state === "world" || controller.state === "fight")
    )
      $("#story-pause").click();
  });
  for (const b of document.querySelectorAll("[data-story-touch]")) {
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      touch.add(b.dataset.storyTouch);
    };
    b.onpointerup = b.onpointercancel = () =>
      touch.delete(b.dataset.storyTouch);
  }
  let musicStep = 0;
  setInterval(() => {
    if (!controller.active) return;
    musicStep++;
    const battle = controller.scene === "fight";
    if (!battle && musicStep % 3) return;
    const notes = battle
      ? [147, 220, 294, 349, 330, 294, 220, 196]
      : [196, 247, 294, 392, 330, 294, 247, 220];
    const n =
      notes[(battle ? musicStep : Math.floor(musicStep / 3)) % notes.length];
    sound(n, battle ? 0.16 : 0.45, "triangle", battle ? 0.009 : 0.012, n);
    if (battle && musicStep % 4 === 0) sound(73, 0.1, "sine", 0.018, 40);
  }, 180);
  return controller;
}
