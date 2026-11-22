const list = document.querySelector("#backup-files");
const status = document.querySelector("#backup-status");

function stored(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function offer(name, filename, value) {
  const link = document.createElement("a");
  const row = document.createElement("li");
  link.download = filename;
  link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  link.textContent = name;
  row.append(link);
  list.append(row);
}

const archive = stored("gomoku-archive:/ai/:v1");
if (archive?.version === 1 && Array.isArray(archive.entries) && archive.entries.length) {
  const entries = archive.entries.map(entry => ({
    ...entry, createdAt: entry.createdAt ?? entry.updatedAt,
    name: entry.name ?? "", note: entry.note ?? "", favorite: Boolean(entry.favorite), meta: entry.meta ?? {}
  }));
  offer("最近对局 / Recent games", "gomoku-studio-legacy-archive.json", { format: "wumu-archive-backup", version: 1, entries });
}
const current = stored("gomoku-opening:/ai/:v1")?.record;
if (current?.format === "gomoku-opening") offer("当前对局 / Current game", "gomoku-studio-legacy-position.json", current);
const freestyle = stored("gomoku-game:/ai/:v1");
if (freestyle?.format === "gomoku-studio") offer("早期无禁手对局 / Earlier freestyle game", "gomoku-studio-legacy-freestyle.json", freestyle);
if (!list.children.length) status.textContent = "此浏览器没有可下载的旧棋局。 No old games found in this browser.";
