// 玩家类

class Player {
    constructor(gridX, gridY, levelMap = null) {
        // 将角色放置在格子的中心
        this.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        this.width = TILE_SIZE - 4;
        this.height = TILE_SIZE - 4;
        this.velocityY = 0;
        this.direction = Direction.RIGHT;
        this.isOnGround = false;
        this.isOnLadder = false;
        this.isOnBar = false;
        this.isAlive = true;
        
        // 简单直接设置位置：玩家起始位置 (2,2)，站在第2行
        // 第3行是砖块，所以玩家应该站在第2行的中心
        if (levelMap) {
            this.y = gridY * TILE_SIZE + TILE_SIZE / 2; // 直接站在第2行中心
        }
    }

    update(keys, level) {
        if (!this.isAlive) return;

        // 检查当前状态（使用新的物理系统）
        this.isOnLadder = Physics.isOnLadder(this.x, this.y, this.height, level.map);
        this.isOnBar = Physics.isOnBar(this.x, this.y, this.height, level.map);
        this.isOnGround = Physics.isOnGround(this.x, this.y, this.height, level.map);

        // 水平移动
        if (keys['ArrowLeft']) {
            this.direction = Direction.LEFT;
            if (Physics.canMove(this.x, this.y, Direction.LEFT, this.width, level.map)) {
                this.x -= PLAYER_SPEED;
            }
        }
        if (keys['ArrowRight']) {
            this.direction = Direction.RIGHT;
            if (Physics.canMove(this.x, this.y, Direction.RIGHT, this.width, level.map)) {
                this.x += PLAYER_SPEED;
            }
        }

        // 垂直移动（爬梯子或横杆）
        if (keys['ArrowUp']) {
            if (this.isOnLadder) {
                this.y -= CLIMB_SPEED;
                this.velocityY = 0;
            }
        }
        if (keys['ArrowDown']) {
            if (this.isOnLadder) {
                this.y += CLIMB_SPEED;
                this.velocityY = 0;
            }
        }

        // 重力（如果不在梯子或横杆上，并且不在地面上）
        if (!this.isOnLadder && !this.isOnBar) {
            if (!this.isOnGround) {
                this.velocityY += GRAVITY;
                if (this.velocityY > MAX_FALL_SPEED) {
                    this.velocityY = MAX_FALL_SPEED;
                }
            } else {
                this.velocityY = 0;
            }
        } else {
            // 在梯子或横杆上，重力为0
            if (!keys['ArrowUp'] && !keys['ArrowDown']) {
                this.velocityY = 0;
            }
        }

        // 应用垂直速度
        this.y += this.velocityY;

        // 边界检查
        if (this.x < TILE_SIZE) this.x = TILE_SIZE;
        if (this.x > CANVAS_WIDTH - TILE_SIZE) this.x = CANVAS_WIDTH - TILE_SIZE;
        if (this.y < TILE_SIZE) this.y = TILE_SIZE;
        if (this.y > CANVAS_HEIGHT - TILE_SIZE) this.y = CANVAS_HEIGHT - TILE_SIZE;

        // 检查是否收集宝物
        this.collectTreasure(level);
    }

    collectTreasure(level) {
        const grid = Physics.pixelToGrid(this.x, this.y);
        const tile = level.getTile(grid.gridX, grid.gridY);

        if (tile === TILES.TREASURE) {
            level.setTile(grid.gridX, grid.gridY, TILES.EMPTY);
            return true;
        }
        return false;
    }

    digLeft(level) {
        const grid = Physics.pixelToGrid(this.x, this.y);
        return level.digHole(grid.gridX, grid.gridY, Direction.LEFT);
    }

    digRight(level) {
        const grid = Physics.pixelToGrid(this.x, this.y);
        return level.digHole(grid.gridX, grid.gridY, Direction.RIGHT);
    }

    render(ctx) {
        if (!this.isAlive) return;

        // 确保角色居中对齐到格子
        const drawX = Math.floor(this.x - this.width / 2);
        const drawY = Math.floor(this.y - this.height / 2);

        // 玩家身体（蓝色小偷）
        ctx.fillStyle = COLORS.PLAYER;
        ctx.fillRect(drawX, drawY, this.width, this.height);

        // 眼睛
        ctx.fillStyle = '#FFFFFF';
        const eyeSize = 4;
        const eyeY = drawY + 6;
        if (this.direction === Direction.RIGHT) {
            ctx.fillRect(drawX + this.width - 14, eyeY, eyeSize, eyeSize);
            ctx.fillRect(drawX + this.width - 8, eyeY, eyeSize, eyeSize);
        } else {
            ctx.fillRect(drawX + 4, eyeY, eyeSize, eyeSize);
            ctx.fillRect(drawX + 10, eyeY, eyeSize, eyeSize);
        }

        // 帽子（小偷标志）
        ctx.fillStyle = '#000000';
        ctx.fillRect(drawX + 4, drawY + 2, this.width - 8, 3);

        // 边框
        ctx.strokeStyle = '#0000AA';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, this.width, this.height);
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }

    reset(gridX, gridY, levelMap = null) {
        this.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        this.velocityY = 0;
        this.isAlive = true;
        
        // 简单直接设置位置
        if (levelMap) {
            this.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        }
    }
}
