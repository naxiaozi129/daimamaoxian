import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Cpu, ChevronRight, RefreshCw, Star, Info } from 'lucide-react';
import { LEVEL_CONFIGS, DIRECTION_VECTORS } from './constants';
import { CommandType, Direction, GameState, LevelConfig } from './types';
import GameCanvas from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import { getAiHint, getStoryBriefing } from './services/geminiService';

const App: React.FC = () => {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [commands, setCommands] = useState<CommandType[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentLevelId: LEVEL_CONFIGS[0].id,
    playerPos: { ...LEVEL_CONFIGS[0].startPos },
    playerDir: LEVEL_CONFIGS[0].startDir,
    path: [{ ...LEVEL_CONFIGS[0].startPos }],
    isPlaying: false,
    isWon: false,
    isLost: false,
    errorMsg: null,
    commands: [],
  });
  
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [storyText, setStoryText] = useState<string>("");
  
  // Code Mode State
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeText, setCodeText] = useState("");

  const currentLevel = LEVEL_CONFIGS[currentLevelIndex];
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper: Generate code from commands with indentation
  const generateCodeFromCommands = useCallback((cmds: CommandType[]): string => {
    let indentLevel = 0;
    const getIndent = () => "  ".repeat(indentLevel);

    return cmds.map(cmd => {
      let line = "";
      switch (cmd) {
        case CommandType.MOVE_FORWARD: line = `${getIndent()}move();`; break;
        case CommandType.TURN_LEFT: line = `${getIndent()}turnLeft();`; break;
        case CommandType.TURN_RIGHT: line = `${getIndent()}turnRight();`; break;
        case CommandType.REPEAT_3: 
            line = `${getIndent()}repeat(3) {`; 
            indentLevel++; 
            break;
        case CommandType.REPEAT_5: 
            line = `${getIndent()}repeat(5) {`; 
            indentLevel++; 
            break;
        case CommandType.IF_OBSTACLE:
            line = `${getIndent()}if (isPathBlocked()) {`;
            indentLevel++;
            break;
        case CommandType.CLOSE_BLOCK:
            indentLevel = Math.max(0, indentLevel - 1);
            line = `${getIndent()}}`;
            break;
        default: return '';
      }
      return line;
    }).join('\n');
  }, []);

  // Helper: Parse code to commands (Strict Regex Parsing)
  const parseCodeToCommands = useCallback((code: string): CommandType[] => {
    // 1. Remove comments
    const stripComments = code.replace(/\/\/.*$/gm, '');
    
    // 2. Tokenize loosely by expecting commands or block markers
    // We split by newlines or semicolons, but we also need to preserve { and } as tokens
    // A simple approach is to insert newlines around { and } then split
    const preparedCode = stripComments
        .replace(/\{/g, ' { ')
        .replace(/\}/g, ' } ')
        .replace(/;/g, ' ; ');
        
    const tokens = preparedCode.split(/[\s\n;]+/);

    const validCommands: CommandType[] = [];
    
    // Regex Patterns
    const patterns = [
        { regex: /^move(?:Forward)?(?:\(\s*\))?$/i, type: CommandType.MOVE_FORWARD },
        { regex: /^turnLeft(?:\(\s*\))?$/i, type: CommandType.TURN_LEFT },
        { regex: /^turnRight(?:\(\s*\))?$/i, type: CommandType.TURN_RIGHT },
        { regex: /^前进(?:\(\s*\))?$/i, type: CommandType.MOVE_FORWARD },
        { regex: /^左转(?:\(\s*\))?$/i, type: CommandType.TURN_LEFT },
        { regex: /^右转(?:\(\s*\))?$/i, type: CommandType.TURN_RIGHT },
        
        // Control Flow
        { regex: /^repeat\(3\)$/i, type: CommandType.REPEAT_3 },
        { regex: /^repeat\(5\)$/i, type: CommandType.REPEAT_5 },
        { regex: /^if\(isPathBlocked\(\)\)$/i, type: CommandType.IF_OBSTACLE },
        { regex: /^\}$/, type: CommandType.CLOSE_BLOCK },
    ];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim();
        if (!token) continue;

        // Combine potential split tokens for functions like "repeat" and "(3)" if they got split
        // For simplicity, we assume standard formatting or the regex handles partials if we were more robust.
        // But here, let's just check the single token first.
        
        let match = false;
        for (const p of patterns) {
            if (p.regex.test(token)) {
                validCommands.push(p.type);
                match = true;
                break;
            }
        }
        
        if (!match) {
            // Special handling for "repeat(3)" vs "repeat" + "(3)"
            // Simplification: The user is encouraged to type `repeat(3)` together.
            // But if they type `if` `(` ... it might get complex.
            // Let's rely on standard tokens defined in placeholder.
        }
    }
    
    return validCommands;
  }, []);

  // Load initial story
  useEffect(() => {
    let mounted = true;
    getStoryBriefing(currentLevel).then(text => {
        if(mounted) setStoryText(text);
    });
    return () => { mounted = false; };
  }, [currentLevel]);

  // Reset state when level changes
  const resetLevel = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setGameState({
      currentLevelId: currentLevel.id,
      playerPos: { ...currentLevel.startPos },
      playerDir: currentLevel.startDir,
      path: [{ ...currentLevel.startPos }],
      isPlaying: false,
      isWon: false,
      isLost: false,
      errorMsg: null,
      commands: commands, // Keep commands in editor
    });
    setAiMessage(null);
  }, [currentLevel, commands]);

  // Ensure fresh start when level ID actually changes (navigation)
  useEffect(() => {
    setCommands([]);
    setCodeText("");
    setGameState(prev => ({ ...prev, commands: [] }));
    resetLevel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevelIndex]);

  // Sync Commands -> Code (When in Block Mode)
  useEffect(() => {
    if (!isCodeMode) {
      setCodeText(generateCodeFromCommands(commands));
    }
  }, [commands, isCodeMode, generateCodeFromCommands]);

  // Sync Code -> Commands (When in Code Mode)
  useEffect(() => {
    if (isCodeMode) {
      const newCommands = parseCodeToCommands(codeText);
      setCommands(newCommands);
    }
  }, [codeText, isCodeMode, parseCodeToCommands]);

  const handleAddCommand = useCallback((cmd: CommandType) => {
    if (isCodeMode) {
        let newText = "";
        switch (cmd) {
            case CommandType.MOVE_FORWARD: newText = "move();"; break;
            case CommandType.TURN_LEFT: newText = "turnLeft();"; break;
            case CommandType.TURN_RIGHT: newText = "turnRight();"; break;
            case CommandType.REPEAT_3: newText = "repeat(3) {\n\n}"; break;
            case CommandType.REPEAT_5: newText = "repeat(5) {\n\n}"; break;
            case CommandType.IF_OBSTACLE: newText = "if (isPathBlocked()) {\n\n}"; break;
            case CommandType.CLOSE_BLOCK: newText = "}"; break;
        }
        setCodeText(prev => prev ? prev + "\n" + newText : newText);
    } else {
        setCommands(prev => [...prev, cmd]);
    }
  }, [isCodeMode]);

  const handleRemoveCommand = (index: number) => {
    if (!isCodeMode) {
        setCommands(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleClearCommands = () => {
    setCommands([]);
    setCodeText("");
  };

  // --- INTERPRETER LOGIC ---
  const executeCommands = useCallback(async () => {
    if (commands.length === 0) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setGameState(prev => ({ 
        ...prev, 
        isPlaying: true, 
        isWon: false, 
        isLost: false, 
        playerPos: { ...currentLevel.startPos },
        playerDir: currentLevel.startDir,
        path: [{ ...currentLevel.startPos }]
    }));

    let currentPos = { ...currentLevel.startPos };
    let currentDir = currentLevel.startDir;
    let currentPath = [{ ...currentLevel.startPos }];
    
    // Execution State
    let pc = 0; // Program Counter
    const callStack: { returnAddr: number, count: number }[] = [];
    const MAX_STEPS = 1000; // Infinite loop protection
    let stepsExecuted = 0;

    try {
        while (pc < commands.length) {
            if (ac.signal.aborted) return;
            if (stepsExecuted++ > MAX_STEPS) throw new Error("Infinite Loop detected");

            const cmd = commands[pc];
            let shouldDelay = true;

            // Logic Helper: Check ahead
            const isPathBlocked = () => {
                 const vec = DIRECTION_VECTORS[currentDir];
                 const nextX = currentPos.x + vec.x;
                 const nextY = currentPos.y + vec.y;
                 // Wall or Obstacle
                 if (nextX < 0 || nextX >= currentLevel.gridSize || nextY < 0 || nextY >= currentLevel.gridSize) return true;
                 return currentLevel.obstacles.some(o => o.x === nextX && o.y === nextY);
            };

            switch (cmd) {
                case CommandType.MOVE_FORWARD: {
                    const vec = DIRECTION_VECTORS[currentDir];
                    const nextPos = { x: currentPos.x + vec.x, y: currentPos.y + vec.y };

                    // Collision Check
                    if (
                        nextPos.x < 0 || nextPos.x >= currentLevel.gridSize ||
                        nextPos.y < 0 || nextPos.y >= currentLevel.gridSize
                    ) {
                         setGameState(prev => ({ ...prev, isPlaying: false, isLost: true, errorMsg: "超出边界！" }));
                         return;
                    }
                    if (currentLevel.obstacles.some(o => o.x === nextPos.x && o.y === nextPos.y)) {
                        setGameState(prev => ({ ...prev, playerPos: nextPos, isPlaying: false, isLost: true, errorMsg: "撞到障碍物！" }));
                        return;
                    }
                    currentPos = nextPos;
                    currentPath = [...currentPath, currentPos];
                    pc++;
                    break;
                }
                case CommandType.TURN_LEFT:
                    currentDir = (currentDir + 3) % 4;
                    pc++;
                    break;
                case CommandType.TURN_RIGHT:
                    currentDir = (currentDir + 1) % 4;
                    pc++;
                    break;
                
                // Control Flow
                case CommandType.REPEAT_3:
                case CommandType.REPEAT_5: {
                    const count = cmd === CommandType.REPEAT_3 ? 3 : 5;
                    callStack.push({ returnAddr: pc + 1, count: count });
                    pc++;
                    shouldDelay = false; // Don't delay on logic steps
                    break;
                }
                case CommandType.IF_OBSTACLE: {
                    if (isPathBlocked()) {
                        // Enter the block
                        pc++;
                    } else {
                        // Skip the block: Scan for matching CLOSE_BLOCK at same depth
                        let depth = 1;
                        let lookahead = pc + 1;
                        let found = false;
                        while (lookahead < commands.length) {
                            if (commands[lookahead] === CommandType.REPEAT_3 || 
                                commands[lookahead] === CommandType.REPEAT_5 || 
                                commands[lookahead] === CommandType.IF_OBSTACLE) {
                                depth++;
                            } else if (commands[lookahead] === CommandType.CLOSE_BLOCK) {
                                depth--;
                                if (depth === 0) {
                                    pc = lookahead + 1;
                                    found = true;
                                    break;
                                }
                            }
                            lookahead++;
                        }
                        if (!found) pc = commands.length; // Abort if no close
                    }
                    shouldDelay = false;
                    break;
                }
                case CommandType.CLOSE_BLOCK: {
                    // Check if we are in a loop
                    if (callStack.length > 0) {
                        const frame = callStack[callStack.length - 1];
                        // Are we closing a loop? 
                        // Simplified: In this flat model, "CLOSE_BLOCK" matches the most recent control structure.
                        // Ideally we should track block types in stack, but for this simple app, we assume well-formedness or just loop back if count > 1.
                        
                        // Decrement loop counter
                        frame.count--;
                        if (frame.count > 0) {
                            pc = frame.returnAddr; // Jump back
                        } else {
                            callStack.pop(); // Loop done
                            pc++;
                        }
                    } else {
                        // Just a block end (like from an IF that was entered)
                        pc++;
                    }
                    shouldDelay = false;
                    break;
                }
                default:
                    pc++;
                    shouldDelay = false;
            }

            // Update UI
            setGameState(prev => ({
                ...prev,
                playerPos: currentPos,
                playerDir: currentDir,
                path: currentPath
            }));
            
            if (shouldDelay) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Final Verification
        if (currentPos.x === currentLevel.goalPos.x && currentPos.y === currentLevel.goalPos.y) {
            setGameState(prev => ({ ...prev, isPlaying: false, isWon: true }));
        } else {
             setGameState(prev => ({ 
                ...prev, 
                isPlaying: false, 
                isLost: true, 
                errorMsg: "程序结束，但未到达终点。" 
            }));
        }

    } catch (e) {
        console.error(e);
        setGameState(prev => ({ ...prev, isPlaying: false, isLost: true, errorMsg: "运行时错误 (可能死循环)" }));
    }
  }, [commands, currentLevel]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.isPlaying) return;
      if (isCodeMode && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w': e.preventDefault(); handleAddCommand(CommandType.MOVE_FORWARD); break;
        case 'ArrowLeft':
        case 'a': e.preventDefault(); handleAddCommand(CommandType.TURN_LEFT); break;
        case 'ArrowRight':
        case 'd': e.preventDefault(); handleAddCommand(CommandType.TURN_RIGHT); break;
        case 'Backspace':
        case 'Delete': if (!isCodeMode) setCommands(prev => prev.slice(0, -1)); break;
        case 'Enter':
            if (!e.shiftKey) {
                e.preventDefault();
                executeCommands();
            }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isPlaying, handleAddCommand, executeCommands, isCodeMode]);

  const handleNextLevel = () => {
    if (currentLevelIndex < LEVEL_CONFIGS.length - 1) {
        setCurrentLevelIndex(prev => prev + 1);
    }
  };

  const handleAskAI = async () => {
    setIsAiLoading(true);
    setAiMessage(null);
    const hint = await getAiHint(currentLevel, commands, gameState.errorMsg);
    setAiMessage(hint);
    setIsAiLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100 selection:bg-sky-500/30">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-700 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-900/20">
                <Terminal className="text-white" size={24} />
            </div>
            <div>
                <h1 className="font-bold text-xl tracking-tight">代码探险 <span className="text-sky-400">AI</span></h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">逻辑协议已启动</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
                <Cpu size={14} className="text-sky-400" />
                <span className="text-xs font-mono text-slate-300">系统：在线</span>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:max-w-6xl">
        
        {/* Level Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-sky-900/50 text-sky-300 text-xs font-bold border border-sky-800">第 {currentLevel.id} 关</span>
                    <h2 className="text-2xl font-bold text-white">{currentLevel.name}</h2>
                </div>
                <p className="text-slate-400 text-sm max-w-xl">{currentLevel.description}</p>
                <p className="text-xs text-indigo-400 mt-1 font-mono italic">"{storyText}"</p>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                    {LEVEL_CONFIGS.map((l, idx) => (
                        <div 
                            key={l.id} 
                            onClick={() => idx <= currentLevelIndex ? setCurrentLevelIndex(idx) : null}
                            className={`
                                w-8 h-2 rounded-full transition-colors cursor-pointer
                                ${idx === currentLevelIndex ? 'bg-sky-500 z-10 scale-110' : idx < currentLevelIndex ? 'bg-emerald-500' : 'bg-slate-700'}
                            `}
                        />
                    ))}
                </div>
            </div>
        </div>

        {/* Game Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
            
            {/* Left Col: Visuals */}
            <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex-1 bg-slate-800/50 rounded-2xl border border-slate-700 p-6 flex items-center justify-center relative">
                    <GameCanvas 
                        level={currentLevel}
                        playerPos={gameState.playerPos}
                        playerDir={gameState.playerDir}
                        path={gameState.path}
                        isWon={gameState.isWon}
                        isLost={gameState.isLost}
                    />
                    
                    {/* Floating Hint Overlay */}
                    {aiMessage && (
                        <div className="absolute top-4 left-4 right-4 bg-indigo-900/90 backdrop-blur-md border border-indigo-500 p-4 rounded-xl shadow-2xl z-30 animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-500 rounded-lg shrink-0">
                                    <Cpu size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-indigo-200 text-sm mb-1">AI 导师提示</h4>
                                    <p className="text-sm text-white leading-relaxed">{aiMessage}</p>
                                </div>
                                <button onClick={() => setAiMessage(null)} className="text-indigo-300 hover:text-white">
                                    &times;
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Bar */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
                        <Info className="text-slate-400" />
                        <div>
                            <div className="text-xs text-slate-400 uppercase font-bold">最优步数</div>
                            <div className="text-lg font-mono text-white">~{currentLevel.optimalSteps} 步</div>
                        </div>
                    </div>
                     {gameState.isWon ? (
                         <button 
                            onClick={handleNextLevel}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl p-4 border border-emerald-500 flex items-center justify-center gap-2 font-bold shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02]"
                        >
                            <span>下一关</span>
                            <ChevronRight />
                        </button>
                     ) : (
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3 opacity-50">
                            <Star className="text-slate-400" />
                            <div>
                                <div className="text-xs text-slate-400 uppercase font-bold">状态</div>
                                <div className="text-lg font-mono text-white">进行中</div>
                            </div>
                        </div>
                     )}
                </div>
            </div>

            {/* Right Col: Controls */}
            <div className="lg:col-span-5 h-full">
                <ControlPanel 
                    commands={commands}
                    onAddCommand={handleAddCommand}
                    onRemoveCommand={handleRemoveCommand}
                    onClear={handleClearCommands}
                    onRun={executeCommands}
                    onReset={resetLevel}
                    onAskAI={handleAskAI}
                    gameState={gameState}
                    isAiLoading={isAiLoading}
                    isCodeMode={isCodeMode}
                    codeText={codeText}
                    onCodeChange={setCodeText}
                    onToggleMode={() => setIsCodeMode(!isCodeMode)}
                />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;