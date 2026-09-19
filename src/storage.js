const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(text) {
  const bytes = textEncoder.encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return textDecoder.decode(bytes);
}

function hash(value) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) { result ^= value.charCodeAt(i); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(16).padStart(8, "0");
}

export function packSave(snapshot) {
  const payload = JSON.stringify(snapshot);
  return `PD2|${hash(payload)}|${toBase64(payload)}`;
}

export function unpackSave(content) {
  const value = String(content || "").trim();
  if (value.startsWith("PD2|")) {
    const parts = value.split("|");
    if (parts.length !== 3) throw new Error("存档头损坏");
    const payload = fromBase64(parts[2]);
    if (hash(payload) !== parts[1]) throw new Error("存档校验失败");
    return JSON.parse(payload);
  }
  return legacyToSnapshot(legacyDecode(value));
}

function legacyDecode(value) {
  const parts = value.split("S");
  if (parts.length !== 2) throw new Error("无法识别的存档格式");
  const body = parts[0];
  const expected = Number.parseInt(parts[1], 16);
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) sum = (sum + body.charCodeAt(i)) % 997;
  if (sum !== expected) throw new Error("旧存档校验失败");
  const salt = [13, 7, 23, 11, 19, 5, 17];
  let key = 0xab;
  const result = [];
  body.split("X").forEach((item, index) => {
    if (!item) return;
    let decoded = "";
    for (let i = 0; i < item.length; i += 2) { decoded += String.fromCharCode(Number.parseInt(item.slice(i, i + 2), 16) ^ key); key = (key + 5) % 255; }
    const salted = Number.parseInt(decoded, 16);
    result.push((salted - index * 3) / salt[index % salt.length]);
  });
  return result;
}

function legacyToSnapshot(data) {
  let pointer = 0;
  const snapshot = { version: 2, wave: data[pointer++] || 0, gold: data[pointer - 3] || 0, lives: data[pointer - 4] || 30, autoWave: Boolean(data[pointer - 1]), towers: [], enemies: [] };
  // Legacy header order was: gold, lives, wave, waveActive, autoWave.
  snapshot.gold = data[0] || 0; snapshot.lives = data[1] || 30; snapshot.wave = data[2] || 0; snapshot.autoWave = Boolean(data[4]); pointer = 5;
  const towerCount = Math.max(0, Math.floor(data[pointer++] || 0));
  const oldTowers = ["VULCAN", "FLAK", "NET", "TESLA", "MAGMA", "BUFF", "PRISM", "MISSILE", "NUKE", "GOLD", "DRONE"];
  for (let i = 0; i < towerCount; i += 1) {
    const type = oldTowers[data[pointer++]];
    const level = data[pointer++]; const c = data[pointer++]; const r = data[pointer++]; const heat = data[pointer++]; pointer += 1;
    if (type && type !== "DRONE") snapshot.towers.push({ typeKey: type === "BUFF" ? "SUPPORT" : type, level, c, r, heat });
  }
  const enemyCount = Math.max(0, Math.floor(data[pointer++] || 0));
  const oldEnemies = ["NORMAL", "FAST", "SHIELD", "TANK", "BOSS", "GHOST", "FLY", "FLY_H", "MEDIC", "SPIDER", "MINI", "REAPER", "DASHER"];
  for (let i = 0; i < enemyCount; i += 1) {
    const typeKey = oldEnemies[data[pointer++]]; const x = data[pointer++]; const y = data[pointer++]; const hp = data[pointer++]; const shield = data[pointer++]; const pathIndex = data[pointer++];
    if (typeKey) snapshot.enemies.push({ typeKey, x, y, hp, shield, pathIndex });
  }
  return snapshot;
}

export async function loadTextFile(file) { return unpackSave(await file.text()); }
export async function loadRemoteSave(url) { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error("预设存档不存在"); return unpackSave(await response.text()); }
