import { Direction, LevelConfig, Position } from './types';

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 1,
    name: "你好，世界",
    description: "基础移动：将机器人移动到目标位置。",
    gridSize: 5,
    startPos: { x: 0, y: 0 },
    startDir: Direction.RIGHT,
    goalPos: { x: 3, y: 0 },
    obstacles: [],
    optimalSteps: 3,
  },
  {
    id: 2,
    name: "转角遇到爱",
    description: "转向训练：你需要转向才能到达目标。",
    gridSize: 5,
    startPos: { x: 0, y: 0 },
    startDir: Direction.RIGHT,
    goalPos: { x: 2, y: 2 },
    obstacles: [{ x: 2, y: 0 }, { x: 2, y: 1 }],
    optimalSteps: 5,
  },
  {
    id: 3,
    name: "迷宫行者",
    description: "综合移动：绕过墙壁前行。",
    gridSize: 6,
    startPos: { x: 0, y: 2 },
    startDir: Direction.RIGHT,
    goalPos: { x: 5, y: 2 },
    obstacles: [
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 3 }, { x: 4, y: 4 }
    ],
    optimalSteps: 10,
  },
  {
    id: 4,
    name: "循环之力",
    description: "介绍循环：使用 repeat(3) 来简化你的代码。目标在直线的尽头。",
    gridSize: 5,
    startPos: { x: 0, y: 2 },
    startDir: Direction.RIGHT,
    goalPos: { x: 4, y: 2 },
    obstacles: [],
    optimalSteps: 4, // repeat(3) { move } + move or move * 4
  },
  {
    id: 5,
    name: "机械阶梯",
    description: "模式识别：观察阶梯状的路径。使用循环来减少代码量。",
    gridSize: 6,
    startPos: { x: 0, y: 5 },
    startDir: Direction.RIGHT,
    goalPos: { x: 4, y: 1 },
    obstacles: [
        { x: 1, y: 5 }, { x: 1, y: 4 }, 
        { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 3 },
        { x: 3, y: 5 }, { x: 3, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 2 }
    ],
    optimalSteps: 8, // repeat(3) { move; left; move; right; }
  },
  {
    id: 6,
    name: "智能避障",
    description: "条件判断：如果你面前有障碍物，就左转，否则前进。",
    gridSize: 6,
    startPos: { x: 0, y: 2 },
    startDir: Direction.RIGHT,
    goalPos: { x: 5, y: 2 },
    obstacles: [
        { x: 2, y: 2 }, 
        { x: 3, y: 1 }, // Tunnel walls
        { x: 3, y: 3 }
    ],
    optimalSteps: 8,
  }
];

export const MAX_COMMANDS = 30;

export const DIRECTION_ROTATION: Record<Direction, number> = {
  [Direction.UP]: 0,
  [Direction.RIGHT]: 90,
  [Direction.DOWN]: 180,
  [Direction.LEFT]: 270,
};

export const DIRECTION_VECTORS: Record<Direction, Position> = {
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.RIGHT]: { x: 1, y: 0 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
};