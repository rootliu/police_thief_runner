// 物理和碰撞检测系统

class Physics {
    // 检查某个网格位置是否是固体（阻挡移动）
    static isSolid(tile) {
        return tile === TILES.BRICK || tile === TILES.SOLID;
    }

    // 检查某个网格位置是否可以站立
    static canStandOn(tile) {
        return tile === TILES.BRICK ||
               tile === TILES.SOLID ||
               tile === TILES.LADDER ||
               tile === TILES.DUG_HOLE;
    }

    // 检查某个网格位置是否是梯子
    static isLadder(tile) {
        return tile === TILES.LADDER;
    }

    // 检查某个网格位置是否是横杆
    static isBar(tile) {
        return tile === TILES.BAR;
    }

    // 检查某个网格位置是否是洞
    static isHole(tile) {
        return tile === TILES.DUG_HOLE;
    }

    // 将像素坐标转换为网格坐标
    static pixelToGrid(x, y) {
        return {
            gridX: Math.floor(x / TILE_SIZE),
            gridY: Math.floor(y / TILE_SIZE)
        };
    }

    // 将网格坐标转换为像素坐标（中心点）
    static gridToPixel(gridX, gridY) {
        return {
            x: gridX * TILE_SIZE + TILE_SIZE / 2,
            y: gridY * TILE_SIZE + TILE_SIZE / 2
        };
    }

    // 检查实体是否在地面上
    static isOnGround(x, y, levelMap) {
        const grid = this.pixelToGrid(x, y);
        const belowTile = levelMap[grid.gridY + 1]?.[grid.gridX];

        return this.canStandOn(belowTile) || this.isBar(belowTile);
    }

    // 检查实体是否在梯子上
    static isOnLadder(x, y, levelMap) {
        const grid = this.pixelToGrid(x, y);
        const currentTile = levelMap[grid.gridY]?.[grid.gridX];

        return this.isLadder(currentTile);
    }

    // 检查实体是否在横杆上
    static isOnBar(x, y, levelMap) {
        const grid = this.pixelToGrid(x, y);
        const currentTile = levelMap[grid.gridY]?.[grid.gridX];

        return this.isBar(currentTile);
    }

    // 检查移动是否会碰到墙
    static canMove(x, y, direction, levelMap) {
        let newX = x;
        let newY = y;

        if (direction === Direction.LEFT) {
            newX -= PLAYER_SPEED;
        } else if (direction === Direction.RIGHT) {
            newX += PLAYER_SPEED;
        }

        const grid = this.pixelToGrid(newX, newY);
        const tile = levelMap[grid.gridY]?.[grid.gridX];

        return !this.isSolid(tile);
    }

    // 检查两个矩形是否碰撞（用于玩家和敌人碰撞）
    static checkCollision(x1, y1, width1, height1, x2, y2, width2, height2) {
        return x1 < x2 + width2 &&
               x1 + width1 > x2 &&
               y1 < y2 + height2 &&
               y1 + height1 > y2;
    }
}
