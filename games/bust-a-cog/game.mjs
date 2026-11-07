import { GolfGame, position } from './engine.mjs';
import { BoardRenderer } from './renderer.mjs?v=minnie-2';
import boards from './boards.mjs';

const $ = id => document.getElementById(id);
const renderer = new BoardRenderer(), keys = new Set(), sounds = {};
let game, order = [], completed = 0, remaining = 120, state = 'loading', angle = 0;
let last = 0, transition = 0, pendingFailure = false, muted = false, autoPaused = false, pointerId = null;
for (const name of ['fire', 'land', 'pop', 'bomb', 'lose', 'win', 'move', 'done']) {
  sounds[name] = new Audio(`./assets/${name}.ogg`); sounds[name].preload = 'auto'; sounds[name].volume = .4;
}
function sound(name) {
  if (muted || !sounds[name]) return;
  const audio = sounds[name]; audio.currentTime = 0; audio.play().catch(() => {});
}
function announce(message) { $('announcement').textContent = message; }
function startBoard(index, preserveEffects = false) {
  if (!preserveEffects) renderer.clearEffects();
  renderer.displayNotch = 0;
  game = new GolfGame({ boardIndex: index, descending: true }); game.start(); angle = 0;
  state = 'playing'; transition = 0; pendingFailure = false;
}
function begin() {
  order = []; completed = 0; remaining = 120; autoPaused = false;
  const pool = boards.map((_, i) => i);
  while (order.length < 4) order.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  startBoard(order[0]);
  $('game').focus({ preventScroll: true }); announce('Puzzles Left: 4');
}
function togglePause() {
  if (state === 'playing') { game.pause(); state = 'paused'; keys.clear(); }
  else if (state === 'paused') { game.start(); state = 'playing'; }
}
function shoot() { if (state === 'playing') game.shoot(angle); }
$('game').addEventListener('pointerdown', event => {
  if (['success', 'failure'].includes(state) && event.button === 0) { begin(); return; }
  if (state !== 'playing' || (event.pointerType === 'mouse' && event.button !== 0)) return;
  angle = renderer.pointer(event.clientX, event.clientY); $('game').focus({ preventScroll: true });
  if (event.pointerType === 'mouse') shoot();
  else { pointerId = event.pointerId; $('game').setPointerCapture(pointerId); }
  event.preventDefault();
});
$('game').addEventListener('pointermove', event => {
  if (state === 'playing' && (event.pointerType === 'mouse' || event.pointerId === pointerId)) angle = renderer.pointer(event.clientX, event.clientY);
});
$('game').addEventListener('pointerup', event => {
  if (event.pointerId !== pointerId) return;
  angle = renderer.pointer(event.clientX, event.clientY); pointerId = null; shoot();
});
$('game').addEventListener('pointercancel', () => { pointerId = null; });
document.addEventListener('keydown', event => {
  if (state === 'loading' || state === 'error') return;
  if (['p', 'P', 'Escape'].includes(event.key)) { event.preventDefault(); togglePause(); return; }
  if (['m', 'M'].includes(event.key)) { muted = !muted; announce(muted ? 'Sound off' : 'Sound on'); return; }
  if (['r', 'R'].includes(event.key)) { begin(); return; }
  if (['BUTTON', 'A'].includes(event.target.tagName)) return;
  if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key)) {
    event.preventDefault(); keys.add(event.key);
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) shoot();
  }
});
document.addEventListener('keyup', event => keys.delete(event.key));
function suspend() {
  keys.clear(); pointerId = null;
  if (state === 'playing') { togglePause(); autoPaused = true; }
}
function restore() { if (autoPaused && state === 'paused' && !document.hidden) { togglePause(); autoPaused = false; } }
window.addEventListener('blur', suspend); window.addEventListener('focus', restore);
document.addEventListener('visibilitychange', () => document.hidden ? suspend() : restore());
$('game').addEventListener('webglcontextlost', event => {
  event.preventDefault(); state = 'error'; $('loading').hidden = false; $('loading').textContent = 'Graphics interrupted. Reload to play again.';
});
function finish(success) {
  state = success ? 'success' : 'failure'; game.pause();
  sound('done'); announce((success ? 'Success!' : 'Out of Time!') + ' Press R or tap the board to play again.');
}
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  if (state === 'playing') {
    remaining = Math.max(0, remaining - dt);
    if (keys.has('ArrowLeft')) angle += dt * 1.5;
    if (keys.has('ArrowRight')) angle -= dt * 1.5;
    angle = Math.max(-Math.PI / 2 + .2, Math.min(Math.PI / 2 - .2, angle));
    if (remaining <= 0) finish(false);
    else if (transition > 0) {
      transition -= dt;
      if (transition <= 0) {
        if (pendingFailure) {
          renderer.burst([...game.cells.values()].map(c => ({ ...c, ...position(c.col, c.row, game.notch) })), { black: true });
          game.cells.clear(); sound('lose');
        }
        startBoard(order[completed], true);
      }
    } else {
      game.tick(dt);
      if (game.status === 'won') {
        renderer.burst([...game.cells.values()].map(c => ({ ...c, ...position(c.col, c.row, game.notch) })));
        game.cells.clear();
        completed++; announce('Puzzles Left: ' + (4 - completed));
        if (completed === 4) finish(true); else transition = .25;
      } else if (game.status === 'lost') {
        // Anesidora doFail: blacken the balls, wait one second, then
        // clearGrid triggers GameSprite3D.deathEffect before reassignment.
        pendingFailure = true; transition = 1;
      }
    }
  }
  for (const event of game.drainEvents()) {
    if (event.kind === 'clear') { renderer.burst(event.balls); sound('pop'); }
    else if (event.kind !== 'lose') sound(event.kind);
  }
  renderer.setHud(4 - completed, remaining, state);
  renderer.draw(game, angle, dt); requestAnimationFrame(frame);
}
try {
  await renderer.init($('game')); $('loading').hidden = true; begin(); requestAnimationFrame(frame);
} catch (error) {
  state = 'error'; console.error(error); $('loading').textContent = 'Unable to load the game. Please reload with WebGL enabled.';
}
