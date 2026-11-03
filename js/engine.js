/* Original fixed-step tile simulation; no proprietary game assets. */
(function (root) {
  "use strict";
  const W = 25,
    H = 18,
    STEP = 1 / 60,
    solid = (t) => t === "#" || t === "=";
  function makeLevel(index) {
    const map = Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) =>
        x === 0 || x === W - 1 || y === H - 1 ? "=" : " ",
      ),
    );
    const floors = [4, 8, 12, 16],
      ladders = [
        [4, 20, 7, 21],
        [20, 5, 19, 4],
        [5, 19, 6, 20],
      ][index];
    for (const y of floors) for (let x = 1; x < W - 1; x++) map[y][x] = "#";
    floors.forEach((f, i) => {
      for (let y = i ? floors[i - 1] - 1 : 1; y <= f; y++)
        map[y][ladders[i]] = "H";
    });
    for (let y = 3; y <= 16; y++) map[y][12] = "H";
    if (index > 0)
      for (const [a, b, y] of [
        [7, 10, 8],
        [15, 18, 12],
      ])
        for (let x = a; x <= b; x++) {
          map[y][x] = " ";
          map[y - 1][x] = "-";
        }
    const gold = [];
    floors.forEach((f, i) => {
      for (const x of [2 + (i % 2) * 3, 10, 22 - (i % 2) * 3])
        if (map[f - 1][x] === " ") {
          map[f - 1][x] = "$";
          gold.push([x, f - 1]);
        }
    });
    map[1][ladders[0]] = "E";
    return {
      name: ["MOSS CAVERNS", "AMETHYST VAULT", "EMBER DEPTHS"][index],
      nameZh: ["苔藓洞窟", "紫晶密室", "余烬深处"][index],
      map,
      start: { x: 2, y: 15 },
      spawns: [
        { x: 22, y: 3 },
        { x: 2, y: 7 },
        { x: 22, y: 11 },
      ].slice(0, index + 1),
      gold,
      exit: { x: ladders[0], y: 1 },
    };
  }
  class Engine {
    constructor() {
      this.state = "menu";
      this.score = 0;
      this.lives = 3;
      this.elapsed = 0;
      this.events = [];
      this.load(0);
    }
    load(index) {
      this.levelIndex = index;
      this.level = makeLevel(index);
      this.map = this.level.map.map((r) => r.slice());
      this.total = this.level.gold.length;
      this.collected = 0;
      this.holes = [];
      this.resetActors();
    }
    actor(p) {
      return {
        x: p.x,
        y: p.y,
        fromX: p.x,
        fromY: p.y,
        toX: p.x,
        toY: p.y,
        progress: 1,
        duration: 0.15,
        face: 1,
        trapped: false,
        immune: 0,
      };
    }
    resetActors() {
      this.player = this.actor(this.level.start);
      this.player.immune = 1.8;
      this.enemies = this.level.spawns.map((p) => this.actor(p));
    }
    start() {
      this.score = 0;
      this.lives = 3;
      this.elapsed = 0;
      this.load(0);
      this.state = "playing";
      this.events = [];
    }
    tile(x, y) {
      return this.map[y]?.[x] ?? "=";
    }
    emit(type) {
      this.events.push(type);
    }
    move(a, dx, dy, duration) {
      const x = a.toX,
        y = a.toY;
      if (solid(this.tile(x + dx, y + dy))) return false;
      a.fromX = x;
      a.fromY = y;
      a.toX = x + dx;
      a.toY = y + dy;
      a.progress = 0;
      a.duration = duration;
      if (dx) a.face = dx;
      return true;
    }
    advance(a, dt) {
      if (a.progress >= 1) return;
      a.progress = Math.min(1, a.progress + dt / a.duration);
      a.x = a.fromX + (a.toX - a.fromX) * a.progress;
      a.y = a.fromY + (a.toY - a.fromY) * a.progress;
    }
    occupiesOrEnters(a, x, y) {
      return (Math.round(a.x) === x && Math.round(a.y) === y) ||
        (a.toX === x && a.toY === y);
    }
    supported(x, y) {
      return (
        solid(this.tile(x, y + 1)) ||
        this.tile(x, y + 1) === "H" ||
        this.enemies.some((e) => e.trapped && e.toX === x && e.toY === y + 1)
      );
    }
    falling(x, y) {
      return !["H", "E", "-"].includes(this.tile(x, y)) && !this.supported(x, y);
    }
    options(x, y) {
      const here = this.tile(x, y),
        below = this.tile(x, y + 1);
      if (this.falling(x, y))
        return [[0, 1]];
      const out = [];
      for (const dx of [-1, 1])
        if (!solid(this.tile(x + dx, y))) out.push([dx, 0]);
      if ((here === "H" || here === "E") && !solid(this.tile(x, y - 1)))
        out.push([0, -1]);
      if (
        (here === "H" || here === "E" || here === "-" || below === "H") &&
        !solid(below)
      )
        out.push([0, 1]);
      return out;
    }
    dig(direction) {
      if (this.state !== "playing" || this.player.progress < 1) return false;
      const { toX: x, toY: y } = this.player;
      if (!this.supported(x, y) && this.tile(x, y) !== "H") return false;
      if (
        this.tile(x + direction, y + 1) !== "#" ||
        ![" ", "$", "-"].includes(this.tile(x + direction, y))
      )
        return false;
      this.map[y + 1][x + direction] = " ";
      this.holes.push({ x: x + direction, y: y + 1, left: 6 });
      this.emit("dig");
      return true;
    }
    enemyDirection(e) {
      const start = [e.toX, e.toY],
        target = [this.player.toX, this.player.toY],
        queue = [[...start, null]],
        seen = new Set([start.join(",")]);
      for (let n = 0; n < queue.length; n++) {
        const [x, y, first] = queue[n];
        if (x === target[0] && y === target[1]) return first;
        for (const d of this.options(x, y)) {
          const nx = x + d[0],
            ny = y + d[1],
            k = `${nx},${ny}`;
          if (nx < 1 || nx >= W - 1 || ny < 1 || ny >= H - 1 || seen.has(k))
            continue;
          seen.add(k);
          queue.push([nx, ny, first || d]);
        }
      }
      return null;
    }
    die() {
      if (this.state !== "playing") return;
      this.lives--;
      this.emit("death");
      if (this.lives <= 0) {
        this.state = "gameover";
        return;
      }
      for (const h of this.holes) this.map[h.y][h.x] = "#";
      this.holes = [];
      this.resetActors();
    }
    next() {
      if (this.state !== "complete") return;
      if (this.levelIndex === 2) {
        this.state = "won";
        return;
      }
      this.load(this.levelIndex + 1);
      this.state = "playing";
    }
    update(dt, keys = {}) {
      if (this.state !== "playing") return;
      this.elapsed += dt;
      const p = this.player;
      p.immune = Math.max(0, p.immune - dt);
      for (const h of [...this.holes]) {
        h.left -= dt;
        if (h.left <= 0) {
          this.map[h.y][h.x] = "#";
          this.holes.splice(this.holes.indexOf(h), 1);
          if (this.occupiesOrEnters(p, h.x, h.y)) {
            this.die();
            return;
          }
          this.enemies.forEach((e, i) => {
            if (this.occupiesOrEnters(e, h.x, h.y)) {
              this.enemies[i] = this.actor(this.level.spawns[i]);
              this.score += 250;
              this.emit("trap");
            }
          });
        }
      }
      const wasMoving = p.progress < 1;
      this.advance(p, dt);
      if (p.progress >= 1) {
        const x = p.toX,
          y = p.toY;
        if (this.tile(x, y) === "$") {
          this.map[y][x] = " ";
          this.collected++;
          this.score += 100;
          this.emit(this.collected === this.total ? "unlock" : "gold");
        }
        if (
          this.collected === this.total &&
          x === this.level.exit.x &&
          y === this.level.exit.y
        ) {
          this.score += 1000;
          this.state = "complete";
          this.emit("complete");
          return;
        }
        const opts = this.options(x, y),
          falling = this.falling(x, y);
        const desired = falling
          ? [0, 1]
          : keys.ArrowUp
            ? [0, -1]
            : keys.ArrowDown
              ? [0, 1]
              : keys.ArrowLeft
                ? [-1, 0]
                : keys.ArrowRight
                  ? [1, 0]
                  : null;
        if (
          !wasMoving &&
          desired &&
          opts.some((d) => d[0] === desired[0] && d[1] === desired[1])
        )
          this.move(p, ...desired, falling ? 0.1 : 0.14);
      }
      for (const e of this.enemies) {
        if (e.trapped) continue;
        this.advance(e, dt);
        if (e.progress >= 1) {
          if (this.holes.some((h) => h.x === e.toX && h.y === e.toY)) {
            e.trapped = true;
            this.emit("trap");
            continue;
          }
          // Gravity must work even when no chase route exists out of a hole.
          const falling = this.falling(e.toX, e.toY);
          const d = falling ? [0, 1] : this.enemyDirection(e);
          if (d) this.move(e, ...d, falling ? 0.1 : 0.26 - this.levelIndex * 0.025);
        }
        if (
          !p.immune &&
          Math.abs(e.x - p.x) < 0.6 &&
          Math.abs(e.y - p.y) < 0.65
        ) {
          this.die();
          return;
        }
      }
    }
  }
  root.Lode = { Engine, makeLevel, W, H, STEP };
  if (typeof module !== "undefined") module.exports = root.Lode;
})(typeof window !== "undefined" ? window : globalThis);
