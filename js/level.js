// 关卡系统

class Level {
    constructor(levelData) {
        this.map = levelData.map;
        this.playerStart = levelData.playerStart;
        this.enemySpawns = levelData.enemySpawns || [];
        this.dugHoles = []; // 存储被挖的洞 {x, y, timestamp}
    }

    // 获取指定位置的地图块
    getTile(gridX, gridY) {
        if (gridY < 0 || gridY >= this.map.length || gridX < 0 || gridX >= this.map[0].length) {
            return TILES.SOLID; // 边界外视为墙
        }
        return this.map[gridY][gridX];
    }

    // 设置指定位置的地图块
    setTile(gridX, gridY, tile) {
        if (gridY >= 0 && gridY < this.map.length && gridX >= 0 && gridX < this.map[0].length) {
            this.map[gridY][gridX] = tile;
        }
    }

    // 挖洞
    digHole(gridX, gridY, side) {
        const targetX = side === Direction.LEFT ? gridX - 1 : gridX + 1;
        const targetY = gridY + 1; // 挖脚下的洞

        const tile = this.getTile(targetX, targetY);

        // 只能挖砖块
        if (tile === TILES.BRICK) {
            this.setTile(targetX, targetY, TILES.DUG_HOLE);
            this.dugHoles.push({
                x: targetX,
                y: targetY,
                timestamp: Date.now()
            });
            return true;
        }
        return false;
    }

    // 更新洞的状态（填补旧洞）
    updateHoles() {
        const currentTime = Date.now();
        this.dugHoles = this.dugHoles.filter(hole => {
            if (currentTime - hole.timestamp >= HOLE_REFILL_TIME) {
                this.setTile(hole.x, hole.y, TILES.BRICK);
                return false; // 移除这个洞
            }
            return true; // 保留这个洞
        });
    }

    // 统计宝物数量
    countTreasures() {
        let count = 0;
        for (let row of this.map) {
            for (let tile of row) {
                if (tile === TILES.TREASURE) count++;
            }
        }
        return count;
    }

    // 渲染背景（除梯子外的所有元素）
    renderBackground(ctx) {
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                if (tile !== TILES.LADDER) {
                    this.renderTile(ctx, tile, x, y);
                }
            }
        }
    }

    // 渲染梯子（显示在最上层）
    renderLadders(ctx) {
        let ladderCount = 0;
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                if (tile === TILES.LADDER) {
                    this.renderTile(ctx, tile, x, y);
                    ladderCount++;
                }
            }
        }

        if (ladderCount > 0 && Math.random() < 0.01) { // 1%概率打印，避免刷屏
            console.log(`Rendered ${ladderCount} ladders on top layer`);
        }
    }

    // 保留旧的render方法以兼容（调用新的两个方法）
    render(ctx) {
        this.renderBackground(ctx);
        this.renderLadders(ctx);
    }

    // 渲染单个地图块（像素风格）
    renderTile(ctx, tile, gridX, gridY) {
        const px = gridX * TILE_SIZE;
        const py = gridY * TILE_SIZE;

        switch (tile) {
            case TILES.BRICK:
                // 砖块纹理
                ctx.fillStyle = COLORS.BRICK;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                // 砖块细节
                ctx.strokeStyle = '#A0522D';
                ctx.beginPath();
                ctx.moveTo(px, py + TILE_SIZE / 2);
                ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
                ctx.stroke();
                break;

            case TILES.SOLID:
                // 坚固墙
                ctx.fillStyle = COLORS.SOLID;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#505050';
                ctx.lineWidth = 2;
                ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                break;

            case TILES.LADDER:
                // 梯子 - 检查上下是否有连接
                const tileAbove = this.map[gridY - 1]?.[gridX];
                const tileBelow = this.map[gridY + 1]?.[gridX];
                const hasAbove = tileAbove === TILES.LADDER || tileAbove === TILES.EMPTY;
                const hasBelow = tileBelow === TILES.LADDER || tileBelow === TILES.EMPTY;

                ctx.strokeStyle = COLORS.LADDER;
                ctx.lineWidth = 4;
                ctx.beginPath();
                // 左侧竖杆 - 如果上方有连接则延伸到格子外
                ctx.moveTo(px + 8, hasAbove ? py - 4 : py);
                ctx.lineTo(px + 8, hasBelow ? py + TILE_SIZE + 4 : py + TILE_SIZE);
                // 右侧竖杆
                ctx.moveTo(px + 24, hasAbove ? py - 4 : py);
                ctx.lineTo(px + 24, hasBelow ? py + TILE_SIZE + 4 : py + TILE_SIZE);
                ctx.stroke();

                // 横档
                ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    const rungY = py + 8 + i * 12;
                    ctx.beginPath();
                    ctx.moveTo(px + 8, rungY);
                    ctx.lineTo(px + 24, rungY);
                    ctx.stroke();
                }
                break;

            case TILES.BAR:
                // 横杆
                ctx.strokeStyle = COLORS.BAR;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(px, py + TILE_SIZE / 2);
                ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
                ctx.stroke();
                break;

            case TILES.TREASURE:
                // 宝物（钻石）
                ctx.fillStyle = COLORS.TREASURE;
                ctx.beginPath();
                ctx.moveTo(px + TILE_SIZE / 2, py + 4);
                ctx.lineTo(px + TILE_SIZE - 6, py + TILE_SIZE / 2);
                ctx.lineTo(px + TILE_SIZE / 2, py + TILE_SIZE - 4);
                ctx.lineTo(px + 6, py + TILE_SIZE / 2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;

            case TILES.EXIT:
                // 出口（门）
                ctx.fillStyle = COLORS.EXIT;
                ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.strokeStyle = '#00CC00';
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                break;

            case TILES.DUG_HOLE:
                // 被挖的洞
                ctx.fillStyle = COLORS.DUG_HOLE;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#1C1C1C';
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                break;
        }
    }
}

// 测试关卡数据
const LEVEL_1 = {
    playerStart: { x: 2, y: 2 },
    enemySpawns: [
        { x: 22, y: 2 }
    ],
    map: [
        // 25列 x 18行
        [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
        [2,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,2],
        [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
        [2,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,2],
        [2,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2],
        [2,0,0,5,0,0,5,0,0,5,0,3,0,5,0,0,5,0,0,5,0,0,5,0,2],
        [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
        [2,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2],
        [2,0,1,1,1,0,0,1,1,1,0,3,0,1,1,1,1,1,0,0,1,1,1,0,2],
        [2,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2],
        [2,0,0,5,0,5,0,0,5,0,0,3,0,0,5,0,0,5,0,5,0,0,5,0,2],
        [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
        [2,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2],
        [2,0,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,2],
        [2,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2],
        [2,0,0,5,0,0,5,0,0,5,0,3,0,0,5,0,0,5,0,0,5,0,0,5,2],
        [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
        [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
    ]
};
