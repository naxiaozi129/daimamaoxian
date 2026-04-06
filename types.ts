export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

export enum CommandType {
  MOVE_FORWARD = 'MOVE_FORWARD',
  TURN_LEFT = 'TURN_LEFT',
  TURN_RIGHT = 'TURN_RIGHT',
  // Control Flow
  REPEAT_3 = 'REPEAT_3',       // repeat(3) {
  REPEAT_5 = 'REPEAT_5',       // repeat(5) {
  IF_OBSTACLE = 'IF_OBSTACLE', // if(isPathBlocked()) {
  CLOSE_BLOCK = 'CLOSE_BLOCK', // }
}

export interface Position {
  x: number;
  y: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  gridSize: number;
  startPos: Position;
  startDir: Direction;
  goalPos: Position;
  obstacles: Position[];
  optimalSteps: number;
  /** 运行中累计「前进」次数上限（仅统计成功的 move）；不设置则不限制 */
  maxForwardMoves?: number;
  /** 程序里必须出现 repeat(3) 或 repeat(5) */
  requireLoop?: boolean;
  /** 程序里必须出现 if(isPathBlocked()) */
  requireIf?: boolean;
  /** 本关指令条数上限，默认使用全局 MAX_COMMANDS */
  maxCommandsOverride?: number;
}

export interface GameState {
  currentLevelId: number;
  playerPos: Position;
  playerDir: Direction;
  path: Position[];
  isPlaying: boolean;
  isWon: boolean;
  isLost: boolean;
  errorMsg: string | null;
  commands: CommandType[];
}