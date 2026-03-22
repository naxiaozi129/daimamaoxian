import React from 'react';
import { Bot, Flag, Skull, MapPin } from 'lucide-react';
import { Position, Direction, LevelConfig } from '../types';
import { DIRECTION_ROTATION } from '../constants';

interface GameCanvasProps {
  level: LevelConfig;
  playerPos: Position;
  playerDir: Direction;
  path?: Position[];
  isWon: boolean;
  isLost: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ level, playerPos, playerDir, path = [], isWon, isLost }) => {
  // Create grid cells
  const cells = [];
  for (let y = 0; y < level.gridSize; y++) {
    for (let x = 0; x < level.gridSize; x++) {
      const isStart = x === level.startPos.x && y === level.startPos.y;
      const isGoal = x === level.goalPos.x && y === level.goalPos.y;
      const isObstacle = level.obstacles.some(o => o.x === x && o.y === y);
      const isPath = path.some(p => p.x === x && p.y === y);

      cells.push(
        <div 
          key={`${x}-${y}`} 
          className={`
            relative w-full h-full border border-slate-700/50 rounded-md transition-colors duration-300
            ${isStart ? 'bg-slate-800/50' : ''}
            ${isGoal ? 'bg-emerald-900/20' : ''}
            ${isPath && !isStart && !isGoal && !isObstacle ? 'bg-sky-900/30' : ''}
            ${isObstacle ? 'bg-slate-800 shadow-inner border-slate-600' : (!isStart && !isGoal && !isPath ? 'bg-game-panel' : '')}
          `}
        >
            {isGoal && (
                <div className="absolute inset-0 flex items-center justify-center text-emerald-400 opacity-80 animate-pulse">
                    <Flag size={24} fill="currentColor" />
                </div>
            )}
            {isObstacle && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <div className="w-3/4 h-3/4 bg-slate-600 rounded-sm shadow-lg"></div>
                </div>
            )}
            {/* Grid coordinates for debugging/learning - simplified */}
            <span className="absolute bottom-0.5 right-1 text-[8px] text-slate-600 select-none">
                {x},{y}
            </span>
        </div>
      );
    }
  }

  // Calculate player absolute position for smooth transition
  // We use percentage based on grid size
  const cellSize = 100 / level.gridSize;
  const top = playerPos.y * cellSize;
  const left = playerPos.x * cellSize;

  return (
    <div className="aspect-square w-full max-w-md mx-auto bg-slate-900 rounded-xl p-4 shadow-2xl border border-slate-700 relative overflow-hidden">
      
      {/* The Grid */}
      <div 
        className="w-full h-full grid gap-1 relative z-0"
        style={{ 
            gridTemplateColumns: `repeat(${level.gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${level.gridSize}, 1fr)`
        }}
      >
        {cells}
      </div>

      {/* The Path Line Layer */}
      {path.length > 1 && (
        <div className="absolute inset-4 pointer-events-none z-[5]">
          <svg 
            className="w-full h-full" 
            viewBox={`0 0 ${level.gridSize * 100} ${level.gridSize * 100}`}
            preserveAspectRatio="none"
          >
            <polyline 
              points={path.map(p => `${p.x * 100 + 50},${p.y * 100 + 50}`).join(' ')}
              fill="none"
              stroke="rgba(56, 189, 248, 0.6)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 10"
              className="path-animation"
            />
          </svg>
        </div>
      )}

      {/* The Player Layer */}
      <div className="absolute inset-4 pointer-events-none z-10">
        <div 
            className="absolute robot-transition flex items-center justify-center text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]"
            style={{
                width: `${cellSize}%`,
                height: `${cellSize}%`,
                top: `${top}%`,
                left: `${left}%`,
                transform: `rotate(${DIRECTION_ROTATION[playerDir]}deg)`
            }}
        >
            <Bot size={36} />
        </div>
      </div>

      {/* Overlay Status */}
      {(isWon || isLost) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            {isWon && (
                <div className="text-center p-6 bg-emerald-900/90 rounded-2xl border border-emerald-500 shadow-2xl transform scale-110">
                    <Flag className="mx-auto text-white mb-2" size={48} />
                    <h2 className="text-3xl font-bold text-white mb-1">关卡通过！</h2>
                    <p className="text-emerald-200">优秀的编程能力。</p>
                </div>
            )}
             {isLost && (
                <div className="text-center p-6 bg-red-900/90 rounded-2xl border border-red-500 shadow-2xl transform scale-110">
                    <Skull className="mx-auto text-white mb-2" size={48} />
                    <h2 className="text-3xl font-bold text-white mb-1">坠毁！</h2>
                    <p className="text-red-200">检测到系统故障。</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default GameCanvas;