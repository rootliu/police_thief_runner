// 游戏常量配置

const TILE_SIZE = 32; // 每个格子的像素大小
const GRID_WIDTH = 25; // 网格宽度（格子数）
const GRID_HEIGHT = 18; // 网格高度（格子数）
const CANVAS_WIDTH = TILE_SIZE * GRID_WIDTH; // 800px
const CANVAS_HEIGHT = TILE_SIZE * GRID_HEIGHT; // 576px

// 地图元素类型
const TILES = {
    EMPTY: 0,      // 空气
    BRICK: 1,      // 可挖的砖块
    SOLID: 2,      // 不可挖的墙
    LADDER: 3,     // 梯子
    BAR: 4,        // 横杆
    TREASURE: 5,   // 宝物
    EXIT: 6,       // 出口
    DUG_HOLE: 7    // 被挖的洞
};

// 颜色方案（像素风格）
const COLORS = {
    EMPTY: '#000000',
    BRICK: '#CD853F',      // 棕色砖块
    SOLID: '#696969',      // 灰色墙
    LADDER: '#8B4513',     // 棕色梯子
    BAR: '#FFD700',        // 金色横杆
    TREASURE: '#FFD700',   // 金色宝物
    EXIT: '#00FF00',       // 绿色出口
    DUG_HOLE: '#2F4F4F',   // 深灰色洞
    PLAYER: '#0000FF',     // 蓝色小偷
    ENEMY: '#FF0000'       // 红色警察
};

// 游戏状态
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'game_over'
};

// 方向常量
const Direction = {
    NONE: 0,
    LEFT: 1,
    RIGHT: 2,
    UP: 3,
    DOWN: 4
};

// 玩家设置
const PLAYER_SPEED = 3;
const GRAVITY = 0.6;
const MAX_FALL_SPEED = 10;
const CLIMB_SPEED = 2;

// 敌人设置
const ENEMY_SPEED = 2;

// 挖洞设置
const HOLE_REFILL_TIME = 5000; // 洞5秒后填补（毫秒）

// 游戏设置
const INITIAL_LIVES = 3;
const FPS = 60;
