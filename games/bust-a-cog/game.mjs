import { GolfGame, NAMES } from './engine.mjs';
import { BoardRenderer } from './renderer.mjs';
import boards from './boards.mjs';

const $ = id => document.getElementById(id);
const titles = ['Color corridors', 'Triple stacks', 'Zigzag', 'First tee', 'Diamond', 'Tall order', 'Gift exchange', 'Long putt', 'Patchwork', 'Purple pin', 'Switchback', 'Double trouble', 'Butterfly', 'Fire escape', 'Yellow jacket', 'Bomb squad', 'Steel trap'];
const boardSelect = $('board-select');
titles.forEach((title, i) => {
  const option = document.createElement('option'); option.value = i; option.textContent = `${String(i + 1).padStart(2, '0')} · ${title}`; boardSelect.append(option);
});
boardSelect.value = '3';
let mode = 'practice', game = new GolfGame({ descending: false }), renderer;
let angle = 0, last = 0, ready = false, resultShown = false, menuState = 'setup';
let run = { order: [], stage: 0, score: 0, remaining: 120 };
let best = 0, muted = false, toastTime = 0, helpResume = false;
const keys = new Set(), sounds = {};
try { best = Number(localStorage.getItem('bust-a-cog-best')) || 0; muted = localStorage.getItem('bust-a-cog-muted') === 'true'; } catch { /* Storage is optional. */ }
$('best').textContent = best ? best.toLocaleString() : '—';
for (const name of ['fire', 'land', 'pop', 'bomb', 'lose', 'win', 'move']) {
  const audio = new Audio(`./assets/${name}.ogg`); audio.preload = 'auto'; audio.volume = name === 'fire' ? .35 : .25; sounds[name] = audio;
}
function sound(name) {
  if (muted || !sounds[name]) return;
  const audio = sounds[name]; audio.currentTime = 0; audio.play().catch(() => {});
}
function updateSound() { $('sound').textContent = muted ? 'Sound off' : 'Sound on'; $('sound').setAttribute('aria-pressed', String(!muted)); }
updateSound();
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); toastTime = 2.2; }
function overlay(state, title, copy, button, secondary = '') {
  menuState = state; $('overlay').hidden = false;
  $('setup').hidden = state !== 'setup'; $('load-status').hidden = ready;
  $('menu-kicker').textContent = state === 'setup' ? 'WELCOME TO THE GREEN' : state === 'pause' ? 'TAKE A BREATHER' : 'COUNTRY CLUB SCORECARD';
  $('menu-title').textContent = title; $('menu-copy').textContent = copy;
  $('start').textContent = button; $('start').disabled = !ready;
  $('menu-secondary').hidden = !secondary; $('menu-secondary').textContent = secondary;
  $('pause').disabled = true; $('fire').disabled = true; keys.clear();
  if (ready) $('start').focus({ preventScroll: true });
}
function preview() {
  game = new GolfGame({ boardIndex: Number(boardSelect.value), descending: $('moving').checked });
  angle = 0; resultShown = false; renderer?.clearEffects(); updateHud();
}
function setup() {
  run = { order: [], stage: 0, score: 0, remaining: 120 }; preview();
  overlay('setup', 'Ready to tee off?', 'Match three golf balls of the same color. Knock every Cog off the board to win.', 'Play Now');
}
function startBoard(index) {
  renderer.clearEffects(); angle = 0; resultShown = false;
  game = new GolfGame({ boardIndex: index, descending: mode === 'challenge' || $('moving').checked, timeLimit: mode === 'challenge' ? run.remaining : 0 });
  resume();
}
function resume() {
  game.start(); $('overlay').hidden = true; menuState = null;
  $('pause').disabled = false; $('fire').disabled = false; $('game').focus({ preventScroll: true });
}
function begin() {
  if (!ready) return;
  if (menuState === 'pause') { resume(); return; }
  if (menuState === 'next') {
    run.stage++;
    if (mode === 'practice') { boardSelect.value = (game.boardIndex + 1) % boards.length; run.score = 0; }
    startBoard(mode === 'challenge' ? run.order[run.stage] : Number(boardSelect.value)); return;
  }
  if (menuState === 'retry') {
    if (mode === 'practice') { startBoard(game.boardIndex); return; }
  }
  run = { order: [3], stage: 0, score: 0, remaining: 120 };
  const pool = boards.map((_, i) => i).filter(i => i !== 3);
  while (run.order.length < 4) run.order.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  startBoard(mode === 'challenge' ? run.order[0] : Number(boardSelect.value));
}
function pause() {
  if (game.status !== 'playing') return;
  game.pause(); overlay('pause', 'Taking a breather?', 'Your ball and the clock will be right here when you return.', 'Resume game', 'Start a new game');
}
function shoot() { if (game.shoot(angle)) $('game').focus({ preventScroll: true }); }
function finish() {
  resultShown = true;
  if (game.status === 'lost') {
    overlay('retry', 'The Cogs got this one.', `${game.reason} Try a bank shot or use a gift ball to open a path.`, mode === 'challenge' ? 'Try the challenge again' : 'Try this board again', 'Choose another game');
    return;
  }
  if (mode === 'challenge') {
    run.score += game.score + 250; game.score = 0;
    run.remaining = Math.max(0, run.remaining - game.elapsed);
    if (run.stage === 3) {
      run.score += Math.floor(run.remaining) * 5;
      if (run.score > best) { best = run.score; try { localStorage.setItem('bust-a-cog-best', String(best)); } catch {} }
      $('best').textContent = best.toLocaleString();
      overlay('complete', 'Country Club champion!', `Four greens cleared. ${run.score.toLocaleString()} points, with ${Math.ceil(run.remaining)} seconds to spare.`, 'Play again', 'Choose another game');
    } else overlay('next', 'That green is clean!', `${run.stage + 1} of 4 boards cleared. ${Math.ceil(run.remaining)} seconds left on the clock.`, 'Next green', 'Choose another game');
  } else overlay('next', 'You busted the Cogs!', `Board ${game.boardIndex + 1} cleared in ${game.shots} ${game.shots === 1 ? 'shot' : 'shots'}. ${game.score.toLocaleString()} points.`, 'Next board', 'Choose another board');
  updateHud();
}
function updateHud() {
  $('mode-label').textContent = mode === 'challenge' ? 'CHALLENGE' : 'PRACTICE';
  $('board-label').textContent = mode === 'challenge' ? `Green ${run.stage + 1} / 4` : `Board ${String(game.boardIndex + 1).padStart(2, '0')}`;
  $('cogs').textContent = game.cogs;
  $('time-label').textContent = mode === 'challenge' ? 'TIME LEFT' : 'SHOTS';
  const remaining = Math.max(0, Math.ceil(game.status === 'won' ? run.remaining : run.remaining - game.elapsed));
  $('time').textContent = mode === 'challenge' ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : game.shots;
  $('score').textContent = (run.score + game.score).toLocaleString();
  $('ball-name').textContent = `${NAMES[game.current]}${[7, 8].includes(game.current) ? '' : ' ball'}`;
  const seconds = Math.ceil(10 - game.descentClock);
  $('descent-label').textContent = game.descending ? `Board moves in ${seconds}s` : 'A little room to practice';
  $('descent-meter').style.width = game.descending ? `${game.descentClock * 10}%` : '0%';
  $('descent').classList.toggle('warning', game.descending && seconds <= 3);
  $('fire').disabled = game.status !== 'playing' || !!game.projectile;
}
$('start').addEventListener('click', begin);
$('menu-secondary').addEventListener('click', setup);
$('new-game').addEventListener('click', setup);
$('pause').addEventListener('click', pause);
$('fire').addEventListener('click', shoot);
$('sound').addEventListener('click', () => {
  muted = !muted; updateSound(); try { localStorage.setItem('bust-a-cog-muted', String(muted)); } catch {}
});
boardSelect.addEventListener('change', preview);
$('moving').addEventListener('change', preview);
document.querySelectorAll('input[name="mode"]').forEach(radio => radio.addEventListener('change', () => {
  mode = radio.value; $('practice-settings').hidden = mode === 'challenge';
  $('mode-hint').textContent = mode === 'challenge' ? 'Four greens. Two minutes. A board that keeps moving.' : 'Pick any of the 17 original boards. Take your time.';
  preview();
}));
let pointerId = null;
$('game').addEventListener('pointerdown', event => {
  if (game.status !== 'playing' || (event.button !== 0 && event.pointerType === 'mouse')) return;
  pointerId = event.pointerId; $('game').setPointerCapture(pointerId);
  angle = renderer.pointer(event.clientX, event.clientY); $('game').focus({ preventScroll: true }); event.preventDefault();
});
$('game').addEventListener('pointermove', event => {
  if (game.status === 'playing' && (event.pointerType === 'mouse' || pointerId === event.pointerId)) angle = renderer.pointer(event.clientX, event.clientY);
});
$('game').addEventListener('pointerup', event => {
  if (pointerId !== event.pointerId) return;
  angle = renderer.pointer(event.clientX, event.clientY); pointerId = null; shoot();
});
$('game').addEventListener('pointercancel', () => { pointerId = null; });
document.addEventListener('keydown', event => {
  if ($('instructions').open || ['INPUT', 'SELECT'].includes(event.target.tagName)) return;
  if (['p', 'P', 'Escape'].includes(event.key)) { event.preventDefault(); if (menuState === 'pause') resume(); else pause(); return; }
  if (['BUTTON', 'A'].includes(event.target.tagName)) return;
  if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key) && game.status === 'playing') {
    event.preventDefault(); keys.add(event.key);
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) shoot();
  }
});
document.addEventListener('keyup', event => keys.delete(event.key));
window.addEventListener('blur', () => { keys.clear(); pointerId = null; pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { helpResume = false; pause(); } });
$('help').addEventListener('click', () => {
  helpResume = game.status === 'playing'; pause(); $('instructions').showModal();
});
function closeHelp() { $('instructions').close(); }
$('close-help').addEventListener('click', closeHelp); $('got-it').addEventListener('click', closeHelp);
$('instructions').addEventListener('close', () => { if (helpResume) resume(); helpResume = false; });
$('game').addEventListener('webglcontextlost', event => {
  event.preventDefault(); game.pause(); ready = false;
  overlay('error', 'The green needs a refresh.', 'Your graphics connection was interrupted. Reload the game to play again.', 'Reload game');
  $('start').disabled = false; $('start').onclick = () => location.reload();
});
let hudElapsed = 0;
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  if (game.status === 'playing') {
    if (keys.has('ArrowLeft')) angle -= dt * 1.5;
    if (keys.has('ArrowRight')) angle += dt * 1.5;
    angle = Math.max(-Math.PI / 2 + .2, Math.min(Math.PI / 2 - .2, angle));
    game.tick(dt);
  }
  for (const event of game.drainEvents()) {
    if (event.kind === 'clear') { renderer.burst(event.balls); sound('pop'); toast(`${event.balls.length} balls cleared!`); }
    else { sound(event.kind); if (event.kind === 'move') toast('The green is moving!'); }
  }
  if (['won', 'lost'].includes(game.status) && !resultShown) finish();
  if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $('toast').classList.remove('show'); }
  renderer.draw(game, angle, dt);
  hudElapsed += dt; if (hudElapsed > .1) { updateHud(); hudElapsed = 0; }
  requestAnimationFrame(frame);
}
try {
  renderer = new BoardRenderer(); await renderer.init($('game')); ready = true;
  setup(); requestAnimationFrame(frame);
} catch (error) {
  console.error('Bust-a-Cog could not start:', error);
  $('menu-title').textContent = 'The green could not load.';
  $('menu-copy').textContent = 'Please reload to try again. This game needs a browser with WebGL enabled.';
  $('setup').hidden = true; $('load-status').hidden = true;
  $('start').disabled = false; $('start').textContent = 'Reload game'; $('start').onclick = () => location.reload();
}
