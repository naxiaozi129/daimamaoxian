import React, { useRef } from 'react';
import {
  Play,
  RotateCcw,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Trash2,
  HelpCircle,
  Keyboard,
  Code2,
  Blocks,
  Repeat,
  GitBranch,
  Ban,
  Sparkles,
} from 'lucide-react';
import { CommandType, GameState } from '../types';
interface ControlPanelProps {
  maxCommands: number;
  commands: CommandType[];
  onAddCommand: (cmd: CommandType) => void;
  onRemoveCommand: (index: number) => void;
  onClear: () => void;
  onRun: () => void;
  onReset: () => void;
  onAskAI: () => void;
  gameState: GameState;
  isAiLoading: boolean;
  isCodeMode: boolean;
  codeText: string;
  onCodeChange: (code: string) => void;
  onToggleMode: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  maxCommands,
  commands,
  onAddCommand,
  onRemoveCommand,
  onClear,
  onRun,
  onReset,
  onAskAI,
  gameState,
  isAiLoading,
  isCodeMode,
  codeText,
  onCodeChange,
  onToggleMode,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getCommandIcon = (cmd: CommandType) => {
    switch (cmd) {
      case CommandType.MOVE_FORWARD:
        return <ArrowUp size={16} />;
      case CommandType.TURN_LEFT:
        return <ArrowLeft size={16} />;
      case CommandType.TURN_RIGHT:
        return <ArrowRight size={16} />;
      case CommandType.REPEAT_3:
      case CommandType.REPEAT_5:
        return <Repeat size={16} />;
      case CommandType.IF_OBSTACLE:
        return <GitBranch size={16} />;
      case CommandType.CLOSE_BLOCK:
        return <Ban size={16} className="rotate-90" />;
      default:
        return null;
    }
  };

  const getCommandLabel = (cmd: CommandType) => {
    switch (cmd) {
      case CommandType.MOVE_FORWARD:
        return '前进';
      case CommandType.TURN_LEFT:
        return '左转';
      case CommandType.TURN_RIGHT:
        return '右转';
      case CommandType.REPEAT_3:
        return '重复 (3次) {';
      case CommandType.REPEAT_5:
        return '重复 (5次) {';
      case CommandType.IF_OBSTACLE:
        return '如果 (前方障碍) {';
      case CommandType.CLOSE_BLOCK:
        return '} 结束块';
      default:
        return String(cmd);
    }
  };

  const getCommandColor = (cmd: CommandType) => {
    switch (cmd) {
      case CommandType.MOVE_FORWARD:
        return 'from-sky-600/95 to-sky-700/90 border-sky-400/35 shadow-[0_8px_24px_-12px_rgba(56,189,248,0.55)]';
      case CommandType.TURN_LEFT:
      case CommandType.TURN_RIGHT:
        return 'from-violet-600/95 to-violet-800/90 border-violet-400/35 shadow-[0_8px_24px_-12px_rgba(167,139,250,0.45)]';
      case CommandType.REPEAT_3:
      case CommandType.REPEAT_5:
        return 'from-amber-600/95 to-amber-800/90 border-amber-400/35 shadow-[0_8px_24px_-12px_rgba(251,191,36,0.4)]';
      case CommandType.IF_OBSTACLE:
        return 'from-rose-600/95 to-rose-900/90 border-rose-400/35 shadow-[0_8px_24px_-12px_rgba(251,113,133,0.4)]';
      case CommandType.CLOSE_BLOCK:
        return 'from-slate-600/90 to-slate-800/90 border-slate-400/25';
      default:
        return 'from-slate-600 to-slate-700 border-slate-500/30';
    }
  };

