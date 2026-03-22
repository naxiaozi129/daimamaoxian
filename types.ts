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