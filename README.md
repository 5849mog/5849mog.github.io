# Planet Defense: Reforged

这是 `5849mog/5849mog.github.io` 的模块化重构版本。

## 这次升级改变了什么

- 从单文件脚本拆分为 ES Modules：配置、实体、游戏状态、Canvas 渲染、存档、应用入口分别维护。
- 使用基于 `requestAnimationFrame + delta time` 的游戏时钟，避免 60Hz 与 120Hz 设备速度不同。
- Canvas 使用设备像素比绘制，适配手机、平板和桌面窗口尺寸。
- 重新设计移动端指挥面板：炮塔卡片、选中详情、升级/回收、自动波次、暂停和存档入口集中管理。
- 增加更清晰的战斗反馈：目标范围、部署高亮、命中数字、连击、爆炸、电弧、光束、整备奖励和波次过场。
- 存档采用版本化 `PD2` 格式，并保留旧版 `.pds` 的读取兼容能力。
- 移除樱花特效的远程脚本依赖，核心玩法可以离线运行。

## 目录

```text
index.html             页面骨架
styles.css             移动端优先界面与视觉系统
src/config.js          地图、炮塔、敌人和波次配置
src/entities.js        敌人、炮塔、投射物、区域实体
src/game.js            游戏状态与模拟循环
src/renderer.js        高清 Canvas 渲染与屏幕坐标转换
src/storage.js         PD2 存档及旧版存档兼容读取
src/app.js             输入、UI、音频与应用启动
legacy/                原版 index.html 备份
```

## 运行

推荐通过 GitHub Pages 或任意静态服务器打开。ES Module 在部分浏览器的 `file://` 环境下会受跨域策略限制。

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080/`。

## 操作

- 点击炮塔卡片，再点击地图高亮空地进行部署。
- 点击地图上的炮塔，可以查看范围、等级、升级费用和回收金额。
- `SPACE` 开始下一波，`ESC` 暂停，数字键 `1` 至 `9` 快速选择炮塔。
- 可以直接导入旧版 `.pds` 预设，也可以导出新版 `PD2` 存档。

## 版本说明

本版本优先提升实际游戏手感与可维护性。旧版源码保存在 `legacy/index-v1.8.1.html`，用于对照和回溯，不再作为入口运行。
