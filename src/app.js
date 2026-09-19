import { GAME, TOWERS } from "./config.js";
import { Game } from "./game.js";
import { Renderer } from "./renderer.js";
import { loadRemoteSave, loadTextFile, packSave } from "./storage.js";

const $ = (id) => document.getElementById(id);
const game = new Game();
const renderer = new Renderer($("game-canvas"));
const bgm = $("bgm");
let soundEnabled = false;
let lastTime = performance.now();
let lastMessage = "";
let toastTimer = 0;

function showModal(id, visible) { $(id).classList.toggle("hidden", !visible); }
function startAudio() { if (!soundEnabled) return; bgm.volume = 0.22; bgm.play().catch(() => {}); }
function beep(frequency = 440, duration = 0.05) {
  if (!soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = beep.context || (beep.context = new AudioContext());
  const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.frequency.value = frequency; oscillator.type = "sine"; gain.gain.setValueAtTime(0.045, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
}

function showToast(message, tone = "cyan") {
  const node = document.createElement("div"); node.className = "toast"; node.style.borderLeftColor = tone === "danger" ? "var(--red)" : tone === "gold" ? "var(--gold)" : "var(--cyan)"; node.textContent = message; $("toast-stack").appendChild(node); setTimeout(() => node.remove(), 3300);
}

function buildTowerCards() {
  const grid = $("tower-grid"); grid.innerHTML = "";
  Object.entries(TOWERS).forEach(([key, type]) => {
    const card = document.createElement("button"); card.className = "tower-card"; card.dataset.key = key; card.style.setProperty("--accent", type.color); card.innerHTML = `<span class="tower-icon">${type.icon}</span><strong>${type.name}</strong><small>${type.description}</small><span class="cost">${type.cost}</span>`;
    card.addEventListener("click", () => { if (game.gold < type.cost) { showToast("资源不足，先稳住下一波", "danger"); beep(160, .08); return; } game.selectBuild(key); beep(500, .06); }); grid.appendChild(card);
  });
}

function renderSelection() {
  const panel = $("selection-panel");
  if (game.selectedBuild) {
    const type = TOWERS[game.selectedBuild]; panel.innerHTML = `<div class="selection-detail"><div><span class="eyebrow">DEPLOYMENT MODE</span><h2 style="color:${type.color}">${type.icon} ${type.name}</h2><p>${type.description}<br>点击地图上的高亮空地完成部署。</p></div><div class="level-dots">NEW</div></div>`; return;
  }
  if (!game.selectedTower) { panel.innerHTML = `<div class="selection-empty"><span class="selection-icon">⌖</span><strong>选择一个防御塔</strong><small>点击上方卡片部署，或点击地图上的建筑查看详情</small></div>`; return; }
  const tower = game.selectedTower; const type = tower.type; const dots = "●".repeat(Math.min(10, tower.level)) + "○".repeat(Math.max(0, 10 - tower.level));
  panel.innerHTML = `<div class="selection-detail"><div><span class="eyebrow">ACTIVE STRUCTURE</span><h2 style="color:${type.color}">${type.icon} ${type.name}</h2><p>${type.description}</p><div class="level-dots">${dots}</div></div><div class="detail-stat">LV <b>${tower.level}</b><br>伤害 <b>${Math.floor(tower.damage)}</b><br>范围 <b>${type.range.toFixed(1)}</b></div></div><div class="detail-actions"><button class="mini-btn upgrade" id="upgrade-btn">升级 · ${tower.level >= tower.maxLevel ? "MAX" : tower.upgradeCost}</button><button class="mini-btn sell" id="sell-btn">回收 · ${tower.refund}</button></div>`;
  $("upgrade-btn").disabled = tower.level >= tower.maxLevel || game.gold < tower.upgradeCost; $("upgrade-btn").addEventListener("click", () => { if (game.upgradeSelected()) { beep(760, .08); showToast("结构升级完成", "gold"); } }); $("sell-btn").addEventListener("click", () => { if (game.sellSelected()) { beep(280, .08); showToast("结构已回收", "cyan"); } });
}

function renderHud() {
  $("gold-value").textContent = Math.floor(game.gold); $("life-value").textContent = game.lives; $("wave-value").textContent = game.wave; $("combo-value").textContent = game.combo;
  $("combo-pill").classList.toggle("active", game.combo > 2); $("auto-switch").classList.toggle("on", game.autoWave);
  $("wave-state").textContent = game.phase === "paused" ? "PAUSED" : game.phase === "gameover" ? "OFFLINE" : game.waveQueue.length || game.enemies.length ? "ENGAGED" : "STANDBY";
  $("prep-label").textContent = game.prepTimer > 0 ? `下一波整备 ${Math.ceil(game.prepTimer)}s` : game.wave > 0 ? "等待指令" : "整备中";
  $("wave-btn").disabled = game.phase !== "playing" || Boolean(game.waveQueue.length || game.enemies.length || game.prepTimer > 0); $("wave-btn").querySelector("span").textContent = game.wave % 5 === 4 ? "召唤巨像波次" : "开始下一波";
  $("game-message").textContent = game.message;
  document.querySelectorAll(".tower-card").forEach((card) => { const type = TOWERS[card.dataset.key]; card.classList.toggle("selected", game.selectedBuild === card.dataset.key); card.classList.toggle("insufficient", game.gold < type.cost); });
  if (game.message !== lastMessage) { lastMessage = game.message; $("stage-toast").textContent = game.message; $("stage-toast").style.opacity = "1"; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("stage-toast").style.opacity = "0"; }, 2600); }
}

