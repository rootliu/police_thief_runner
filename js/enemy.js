// 敌人（警察）类

class Enemy {
    constructor(gridX, gridY) {
        this.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        this.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        this.spawnX = gridX;
        this.spawnY = gridY;
        this.width = TILE_SIZE - 4;
        this.height = TILE_SIZE - 4;
        this.velocityY = 0;
        this.direction = Direction.LEFT;
        this.isOnGround = false;
        this.isOnLadder = false;
        this.isTrapped = false;
        this.trapTimer = 0;
    }

    update(playerX, playerY, level) {
        // 如果已经被困，等待重生
        if (this.isTrapped) {
            if (Date.now() - this.trapTimer > 3000) { // 3秒后重生
                this.respawn();
            }
            return;
        }

        // 检查当前状态（使用新的物理系统）
        this.isOnLadder = Physics.isOnLadder(this.x, this.y, this.height, level.map);

        // 简单的AI：追踪玩家
        this.chasePlayer(playerX, playerY, level);

        // 重力（如果不在梯子上）
        if (!this.isOnLadder) {
            this.velocityY += GRAVITY;
            if (this.velocityY > MAX_FALL_SPEED) {
                this.velocityY = MAX_FALL_SPEED;
            }
        } else {
            this.velocityY = 0;
        }

        // 应用垂直速度
        this.y += this.velocityY;

        // 检查是否掉入陷阱（在地面对齐之前检查）
        const characterBottom = this.y + this.height / 2;
        const gridX = Math.floor(this.x / TILE_SIZE);
        const belowGridY = Math.floor((characterBottom + 1) / TILE_SIZE);
        const belowTile = level.getTile(gridX, belowGridY);

        // 如果脚下是被挖的洞，就被困住
        if (belowTile === TILES.DUG_HOLE && !this.isTrapped) {
            this.isTrapped = true;
            this.trapTimer = Date.now();
            // 将警察固定在洞格子的中心位置（X和Y都对齐到陷阱中心）
            this.x = gridX * TILE_SIZE + TILE_SIZE / 2;
            this.y = belowGridY * TILE_SIZE + TILE_SIZE / 2;
            this.velocityY = 0;
            console.log(`Police trapped at grid(${gridX}, ${belowGridY}), position(${this.x}, ${this.y})`);
            return; // 立即返回，不再执行后续的地面对齐
        }

        // 检查地面碰撞并修正位置（isPlayer=false，敌人会被困在洞里）
        this.isOnGround = Physics.isOnGround(this.x, this.y, this.height, level.map, false);
        if (this.isOnGround) {
            // 对齐到地面 - 找到角色底部所在的最近地面
            const characterBottom = this.y + this.height / 2;
            const gridX = Math.floor(this.x / TILE_SIZE);
            const currentGridY = Math.floor(characterBottom / TILE_SIZE);
            const currentTile = level.map[currentGridY]?.[gridX];

            let floorTop;
            // 对于敌人，BRICK、SOLID和DUG_HOLE都算作穿透的地面
            if (currentTile === TILES.BRICK || currentTile === TILES.SOLID || currentTile === TILES.DUG_HOLE) {
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
    }

    chasePlayer(playerX, playerY, level) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;

        // 如果在梯子上且执行垂直追踪，对齐X坐标到梯子中心
        if (this.isOnLadder && Math.abs(dy) > TILE_SIZE / 2) {
            const gridX = Math.floor(this.x / TILE_SIZE);
            const ladderCenterX = gridX * TILE_SIZE + TILE_SIZE / 2;
            this.x = ladderCenterX;
        }

        // 垂直追踪优先（如果在梯子上且玩家在不同楼层）
        if (this.isOnLadder && Math.abs(dy) > TILE_SIZE / 2) {
            if (dy > 0) {
                this.y += CLIMB_SPEED * 0.8;
            } else {
                this.y -= CLIMB_SPEED * 0.8;
            }
        }
        // 否则水平追踪
        else if (Math.abs(dx) > 10) {
            if (dx > 0) {
                this.direction = Direction.RIGHT;
                if (Physics.canMove(this.x, this.y, Direction.RIGHT, this.width, level.map)) {
                    this.x += ENEMY_SPEED;
                }
            } else {
                this.direction = Direction.LEFT;
                if (Physics.canMove(this.x, this.y, Direction.LEFT, this.width, level.map)) {
                    this.x -= ENEMY_SPEED;
                }
            }
        }
    }

    respawn() {
        this.x = this.spawnX * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.spawnY * TILE_SIZE + TILE_SIZE / 2;
        this.velocityY = 0;
        this.isTrapped = false;
    }

    render(ctx) {
        if (this.isTrapped) {
            // 被困时显示为半透明
            ctx.globalAlpha = 0.5;
        }

        // 确保角色居中对齐到格子
        const drawX = Math.floor(this.x - this.width / 2);
        const drawY = Math.floor(this.y - this.height / 2);

        // 警察身体（红色）
        ctx.fillStyle = COLORS.ENEMY;
        ctx.fillRect(drawX, drawY, this.width, this.height);

        // 警徽
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(drawX + this.width / 2, drawY + this.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();

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

        // 帽子（警察帽）
        ctx.fillStyle = '#000080';
        ctx.fillRect(drawX + 2, drawY + 2, this.width - 4, 3);

        // 边框
        ctx.strokeStyle = '#AA0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, this.width, this.height);

        ctx.globalAlpha = 1.0;
    }

    checkCollisionWithPlayer(playerX, playerY, playerWidth, playerHeight) {
        // 被困在洞里的警察不会抓住玩家
        if (this.isTrapped) {
            return false;
        }
        return Physics.checkCollision(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height,
            playerX - playerWidth / 2,
            playerY - playerHeight / 2,
            playerWidth,
            playerHeight
        );
    }
}
