import { ENEMIES, GRID, TOWERS } from "./config.js";

const tile = GRID.tile;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class Enemy {
  constructor(game, typeKey, overrides = {}) {
    const base = ENEMIES[typeKey] || ENEMIES.NORMAL;
    this.typeKey = typeKey;
    this.base = base;
    const scale = 1 + game.wave * 0.34 + Math.max(0, game.wave - 25) * 0.06;
    this.maxHp = Math.floor(base.hp * scale);
    this.hp = overrides.hp ?? this.maxHp;
    this.maxShield = Math.floor((base.shield || 0) * scale);
    this.shield = overrides.shield ?? this.maxShield;
    this.speed = base.speed * (1 + game.wave * 0.004);
    this.reward = Math.floor(base.reward + game.wave * 0.7);
    this.radius = base.radius;
    this.active = true;
    this.pathIndex = overrides.pathIndex ?? 0;
    const start = game.route[this.pathIndex] || game.route[0];
    this.x = overrides.x ?? start.c * tile + tile / 2;
    this.y = overrides.y ?? start.r * tile + tile / 2;
    this.air = base.type === "air";
    this.webbed = 0;
    this.skillTimer = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.beamFlash = 0;
  }

  update(game, dt) {
    if (!this.active) return;
    this.webbed = Math.max(0, this.webbed - dt);
    this.skillTimer += dt;
    this.dashTimer += dt;
    this.beamFlash = Math.max(0, this.beamFlash - dt);

    if (this.base.medic && this.skillTimer >= 1.4) {
      this.skillTimer = 0;
      game.enemies.forEach((other) => {
        if (other !== this && other.active && !other.air && distance(this, other) < tile * 2.6) {
          const amount = other.maxHp * 0.035 + 12;
          other.hp = Math.min(other.maxHp, other.hp + amount);
          game.float(other.x, other.y - 16, `+${Math.floor(amount)}`, "#65e6a2");
          game.effect({ kind: "heal", x: this.x, y: this.y, tx: other.x, ty: other.y, life: 0.28 });
        }
      });
    }

    if (this.base.reaper && this.skillTimer >= 6) {
      this.skillTimer = 0;
      game.shake(5);
      game.float(this.x, this.y - 22, "静默脉冲", "#c6a4ff");
      game.towers.forEach((tower) => {
        if (distance(this, tower) < tile * 3.3 && !tower.isBoosted(game)) tower.disabled = Math.max(tower.disabled, 2.2);
      });
    }

    if (this.base.dasher && !this.isDashing && this.dashTimer >= 5) {
      this.dashTimer = 0;
      this.isDashing = true;
      game.float(this.x, this.y - 18, "突进", "#6be8ff");
    }
    if (this.isDashing && this.dashTimer >= 0.75) {
      this.isDashing = false;
      this.dashTimer = 0;
    }

    const speedScale = (this.webbed > 0 ? 0.24 : 1) * (this.isDashing ? 3.6 : 1);
    const move = this.speed * speedScale * dt;
    if (this.air) {
      const end = game.route[game.route.length - 1];
      const tx = end.c * tile + tile / 2;
      const ty = end.r * tile + tile / 2;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const len = Math.hypot(dx, dy) || 1;
      if (len <= move) this.reach(game);
      else { this.x += (dx / len) * move; this.y += (dy / len) * move; }
      return;
    }

    const next = game.route[this.pathIndex + 1];
    if (!next) { this.reach(game); return; }
    const tx = next.c * tile + tile / 2;
    const ty = next.r * tile + tile / 2;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy) || 1;
    if (len <= move) {
      this.x = tx; this.y = ty; this.pathIndex += 1;
    } else {
      this.x += (dx / len) * move;
      this.y += (dy / len) * move;
    }
  }

  takeDamage(game, amount, kind = "normal", source = null) {
    if (!this.active) return;
    if (this.air && !["all", "air", "flak", "missile", "tesla", "beam", "nuke"].includes(kind)) return;
    if (kind === "flak" && this.typeKey === "FLY_H") amount *= 2.7;
    if (kind === "net") {
      this.webbed = Math.max(this.webbed, 1.7 + (source?.level || 1) * 0.15);
    }
    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield < 0) { this.hp += this.shield; this.shield = 0; }
    } else this.hp -= amount;
    this.beamFlash = 0.08;
    game.float(this.x, this.y - this.radius - 7, `-${Math.max(1, Math.floor(amount))}`, kind === "crit" ? "#ffe08a" : "#ffffff");
    if (this.hp <= 0) this.destroy(game, source);
  }

  destroy(game, source) {
    if (!this.active) return;
    this.active = false;
    game.gold += this.reward + (source?.bounty ? Math.floor(this.reward * 0.6) : 0);
    game.combo = Math.min(99, game.combo + 1);
    game.comboTimer = 2.5;
    game.effect({ kind: "burst", x: this.x, y: this.y, life: 0.45, color: this.base.color, radius: this.radius * 2.8 });
    if (this.base.spider) {
      for (let i = 0; i < 3; i += 1) game.enemies.push(new Enemy(game, "MINI", { x: this.x + (i - 1) * 12, y: this.y + (i % 2) * 10, pathIndex: this.pathIndex }));
    }
    if (this.base.boss) { game.shake(16); game.float(this.x, this.y - 30, "巨像已摧毁", "#ffd166"); }
    game.float(this.x, this.y - this.radius - 24, `+${this.reward}`, "#ffd166");
  }

  reach(game) {
    if (!this.active) return;
    this.active = false;
    game.lives -= this.base.boss ? 5 : 1;
    game.shake(this.base.boss ? 14 : 5);
    game.float(this.x, this.y - 20, this.base.boss ? "防线重创" : "突破防线", "#ff6b72");
    if (game.lives <= 0) game.endGame();
  }

  draw(ctx, game) {
    const pulse = 1 + Math.sin(game.time * 5 + this.pathIndex) * 0.06;
    const radius = this.radius * pulse;
    ctx.save();
    if (this.base.boss) { ctx.shadowColor = this.base.color; ctx.shadowBlur = 24; }
    ctx.fillStyle = this.base.color;
    ctx.globalAlpha = this.beamFlash > 0 ? 0.65 : 1;
    ctx.beginPath(); ctx.arc(this.x, this.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = this.base.boss ? "#ffe28a" : "rgba(255,255,255,.6)";
    ctx.lineWidth = this.base.boss ? 3 : 1.5;
    ctx.stroke();
    if (this.air) {
      ctx.strokeStyle = "rgba(255,255,255,.6)";
      ctx.beginPath(); ctx.moveTo(this.x - radius * 1.8, this.y + radius); ctx.lineTo(this.x - radius * 0.8, this.y); ctx.lineTo(this.x - radius * 1.8, this.y - radius); ctx.stroke();
    }
    if (this.base.medic) {
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.x - 5, this.y); ctx.lineTo(this.x + 5, this.y); ctx.moveTo(this.x, this.y - 5); ctx.lineTo(this.x, this.y + 5); ctx.stroke();
    }
    if (this.webbed > 0) {
      ctx.strokeStyle = "#c3b4ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.x - radius, this.y - radius); ctx.lineTo(this.x + radius, this.y + radius); ctx.moveTo(this.x + radius, this.y - radius); ctx.lineTo(this.x - radius, this.y + radius); ctx.stroke();
    }
    const barWidth = Math.max(22, radius * 2.7);
    const hpRatio = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(this.x - barWidth / 2, this.y - radius - 10, barWidth, 4);
    ctx.fillStyle = this.base.boss ? "#ffd166" : "#ff6174"; ctx.fillRect(this.x - barWidth / 2, this.y - radius - 10, barWidth * hpRatio, 4);
    if (this.shield > 0) {
      ctx.fillStyle = "#d8f5ff"; ctx.fillRect(this.x - barWidth / 2, this.y - radius - 6, barWidth * clamp(this.shield / this.maxShield, 0, 1), 2);
    }
    ctx.restore();
  }
}

