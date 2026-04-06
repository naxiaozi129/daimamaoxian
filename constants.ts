import { CommandType, Direction, LevelConfig, Position } from './types';

export const MAX_COMMANDS = 30;

/** 单关指令上限（未配置则用全局 MAX_COMMANDS） */
export function getLevelMaxCommands(level: LevelConfig): number {
  return level.maxCommandsOverride ?? MAX_COMMANDS;
}

/** 运行前校验：指令数量与必带结构 */
export function validateProgramForLevel(level: LevelConfig, cmds: CommandType[]): string | null {
  const maxCmds = getLevelMaxCommands(level);
  if (cmds.length > maxCmds) {
    return `指令条数超限：本关最多 ${maxCmds} 条，当前 ${cmds.length} 条。`;
  }
  if (level.requireLoop) {
    const ok = cmds.some((c) => c === CommandType.REPEAT_3 || c === CommandType.REPEAT_5);
    if (!ok) return '本关约束：程序中必须包含至少一个 repeat(3) 或 repeat(5)。';
  }
  if (level.requireIf) {
    const ok = cmds.some((c) => c === CommandType.IF_OBSTACLE);
    if (!ok) return '本关约束：程序中必须包含至少一次 if(isPathBlocked())。';
  }
  return null;
}

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
  },
  {
    id: 7,
    name: '循环条令',
    description:
      '笔直长廊：必须用 repeat 组织代码；「前进」累计次数不得超过上限（多走一格都会判负）。',
    gridSize: 8,
    startPos: { x: 0, y: 3 },
    startDir: Direction.RIGHT,
    goalPos: { x: 7, y: 3 },
    obstacles: [],
    optimalSteps: 7,
    requireLoop: true,
    maxForwardMoves: 9,
    maxCommandsOverride: 28,
  },
  {
    id: 8,
    name: '之字形栈道',
    description: '中路被堵死，只能绕行；仍要求使用循环，并限制总前进步数。',
    gridSize: 7,
    startPos: { x: 0, y: 3 },
    startDir: Direction.RIGHT,
    goalPos: { x: 6, y: 3 },
    obstacles: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }],
    optimalSteps: 8,
    requireLoop: true,
    maxForwardMoves: 11,
    maxCommandsOverride: 30,
  },
  {
    id: 9,
    name: '门闩阵列',
    description: '同一行上有多处障碍，适合用「如果前方受阻」做分支；本关强制要求写出 if。',
    gridSize: 7,
    startPos: { x: 0, y: 3 },
    startDir: Direction.RIGHT,
    goalPos: { x: 6, y: 3 },
    obstacles: [{ x: 2, y: 3 }, { x: 4, y: 3 }],
    optimalSteps: 9,
    requireIf: true,
    maxForwardMoves: 14,
    maxCommandsOverride: 32,
  },
  {
    id: 10,
    name: '双因子验证',
    description: '同时携带循环与条件两种结构；前进总数与指令条数均有硬性上限。',
    gridSize: 8,
    startPos: { x: 0, y: 4 },
    startDir: Direction.RIGHT,
    goalPos: { x: 7, y: 4 },
    obstacles: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }],
    optimalSteps: 10,
    requireLoop: true,
    requireIf: true,
    maxForwardMoves: 14,
    maxCommandsOverride: 34,
  },
  {
    id: 11,
    name: '深隧回环',
    description: '更长的断带障碍带，继续考验循环 + 条件配合与步数预算。',
    gridSize: 8,
    startPos: { x: 0, y: 3 },
    startDir: Direction.RIGHT,
    goalPos: { x: 7, y: 3 },
    obstacles: [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ],
    optimalSteps: 10,
    requireLoop: true,
    requireIf: true,
    maxForwardMoves: 15,
    maxCommandsOverride: 36,
  },
  {
    id: 12,
    name: '终焉网格',
    description: '综合大关：大网格、墙垛与窄门并存；必须含 repeat 与 if，并遵守前进上限。',
    gridSize: 9,
    startPos: { x: 0, y: 4 },
    startDir: Direction.RIGHT,
    goalPos: { x: 8, y: 4 },
    obstacles: [
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 7, y: 5 },
    ],
    optimalSteps: 14,
    requireLoop: true,
    requireIf: true,
    maxForwardMoves: 22,
    maxCommandsOverride: 40,
  },
];

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