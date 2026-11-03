const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Engine, STEP } = require("../js/engine.js");
const tick = (g, n = 1, k = {}) => {
  for (let i = 0; i < n; i++) g.update(STEP, k);
};
test("restart restores gold, score, lives and independent map", () => {
  const g = new Engine();
  g.start();
  const [x, y] = g.level.gold[0];
  g.map[y][x] = " ";
  g.score = 500;
  g.lives = 1;
  g.start();
  assert.equal(g.tile(x, y), "$");
  assert.equal(g.score, 0);
  assert.equal(g.lives, 3);
});
test("pause freezes holes and all simulation time; digging disabled", () => {
  const g = new Engine();
  g.start();
  assert.ok(g.dig(1));
  g.state = "paused";
  tick(g, 600);
  assert.equal(g.elapsed, 0);
  assert.equal(g.holes[0].left, 6);
  assert.equal(g.dig(-1), false);
});
test("hole traps guard, refills, respawns guard and awards score", () => {
  const g = new Engine();
  g.start();
  g.dig(1);
  g.enemies = [g.actor({ x: 3, y: 16 })];
  tick(g);
  assert.ok(g.enemies[0].trapped);
  tick(g, 361);
  assert.equal(g.tile(3, 16), "#");
  assert.equal(g.holes.length, 0);
  assert.equal(g.enemies[0].trapped, false);
  assert.equal(g.score, 250);
});
test("guard falls into a newly dug dead-end hole even without a path to player", () => {
  const g = new Engine();
  g.start();
  g.enemies = [g.actor({ x: 3, y: 15 })];
  assert.ok(g.dig(1));
  assert.equal(g.enemyDirection(g.enemies[0]), null);
  tick(g, 2);
  assert.ok(g.enemies[0].y > 15, "gravity starts without a chase route");
  tick(g, 20);
  assert.equal(g.enemies[0].y, 16);
  assert.equal(g.enemies[0].trapped, true);
  tick(g, 340);
  assert.equal(g.holes.length, 0);
  assert.equal(g.score, 250);
  assert.equal(g.enemies[0].trapped, false);
});
test("guard finishing a horizontal step falls into the hole below", () => {
  const g = new Engine();
  g.start();
  const e = g.actor({ x: 4, y: 15 });
  g.enemies = [e];
  g.move(e, -1, 0, 0.26);
  assert.ok(g.dig(1));
  tick(g, 35);
  assert.equal(e.x, 3);
  assert.equal(e.y, 16);
  assert.equal(e.trapped, true);
});
test("gold unlocks exit but does not automatically complete level", () => {
  const g = new Engine();
  g.start();
  g.enemies = [];
  for (const [x, y] of g.level.gold) {
    g.player = g.actor({ x, y });
    tick(g);
  }
  assert.equal(g.collected, g.total);
  assert.equal(g.state, "playing");
  g.player = g.actor(g.level.exit);
  tick(g);
  assert.equal(g.state, "complete");
  g.next();
  assert.equal(g.levelIndex, 1);
  assert.equal(g.state, "playing");
});
test("collision costs exactly one life and respawn grants protection", () => {
  const g = new Engine();
  g.start();
  g.player.immune = 0;
  g.enemies = [g.actor(g.level.start), g.actor(g.level.start)];
  tick(g);
  assert.equal(g.lives, 2);
  assert.ok(g.player.immune > 0);
});
test("three exits lead to victory", () => {
  const g = new Engine();
  g.start();
  for (let n = 0; n < 3; n++) {
    g.collected = g.total;
    g.player = g.actor(g.level.exit);
    tick(g);
    g.next();
  }
  assert.equal(g.state, "won");
});
test("all gold and exits reachable using actual movement rules in all levels", () => {
  const g = new Engine();
  for (let i = 0; i < 3; i++) {
    g.load(i);
    g.enemies = [];
    const queue = [[g.player.x, g.player.y]],
      seen = new Set(queue.map((p) => p.join(",")));
    for (let n = 0; n < queue.length; n++) {
      const [x, y] = queue[n];
      for (const [dx, dy] of g.options(x, y)) {
        const nx = x + dx,
          ny = y + dy,
          k = `${nx},${ny}`;
        if (nx < 1 || nx > 23 || ny < 1 || ny > 16 || seen.has(k)) continue;
        seen.add(k);
        queue.push([nx, ny]);
      }
    }
    for (const p of [...g.level.gold, [g.level.exit.x, g.level.exit.y]])
      assert.ok(seen.has(p.join(",")), `level ${i + 1}: ${p}`);
  }
});
test("walk every gold route and exit with fixed-step keyboard movement", () => {
  const g = new Engine();
  for (let level = 0; level < 3; level++) {
    g.start();
    g.load(level);
    g.enemies = [];
    for (const goal of [...g.level.gold, [g.level.exit.x, g.level.exit.y]]) {
      const queue = [[g.player.toX, g.player.toY, []]],
        seen = new Set();
      let path;
      for (let n = 0; n < queue.length; n++) {
        const [x, y, route] = queue[n],
          key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (x === goal[0] && y === goal[1]) {
          path = route;
          break;
        }
        for (const [dx, dy] of g.options(x, y)) {
          if (x + dx < 1 || x + dx > 23 || y + dy < 1 || y + dy > 16) continue;
          queue.push([x + dx, y + dy, [...route, [dx, dy]]]);
        }
      }
      assert.ok(path);
      for (const [dx, dy] of path) {
        const target = [g.player.toX + dx, g.player.toY + dy];
        const key =
          dx < 0
            ? "ArrowLeft"
            : dx > 0
              ? "ArrowRight"
              : dy < 0
                ? "ArrowUp"
                : "ArrowDown";
        tick(g, 1, { [key]: true });
        let frames = 0;
        while (g.player.progress < 1 && frames++ < 30) tick(g);
        assert.deepEqual(
          [Math.round(g.player.x), Math.round(g.player.y)],
          target,
        );
        assert.ok(frames < 30);
      }
    }
    assert.equal(g.state, "complete", `walkthrough level ${level + 1}`);
  }
});