  const renderBlocks = () => {
    let indentLevel = 0;

    return commands.map((cmd, idx) => {
      const isClose = cmd === CommandType.CLOSE_BLOCK;
      if (isClose) indentLevel = Math.max(0, indentLevel - 1);
      const currentIndent = indentLevel;
      if (cmd === CommandType.REPEAT_3 || cmd === CommandType.REPEAT_5 || cmd === CommandType.IF_OBSTACLE) {
        indentLevel++;
      }

      return (
        <div
          key={idx}
          className={`
            relative group flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-[3px] text-white font-mono text-sm
            bg-gradient-to-r ${getCommandColor(cmd)}
            transition-transform duration-200 hover:scale-[1.01]
          `}
          style={{ marginLeft: `${currentIndent * 14}px` }}
        >
          <span className="text-white/45 w-6 text-xs tabular-nums text-right shrink-0">{idx + 1}</span>
          <span className="flex-1 flex items-center gap-2 min-w-0">
            <span className="opacity-90 shrink-0">{getCommandIcon(cmd)}</span>
            <span className="truncate">{getCommandLabel(cmd)}</span>
          </span>
          <button
            type="button"
            onClick={() => onRemoveCommand(idx)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-black/25 text-white/90 transition-all shrink-0"
            aria-label="删除此行"
          >
            <Trash2 size={14} />
          </button>
        </div>
      );
    });
  };

  const toolBtn =
    'rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-700/90 active:scale-[0.98] transition-all disabled:opacity-45 disabled:pointer-events-none shadow-sm';

  return (
    <div className="flex flex-col h-full min-h-[520px] rounded-2xl border border-slate-700/80 bg-slate-900/55 backdrop-blur-md overflow-hidden shadow-panel">
      <div className="px-4 pt-4 pb-3 border-b border-slate-700/60 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">控制台</p>
            <h3 className="font-display text-lg font-semibold text-white tracking-tight">程序编排</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <Sparkles size={12} className="text-sky-400/80" />
            <span>实时同步</span>
          </div>
        </div>

        <div className="flex p-1 rounded-xl bg-slate-950/80 border border-slate-700/70">
          <button
            type="button"
            onClick={() => isCodeMode && onToggleMode()}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
              ${!isCodeMode
                ? 'bg-slate-700/90 text-white shadow-md border border-slate-600/50'
                : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Blocks size={17} strokeWidth={2} />
            图形化
          </button>
          <button
            type="button"
            onClick={() => !isCodeMode && onToggleMode()}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
              ${isCodeMode
                ? 'bg-slate-700/90 text-white shadow-md border border-slate-600/50'
                : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            <Code2 size={17} strokeWidth={2} />
            代码
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-[#0a0f1a]/90">
        {!isCodeMode && (
          <div className="absolute inset-0 p-4 overflow-y-auto">
            {commands.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
                <div className="w-12 h-12 rounded-2xl border border-dashed border-slate-600 flex items-center justify-center mb-3">
                  <Blocks className="text-slate-600" size={22} />
                </div>
                <p className="text-slate-500 text-sm font-mono">// 点击下方按钮添加指令</p>
                <p className="text-slate-600 text-xs mt-1">或使用 W A D 快速输入</p>
              </div>
            )}
            <div className="space-y-2">{renderBlocks()}</div>
          </div>
        )}

        {isCodeMode && (
          <textarea
            ref={textareaRef}
            value={codeText}
            onChange={(e) => onCodeChange(e.target.value)}
            className="w-full h-full min-h-[240px] p-4 bg-[#050810] text-slate-200 font-mono text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500/25 border-none placeholder:text-slate-600"
            placeholder={'// 在此编写伪代码\nmove();\nrepeat(3) {\n  move();\n}'}
            spellCheck={false}
          />
        )}
      </div>

      <div className="px-4 py-2 bg-slate-950/90 border-y border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
        <span className="text-sky-500/70">{isCodeMode ? 'MODE: CODE' : 'MODE: BLOCKS'}</span>
        <span>
          指令 <span className="text-slate-300">{commands.length}</span> / {maxCommands}
        </span>
      </div>

      <div className="p-4 bg-slate-900/80 border-t border-slate-800/80 space-y-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">基础动作</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onAddCommand(CommandType.TURN_LEFT)}
              disabled={gameState.isPlaying}
              className={`${toolBtn} flex flex-col items-center gap-1.5 py-3 text-white`}
              title="左转 (A)"
            >
              <ArrowLeft size={18} className="text-violet-300" />
              <span className="text-[11px] font-bold">左转</span>
            </button>
            <button
              type="button"
              onClick={() => onAddCommand(CommandType.MOVE_FORWARD)}
              disabled={gameState.isPlaying}
              className={`${toolBtn} flex flex-col items-center gap-1.5 py-3 ring-1 ring-sky-500/25 text-white`}
              title="前进 (W)"
            >
              <ArrowUp size={18} className="text-sky-300" />
              <span className="text-[11px] font-bold">前进</span>
            </button>
            <button
              type="button"
              onClick={() => onAddCommand(CommandType.TURN_RIGHT)}
              disabled={gameState.isPlaying}
              className={`${toolBtn} flex flex-col items-center gap-1.5 py-3 text-white`}
              title="右转 (D)"
            >
              <ArrowRight size={18} className="text-violet-300" />
              <span className="text-[11px] font-bold">右转</span>
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">逻辑结构</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onAddCommand(CommandType.REPEAT_3)}
              disabled={gameState.isPlaying}
              className={`${toolBtn} flex flex-col items-center gap-1 py-2.5 text-white`}
              title="重复 3 次"
            >
              <Repeat size={15} className="text-amber-300" />
              <span className="text-[10px] font-bold">×3</span>
            </button>
            <button
              type="button"
              onClick={() => onAddCommand(CommandType.REPEAT_5)}
              disabled={gameState.isPlaying}
              className={`${toolBtn} flex flex-col items-center gap-1 py-2.5 text-white`}
              title="重复 5 次"
            >
              <Repeat size={15} className="text-amber-300" />
              <span className="text-[10px] font-bold">×5</span>
            </button>
            <button
              type="button"
              onClick={() => onAddCommand(CommandType.IF_OBSTACLE)}
              disabled={gameState.isPlaying}
              className={`${toolBtn} flex flex-col items-center gap-1 py-2.5 text-white`}
              title="如果前方有障碍"
            >
              <GitBranch size={15} className="text-rose-300" />
              <span className="text-[10px] font-bold">如果</span>
            </button>
            <button
              type="button"
              onClick={() => onAddCommand(CommandType.CLOSE_BLOCK)}
              disabled={gameState.isPlaying}
              className={`${toolBtn} flex flex-col items-center gap-1 py-2.5 text-white`}
              title="结束代码块"
            >
              <Ban size={15} className="rotate-90 text-slate-300" />
              <span className="text-[10px] font-bold font-mono">{'}'}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={gameState.isPlaying}
            className="p-3 rounded-xl border border-slate-600/60 bg-slate-800/80 hover:bg-red-950/40 hover:border-red-500/40 text-slate-300 hover:text-red-300 transition-colors disabled:opacity-40"
            title="清空"
          >
            <Trash2 size={20} />
          </button>

          <button
            type="button"
            onClick={onRun}
            disabled={gameState.isPlaying || commands.length === 0}
            className={`
              flex-1 flex items-center justify-center gap-2 font-display font-bold rounded-xl py-3 text-[15px] transition-all border
              ${gameState.isPlaying || commands.length === 0
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'text-white border-emerald-500/40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_12px_32px_-14px_rgba(16,185,129,0.65)] active:scale-[0.99]'}
            `}
            title="运行 (Enter)"
          >
            <Play size={22} fill="currentColor" className="opacity-95" />
            运行程序
          </button>

          {(gameState.isWon || gameState.isLost) && (
            <button
              type="button"
              onClick={onReset}
              className="p-3 rounded-xl border border-orange-500/50 bg-orange-600/90 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30 transition-colors animate-pulse"
              title="重置本关"
            >
              <RotateCcw size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={onAskAI}
            disabled={isAiLoading}
            className="p-3 rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white shadow-lg shadow-indigo-950/40 transition-all disabled:opacity-60"
            title="AI 提示"
          >
            {isAiLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <HelpCircle size={20} />
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-1">
          <Keyboard size={12} className="text-slate-600" />
          {isCodeMode ? (
            <span>可手写代码，也可用按钮插入片段</span>
          ) : (
            <span>W / A / D 插入 · Enter 运行 · 记得闭合 {'{ }'}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
