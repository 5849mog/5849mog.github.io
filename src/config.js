// 手机纵向屏幕优先：减少纵向格数，让完整地图在 375×812 内保持可读。
export const GRID = { cols: 10, rows: 14, tile: 40 };
export const WORLD = { width: GRID.cols * GRID.tile, height: GRID.rows * GRID.tile };

export const GAME = {
  saveVersion: 2,
  startingGold: 2400,
  startingLives: 30,
  waveBaseCount: 12,
  waveCountGrowth: 2.2,
  prepTime: 4,
  maxDt: 0.05,
};

export const TOWERS = {
  VULCAN: { name: "火神炮", icon: "✦", cost: 160, range: 4.8, damage: 24, cooldown: 0.16, target: "all", color: "#ff9b63", projectile: "bullet", description: "高速压制，连续射击会升温" },
  FLAK: { name: "暴风防空", icon: "◈", cost: 420, range: 7.2, damage: 150, cooldown: 0.9, target: "air", color: "#b8d4df", projectile: "flak", description: "专门拦截空中单位，带范围爆炸" },
  TESLA: { name: "电磁塔", icon: "ϟ", cost: 620, range: 5.4, damage: 105, cooldown: 1.25, target: "all", color: "#69a6ff", projectile: "tesla", description: "链式电弧，适合处理密集波次" },
  PRISM: { name: "光棱塔", icon: "◇", cost: 760, range: 7.1, damage: 34, cooldown: 0.1, target: "all", color: "#ff5c9d", projectile: "beam", description: "持续光束，锁定后伤害逐渐增强" },
  MAGMA: { name: "熔岩塔", icon: "▲", cost: 820, range: 5.2, damage: 72, cooldown: 1.8, target: "ground", color: "#ff7043", projectile: "magma", description: "制造燃烧区域，持续削弱地面敌人" },
  MISSILE: { name: "追猎者", icon: "⬟", cost: 1100, range: 20, damage: 420, cooldown: 2.8, target: "all", color: "#ffc857", projectile: "missile", description: "全图锁定，爆炸造成范围伤害" },
  SUPPORT: { name: "增幅器", icon: "✣", cost: 1500, range: 3.6, damage: 0, cooldown: 0, target: "none", color: "#53e6a5", projectile: "none", description: "提升范围内防御塔的火力与射速" },
  GOLD: { name: "资源核心", icon: "＄", cost: 480, range: 3.2, damage: 0, cooldown: 8, target: "none", color: "#ffd166", projectile: "none", description: "周期性提供额外资源" },
  NUKE: { name: "核弹井", icon: "☼", cost: 2000, range: 20, damage: 1500, cooldown: 14, target: "ground", color: "#ff4567", projectile: "nuke", description: "高冷却全屏打击，改变战场节奏" },
};

export const ENEMIES = {
  NORMAL: { name: "哨兵", hp: 150, speed: 38, reward: 12, color: "#8de29b", radius: 9, type: "ground" },
  FAST: { name: "疾行者", hp: 100, speed: 78, reward: 16, color: "#ff6b72", radius: 8, type: "ground" },
  SHIELD: { name: "护盾体", hp: 360, shield: 480, speed: 27, reward: 30, color: "#a7c1cf", radius: 11, type: "ground" },
  TANK: { name: "重装体", hp: 1450, speed: 18, reward: 82, color: "#9a7557", radius: 15, type: "ground" },
  BOSS: { name: "巨像", hp: 7200, shield: 2600, speed: 14, reward: 900, color: "#b47cff", radius: 23, type: "ground", boss: true },
  GHOST: { name: "幽影", hp: 190, speed: 52, reward: 22, color: "#b6c5ff", radius: 10, type: "ground", ghost: true },
  FLY: { name: "蜂鸟", hp: 230, speed: 62, reward: 38, color: "#ffbd55", radius: 9, type: "air" },
  FLY_H: { name: "轰炸机", hp: 1050, shield: 250, speed: 42, reward: 120, color: "#ff7a4f", radius: 15, type: "air" },
  MEDIC: { name: "修复者", hp: 900, shield: 180, speed: 30, reward: 46, color: "#ff83b1", radius: 12, type: "ground", medic: true },
  SPIDER: { name: "裂变兽", hp: 600, speed: 34, reward: 42, color: "#ba78e8", radius: 13, type: "ground", spider: true },
  MINI: { name: "碎片", hp: 48, speed: 82, reward: 5, color: "#d29aff", radius: 6, type: "ground" },
  REAPER: { name: "收割者", hp: 3700, shield: 1500, speed: 22, reward: 300, color: "#59616f", radius: 18, type: "ground", reaper: true },
  DASHER: { name: "突进者", hp: 760, shield: 100, speed: 35, reward: 58, color: "#55e6ff", radius: 12, type: "ground", dasher: true },
};

export function createRoute() {
  const route = [];
  let column = 1;
  route.push({ c: column, r: 0 });
  for (let row = 1; row < GRID.rows - 1; row += 1) {
    const target = row % 2 === 1 ? (row % 4 === 1 ? GRID.cols - 2 : 1) : column;
    if (row % 2 === 1) {
      const step = target > column ? 1 : -1;
      for (let c = column + step; c !== target + step; c += step) route.push({ c, r: row });
      column = target;
    } else {
      route.push({ c: column, r: row });
    }
  }
  route.push({ c: column, r: GRID.rows - 1 });
  return route;
}

export function makeWave(wave) {
  const count = Math.floor(GAME.waveBaseCount + wave * GAME.waveCountGrowth);
  const queue = [];
  for (let i = 0; i < count; i += 1) {
    const roll = Math.random();
    if (wave % 5 === 0 && i === count - 1) queue.push("BOSS");
    else if (wave > 35 && roll < 0.08) queue.push("FLY_H");
    else if (wave > 22 && roll < 0.15) queue.push("REAPER");
    else if (wave > 16 && roll < 0.25) queue.push("DASHER");
    else if (wave > 10 && roll < 0.34) queue.push("SPIDER");
    else if (wave > 7 && roll < 0.48) queue.push("MEDIC");
    else if (wave > 4 && roll < 0.60) queue.push("TANK");
    else if (wave > 2 && roll < 0.72) queue.push("FLY");
    else if (wave > 2 && roll < 0.82) queue.push("SHIELD");
    else if (wave > 1 && roll < 0.92) queue.push("FAST");
    else queue.push("NORMAL");
  }
  return queue;
}
