"use strict";
const game = (window.game = new Lode.Engine()),
  canvas = document.querySelector("#game"),
  ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const $ = (id) => document.getElementById(id),
  keys = {},
  palettes = [
    ["#1b2815", "#35452a", "#60743b", "#9bab58"],
    ["#201c2c", "#41344e", "#735875", "#b09cbb"],
    ["#2b2119", "#51402c", "#886339", "#ce9b54"],
  ];
let sound = false,
  audio,
  last = 0,
  accumulator = 0,
  visualTime = 0;
function beep(kind) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "square";
    const freq =
      {
        gold: 880,
        dig: 100,
        trap: 220,
        death: 110,
        unlock: 1320,
        complete: 1760,
      }[kind] || 440;
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      freq * 0.6,
      audio.currentTime + 0.15,
    );
    g.gain.setValueAtTime(0.025, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.2);
  } catch {
    sound = false;
    $("sound").textContent = "声音不可用";
  }
}
function action() {
  if (game.state === "paused") game.state = "playing";
  else if (game.state === "complete") game.next();
  else if (game.state !== "playing") game.start();
  canvas.focus();
  sync();
}
function pause() {
  if (game.state === "playing") game.state = "paused";
  else if (game.state === "paused") game.state = "playing";
  clearKeys();
  sync();
}
function clearKeys() {
  for (const k of Object.keys(keys)) delete keys[k];
}
function input(key, repeat = false) {
  if (key === "Enter" && !repeat) action();
  if (key === "p" && !repeat) pause();
  if (key === "r" && !repeat) {
    game.start();
    sync();
  }
  if (key === "z" && !repeat) game.dig(-1);
  if (key === "x" && !repeat) game.dig(1);
}
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " ",
      "z",
      "x",
      "p",
      "r",
    ].includes(k)
  )
    e.preventDefault();
  if (k === "Enter" && e.target.tagName === "BUTTON") return;
  keys[k] = true;
  input(k, e.repeat);
});
window.addEventListener("keyup", (e) => {
  delete keys[e.key.length === 1 ? e.key.toLowerCase() : e.key];
});
window.addEventListener("blur", () => {
  clearKeys();
  if (game.state === "playing") {
    game.state = "paused";
    sync();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearKeys();
    if (game.state === "playing") {
      game.state = "paused";
      sync();
    }
  }
});
$("primary").onclick = action;
$("pause").onclick = pause;
$("restart").onclick = () => {
  game.start();
  canvas.focus();
  sync();
};
$("sound").onclick = () => {
  sound = !sound;
  $("sound").textContent = `声音 ${sound ? "开" : "关"}`;
  $("sound").setAttribute("aria-pressed", sound);
  beep("gold");
};
$("crt").onclick = () => {
  const off = $("screen").classList.toggle("no-crt");
  $("crt").textContent = `CRT ${off ? "关" : "开"}`;
  $("crt").setAttribute("aria-pressed", !off);
};
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector(".machine").requestFullscreen();
  } catch {
    $("status").textContent = "此浏览器不支持全屏，请使用浏览器缩放。";
  }
};
for (const b of document.querySelectorAll("[data-key]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys[b.dataset.key] = true;
    input(b.dataset.key);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(type, () => delete keys[b.dataset.key]);
}
function rect(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function hash(x, y, n = 0) {
  return (
    ((((x * 73856093) ^ (y * 19349663) ^ (n * 83492791)) >>> 0) % 997) / 997
  );
}
function background(p) {
  rect(0, 0, 800, 576, "#10180e");
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 11; col++) {
      const x = col * 82 - (row % 2) * 36,
        y = row * 66,
        seed = hash(col, row),
        points = [
          [x + 8, y + 5],
          [x + 55 + seed * 20, y],
          [x + 85, y + 23],
          [x + 74, y + 59],
          [x + 22, y + 70],
          [x - 5, y + 38],
        ];
      ctx.beginPath();
      points.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
      ctx.closePath();
      ctx.fillStyle = seed > 0.4 ? p[0] : "#192311";
      ctx.fill();
      ctx.strokeStyle = "#0b120b";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 7);
      ctx.lineTo(x + 30, y + 19);
      ctx.lineTo(x + 22, y + 32);
      ctx.stroke();
      if (seed > 0.6) {
        for (let n = 0; n < 9; n++)
          rect(x + 15 + n * 2 + Math.sin(n) * 4, y + n * 5, 2, 6, p[1]);
      }
    }
}
function tile(t, x, y, p) {
  const a = x * 32,
    b = y * 32;
  if (t === "#" || t === "=") {
    rect(a, b, 32, 32, t === "=" ? "#34392c" : p[1]);
    rect(a + 1, b + 2, 30, 3, t === "=" ? "#73745b" : p[3]);
    rect(a, b + 28, 32, 4, "#121b0f");
    for (let n = 0; n < 14; n++) {
      const xx = Math.floor(hash(x, y, n) * 28),
        yy = Math.floor(hash(y, x, n + 5) * 26);
      rect(
        a + xx,
        b + yy + 5,
        2 + Math.floor(hash(x, n) * 4),
        2,
        n % 3 ? p[0] : p[2],
      );
    }
    if (t === "#") {
      rect(a, b, 32, 5, p[2]);
      for (let n = 0; n < 6; n++)
        rect(a + n * 6, b + 3, 3, 3 + Math.floor(hash(x, y, n) * 7), p[2]);
    } else {
      rect(a, b, 2, 32, "#151c13");
      rect(a + 28, b + 25, 2, 2, "#a1a383");
    }
  }
  if (t === "H" || t === "E") {
    rect(a + 9, b, 3, 32, "#333a2b");
    rect(a + 20, b, 3, 32, "#333a2b");
    rect(a + 10, b, 1, 32, "#a6ab83");
    rect(a + 21, b, 1, 32, "#a6ab83");
    for (let k = 4; k < 32; k += 7) {
      rect(a + 11, b + k, 10, 2, "#929777");
      rect(a + 11, b + k + 2, 10, 1, "#313a25");
    }
  }
  if (t === "-") {
    rect(a, b + 8, 32, 2, "#8f9870");
    rect(a, b + 10, 32, 1, "#343f2c");
  }
  if (t === "$") {
    const bob = Math.floor(Math.sin(visualTime * 4 + x) * 1.5);
    rect(a + 7, b + 25 + bob, 19, 3, "#12150b");
    rect(a + 10, b + 17 + bob, 12, 8, "#ad7626");
    rect(a + 12, b + 12 + bob, 8, 12, "#e1b950");
    rect(a + 13, b + 12 + bob, 3, 7, "#fff0a1");
    rect(a + 9, b + 22 + bob, 16, 3, "#dca840");
    if (Math.sin(visualTime * 5 + x) > 0.8) {
      rect(a + 23, b + 9, 1, 5, "#ffffc0");
      rect(a + 21, b + 11, 5, 1, "#ffffc0");
    }
  }
  if (t === "E") {
    const open = game.collected === game.total;
    rect(a + 2, b, 28, 32, open ? "#688242" : "#414634");
    rect(a + 6, b + 3, 20, 29, "#081009");
    rect(a + 8, b + 6, 16, 24, open ? "#c0d88a" : "#202c1a");
    if (open) {
      rect(a + 12, b + 9, 8, 20, "#eff4b7");
    } else {
      rect(a + 14, b + 14, 5, 7, "#9a8750");
    }
  }
}
function actor(a, enemy = false) {
  if (
    !enemy &&
    a.immune > 0 &&
    Math.floor(visualTime * 12) % 2 === 0 &&
    game.state === "playing"
  )
    return;
  const x = Math.round(a.x * 32 + 7),
    y = Math.round(a.y * 32 + 4) + (a.trapped ? 12 : 0),
    walking = a.progress < 1,
    phase = walking ? Math.floor(visualTime * 10) % 2 : 0,
    climb = a.fromY !== a.toY && walking;
  const skin = enemy ? "#c1a17b" : "#d2b493",
    cloth = enemy ? "#9d342d" : "#b9c0ad",
    shade = enemy ? "#541e20" : "#667968";
  rect(x + 5, y + 1, 10, 8, enemy ? "#7d2725" : "#534b36");
  rect(x + 7, y + 4, 7, 6, skin);
  rect(x + (a.face > 0 ? 12 : 7), y + 5, 2, 2, "#171c14");
  rect(x + 4, y + 10, 12, 10, shade);
  rect(x + 5, y + 10, 8, 8, cloth);
  rect(x + 2, y + (climb ? 4 : 11), 3, 10, cloth);
  rect(x + 16, y + (climb ? 8 : 12), 3, 8, cloth);
  rect(x + 4, y + 19, 5, 6 + (phase ? 2 : 0), shade);
  rect(x + 11, y + 19, 5, 8 - (phase ? 2 : 0), shade);
  rect(x + 2, y + 25 + (phase ? 2 : 0), 7, 3, "#272c20");
  rect(x + 11, y + 27 - (phase ? 2 : 0), 8, 3, "#272c20");
  if (enemy) rect(x + 3, y + 17, 14, 5, "#8c2b28");
}
function render() {
  const p = palettes[game.levelIndex];
  background(p);
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 25; x++) tile(game.map[y][x], x, y, p);
  for (const h of game.holes) {
    rect(h.x * 32, h.y * 32 + 28, 32, 4, p[0]);
    if (h.left < 2) {
      rect(h.x * 32, h.y * 32, Math.floor((2 - h.left) * 8), 32, p[1]);
      rect(
        h.x * 32 + 32 - Math.floor((2 - h.left) * 8),
        h.y * 32,
        Math.floor((2 - h.left) * 8),
        32,
        p[1],
      );
    }
  }
  for (const e of game.enemies) actor(e, true);
  actor(game.player);
}
let previousState;
function sync() {
  const pad = (n, s = 2) => String(n).padStart(s, "0");
  $("score").textContent = pad(game.score, 6);
  $("gold").textContent = `${pad(game.collected)} / ${pad(game.total)}`;
  $("lives").textContent = "♥ ".repeat(game.lives) || "—";
  $("time").textContent =
    `${pad(Math.floor(game.elapsed / 60))}:${pad(Math.floor(game.elapsed) % 60)}`;
  $("world").textContent = `0${game.levelIndex + 1} / ${game.level.name}`;
  $("pause").textContent = game.state === "paused" ? "继续 P" : "暂停 P";
  $("status").textContent =
    game.collected === game.total
      ? "出口已开启！沿顶部梯子离开洞窟。"
      : `${game.level.nameZh} · 还需收集 ${game.total - game.collected} 堆黄金`;
  if (previousState === game.state) return;
  previousState = game.state;
  $("overlay").hidden = game.state === "playing";
  const states = {
    menu: [
      "洞窟归来",
      "黄金散落在古老洞窟中。收齐它们，出口才会开启。",
      "开始探险",
    ],
    paused: ["暂歇片刻", "洞窟时间已冻结，准备好后继续。", "继续探险"],
    complete: [
      "出口已抵达",
      `已完成${game.level.nameZh}，获得 1,000 分通关奖励。`,
      game.levelIndex === 2 ? "查看战绩" : "下一座洞窟",
    ],
    gameover: [
      "探险结束",
      `最终得分 ${game.score}。再试一次，挖洞能为你争取时间。`,
      "重新探险",
    ],
    won: ["重见天日", `三座洞窟全部完成！最终得分 ${game.score}。`, "再次探险"],
  };
  if (states[game.state]) {
    const [title, copy, button] = states[game.state];
    $("overlay-kicker").textContent =
      `EXPEDITION 0${game.levelIndex + 1} / ${game.level.name}`;
    $("overlay-title").textContent = title;
    $("overlay-copy").textContent = copy;
    $("primary").textContent = button + "  ↵";
  }
}
function frame(now) {
  const delta = Math.min((now - last) / 1000 || 0, 0.1);
  last = now;
  visualTime += delta;
  accumulator += delta;
  while (accumulator >= Lode.STEP) {
    game.update(Lode.STEP, keys);
    accumulator -= Lode.STEP;
  }
  for (const event of game.events.splice(0)) beep(event);
  render();
  sync();
  requestAnimationFrame(frame);
}
sync();
requestAnimationFrame(frame);