export class Tower {
  constructor(c, r, typeKey, level = 1) {
    this.c = c; this.r = r; this.typeKey = typeKey; this.level = level;
    this.cooldown = 0; this.heat = 0; this.disabled = 0; this.beamTarget = null;
    this.bounty = false;
  }

  get type() { return TOWERS[this.typeKey]; }
  get x() { return this.c * tile + tile / 2; }
  get y() { return this.r * tile + tile / 2; }
  get range() { return this.type.range * tile * (1 + (this.level - 1) * 0.035); }
  get damage() { return this.type.damage * Math.pow(1.34, this.level - 1); }
  get maxLevel() { return 10; }
  get upgradeCost() { return Math.floor(this.type.cost * (0.75 + this.level * 0.65)); }
  get refund() { return Math.floor(this.type.cost * (1 + (this.level - 1) * 0.55) * 0.68); }

  isBoosted(game) { return game.towers.some((other) => other.typeKey === "SUPPORT" && other !== this && distance(this, other) < other.range); }
  boostFactor(game) { return this.isBoosted(game) ? 1.32 : 1; }

  update(game, dt) {
    this.disabled = Math.max(0, this.disabled - dt);
    this.cooldown -= dt;
    this.heat = Math.max(0, this.heat - dt * 0.08);
    if (this.disabled > 0) return;
    if (this.typeKey === "SUPPORT") return;
    if (this.typeKey === "GOLD") {
      if (this.cooldown <= 0) { game.gold += Math.floor(32 * Math.pow(1.22, this.level - 1)); game.float(this.x, this.y - 20, "+资源", "#ffd166"); this.cooldown = this.type.cooldown; }
      return;
    }
    const target = this.findTarget(game);
    if (!target) { this.beamTarget = null; return; }
    if (this.typeKey === "PRISM") {
      this.beamTarget = target;
      if (this.cooldown <= 0) { target.takeDamage(game, this.damage * 0.12 * this.boostFactor(game), "beam", this); this.cooldown = this.type.cooldown; }
      return;
    }
    if (this.cooldown > 0) return;
    this.fire(game, target);
    this.cooldown = this.type.cooldown / this.boostFactor(game);
  }

