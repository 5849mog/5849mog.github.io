

🛡️ PLANET DEFENSE: BLACK BOX EDITION
塔防：终极防空版 (黑盒存档版)

![alt text](https://img.shields.io/badge/build-passing-brightgreen)


![alt text](https://img.shields.io/badge/platform-Mobile%20%7C%20Desktop-blue)


![alt text](https://img.shields.io/badge/tech-Vanilla%20JS%20%7C%20Canvas-yellow)


![alt text](https://img.shields.io/badge/license-MIT-orange)

"不是所有的塔防都叫行星防御。体验极致的策略深度与去中心化的存档加密技术。"

📖 项目简介 (Introduction)

Planet Defense 是一款基于 HTML5 Canvas 引擎构建的轻量级、高性能塔防模拟器。本项目摒弃了臃肿的游戏引擎，完全采用原生 JavaScript 编写，实现了零依赖 (Zero-Dependency) 的架构设计。

该版本为 Black Box Edition (黑盒版)，集成了专有的反 AI 混淆存档算法（Anti-AI Obfuscation），并针对移动端设备进行了深度触控优化与性能调优。支持动态环境渲染（樱花系统）与沉浸式音频流管理。

🚀 核心特性 (Key Features)
⚡ 极致性能与架构

Single-File Architecture: 所有的游戏逻辑、渲染引擎与 UI 系统通过单 HTML 文件交付，部署极其便捷。

Canvas 2D Rendering: 基于像素级操作的渲染管线，支持数百个粒子特效与弹道同屏流畅运行。

Responsive Viewport: 针对移动端 WebView 深度适配，支持 touch-action 优化与动态分辨率缩放。

🔒 黑盒存档系统 (The Black Box Storage)

Poly-morphic Serialization: 存档数据并非简单的 JSON，而是经过了去语义化的扁平化处理。

Salted Rolling XOR Encryption: 内置自定义的滚动异或加密算法与动态盐值（Salt）注入，有效防止数据篡改与 AI 暴力破解。

Data Integrity Check: 存档包含 CRC 校验机制，确保载入数据的绝对安全。

🎮 深度策略机制

Synergy System: 塔防单位之间存在复杂的 buff 增益与元素连锁（如电磁塔的连锁闪电、光棱塔的折射机制）。

Dynamic Wave Logic: 随波次指数级增长的非线性难度曲线，包含 BOSS 战与特种敌人（隐形、护盾、治疗）。

Environmental Interaction: 动态地形破坏（熔岩塔）与全图打击（核弹井）。

🎨 沉浸式体验

Dynamic Asset Injection: 支持按需加载樱花粒子特效（Sakura FX），最大化节省移动端电量。

Audio Stream Control: 内置 BGM 循环控制流，支持移动端音频自动播放策略的优雅降级处理。

🛠️ 快速开始 (Quick Start)
环境要求

任何支持 HTML5 标准的现代浏览器 (Chrome, Safari, Firefox, Edge)。

推荐在移动端 (iOS/Android) 体验最佳触控效果。

部署与运行

克隆或下载本项目到本地。

确保 You.mp3 音频文件与 index.html 位于同一级目录（用于 BGM）。

直接双击打开 index.html 或将其部署至任意静态服务器（GitHub Pages/Vercel）。

code
Bash
download
content_copy
expand_less
# 目录结构示例
/project-root
  ├── index.html        # 核心游戏引擎
  ├── You.mp3           # 背景音乐文件
  └── README.md         # 说明文档
⚔️ 武器库数据 (Arsenal Specs)
代号	名称	类型	战术定位	特殊能力
VULCAN	火神炮	动能	持续输出	预热机制，攻速随时间递增
TESLA	电磁塔	能量	连锁控制	电荷爆炸，AOE 传导伤害
PRISM	光棱塔	光束	群体歼灭	激光折射，多目标即时打击
FLAK	暴风防空	高爆	对空专精	空中单位 300% 暴击伤害
NET	天网捕手	物理	辅助控制	强力减速与百分比切割
NUKE	核弹井	战略	终极清屏	全屏震慑，辐射残留伤害
DRONE	截击机	载具	独立作战	动态挂载，蜂群作战模式
📱 移动端操作指南 (Mobile Controls)

UI 交互: 顶部栏集成了全新的控制中心。

🎵: 切换背景音乐流 (BGM Stream Toggle)。

🌸: 动态注入/移除樱花粒子特效 (Sakura Injector)。

建造: 点击底部商店卡片选中，再次点击地图空白处部署。

升级: 点击已建造的防御塔，消耗资源进行固件升级。

存档: 在暂停菜单中选择 "导出存档"，将生成 .pds 加密文件。

🔧 技术细节 (Technical Details)
Anti-AI Obfuscation 逻辑片段

为了防止数据被简单读取，我们采用了以下流式加密方案：

code
JavaScript
download
content_copy
expand_less
// 核心加密逻辑摘要
const ObscureStorage = {
    encrypt: function(stream) {
        // 动态盐值注入
        // 滚动密钥异或运算
        // 头部指纹校验
        return encryptedBlob;
    }
};
樱花特效 (Sakura Module)

采用 Lazy Load 模式，仅在用户激活时请求远程脚本，极大降低了初始加载时间 (TTFB) 和内存占用。

code
JavaScript
download
content_copy
expand_less
// 动态脚本注入
const script = document.createElement('script');
script.src = "https://api.suyanw.cn/api/mouse/yinghua.js"; // External Resource
📄 版权说明 (License)

本项目基于 MIT 协议开源。
您可以自由修改、分发本项目的源代码，但请保留原作者的版权声明。

Copyright (c) 2024 Planet Defense Team.

Project maintained by [Your Name/GitHub ID]
Powering the defense of the digital frontier.
