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

    // 检查实体是否在地面上（考虑角色的实际高度，防止穿透）
    // isPlayer参数用于区分玩家和敌人的行为（玩家可以穿过洞，敌人会被困）
    static isOnGround(x, y, characterHeight, levelMap, isPlayer = false) {
        // 角色的y坐标是中心点，计算底部位置
        const characterBottom = y + characterHeight / 2;
        const gridX = Math.floor(x / TILE_SIZE);

        // 检查角色底部所在的格子和正下方的格子
        const currentGridY = Math.floor(characterBottom / TILE_SIZE);
        const belowGridY = Math.floor((characterBottom + 1) / TILE_SIZE);

        // 检查是否已经进入了一个可站立的tile（穿透情况）
        const currentTile = levelMap[currentGridY]?.[gridX];

        // 如果当前在梯子上，不算站在地面上（允许自由上下移动）
        if (this.isLadder(currentTile)) {
            return false;
        }

        // 梯子不算"地面"，角色可以在梯子上自由移动
        // 洞对玩家来说不算地面（可以掉下去），对敌人来说算地面（会被困）
        if (currentTile === TILES.BRICK || currentTile === TILES.SOLID) {
            // 角色已经穿透到了可站立的tile里面
            return true;
        }
        if (currentTile === TILES.DUG_HOLE && !isPlayer) {
            // 敌人穿透进了洞里
            return true;
        }

        // 获取脚下的tile
        const belowTile = levelMap[belowGridY]?.[gridX];

        // 梯子不阻止下落，洞对玩家不阻止下落
        if (this.isLadder(belowTile)) {
            return false;
        }
        if (belowTile === TILES.DUG_HOLE && isPlayer) {
            return false; // 玩家可以从洞掉下去
        }

        // 如果脚下没有可站立的tile，不在地面上
        if (!this.canStandOn(belowTile) && !this.isBar(belowTile)) {
            return false;
        }

        // 计算角色底部到地面顶部的距离
        const floorTop = belowGridY * TILE_SIZE;
        const distanceToFloor = characterBottom - floorTop;

        // 当角色底部接近或略微穿过地面顶部时（允许最大下落速度的容差）
        return distanceToFloor >= 0 && distanceToFloor <= MAX_FALL_SPEED + 2;
    }

    // 检查实体是否在梯子上（考虑角色的实际占据空间）
    static isOnLadder(x, y, characterHeight, levelMap) {
        const gridX = Math.floor(x / TILE_SIZE);
        const characterTop = y - characterHeight / 2;
        const characterBottom = y + characterHeight / 2;

        // 检查角色占据的所有格子中是否有梯子
        for (let checkY = Math.floor(characterTop / TILE_SIZE); checkY <= Math.floor(characterBottom / TILE_SIZE); checkY++) {
            const tile = levelMap[checkY]?.[gridX];
            if (this.isLadder(tile)) {
                return true;
            }
        }

        return false;
    }

    // 检查实体是否在横杆上（考虑角色的实际高度）
    static isOnBar(x, y, characterHeight, levelMap) {
        const grid = this.pixelToGrid(x, y);
        const currentTile = levelMap[grid.gridY]?.[grid.gridX];

        return this.isBar(currentTile);
    }

    // 检查移动是否会碰到墙（考虑角色的实际宽度）
    static canMove(x, y, direction, characterWidth, levelMap) {
        let newX = x;

        if (direction === Direction.LEFT) {
            newX -= PLAYER_SPEED;
        } else if (direction === Direction.RIGHT) {
            newX += PLAYER_SPEED;
        }

        // 计算角色的边界（中心点坐标系统）
        const characterHeight = TILE_SIZE - 4;
        const characterLeft = newX - characterWidth / 2;
        const characterRight = newX + characterWidth / 2;
        const characterTop = y - characterHeight / 2;
        const characterBottom = y + characterHeight / 2;

        // 获取角色会占据的格子范围
        const leftGridX = Math.floor(characterLeft / TILE_SIZE);
        const rightGridX = Math.floor(characterRight / TILE_SIZE);
        const topGridY = Math.floor(characterTop / TILE_SIZE);
        const bottomGridY = Math.floor((characterBottom - 1) / TILE_SIZE);

        // 检查所有可能碰撞的格子
        for (let checkY = topGridY; checkY <= bottomGridY; checkY++) {
            for (let checkX = leftGridX; checkX <= rightGridX; checkX++) {
                const tile = levelMap[checkY]?.[checkX];
                if (this.isSolid(tile)) {
                    return false;
                }
            }
        }

        return true;
    }

    // 获取角色应该站立的位置（对齐到地面）
    static alignToGround(x, y, characterHeight, levelMap) {
        const gridX = Math.floor(x / TILE_SIZE);

        // 从当前位置向下查找第一个可站立的地面
        for (let checkY = Math.floor(y / TILE_SIZE); checkY < levelMap.length - 1; checkY++) {
            const currentTile = levelMap[checkY]?.[gridX];
            const belowTile = levelMap[checkY + 1]?.[gridX];

            // 如果当前格子是空的，且下方可以站立，则站立在当前位置
            if (currentTile === TILES.EMPTY && this.canStandOn(belowTile)) {
                // 简单直接的方法：角色站在空格子的中心
                return this.gridToPixel(gridX, checkY);
            }

            // 如果当前是梯子，可以站立
            if (this.isLadder(currentTile)) {
                return this.gridToPixel(gridX, checkY);
            }
        }

        return { x, y }; // 如果找不到合适的站立位置，返回原位置
    }

    // 检查两个矩形是否碰撞（用于玩家和敌人碰撞）
    static checkCollision(x1, y1, width1, height1, x2, y2, width2, height2) {
        return x1 < x2 + width2 &&
            x1 + width1 > x2 &&
            y1 < y2 + height2 &&
            y1 + height1 > y2;
    }
}
