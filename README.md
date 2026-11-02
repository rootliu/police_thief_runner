# Lode Runner · 洞窟归来

[在线游玩](https://rootliu.github.io/police_thief_runner/)

将原有「警察抓小偷」Canvas 游戏演进为经典洞窟风格的浏览器游戏，视觉参考 [Lode Runner: The Legend Returns (1994)](https://www.retrogames.cz/play_1249-DOS.php)。这是原生 JavaScript 致敬版，不是 DOSBox 模拟器，也不包含原版程序、关卡、美术或音乐。

## 游玩

- 方向键：左右行走、上下爬梯；横杆上按下松手。
- Z / X：挖开左下 / 右下的土块。洞在 6 秒后回填，守卫落洞后暂时被困，回填时重生。
- 收齐所有黄金后，爬到顶部发光出口；共三座原创洞窟。
- P：暂停 / 继续；R：从第一关重新开始；Enter：开始 / 继续 / 下一关。
- 手机提供触屏按键；支持 CRT 扫描线、全屏、可选合成音效。声音默认关闭。
- 离开窗口自动暂停。死亡保留当前关卡已收集黄金，复位角色和洞穴；重开重置全部进度。

## 本地运行与测试

无需打包和运行时依赖：

```sh
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
node --test tests/engine.test.cjs
```

`js/engine.js` 是独立的固定 60 Hz 模拟，处理地图、移动、重力、BFS 守卫寻路、陷阱和通关。`js/game.js` 负责 Canvas 像素绘制、输入、音效和页面状态。关卡由 `makeLevel()` 创建，每次重开使用独立地图。

自动测试覆盖重开恢复、暂停冻结、洞穴回填和守卫重生、出口条件、死亡保护、三关胜利、地图可达性，以及使用真实固定步长方向键输入走完三关全部黄金和出口（路线测试移除敌人，以单独验证地形）。浏览器人工自动化验证桌面键盘、移动触控、暂停、重开、挖洞、声音/CRT 开关及布局；不声称完整复刻原作 150 关、工具系统或双人模式。

GitHub Actions 在 push / PR 时运行引擎测试；GitHub Pages 从 master 根目录发布。
