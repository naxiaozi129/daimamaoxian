import React, { useRef, useEffect } from 'react';
import { Play, RotateCcw, ArrowUp, ArrowLeft, ArrowRight, Trash2, HelpCircle, Keyboard, Code2, Blocks, Repeat, GitBranch, Ban } from 'lucide-react';
import { CommandType, GameState } from '../types';
import { MAX_COMMANDS } from '../constants';

interface ControlPanelProps {
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
  onToggleMode
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getCommandIcon = (cmd: CommandType) => {
    switch(cmd) {
      case CommandType.MOVE_FORWARD: return <ArrowUp size={16} />;
      case CommandType.TURN_LEFT: return <ArrowLeft size={16} />;
      case CommandType.TURN_RIGHT: return <ArrowRight size={16} />;
      case CommandType.REPEAT_3: 
      case CommandType.REPEAT_5: return <Repeat size={16} />;
      case CommandType.IF_OBSTACLE: return <GitBranch size={16} />;
      case CommandType.CLOSE_BLOCK: return <Ban size={16} className="rotate-90" />;
      default: return null;
    }
  };

  const getCommandLabel = (cmd: CommandType) => {
    switch(cmd) {
      case CommandType.MOVE_FORWARD: return "前进";
      case CommandType.TURN_LEFT: return "左转";
      case CommandType.TURN_RIGHT: return "右转";
      case CommandType.REPEAT_3: return "重复 (3次) {";
      case CommandType.REPEAT_5: return "重复 (5次) {";
      case CommandType.IF_OBSTACLE: return "如果 (前方障碍) {";
      case CommandType.CLOSE_BLOCK: return "} (结束块)";
      default: return cmd;
    }
  };

  const getCommandColor = (cmd: CommandType) => {
    switch(cmd) {
      case CommandType.MOVE_FORWARD: return "bg-sky-600 hover:bg-sky-500 border-sky-400";
      case CommandType.TURN_LEFT: return "bg-violet-600 hover:bg-violet-500 border-violet-400";
      case CommandType.TURN_RIGHT: return "bg-violet-600 hover:bg-violet-500 border-violet-400";
      case CommandType.REPEAT_3:
      case CommandType.REPEAT_5: return "bg-amber-600 hover:bg-amber-500 border-amber-400";
      case CommandType.IF_OBSTACLE: return "bg-rose-600 hover:bg-rose-500 border-rose-400";
      case CommandType.CLOSE_BLOCK: return "bg-slate-500 hover:bg-slate-400 border-slate-400";
      default: return "bg-slate-600";
    }
  };

