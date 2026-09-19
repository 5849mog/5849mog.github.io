import { createRoute, ENEMIES, GAME, GRID, makeWave, TOWERS } from "./config.js";
import { Enemy, Projectile, Tower, Zone } from "./entities.js";

const tile = GRID.tile;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Game {
  constructor() {
    this.route = createRoute();
    this.routeSet = new Set(this.route.map(({ c, r }) => `${c},${r}`));
    this.listeners = new Set();
    this.reset();
  }

  onChange(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit() { this.listeners.forEach((listener) => listener(this)); }

  reset() {
    this.phase = "menu";
    this.wave = 0;
    this.gold = GAME.startingGold;
    this.lives = GAME.startingLives;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.zones = [];
    this.particles = [];
    this.effects = [];
    this.waveQueue = [];
    this.spawnTimer = 0;
    this.prepTimer = 0;
    this.awaitingNextWave = false;
    this.autoWave = false;
    this.time = 0;
    this.shakeAmount = 0;
    this.selectedTower = null;
    this.selectedBuild = null;
    this.combo = 0;
    this.comboTimer = 0;
    this.message = "准备部署";
    this.emit();
  }

  startNew() {
    this.reset();
    this.phase = "playing";
    this.message = "选择防御塔，然后点击蓝色空地";
    this.emit();
  }

  pause() { if (this.phase === "playing") this.phase = "paused"; else if (this.phase === "paused") this.phase = "playing"; this.emit(); }
  endGame() { this.phase = "gameover"; this.message = `防线失守 · 坚持到第 ${this.wave} 波`; this.emit(); }

  startWave() {
    if (this.phase !== "playing" || this.waveQueue.length || this.enemies.length || this.prepTimer > 0) return false;
    this.wave += 1;
    this.awaitingNextWave = false;
    this.waveQueue = makeWave(this.wave);
    this.spawnTimer = 0;
    this.message = this.wave % 5 === 0 ? `第 ${this.wave} 波 · 巨像来袭` : `第 ${this.wave} 波开始`;
    this.effect({ kind: "wave", life: 1.2, wave: this.wave });
    this.shake(this.wave % 5 === 0 ? 9 : 4);
    this.emit();
    return true;
  }

  update(dt) {
    if (this.phase !== "playing") return;
    const delta = Math.min(GAME.maxDt, dt);
    this.time += delta;
    this.shakeAmount = Math.max(0, this.shakeAmount - delta * 28);
    this.comboTimer -= delta;
    if (this.comboTimer <= 0) this.combo = 0;

    if (!this.waveQueue.length && !this.enemies.length) {
      if (this.prepTimer > 0) this.prepTimer -= delta;
      else if (this.autoWave) this.startWave();
    }
    if (this.waveQueue.length) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        const typeKey = this.waveQueue.shift();
        this.enemies.push(new Enemy(this, typeKey));
        this.spawnTimer = Math.max(0.12, 0.42 - this.wave * 0.004);
      }
    }

    this.towers.forEach((tower) => tower.update(this, delta));
    this.zones.forEach((zone) => zone.update(this, delta));
    this.projectiles.forEach((projectile) => projectile.update(this, delta));
    this.enemies.forEach((enemy) => enemy.update(this, delta));
    this.enemies = this.enemies.filter((enemy) => enemy.active);
    this.projectiles = this.projectiles.filter((projectile) => projectile.active);
    this.zones = this.zones.filter((zone) => zone.life > 0);
    this.updateEffects(delta);
    this.updateParticles(delta);

    if (!this.waveQueue.length && !this.enemies.length && this.wave > 0 && this.prepTimer <= 0 && !this.awaitingNextWave) {
      this.gold += 50 + this.wave * 8;
      this.prepTimer = GAME.prepTime;
      this.awaitingNextWave = true;
      this.message = `第 ${this.wave} 波完成 · 整备奖励 +${50 + this.wave * 8}`;
      this.effect({ kind: "clear", life: 0.8 });
    }
    this.emit();
  }

  updateEffects(dt) { this.effects.forEach((effect) => { effect.life -= dt; }); this.effects = this.effects.filter((effect) => effect.life > 0); }
  updateParticles(dt) { this.particles.forEach((particle) => { particle.life -= dt; particle.y += particle.vy * dt; particle.x += particle.vx * dt; }); this.particles = this.particles.filter((particle) => particle.life > 0); }

  canBuild(c, r) { return c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows && !this.routeSet.has(`${c},${r}`) && !this.towers.some((tower) => tower.c === c && tower.r === r); }
  placeTower(c, r) {
    if (this.phase !== "playing" || !this.selectedBuild) return false;
    const type = TOWERS[this.selectedBuild];
    if (!type || this.gold < type.cost || !this.canBuild(c, r)) return false;
    const tower = new Tower(c, r, this.selectedBuild);
    this.towers.push(tower);
    this.gold -= type.cost;
    this.selectedTower = tower;
    this.selectedBuild = null;
    this.float(tower.x, tower.y - 22, "部署完成", type.color);
    this.effect({ kind: "build", x: tower.x, y: tower.y, life: 0.5, color: type.color });
    this.emit();
    return true;
  }

  selectBuild(typeKey) { this.selectedBuild = this.selectedBuild === typeKey ? null : typeKey; this.selectedTower = null; this.emit(); }
  selectAt(c, r) { this.selectedBuild = null; this.selectedTower = this.towers.find((tower) => tower.c === c && tower.r === r) || null; this.emit(); }
  upgradeSelected() {
    const tower = this.selectedTower;
    if (!tower || tower.level >= tower.maxLevel || this.gold < tower.upgradeCost) return false;
    this.gold -= tower.upgradeCost; tower.upgrade(); this.float(tower.x, tower.y - 22, `升级 Lv.${tower.level}`, "#ffd166"); this.effect({ kind: "upgrade", x: tower.x, y: tower.y, life: 0.7, color: tower.type.color }); this.emit(); return true;
  }
  sellSelected() {
    const tower = this.selectedTower;
    if (!tower) return false;
    this.gold += tower.refund; this.towers = this.towers.filter((item) => item !== tower); this.float(tower.x, tower.y - 22, `回收 +${tower.refund}`, "#65e6a2"); this.selectedTower = null; this.emit(); return true;
  }

  float(x, y, text, color = "#ffffff") { this.particles.push({ x, y, text, color, life: 1.1, maxLife: 1.1, vy: -20, vx: 0 }); }
  effect(effect) { this.effects.push(effect); }
  shake(amount) { this.shakeAmount = Math.max(this.shakeAmount, amount); }

  snapshot() {
    return {
      version: GAME.saveVersion, wave: this.wave, gold: Math.floor(this.gold), lives: this.lives, autoWave: this.autoWave, awaitingNextWave: this.awaitingNextWave, waveQueue: [...this.waveQueue], spawnTimer: this.spawnTimer,
      phase: this.phase === "playing" ? "paused" : this.phase, prepTimer: this.prepTimer,
      towers: this.towers.map((tower) => ({ c: tower.c, r: tower.r, typeKey: tower.typeKey, level: tower.level, cooldown: tower.cooldown, heat: tower.heat })),
      enemies: this.enemies.map((enemy) => ({ typeKey: enemy.typeKey, x: enemy.x, y: enemy.y, hp: enemy.hp, shield: enemy.shield, pathIndex: enemy.pathIndex, webbed: enemy.webbed })),
    };
  }

  load(snapshot) {
    if (!snapshot || typeof snapshot !== "object") throw new Error("存档格式错误");
    this.reset();
    this.phase = "paused";
    this.wave = Math.max(0, Number(snapshot.wave) || 0);
    this.gold = Math.max(0, Number(snapshot.gold) || 0);
    this.lives = Math.max(1, Number(snapshot.lives) || GAME.startingLives);
    this.autoWave = Boolean(snapshot.autoWave);
    this.prepTimer = Math.max(0, Number(snapshot.prepTimer) || 0);
    this.awaitingNextWave = Boolean(snapshot.awaitingNextWave);
    this.waveQueue = Array.isArray(snapshot.waveQueue) ? snapshot.waveQueue.filter((key) => Boolean(ENEMIES[key])) : [];
    this.spawnTimer = Math.max(0, Number(snapshot.spawnTimer) || 0);
    (snapshot.towers || []).forEach((data) => {
      if (TOWERS[data.typeKey] && Number.isInteger(data.c) && Number.isInteger(data.r) && this.canBuild(data.c, data.r)) {
        const tower = new Tower(data.c, data.r, data.typeKey, Math.max(1, Math.min(10, Number(data.level) || 1)));
        tower.cooldown = Number(data.cooldown) || 0; tower.heat = Number(data.heat) || 0; this.towers.push(tower);
      }
    });
    (snapshot.enemies || []).forEach((data) => {
      if (ENEMIES[data.typeKey]) this.enemies.push(new Enemy(this, data.typeKey, { x: Number(data.x), y: Number(data.y), hp: Number(data.hp), shield: Number(data.shield), pathIndex: Number(data.pathIndex) || 0 }));
    });
    this.message = "存档已载入 · 游戏处于暂停状态";
    this.emit();
  }
}
