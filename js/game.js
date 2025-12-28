// 游戏主类

class Game {
    constructor() {
        console.log('===== GAME VERSION 20231227e LOADED =====');
        console.log('Ladder two-pass rendering: ENABLED');
        console.log('Trap Y-axis alignment fix: ENABLED');
        console.log('Trap X-axis alignment fix: ENABLED');
        console.log('Render order fix: ENABLED (background → player → enemy → ladders)');
        console.log('Floating treasure fix: ENABLED');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GameState.PLAYING;
        this.score = 0;
        this.lives = INITIAL_LIVES;
        this.currentLevel = 1;
        this.keys = {};
        this.keyPressed = {};

        // 初始化关卡
        this.level = new Level(LEVEL_1);
        this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
        this.enemies = [];

        // 生成敌人
        for (let spawn of this.level.enemySpawns) {
            this.enemies.push(new Enemy(spawn.x, spawn.y));
        }

        this.totalTreasures = this.level.countTreasures();
        this.collectedTreasures = 0;

        // 设置键盘监听
        this.setupInput();

        // 更新UI
        this.updateUI();

        // 启动游戏循环
        this.lastTime = 0;
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            // 处理单次按键（挖洞）
            if ((e.key === 'z' || e.key === 'Z') && !this.keyPressed['z']) {
                this.keyPressed['z'] = true;
                this.player.digLeft(this.level);
            }
            if ((e.key === 'x' || e.key === 'X') && !this.keyPressed['x']) {
                this.keyPressed['x'] = true;
                this.player.digRight(this.level);
            }

            // 暂停
            if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }

            // 重启
            if (e.key === 'r' || e.key === 'R') {
                this.restart();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            if (e.key === 'z' || e.key === 'Z') {
                this.keyPressed['z'] = false;
            }
            if (e.key === 'x' || e.key === 'X') {
                this.keyPressed['x'] = false;
            }
        });
    }

    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (this.state === GameState.PLAYING) {
            this.update(deltaTime);
        }

        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // 更新洞的状态
        this.level.updateHoles();

        // 更新玩家
        this.player.update(this.keys, this.level);

        // 检查宝物收集
        if (this.player.collectTreasure(this.level)) {
            this.collectedTreasures++;
            this.score += 100;
            this.updateUI();
        }

        // 更新敌人
        const playerPos = this.player.getPosition();
        for (let enemy of this.enemies) {
            enemy.update(playerPos.x, playerPos.y, this.level);

            // 检查与玩家的碰撞
            if (enemy.checkCollisionWithPlayer(playerPos.x, playerPos.y, this.player.width, this.player.height)) {
                this.playerCaught();
            }
        }

        // 检查关卡完成
        if (this.collectedTreasures >= this.totalTreasures) {
            this.levelComplete();
        }
    }

    render() {
        // 清屏
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 渲染关卡背景（不含梯子）
        this.level.renderBackground(this.ctx);

        // 渲染玩家
        this.player.render(this.ctx);

        // 渲染敌人
        for (let enemy of this.enemies) {
            enemy.render(this.ctx);
        }

        // 渲染梯子（显示在最上层，覆盖玩家和敌人）
        this.level.renderLadders(this.ctx);

        // 渲染暂停提示
        if (this.state === GameState.PAUSED) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂停', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('按 P 继续', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }

        // 渲染关卡完成
        if (this.state === GameState.LEVEL_COMPLETE) {
            this.ctx.fillStyle = 'rgba(0, 100, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('关卡完成!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('按 R 重新开始', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }

        // 渲染游戏结束
        if (this.state === GameState.GAME_OVER) {
            this.ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('按 R 重新开始', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }

    playerCaught() {
        this.lives--;
        this.updateUI();

        if (this.lives <= 0) {
            this.state = GameState.GAME_OVER;
        } else {
            // 重置玩家位置
            this.player.reset(this.level.playerStart.x, this.level.playerStart.y);
            // 重置敌人位置
            for (let enemy of this.enemies) {
                enemy.respawn();
            }
        }
    }

    levelComplete() {
        this.state = GameState.LEVEL_COMPLETE;
        this.score += 1000; // 关卡完成奖励
        this.updateUI();
    }

    togglePause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
        } else if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
        }
    }

    restart() {
        this.lives = INITIAL_LIVES;
        this.collectedTreasures = 0;
        this.state = GameState.PLAYING;

        // 重新初始化关卡
        this.level = new Level(LEVEL_1);
        this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
        this.enemies = [];

        for (let spawn of this.level.enemySpawns) {
            this.enemies.push(new Enemy(spawn.x, spawn.y));
        }

        this.totalTreasures = this.level.countTreasures();
        this.updateUI();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.currentLevel;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('treasures').textContent = this.collectedTreasures;
        document.getElementById('total-treasures').textContent = this.totalTreasures;
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new Game();
});
