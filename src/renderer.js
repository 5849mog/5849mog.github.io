import { GRID, WORLD } from "./config.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.scale = 1; this.offsetX = 0; this.offsetY = 0; this.cssWidth = 1; this.cssHeight = 1; this.dpr = 1;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.cssWidth = Math.max(1, rect.width); this.cssHeight = Math.max(1, rect.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.cssWidth * this.dpr); this.canvas.height = Math.floor(this.cssHeight * this.dpr);
    this.scale = Math.min(this.cssWidth / WORLD.width, this.cssHeight / WORLD.height);
    this.offsetX = (this.cssWidth - WORLD.width * this.scale) / 2;
    this.offsetY = (this.cssHeight - WORLD.height * this.scale) / 2;
  }

  screenToCell(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - this.offsetX) / this.scale;
    const y = (event.clientY - rect.top - this.offsetY) / this.scale;
    return { c: Math.floor(x / GRID.tile), r: Math.floor(y / GRID.tile), x, y };
  }

  draw(game) {
    const { ctx } = this;
    const shakeX = (Math.random() - 0.5) * game.shakeAmount;
    const shakeY = (Math.random() - 0.5) * game.shakeAmount;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const background = ctx.createLinearGradient(0, 0, this.cssWidth, this.cssHeight); background.addColorStop(0, "#06121d"); background.addColorStop(1, "#0b0b19");
    ctx.fillStyle = background; ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * (this.offsetX + shakeX), this.dpr * (this.offsetY + shakeY));
    this.drawBoard(game);
    game.zones.forEach((zone) => zone.draw(ctx));
    game.towers.forEach((tower) => tower.draw(ctx, game));
    game.projectiles.forEach((projectile) => projectile.draw(ctx));
    game.enemies.forEach((enemy) => enemy.draw(ctx, game));
    this.drawEffects(game);
    this.drawParticles(game);
  }

  drawBoard(game) {
    const { ctx } = this;
    ctx.fillStyle = "#081723"; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = "rgba(96,148,181,.09)"; ctx.lineWidth = 1;
    for (let c = 0; c <= GRID.cols; c += 1) { ctx.beginPath(); ctx.moveTo(c * GRID.tile, 0); ctx.lineTo(c * GRID.tile, WORLD.height); ctx.stroke(); }
    for (let r = 0; r <= GRID.rows; r += 1) { ctx.beginPath(); ctx.moveTo(0, r * GRID.tile); ctx.lineTo(WORLD.width, r * GRID.tile); ctx.stroke(); }
    game.route.forEach(({ c, r }, index) => {
      const isStart = index === 0; const isEnd = index === game.route.length - 1;
      ctx.fillStyle = isStart || isEnd ? "rgba(73,213,255,.18)" : "rgba(53,104,130,.21)";
      ctx.fillRect(c * GRID.tile + 2, r * GRID.tile + 2, GRID.tile - 4, GRID.tile - 4);
    });
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = GRID.tile * 0.38; ctx.strokeStyle = "rgba(7,19,30,.76)"; ctx.beginPath();
    game.route.forEach(({ c, r }, index) => { const x = c * GRID.tile + GRID.tile / 2; const y = r * GRID.tile + GRID.tile / 2; if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(92,170,198,.45)"; ctx.stroke(); ctx.restore();
    this.drawPortal(ctx, game.route[0], "IN", "#55e6ff"); this.drawPortal(ctx, game.route[game.route.length - 1], "CORE", "#ff6b72");
    if (game.selectedBuild) {
      ctx.fillStyle = "rgba(83,230,165,.13)";
      for (let r = 0; r < GRID.rows; r += 1) for (let c = 0; c < GRID.cols; c += 1) if (game.canBuild(c, r)) ctx.fillRect(c * GRID.tile + 4, r * GRID.tile + 4, GRID.tile - 8, GRID.tile - 8);
    }
  }

  drawPortal(ctx, cell, label, color) {
    if (!cell) return; const x = cell.c * GRID.tile + GRID.tile / 2; const y = cell.r * GRID.tile + GRID.tile / 2; const pulse = 0.85 + Math.sin(performance.now() / 260) * 0.1;
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.75; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, GRID.tile * 0.32 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = color; ctx.font = "bold 7px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, x, y); ctx.restore();
  }

  drawEffects(game) {
    const { ctx } = this;
    game.effects.forEach((effect) => {
      const alpha = Math.min(1, effect.life * 3);
      ctx.save();
      if (effect.kind === "arc") { ctx.strokeStyle = effect.color; ctx.globalAlpha = alpha; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.lineTo((effect.x + effect.tx) / 2 + (Math.random() - 0.5) * 18, (effect.y + effect.ty) / 2 + (Math.random() - 0.5) * 18); ctx.lineTo(effect.tx, effect.ty); ctx.stroke(); }
      if (effect.kind === "burst" || effect.kind === "build" || effect.kind === "upgrade") { const progress = 1 - effect.life / (effect.kind === "burst" ? 0.45 : effect.kind === "build" ? 0.5 : 0.7); ctx.globalAlpha = alpha; ctx.strokeStyle = effect.color || "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(effect.x, effect.y, (effect.radius || 24) * progress, 0, Math.PI * 2); ctx.stroke(); }
      if (effect.kind === "nuke") { const progress = 1 - effect.life / 0.7; ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = "#ff4567"; ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius * progress, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = alpha; ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius * progress, 0, Math.PI * 2); ctx.stroke(); }
      if (effect.kind === "heal") { ctx.strokeStyle = "#65e6a2"; ctx.globalAlpha = alpha; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.lineTo(effect.tx, effect.ty); ctx.stroke(); }
      if (effect.kind === "wave") { ctx.globalAlpha = alpha * 0.6; ctx.strokeStyle = "#55e6ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(WORLD.width / 2, WORLD.height / 2, (1.2 - effect.life) * 230, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    });
  }

  drawParticles(game) {
    const { ctx } = this;
    game.particles.forEach((particle) => { ctx.save(); ctx.globalAlpha = Math.min(1, particle.life / particle.maxLife); ctx.fillStyle = particle.color; ctx.font = "bold 12px system-ui"; ctx.textAlign = "center"; ctx.fillText(particle.text, particle.x, particle.y); ctx.restore(); });
  }
}
