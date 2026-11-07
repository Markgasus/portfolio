import * as THREE from './vendor/three.module.js';
import { COLS, ROWS, position, LAUNCH_Y, RADIUS } from './engine.mjs';

const RAD = Math.PI / 180;
const names = ['ball_red', 'ball_blue', 'ball_green', 'ball_cog', 'ball_white', 'ball_purple', 'ball_yello', 'ball_white', 'ball_white', 'ball_steel', 'ball_fire', 'ball_unknown'];
const axisX = new THREE.Vector3(1, 0, 0), axisY = new THREE.Vector3(0, 1, 0), axisZ = new THREE.Vector3(0, 0, 1);
function hpr(object, h, p, r) {
  object.quaternion.setFromAxisAngle(axisZ, h * RAD)
    .multiply(new THREE.Quaternion().setFromAxisAngle(axisX, p * RAD))
    .multiply(new THREE.Quaternion().setFromAxisAngle(axisY, r * RAD));
}
export class BoardRenderer {
  async init(canvas) {
    this.canvas = canvas; this.particles = []; this.balls = new Map(); this.clock = 0;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    // Match Panda3D's original texture/vertex color pipeline.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = false; this.renderer.setClearColor(0x4c4c4c);
    this.scene = new THREE.Scene(); this.hud = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46.8265, 4 / 3, .1, 1500);
    this.camera.up.set(0, 0, 1); this.camera.position.set(0, 12, 27);
    this.camera.lookAt(0, 12 - Math.cos(70 * RAD), 27 - Math.sin(70 * RAD));
    this.uiCamera = new THREE.OrthographicCamera(-4 / 3, 4 / 3, 1, -1, .01, 100);
    this.uiCamera.up.set(0, 0, 1); this.uiCamera.position.set(0, -10, 0); this.uiCamera.lookAt(0, 0, 0);
    this.templates = {};
    const response = await fetch('./assets/original-scene.json?v=minnie-2');
    if (!response.ok) throw new Error('Original game assets could not load.');
    const data = await response.json(), textures = {}, loader = new THREE.TextureLoader();
    await Promise.all([...new Set(Object.values(data).flat().map(m => m.texture).filter(Boolean))].map(async file => {
      const texture = await loader.loadAsync('./assets/' + file);
      texture.colorSpace = THREE.NoColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy(); textures[file] = texture;
    }));
    for (const [name, meshes] of Object.entries(data)) {
      const group = new THREE.Group();
      for (const m of meshes) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(m.positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(m.uvs, 2));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(m.colors, 4)); geometry.setIndex(m.indices);
        const material = new THREE.MeshBasicMaterial({ map: textures[m.texture] || null, vertexColors: true, side: THREE.DoubleSide, transparent: m.transparent, alphaTest: m.transparent ? .001 : 0 });
        const mesh = new THREE.Mesh(geometry, material); mesh.name = m.name; group.add(mesh);
      }
      this.templates[name] = group;
    }
    this.scene.add(this.model('room'));
    const green = this.model('golf_green'); green.scale.setScalar(.24); this.scene.add(green);
    this.frame = new THREE.Group(); hpr(this.frame, 0, 90, 0); this.frame.position.set(0, 10, 2); this.scene.add(this.frame);
    const background = this.model('background'); hpr(background, 0, -90, 0); background.scale.set(.3, .2, .25); background.position.set(0, -1.5, 8); this.frame.add(background);
    this.holes = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const hole = this.model('hole', true); hpr(hole, -90, 0, 90); hole.scale.setScalar(1.2);
      hole.userData = { col, row }; this.frame.add(hole); this.holes.push(hole);
    }
    this.shooter = this.model('shooter'); hpr(this.shooter, 90, 0, 90);
    this.shooter.scale.set(.3, .3, .15); this.shooter.position.set(0, 0, -1.58); this.frame.add(this.shooter);
    this.aimer = new THREE.Group(); this.aimer.add(this.model('shooter_moving')); this.shooter.add(this.aimer);
    this.puzzles = new THREE.Group(); this.puzzles.position.z = .90; this.hud.add(this.puzzles);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(.7, .1), new THREE.MeshBasicMaterial({ color: new THREE.Color(.737, .573, .345), transparent: true, opacity: .3, depthWrite: false }));
    panel.rotation.x = Math.PI / 2; panel.position.y = .02; this.puzzles.add(panel);
    this.timer = this.model('clock'); this.timer.scale.setScalar(.45); this.timer.position.set(1.16, 0, .58); this.hud.add(this.timer);
    this.message = new THREE.Group(); this.message.position.y = -.3; this.hud.add(this.message);
    this.observer = new ResizeObserver(() => this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)); this.observer.observe(canvas);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  }
  model(name, ownMaterials = false) {
    const object = this.templates[name].clone();
    if (ownMaterials) object.traverse(m => { if (m.isMesh) m.material = m.material.clone(); });
    return object;
  }
  setLabel(parent, key, name) {
    if (parent.userData[key] === name) return;
    if (parent.userData[key + 'Object']) parent.remove(parent.userData[key + 'Object']);
    const label = this.model(name); label.position.y = -.02; parent.add(label);
    parent.userData[key] = name; parent.userData[key + 'Object'] = label;
  }
  setHud(left, time, state) {
    this.setLabel(this.puzzles, 'label', 'puzzles' + left);
    this.setLabel(this.timer, 'label', 'timer' + Math.max(0, Math.min(120, Math.ceil(time))));
    this.puzzles.visible = !['success', 'failure'].includes(state); this.timer.visible = this.puzzles.visible;
    const message = ['success', 'failure'].includes(state) ? state : null;
    if (message) this.setLabel(this.message, 'label', message);
    this.message.visible = !!message;
  }
  ball(type) {
    const group = this.model(names[type], true); group.scale.setScalar(1.4); group.userData.type = type;
    if (type === 4) group.traverse(m => { if (m.isMesh) m.material.color.setRGB(0, 0, 0); });
    return group;
  }
  // Anesidora setup() raises spriteNode to radiusBall, above the launcher.
  placeBall(ball, x, y, height = RADIUS) {
    ball.position.set(x, height, y); hpr(ball, 0, 95 - y * 2, 0);
    if (ball.userData.type !== 4) ball.traverse(m => { if (m.isMesh) m.material.color.setRGB(1, 1, 1); });
    if (ball.userData.type === 7 || ball.userData.type === 8) {
      const bomb = ball.userData.type === 7;
      const colors = bomb ? [[1,.5,0],[0,0,0]] : [[1,.2,.2],[.7,.8,1],[0,1,0],[1,1,0]];
      const phase = this.clock * (bomb ? 9 : 6), n = Math.floor(phase), t = phase - n;
      const a = colors[n % colors.length], b = colors[(n + 1) % colors.length];
      ball.traverse(m => { if (m.isMesh) m.material.color.setRGB(...a.map((v,i) => v + (b[i] - v) * t)); });
    }
  }
  disposeBall(ball) { ball.removeFromParent(); ball.traverse(m => { if (m.isMesh) m.material.dispose(); }); }
  preview(which, type, x, y, height) {
    if (!this[which] || this[which].userData.type !== type) {
      if (this[which]) this.disposeBall(this[which]);
      this[which] = this.ball(type); this.frame.add(this[which]);
    }
    this.placeBall(this[which], x, y, height);
  }
  burst(balls, { black = false } = {}) {
    this.frame.updateMatrixWorld(true);
    for (const ball of balls) {
      const mesh = this.ball(ball.type); this.placeBall(mesh, ball.x, ball.y); this.frame.add(mesh); this.scene.attach(mesh);
      mesh.traverse(m => { if (m.isMesh) { m.material.depthWrite = false; if (black) m.material.color.setRGB(0, 0, 0); } });
      const n = Math.random(); this.particles.push({ mesh, age: 0, life: .5 + Math.random(), vx: 20 - n * 40, vy: -20 + n * 40, vz: 30 });
    }
  }
  clearEffects() {
    for (const p of this.particles || []) this.disposeBall(p.mesh); this.particles = []; this.displayNotch = 0;
  }
  draw(game, angle, dt) {
    this.clock += dt; this.displayNotch = Math.min(game.notch, (this.displayNotch || 0) + dt * 2);
    const active = new Set();
    for (const [id, cell] of game.cells) {
      active.add(id); let ball = this.balls.get(id);
      if (ball && ball.userData.type !== cell.type) { this.disposeBall(ball); this.balls.delete(id); ball = null; }
      if (!ball) { ball = this.ball(cell.type); this.balls.set(id, ball); this.frame.add(ball); }
      const p = position(cell.col, cell.row, this.displayNotch); this.placeBall(ball, p.x, p.y);
      if (game.status === 'lost') ball.traverse(m => { if (m.isMesh) m.material.color.setRGB(0, 0, 0); });
    }
    for (const [id, ball] of this.balls) if (!active.has(id)) { this.disposeBall(ball); this.balls.delete(id); }
    for (const hole of this.holes) {
      const { col, row } = hole.userData, p = position(col, row, this.displayNotch);
      hole.position.set(p.x, 0, p.y); hole.visible = row > game.notch;
      const cell = game.cells.get(row * COLS + col), tint = !cell ? 1 : cell.type === 3 ? 0 : .6;
      hole.traverse(m => { if (m.isMesh) m.material.color.setRGB(tint, tint, tint); });
    }
    this.aimer.rotation.z = angle - Math.PI / 2;
    const p = game.projectile;
    this.preview('shot', p ? p.type : game.current, p ? p.x : 0, p ? p.y : LAUNCH_Y);
    this.shot.visible = game.status !== 'won' && game.status !== 'lost'; this.preview('standby', game.next, 0, -3);
    for (const particle of this.particles) {
      particle.age += dt; particle.vz -= 64 * dt;
      particle.mesh.position.x += particle.vx * dt; particle.mesh.position.y += particle.vy * dt; particle.mesh.position.z += particle.vz * dt;
      particle.mesh.traverse(m => { if (m.isMesh) m.material.opacity = Math.max(0, 1 - particle.age / particle.life); });
    }
    this.particles = this.particles.filter(p => { if (p.age < p.life) return true; this.disposeBall(p.mesh); return false; });
    this.renderer.clear(); this.renderer.render(this.scene, this.camera); this.renderer.clearDepth(); this.renderer.render(this.hud, this.uiCamera);
  }
  pointer(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(), x = (clientX - r.left) / r.width * 2 - 1, y = 1 - (clientY - r.top) / r.height * 2;
    // DistributedGolfGreenGame.__run: zGap = .092, the original mouse calculation.
    return Math.max(-Math.PI / 2 + .2, Math.min(Math.PI / 2 - .2, -Math.atan2(x * (4 / 3 / .908), Math.max(.0001, y + .816))));
  }
}