function render() {
  renderHud();
  renderSelection();
  showModal("start-modal", game.phase === "menu"); showModal("pause-modal", game.phase === "paused"); showModal("gameover-modal", game.phase === "gameover");
  if (game.phase === "gameover") $("gameover-copy").textContent = `你坚持到了第 ${game.wave} 波，最终核心完整度为 ${Math.max(0, game.lives)}。`;
}

function downloadSave() { const blob = new Blob([packSave(game.snapshot())], { type: "text/plain;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `planet-defense-${Date.now()}.pds`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); showToast("PD2 存档已导出", "gold"); }
async function importSnapshot(file) { try { game.load(await loadTextFile(file)); showToast("存档载入成功"); } catch (error) { $("error-copy").textContent = error.message || "文件格式或校验不正确。"; showModal("error-modal", true); } }

function bind() {
  buildTowerCards();
  $("new-game-btn").addEventListener("click", () => { game.startNew(); startAudio(); beep(620, .1); });
  $("again-btn").addEventListener("click", () => { game.startNew(); startAudio(); }); $("restart-btn").addEventListener("click", () => { game.startNew(); }); $("resume-btn").addEventListener("click", () => game.pause()); $("pause-btn").addEventListener("click", () => game.pause()); $("error-close-btn").addEventListener("click", () => showModal("error-modal", false));
  $("wave-btn").addEventListener("click", () => { if (game.startWave()) { beep(680, .1); showToast(`第 ${game.wave} 波已开始`); } }); $("auto-btn").addEventListener("click", () => { game.autoWave = !game.autoWave; game.emit(); }); $("save-btn").addEventListener("click", downloadSave); $("pause-save-btn").addEventListener("click", downloadSave); $("file-input").addEventListener("change", (event) => { const [file] = event.target.files; if (file) importSnapshot(file); event.target.value = ""; });
  $("sound-btn").addEventListener("click", () => { soundEnabled = !soundEnabled; $("sound-btn").classList.toggle("active", soundEnabled); if (soundEnabled) { startAudio(); beep(520, .07); } else bgm.pause(); });
  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", async () => { try { game.load(await loadRemoteSave(button.dataset.preset)); showToast("预设战局已载入"); } catch (error) { $("error-copy").textContent = error.message || "预设存档无法载入。"; showModal("error-modal", true); } }));
  $("game-canvas").addEventListener("pointerup", (event) => { event.preventDefault(); if (game.phase !== "playing") return; const cell = renderer.screenToCell(event); if (game.selectedBuild) { if (game.placeTower(cell.c, cell.r)) { beep(720, .06); showToast("防御塔部署完成"); } else { beep(170, .07); showToast("这里无法部署", "danger"); } } else game.selectAt(cell.c, cell.r); });
  window.addEventListener("resize", () => renderer.resize()); window.addEventListener("keydown", (event) => { if (event.code === "Space") { event.preventDefault(); if (game.startWave()) beep(680, .1); } if (event.code === "Escape" && game.phase !== "menu" && game.phase !== "gameover") game.pause(); const keys = Object.keys(TOWERS); const index = Number(event.key) - 1; if (index >= 0 && keys[index]) game.selectBuild(keys[index]); });
  game.onChange(render);
}

function loop(now) { const dt = Math.min(GAME.maxDt, (now - lastTime) / 1000); lastTime = now; game.update(dt); renderHud(); renderer.draw(game); requestAnimationFrame(loop); }

bind(); renderer.resize(); render(); requestAnimationFrame(loop);
