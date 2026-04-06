import React from 'react';
import { Bot, Flag, Skull, Crosshair } from 'lucide-react';
import { Position, Direction, LevelConfig } from '../types';
import { DIRECTION_ROTATION } from '../constants';

interface GameCanvasProps {
  level: LevelConfig;
  playerPos: Position;
  playerDir: Direction;
  path?: Position[];
  isWon: boolean;
  isLost: boolean;
  errorMsg?: string | null;
  isPlaying?: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  playerPos,
  playerDir,
  path = [],
  isWon,
  isLost,
  errorMsg,
  isPlaying,
}) => {
  const cells = [];
  for (let y = 0; y < level.gridSize; y++) {
    for (let x = 0; x < level.gridSize; x++) {
      const isStart = x === level.startPos.x && y === level.startPos.y;
      const isGoal = x === level.goalPos.x && y === level.goalPos.y;
      const isObstacle = level.obstacles.some((o) => o.x === x && o.y === y);
      const isPath = path.some((p) => p.x === x && p.y === y);
      const isPlayerHere = x === playerPos.x && y === playerPos.y;

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`
            relative w-full h-full rounded-lg transition-all duration-300 overflow-hidden
            border
            ${isObstacle
              ? 'border-slate-600/80 bg-gradient-to-br from-slate-700 to-slate-900 shadow-inner'
              : 'border-slate-700/40 bg-slate-950/40'}
            ${isStart && !isObstacle ? 'ring-1 ring-cyan-500/35 bg-cyan-950/25' : ''}
            ${isGoal && !isObstacle ? 'ring-1 ring-emerald-400/50 bg-emerald-950/30' : ''}
            ${isPath && !isStart && !isGoal && !isObstacle ? 'bg-sky-950/35 border-sky-500/25' : ''}
            ${isPlayerHere && isPlaying ? 'ring-2 ring-sky-400/40' : ''}
          `}
        >
          {isGoal && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-2 rounded-md bg-emerald-500/10 animate-pulse" />
              <Flag
                size={22}
                className="relative text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.55)]"
                fill="currentColor"
                strokeWidth={1.5}
              />
            </div>
          )}
          {isObstacle && (
            <div className="absolute inset-0 flex items-center justify-center p-1">
              <div className="w-[72%] h-[72%] rounded-md bg-gradient-to-b from-slate-500 to-slate-700 shadow-lg border border-slate-500/50" />
            </div>
          )}
          {isStart && !isGoal && (
            <span className="absolute top-1 left-1 text-[9px] font-mono font-semibold uppercase tracking-wider text-cyan-400/90">
              START
            </span>
          )}
          <span className="absolute bottom-0.5 right-1 text-[8px] text-slate-600 font-mono select-none tabular-nums">
            {x},{y}
          </span>
        </div>
      );
    }
  }

  const cellSize = 100 / level.gridSize;
  const top = playerPos.y * cellSize;
  const left = playerPos.x * cellSize;

  return (
    <div className="relative w-full max-w-md mx-auto animate-fade-up">
      <div className="relative rounded-2xl p-1 bg-gradient-to-br from-sky-500/20 via-slate-800/50 to-indigo-600/20 hud-frame">
        <div className="relative rounded-[14px] bg-slate-950/90 border border-slate-700/60 overflow-hidden">
          <div className="absolute top-2 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              <Crosshair size={12} className="text-sky-400" />
              <span>战术视图</span>
            </div>
            <div
              className={`
                px-2 py-0.5 rounded-full text-[10px] font-mono border
                ${isPlaying
                  ? 'border-amber-500/40 text-amber-200 bg-amber-500/10'
                  : isWon
                    ? 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10'
                    : isLost
                      ? 'border-red-500/40 text-red-200 bg-red-500/10'
                      : 'border-slate-600 text-slate-400 bg-slate-900/80'}
              `}
            >
              {isPlaying ? '执行中' : isWon ? '任务完成' : isLost ? '任务失败' : '待命中'}
            </div>
          </div>

          <div className="hud-corner tl absolute top-0 left-0 z-20 w-8 h-8" />
          <div className="hud-corner tr absolute top-0 right-0 z-20 w-8 h-8" />
          <div className="hud-corner bl absolute bottom-0 left-0 z-20 w-8 h-8" />
          <div className="hud-corner br absolute bottom-0 right-0 z-20 w-8 h-8" />

          <div className="relative p-10 pb-8 pt-11">
            <div
              className="w-full aspect-square grid gap-1.5 relative z-0"
              style={{
                gridTemplateColumns: `repeat(${level.gridSize}, 1fr)`,
                gridTemplateRows: `repeat(${level.gridSize}, 1fr)`,
              }}
            >
              {cells}
            </div>

            {path.length > 1 && (
              <div className="absolute inset-10 pointer-events-none z-[5]">
                <svg
                  className="w-full h-full"
                  viewBox={`0 0 ${level.gridSize * 100} ${level.gridSize * 100}`}
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={path.map((p) => `${p.x * 100 + 50},${p.y * 100 + 50}`).join(' ')}
                    fill="none"
                    stroke="url(#pathGrad)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="12 10"
                    className="path-animation opacity-90"
                  />
                  <defs>
                    <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(56, 189, 248, 0.2)" />
                      <stop offset="50%" stopColor="rgba(56, 189, 248, 0.85)" />
                      <stop offset="100%" stopColor="rgba(99, 102, 241, 0.5)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            <div className="absolute inset-10 pointer-events-none z-10">
              <div
                className="absolute robot-transition flex items-center justify-center"
                style={{
                  width: `${cellSize}%`,
                  height: `${cellSize}%`,
                  top: `${top}%`,
                  left: `${left}%`,
                  transform: `rotate(${DIRECTION_ROTATION[playerDir]}deg)`,
                }}
              >
                <div className="relative flex items-center justify-center w-[85%] h-[85%] rounded-xl bg-sky-500/15 border border-sky-400/40 shadow-glow-sm backdrop-blur-[2px]">
                  <Bot
                    size={34}
                    className="text-sky-300 drop-shadow-[0_0_14px_rgba(56,189,248,0.65)]"
                    strokeWidth={1.75}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(isWon || isLost) && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 rounded-2xl bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          {isWon && (
            <div className="text-center max-w-xs px-6 py-7 rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-950/95 to-slate-950/95 shadow-glow-md">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/30">
                <Flag className="text-emerald-200" size={32} strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">关卡通过</h2>
              <p className="mt-2 text-sm text-emerald-100/85 leading-relaxed">路线有效，核心逻辑运行正常。</p>
            </div>
          )}
          {isLost && (
            <div className="text-center max-w-xs px-6 py-7 rounded-2xl border border-red-400/40 bg-gradient-to-b from-red-950/95 to-slate-950/95 shadow-[0_0_40px_-10px_rgba(248,113,113,0.45)]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 border border-red-400/30">
                <Skull className="text-red-200" size={32} strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">任务中断</h2>
              <p className="mt-2 text-sm text-red-100/90 leading-relaxed">
                {errorMsg || '执行未达成目标，请检查指令序列。'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