  findTarget(game) {
    let target = null;
    for (const enemy of game.enemies) {
      if (!enemy.active) continue;
      if (this.type.target === "air" && !enemy.air) continue;
      if (this.type.target === "ground" && enemy.air) continue;
      if (distance(this, enemy) > this.range) continue;
      if (!target || enemy.pathIndex > target.pathIndex || (enemy.pathIndex === target.pathIndex && enemy.hp > target.hp)) target = enemy;
    }
    return target;
  }

  fire(game, target) {
    const kind = this.type.projectile;
    if (kind === "nuke") {
      game.effect({ kind: "nuke", x: target.x, y: target.y, radius: tile * 4.2, life: 0.7 });
      game.shake(14);
      game.enemies.forEach((enemy) => { if (!enemy.air && distance(target, enemy) < tile * 4.2) enemy.takeDamage(game, this.damage, "nuke", this); });
      return;
    }
    if (kind === "tesla") {
      let current = target;
      const hit = new Set();
      for (let jump = 0; jump < 3 + Math.floor(this.level / 3); jump += 1) {
        if (!current || hit.has(current)) break;
        hit.add(current); current.takeDamage(game, this.damage * Math.pow(0.82, jump) * this.boostFactor(game), "tesla", this);
        game.effect({ kind: "arc", x: this.x, y: this.y, tx: current.x, ty: current.y, life: 0.16, color: this.type.color });
        current = game.enemies.find((enemy) => enemy.active && !hit.has(enemy) && distance(current, enemy) < tile * 3.1);
      }
      return;
    }
    if (kind === "magma") {
      game.projectiles.push(new Projectile(this.x, this.y, target, this.damage * this.boostFactor(game), "magma", this));
      return;
    }
    game.projectiles.push(new Projectile(this.x, this.y, target, this.damage * this.boostFactor(game), kind, this));
  }

  upgrade() { if (this.level >= this.maxLevel) return false; this.level += 1; return true; }