  // Logic for indentation visualization in Block Mode
  const renderBlocks = () => {
    let indentLevel = 0;
    
    return commands.map((cmd, idx) => {
        const isClose = cmd === CommandType.CLOSE_BLOCK;
        // If it's a close block, we decrease indent BEFORE rendering
        if (isClose) indentLevel = Math.max(0, indentLevel - 1);
        
        const currentIndent = indentLevel;

        // If it's an open block, we increase indent AFTER rendering (for next item)
        if (cmd === CommandType.REPEAT_3 || cmd === CommandType.REPEAT_5 || cmd === CommandType.IF_OBSTACLE) {
            indentLevel++;
        }

        return (
            <div 
                key={idx} 
                className={`
                    relative group flex items-center gap-3 px-3 py-2 rounded border-l-4 text-white font-mono text-sm shadow-sm select-none
                    ${getCommandColor(cmd)}
                    animate-in slide-in-from-left-2 duration-200
                `}
                style={{ marginLeft: `${currentIndent * 16}px` }}
            >
                <span className="text-white/50 w-4 text-xs">{idx + 1}</span>
                <span className="flex-1 flex items-center gap-2">
                    {getCommandIcon(cmd)} {getCommandLabel(cmd)}
                </span>
                <button 
                    onClick={() => onRemoveCommand(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-200 transition-all"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        );
    });
  };

  return (
    <div className="flex flex-col h-full bg-game-panel rounded-xl border border-slate-700 overflow-hidden shadow-xl">
      {/* Header with Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-900">
          <button 
            onClick={() => isCodeMode && onToggleMode()}
            className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors border-r border-slate-800 ${!isCodeMode ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}
          >
              <Blocks size={16} /> 图形化
          </button>
          <button 
            onClick={() => !isCodeMode && onToggleMode()}
             className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors ${isCodeMode ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}
          >
              <Code2 size={16} /> 代码
          </button>
      </div>

      {/* Program View */}
      <div className="flex-1 overflow-hidden relative bg-slate-900/50">
        
        {/* Block Mode */}
        {!isCodeMode && (
             <div className="absolute inset-0 p-4 overflow-y-auto">
                {commands.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 font-mono text-sm pointer-events-none">
                        <span>// 暂无指令...</span>
                    </div>
                )}
                <div className="space-y-2">
                    {renderBlocks()}
                </div>
             </div>
        )}

        {/* Code Mode */}
        {isCodeMode && (
            <textarea
                ref={textareaRef}
                value={codeText}
                onChange={(e) => onCodeChange(e.target.value)}
                className="w-full h-full p-4 bg-[#0d1117] text-slate-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-900/50 border-none leading-relaxed"
                placeholder="// 代码编辑器&#10;move();&#10;repeat(3) {&#10;  move();&#10;}"
                spellCheck={false}
            />
        )}
      </div>

      {/* Status Bar */}
       <div className="px-4 py-1 bg-slate-900 border-t border-b border-slate-700 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>{isCodeMode ? 'MODE: JS_EDIT' : 'MODE: VISUAL_BLOCK'}</span>
            <span>指令: {commands.length}/{MAX_COMMANDS}</span>
       </div>

      {/* Actions */}
      <div className="p-4 bg-slate-800">
        
        {/* Basic Toolbox */}
        <div className="grid grid-cols-3 gap-2 mb-2">
            <button 
                onClick={() => onAddCommand(CommandType.TURN_LEFT)}
                disabled={gameState.isPlaying}
                className="btn-cmd bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white p-2 rounded flex flex-col items-center gap-1"
                title="左转"
            >
                <ArrowLeft size={16} />
                <span className="text-[10px] font-bold">左转</span>
            </button>
            <button 
                onClick={() => onAddCommand(CommandType.MOVE_FORWARD)}
                disabled={gameState.isPlaying}
                className="btn-cmd bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white p-2 rounded flex flex-col items-center gap-1"
                title="前进"
            >
                <ArrowUp size={16} />
                <span className="text-[10px] font-bold">前进</span>
            </button>
            <button 
                onClick={() => onAddCommand(CommandType.TURN_RIGHT)}
                disabled={gameState.isPlaying}
                className="btn-cmd bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white p-2 rounded flex flex-col items-center gap-1"
                title="右转"
            >
                <ArrowRight size={16} />
                <span className="text-[10px] font-bold">右转</span>
            </button>
        </div>

        {/* Logic Toolbox (New) */}
        <div className="grid grid-cols-4 gap-2 mb-4">
            <button 
                onClick={() => onAddCommand(CommandType.REPEAT_3)}
                disabled={gameState.isPlaying}
                className="btn-cmd bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white p-2 rounded flex flex-col items-center gap-1"
                title="重复 3 次"
            >
                <Repeat size={14} />
                <span className="text-[10px] font-bold">x3</span>
            </button>
             <button 
                onClick={() => onAddCommand(CommandType.REPEAT_5)}
                disabled={gameState.isPlaying}
                className="btn-cmd bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white p-2 rounded flex flex-col items-center gap-1"
                title="重复 5 次"
            >
                <Repeat size={14} />
                <span className="text-[10px] font-bold">x5</span>
            </button>
             <button 
                onClick={() => onAddCommand(CommandType.IF_OBSTACLE)}
                disabled={gameState.isPlaying}
                className="btn-cmd bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white p-2 rounded flex flex-col items-center gap-1"
                title="如果遇障碍"
            >
                <GitBranch size={14} />
                <span className="text-[10px] font-bold">如果..</span>
            </button>
            <button 
                onClick={() => onAddCommand(CommandType.CLOSE_BLOCK)}
                disabled={gameState.isPlaying}
                className="btn-cmd bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white p-2 rounded flex flex-col items-center gap-1"
                title="结束当前块"
            >
                <Ban size={14} className="rotate-90" />
                <span className="text-[10px] font-bold">{'}'}</span>
            </button>
        </div>

        {/* Execution Controls */}
        <div className="flex gap-2">
            <button
                onClick={onClear}
                disabled={gameState.isPlaying}
                className="p-3 rounded-lg bg-slate-700 hover:bg-red-900/50 text-slate-300 hover:text-red-400 transition-colors"
                title="清空"
            >
                <Trash2 size={20} />
            </button>

            <button
                onClick={onRun}
                disabled={gameState.isPlaying || commands.length === 0}
                className={`
                    flex-1 flex items-center justify-center gap-2 font-bold rounded-lg shadow-lg transition-all
                    ${gameState.isPlaying 
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
                    }
                `}
                title="运行程序 (Enter)"
            >
                <Play size={20} fill="currentColor" />
                运行程序
            </button>
            
            {(gameState.isWon || gameState.isLost) && (
                 <button
                 onClick={onReset}
                 className="p-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors animate-pulse"
                 title="重置"
             >
                 <RotateCcw size={20} />
             </button>
            )}

            <button
                onClick={onAskAI}
                disabled={isAiLoading}
                className="p-3 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white shadow-lg transition-all"
                title="AI 求助"
            >
                {isAiLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <HelpCircle size={20} />
                )}
            </button>
        </div>
        
        {/* Keyboard Hint Footer */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-500">
             <Keyboard size={12} />
             {isCodeMode ? (
                 <span>手动编写或点击按钮插入代码</span>
             ) : (
                 <span>支持键盘快捷键 | 别忘了闭合代码块！</span>
             )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;