import boards from './boards.mjs';

// Board geometry, attack patterns and matching rules ported from
// Anesidora's DistributedGolfGreenGame and GolfGreenGameGlobals.
export const COLS = 9, ROWS = 15, DX = 1.4, DY = 1.12;
export const MIN_X = -(9 + .3751) * .7, MAX_X = MIN_X + 13.3;
export const MIN_Y = -1.68, MAX_Y = 15.12, LAUNCH_Y = MIN_Y + .14;
export const RADIUS = .7, SPEED = 14;
export const TYPES = { r: 0, b: 1, g: 2, w: 3, k: 4, l: 5, y: 6, o: 7, a: 8, s: 9, R: 10, B: 11 };
export const COLORS = ['#f34f50', '#4c9bff', '#7ccf64', '#e8e8d9', '#42424d', '#bd7bde', '#ffe46b', '#ff9a44', '#f7d4ff', '#9da8b2', '#f34f50', '#4c9bff'];
export const NAMES = ['Red', 'Blue', 'Green', 'Cog', 'Black', 'Purple', 'Yellow', 'Bomb', 'Wild', 'Steel', 'Red gift', 'Blue gift'];
export const color = type => type === 10 ? 0 : type === 11 ? 1 : type;
export const key = (col, row) => row * COLS + col;
export function position(col, row, notch = 0) {
  return { x: col * DX + MIN_X + DX * .4375 + (row % 2 === 0 ? DX / 2 : 0), y: (row - notch) * DY + MIN_Y };
}
export function neighbors(col, row) {
  const side = row % 2 === 0 ? 1 : -1;
  return [[col - 1, row], [col + 1, row], [col, row - 1], [col + side, row - 1], [col, row + 1], [col + side, row + 1]]
    .filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
}
export class GolfGame {
  constructor({ boardIndex = 3, rng = Math.random, descending = true, timeLimit = 0 } = {}) {
    this.rng = rng;
    this.descending = descending;
    this.timeLimit = timeLimit;
    this.load(boardIndex);
  }
  load(index) {
    if (!boards[index]) throw new RangeError('Unknown board');
    this.boardIndex = index;
    this.cells = new Map();
    const [pattern, ...rows] = boards[index];
    rows.forEach((row, i) => [...row].forEach((char, j) => {
      if (char in TYPES) {
        const col = row.length - j - 1, r = ROWS - 1 - i;
        this.cells.set(key(col, r), { col, row: r, type: TYPES[char] });
      }
    }));
    this.pattern = [...pattern, ...pattern].map(c => TYPES[c]);
    for (let i = this.pattern.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.pattern[i], this.pattern[j]] = [this.pattern[j], this.pattern[i]];
    }
    this.patternIndex = 0;
    this.current = this.takeBall(); this.next = this.takeBall();
    this.events = []; this.notch = 0; this.elapsed = 0; this.descentClock = 0;
    this.score = 0; this.shots = 0; this.projectile = null; this.gift = null;
    this.status = 'ready'; this.reason = '';
    this.dropDetached(false);
    this.initialCogs = this.cogs;
  }
  takeBall() { return this.pattern[this.patternIndex++ % this.pattern.length]; }
  get cogs() { return [...this.cells.values()].filter(c => c.type === 3).length; }
  start() { if (this.status === 'ready' || this.status === 'paused') this.status = 'playing'; }
  pause() { if (this.status === 'playing') this.status = 'paused'; }
  shoot(angle) {
    if (this.status !== 'playing' || this.projectile || !Number.isFinite(angle)) return false;
    angle = Math.max(-Math.PI / 2 + .2, Math.min(Math.PI / 2 - .2, angle));
    this.projectile = { x: 0, y: LAUNCH_Y, vx: Math.sin(angle) * SPEED, vy: Math.cos(angle) * SPEED, type: this.current };
    this.shots++;
    this.events.push({ kind: 'fire' });
    return true;
  }
  tick(dt) {
    if (this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    // Fixed substeps also handle slow frames without tunnelling through a ball.
    for (let remaining = dt; remaining > 1e-8 && this.status === 'playing';) {
      const step = Math.min(remaining, 1 / 120); remaining -= step;
      this.elapsed += step;
      if (this.timeLimit && this.elapsed >= this.timeLimit) { this.lose('Time is up!'); break; }
      if (this.descending) {
        this.descentClock += step;
        if (this.descentClock >= 10) {
          this.descentClock -= 10; this.notch++;
          this.events.push({ kind: 'move' });
          if ([...this.cells.values()].some(c => c.row <= this.notch)) { this.lose('The balls reached the tee!'); break; }
        }
      }
      const p = this.projectile;
      if (!p) continue;
      p.x += p.vx * step; p.y += p.vy * step;
      if (p.x < MIN_X + RADIUS) { p.x = 2 * (MIN_X + RADIUS) - p.x; p.vx = Math.abs(p.vx); }
      if (p.x > MAX_X - RADIUS) { p.x = 2 * (MAX_X - RADIUS) - p.x; p.vx = -Math.abs(p.vx); }
      const ceiling = p.y >= MAX_Y - RADIUS - this.notch * DY;
      const hit = [...this.cells.values()].some(c => {
        const pos = position(c.col, c.row, this.notch);
        return (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2 < (RADIUS * 1.65) ** 2;
      });
      if (ceiling || hit) this.settle(p.x, p.y, p.type, ceiling);
    }
  }
  settle(x, y, type, ceiling = false) {
    let closest = null, distance = Infinity;
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (this.cells.has(key(col, row))) continue;
      if (!ceiling && !neighbors(col, row).some(([c, r]) => this.cells.has(key(c, r)))) continue;
      const p = position(col, row, this.notch), d = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (d < distance) { distance = d; closest = { col, row, type }; }
    }
    this.projectile = null;
    if (!closest) { this.lose('The green is full!'); return; }
    this.cells.set(key(closest.col, closest.row), closest);
    this.events.push({ kind: 'land' });
    this.resolve(closest);
    if (this.cogs === 0) { this.status = 'won'; this.events.push({ kind: 'win' }); }
    else if ([...this.cells.values()].some(c => c.row <= this.notch)) this.lose('The balls reached the tee!');
    this.current = this.gift ?? this.next;
    this.next = this.takeBall(); this.gift = null;
  }
  resolve(cell) {
    const removed = [];
    if (cell.type === 7) {
      for (const [col, row] of neighbors(cell.col, cell.row)) {
        const neighbor = this.cells.get(key(col, row));
        if (neighbor && neighbor.type !== 9) this.remove(neighbor, removed, false);
      }
      this.remove(cell, removed, false);
      this.events.push({ kind: 'bomb' });
    } else {
      const group = [], visited = new Set(), stack = [cell];
      while (stack.length) {
        const current = stack.pop(), id = key(current.col, current.row);
        if (visited.has(id) || current.type === 9) continue;
        visited.add(id); group.push(current);
        if (current.type === 4) continue;
        for (const [col, row] of neighbors(current.col, current.row)) {
          const other = this.cells.get(key(col, row));
          if (other && other.type !== 9 && (color(current.type) === color(other.type) || current.type === 8 || other.type === 8)) stack.push(other);
        }
      }
      if (group.length >= 3) group.forEach(c => this.remove(c, removed, false));
    }
    this.dropDetached(true, removed);
    if (removed.length) {
      this.score += Math.max(0, removed.length - 3) * 25;
      this.events.push({ kind: 'clear', balls: removed });
    }
  }
  remove(cell, removed, falling) {
    if (!this.cells.delete(key(cell.col, cell.row))) return;
    if (cell.type === 10) this.gift = 7;
    if (cell.type === 11) this.gift = 8;
    this.score += cell.type === 3 ? 250 : 10;
    removed.push({ ...cell, ...position(cell.col, cell.row, this.notch), falling });
  }
  dropDetached(reward = true, removed = []) {
    const connected = new Set(), stack = [...this.cells.values()].filter(c => c.row === ROWS - 1);
    while (stack.length) {
      const cell = stack.pop(), id = key(cell.col, cell.row);
      if (connected.has(id)) continue;
      connected.add(id);
      for (const [col, row] of neighbors(cell.col, cell.row)) {
        const neighbor = this.cells.get(key(col, row));
        if (neighbor) stack.push(neighbor);
      }
    }
    for (const [id, cell] of this.cells) if (!connected.has(id)) {
      if (reward) this.remove(cell, removed, true); else this.cells.delete(id);
    }
    return removed;
  }
  lose(reason) { this.status = 'lost'; this.reason = reason; this.projectile = null; this.events.push({ kind: 'lose' }); }
  drainEvents() { return this.events.splice(0); }
}