  draw(ctx, game) {
    const boosted = this.isBoosted(game);
    const pulse = 1 + Math.sin(game.time * 4 + this.c) * 0.04;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = this.type.color; ctx.shadowBlur = boosted ? 18 : 8;
    ctx.fillStyle = this.type.color; ctx.globalAlpha = this.disabled > 0 ? 0.35 : 0.95;
    ctx.fillRect(-tile * 0.26 * pulse, -tile * 0.26 * pulse, tile * 0.52 * pulse, tile * 0.52 * pulse);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.strokeStyle = boosted ? "#ffffff" : "rgba(255,255,255,.42)"; ctx.lineWidth = boosted ? 2 : 1; ctx.strokeRect(-tile * 0.26, -tile * 0.26, tile * 0.52, tile * 0.52);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#08121b"; ctx.font = "bold 17px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(this.type.icon, 0, 0);
    if (this.typeKey === "SUPPORT") {
      ctx.strokeStyle = "rgba(83,230,165,.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, this.range, game.time * 0.5, game.time * 0.5 + Math.PI * 1.45); ctx.stroke();
    }
    if (this.typeKey === "PRISM" && this.beamTarget?.active) {
      ctx.strokeStyle = `rgba(255,92,157,${0.55 + this.heat * 0.1})`; ctx.lineWidth = 2.5 + this.heat; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(this.beamTarget.x - this.x, this.beamTarget.y - this.y); ctx.stroke(); this.heat = Math.min(3.5, this.heat + 0.018);
    }
    ctx.restore();
    if (game.selectedTower === this) {
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.setLineDash([5, 6]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }
  }
}

export class Projectile {
  constructor(x, y, target, damage, kind, source) { this.x = x; this.y = y; this.target = target; this.damage = damage; this.kind = kind; this.source = source; this.active = true; this.speed = kind === "missile" ? 180 : 330; }
  update(game, dt) {
    if (!this.target?.active) { this.active = false; return; }
    const dx = this.target.x - this.x; const dy = this.target.y - this.y; const len = Math.hypot(dx, dy) || 1; const step = this.speed * dt;
    if (len <= step) { this.active = false; this.hit(game); } else { this.x += dx / len * step; this.y += dy / len * step; }
  }
  hit(game) {
    if (this.kind === "magma") {
      this.target.takeDamage(game, this.damage, "magma", this.source);
      game.zones.push(new Zone(this.x, this.y, tile * 1.7, this.damage * 0.07, 4.5, "#ff7043"));
      game.effect({ kind: "burst", x: this.x, y: this.y, life: 0.35, color: "#ff7043", radius: tile * 1.2 });
    } else if (this.kind === "flak" || this.kind === "missile") {
      const radius = this.kind === "flak" ? tile * 1.6 : tile * 2.1;
      game.effect({ kind: "burst", x: this.x, y: this.y, life: 0.35, color: this.kind === "flak" ? "#b8d4df" : "#ffc857", radius });
      game.enemies.forEach((enemy) => { if (enemy.active && distance(this, enemy) < radius && (this.kind !== "flak" || enemy.air)) enemy.takeDamage(game, this.damage * (enemy === this.target ? 1 : 0.58), this.kind, this.source); });
    } else this.target.takeDamage(game, this.damage, this.kind, this.source);
  }
  draw(ctx) { ctx.save(); ctx.fillStyle = this.kind === "missile" ? "#ffd166" : this.source?.type.color || "#ffffff"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(this.x, this.y, this.kind === "missile" ? 4 : 2.6, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}

export class Zone {
  constructor(x, y, radius, damage, duration, color) { this.x = x; this.y = y; this.radius = radius; this.damage = damage; this.duration = duration; this.life = duration; this.color = color; this.tick = 0; }
  update(game, dt) { this.life -= dt; this.tick -= dt; if (this.tick <= 0) { this.tick = 0.35; game.enemies.forEach((enemy) => { if (enemy.active && !enemy.air && distance(this, enemy) < this.radius) enemy.takeDamage(game, this.damage, "magma"); }); } }
  draw(ctx) { ctx.save(); ctx.globalAlpha = 0.16 + (this.life / this.duration) * 0.16; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 0.6; ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
}
