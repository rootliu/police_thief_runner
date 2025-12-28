// 玩家类

class Player {
    constructor(gridX, gridY) {
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
    }

    update(keys, level) {
        if (!this.isAlive) return;

        // 水平移动
        if (keys['ArrowLeft']) {
            this.direction = Direction.LEFT;
            const canMove = Physics.canMove(this.x, this.y, Direction.LEFT, this.width, level.map);
            if (canMove) {
                this.x -= PLAYER_SPEED;
            }
        }
        if (keys['ArrowRight']) {
            this.direction = Direction.RIGHT;
            const canMove = Physics.canMove(this.x, this.y, Direction.RIGHT, this.width, level.map);
            if (canMove) {
                this.x += PLAYER_SPEED;
            }
        }

        // 检查当前状态（在移动前检查）
        this.isOnLadder = Physics.isOnLadder(this.x, this.y, this.height, level.map);
        this.isOnBar = Physics.isOnBar(this.x, this.y, this.height, level.map);

        // 如果在梯子上且不进行水平移动，对齐X坐标到梯子中心
        if (this.isOnLadder && !keys['ArrowLeft'] && !keys['ArrowRight']) {
            const gridX = Math.floor(this.x / TILE_SIZE);
            const ladderCenterX = gridX * TILE_SIZE + TILE_SIZE / 2;
            this.x = ladderCenterX;
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

        // 重力（如果不在梯子或横杆上）
        if (!this.isOnLadder && !this.isOnBar) {
            this.velocityY += GRAVITY;
            if (this.velocityY > MAX_FALL_SPEED) {
                this.velocityY = MAX_FALL_SPEED;
            }
        } else {
            // 在梯子或横杆上，重力为0
            if (!keys['ArrowUp'] && !keys['ArrowDown']) {
                this.velocityY = 0;
            }
        }

        // 应用垂直速度
        const oldY = this.y;
        this.y += this.velocityY;

        // 检查地面碰撞并修正位置 (isPlayer=true，玩家可以穿过洞)
        this.isOnGround = Physics.isOnGround(this.x, this.y, this.height, level.map, true);

        // 如果正在从洞掉落，对齐X坐标到洞中心
        if (!this.isOnGround && !this.isOnLadder && !this.isOnBar) {
            const characterBottom = this.y + this.height / 2;
            const gridX = Math.floor(this.x / TILE_SIZE);
            const belowGridY = Math.floor((characterBottom + 1) / TILE_SIZE);
            const belowTile = level.map[belowGridY]?.[gridX];

            if (belowTile === TILES.DUG_HOLE) {
                // 正在从洞掉落，对齐X坐标到洞中心
                const holeCenterX = gridX * TILE_SIZE + TILE_SIZE / 2;
                this.x = holeCenterX;
            }
        }

        if (this.isOnGround) {
            // 对齐到地面 - 找到角色底部所在的最近地面
            const characterBottom = this.y + this.height / 2;
            const gridX = Math.floor(this.x / TILE_SIZE);
            const currentGridY = Math.floor(characterBottom / TILE_SIZE);
            const currentTile = level.map[currentGridY]?.[gridX];

            let floorTop;
            // 只有BRICK和SOLID算作穿透的地面
            if (currentTile === TILES.BRICK || currentTile === TILES.SOLID) {
                // 角色已经穿透进了一个可站立的tile，对齐到这个tile的顶部
                floorTop = currentGridY * TILE_SIZE;
            } else {
                // 正常站立，对齐到下方tile的顶部
                const belowGridY = Math.floor((characterBottom + 1) / TILE_SIZE);
                floorTop = belowGridY * TILE_SIZE;
            }

            // 将角色底部对齐到地面顶部
            this.y = floorTop - this.height / 2;
            this.velocityY = 0;
        }

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

    reset(gridX, gridY) {
        this.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        this.velocityY = 0;
        this.isAlive = true;
    }
}
