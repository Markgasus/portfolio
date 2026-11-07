import * as THREE from './vendor/three.module.js';
import { COLS, ROWS, position, LAUNCH_Y, MIN_X, MAX_X, MAX_Y, RADIUS, DY } from './engine.mjs';

const modelNames = ['ball_red', 'ball_blue', 'ball_green', 'ball_cog', 'ball_white', 'ball_purple', 'ball_yello', 'ball_fire', 'ball_unknown', 'ball_steel', 'ball_fire', 'ball_unknown'];
export class BoardRenderer {
  async init(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-10, 10, 18, -5, .1, 100);
    this.camera.position.z = 40;
    this.templates = {};
    const response = await fetch('./assets/models.json');
    if (!response.ok) throw new Error('The game artwork could not load.');
    const data = await response.json(), textures = {};
    const loader = new THREE.TextureLoader();
    await Promise.all([...new Set(Object.values(data).flat().map(m => m.texture).filter(Boolean))].map(async file => {
      const texture = await loader.loadAsync('./assets/' + file);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      textures[file] = texture;
    }));
    for (const [name, meshes] of Object.entries(data)) {
      const group = new THREE.Group();
      for (const m of meshes) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(m.positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(m.uvs, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(m.colors, 4));
        geo.setIndex(m.indices);
        const material = new THREE.MeshBasicMaterial({ map: textures[m.texture] || null, vertexColors: true, side: THREE.DoubleSide, transparent: true, alphaTest: .025, depthWrite: true });
        const mesh = new THREE.Mesh(geo, material); mesh.name = m.name; group.add(mesh);
      }
      this.templates[name] = group;
    }
    this.background = this.templates.background.clone();
    this.background.scale.set(.3, -.2, .25);
    this.background.position.set(0, 8, -3);
    this.scene.add(this.background);
    this.holes = new THREE.Group();
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const hole = this.templates.hole.clone();
      hole.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.opacity = .42; } });
      const p = position(col, row); hole.position.set(p.x, p.y, -.8); hole.scale.setScalar(1.05);
      this.holes.add(hole);
    }
    this.scene.add(this.holes);
    this.shooter = this.templates.shooter.clone();
    this.shooter.scale.set(.3, .3, .15);
    this.shooter.position.set(0, LAUNCH_Y, -.4);
    this.scene.add(this.shooter);
    this.balls = new Map(); this.particles = [];
    this.aim = new THREE.Group();
    const dotGeo = new THREE.CircleGeometry(.055, 10), dotMat = new THREE.MeshBasicMaterial({ color: 0xffecc3, transparent: true, opacity: .7, depthTest: false });
    for (let i = 0; i < 40; i++) this.aim.add(new THREE.Mesh(dotGeo, dotMat));
    this.scene.add(this.aim);
    this.observer = new ResizeObserver(() => {
      this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    });
    this.observer.observe(canvas);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  }
  ball(type) {
    const group = this.templates[modelNames[type]].clone();
    group.scale.setScalar(1.4);
    if (type === 4) group.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.set(0x33333b); } });
    return group;
  }
  setPreview(which, type, x, y, size) {
    if (!this[which] || this[which].userData.type !== type) {
      if (this[which]) this.scene.remove(this[which]);
      this[which] = this.ball(type); this[which].userData.type = type; this.scene.add(this[which]);
    }
    this[which].position.set(x, y, .4); this[which].scale.setScalar(size);
  }
  burst(balls) {
    for (const ball of balls) {
      const mesh = this.ball(ball.type); mesh.position.set(ball.x, ball.y, 1);
      mesh.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.depthWrite = false; } });
      this.scene.add(mesh);
      this.particles.push({ mesh, life: 0, falling: ball.falling, vx: (Math.random() - .5) * 5, vy: ball.falling ? 1 : 3 });
    }
  }
  clearEffects() {
    for (const p of this.particles || []) this.disposeParticle(p);
    this.particles = [];
  }
  disposeParticle(p) {
    this.scene.remove(p.mesh);
    p.mesh.traverse(m => { if (m.isMesh) m.material.dispose(); });
  }
  draw(game, angle, dt) {
    const active = new Set();
    for (const [id, cell] of game.cells) {
      active.add(id);
      let ball = this.balls.get(id);
      if (ball && ball.userData.type !== cell.type) { this.scene.remove(ball); this.balls.delete(id); ball = null; }
      if (!ball) { ball = this.ball(cell.type); ball.userData.type = cell.type; this.balls.set(id, ball); this.scene.add(ball); }
      const p = position(cell.col, cell.row, game.notch); ball.position.set(p.x, p.y, .1);
    }
    for (const [id, ball] of this.balls) if (!active.has(id)) { this.scene.remove(ball); this.balls.delete(id); }
    this.holes.position.y = -game.notch * DY;
    this.holes.children.forEach((hole, i) => { hole.visible = Math.floor(i / COLS) > game.notch; });
    this.shooter.rotation.z = Math.PI - angle;
    const p = game.projectile;
    this.setPreview('shot', p ? p.type : game.current, p ? p.x : 0, p ? p.y : LAUNCH_Y, 1.4);
    this.shot.visible = game.status !== 'won';
    this.setPreview('preview', game.next, 3.7, -3.25, 1.05);
    this.aim.visible = game.status === 'playing' && !p;
    let x = 0, y = LAUNCH_Y, vx = Math.sin(angle), vy = Math.cos(angle), ended = false;
    for (const dot of this.aim.children) {
      x += vx * .42; y += vy * .42;
      if (x < MIN_X + RADIUS) { x = 2 * (MIN_X + RADIUS) - x; vx *= -1; }
      if (x > MAX_X - RADIUS) { x = 2 * (MAX_X - RADIUS) - x; vx *= -1; }
      if (y > MAX_Y - RADIUS - game.notch * DY || [...game.cells.values()].some(c => {
        const q = position(c.col, c.row, game.notch); return (x - q.x) ** 2 + (y - q.y) ** 2 < 1.34;
      })) ended = true;
      dot.visible = !ended; dot.position.set(x, y, .3);
    }
    for (const particle of this.particles) {
      particle.life += dt; particle.vy -= dt * 18;
      particle.mesh.position.x += particle.vx * dt; particle.mesh.position.y += particle.vy * dt;
      particle.mesh.rotation.z += dt * particle.vx;
      particle.mesh.traverse(m => { if (m.isMesh) m.material.opacity = Math.max(0, 1 - particle.life / .8); });
    }
    this.particles = this.particles.filter(particle => {
      if (particle.life < .8) return true;
      this.disposeParticle(particle); return false;
    });
    this.renderer.render(this.scene, this.camera);
  }
  pointer(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const x = (clientX - r.left) / r.width * 20 - 10;
    const y = 18 - (clientY - r.top) / r.height * 23;
    return Math.max(-Math.PI / 2 + .2, Math.min(Math.PI / 2 - .2, Math.atan2(x, Math.max(.15, y - LAUNCH_Y))));
  }
}
