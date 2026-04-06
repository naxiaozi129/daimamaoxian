import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Cpu, ChevronRight, Star, Info, Repeat, GitBranch, Footprints, Hash, LogOut } from 'lucide-react';
import { LEVEL_CONFIGS, DIRECTION_VECTORS, validateProgramForLevel, getLevelMaxCommands } from './constants';
import { CommandType, Direction, GameState } from './types';
import GameCanvas from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import LoginScreen from './components/LoginScreen';
import { getAiHint, getOptimalSolutionHint, getStoryBriefing } from './services/geminiService';
import {
  getInitialFromStorage,
  loadProgress,
  saveProgress,
  setSavedUsername,
  clearSavedUsername,
} from './services/progressStorage';

const App: React.FC = () => {
  const [bootstrap] = useState(() => getInitialFromStorage());

  const [appPhase, setAppPhase] = useState<'login' | 'game'>(() => (bootstrap.username ? 'game' : 'login'));
  const [persistedUsername, setPersistedUsername] = useState<string | null>(() => bootstrap.username);
  const [maxReachedLevelIndex, setMaxReachedLevelIndex] = useState(() =>
    bootstrap.username ? bootstrap.maxReachedLevelIndex : 0
  );
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() =>
    bootstrap.username ? bootstrap.lastLevelIndex : 0
  );

  const [commands, setCommands] = useState<CommandType[]>([]);
  const [gameState, setGameState] = useState<GameState>(() => {
    const idx = bootstrap.username ? bootstrap.lastLevelIndex : 0;
    const L = LEVEL_CONFIGS[idx];
    return {
      currentLevelId: L.id,
      playerPos: { ...L.startPos },
      playerDir: L.startDir,
      path: [{ ...L.startPos }],
      isPlaying: false,
      isWon: false,
      isLost: false,
      errorMsg: null,
      commands: [],
    };
  });
  
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiPanelVariant, setAiPanelVariant] = useState<'mentor' | 'optimal'>('mentor');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [storyText, setStoryText] = useState<string>("");
  
  // Code Mode State
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeText, setCodeText] = useState("");

  const currentLevel = LEVEL_CONFIGS[currentLevelIndex];
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!persistedUsername) return;
    saveProgress(persistedUsername, {
      maxReachedLevelIndex,
      lastLevelIndex: currentLevelIndex,
    });
  }, [persistedUsername, maxReachedLevelIndex, currentLevelIndex]);

  const enterGameAsUser = useCallback((username: string) => {
    setSavedUsername(username);
    const p = loadProgress(username);
    setPersistedUsername(username);
    setMaxReachedLevelIndex(p.maxReachedLevelIndex);
    setCurrentLevelIndex(p.lastLevelIndex);
    setAppPhase('game');
  }, []);

  const enterAsGuest = useCallback(() => {
    clearSavedUsername();
    setPersistedUsername(null);
    setMaxReachedLevelIndex(0);
    setCurrentLevelIndex(0);
    setAppPhase('game');
  }, []);

  const backToLogin = useCallback(() => {
    clearSavedUsername();
    setPersistedUsername(null);
    setMaxReachedLevelIndex(0);
    setCurrentLevelIndex(0);
    setAppPhase('login');
  }, []);

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
    const cmdLimit = getLevelMaxCommands(currentLevel);
    if (!isCodeMode && commands.length >= cmdLimit) return;

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
  }, [isCodeMode, commands.length, currentLevel]);

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

    const ruleError = validateProgramForLevel(currentLevel, commands);
    if (ruleError) {
      setGameState((prev) => ({
        ...prev,
        isPlaying: false,
        isWon: false,
        isLost: true,
        errorMsg: ruleError,
        playerPos: { ...currentLevel.startPos },
        playerDir: currentLevel.startDir,
        path: [{ ...currentLevel.startPos }],
      }));
      return;
    }

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
    let forwardMoves = 0;

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
                    forwardMoves++;
                    if (
                        currentLevel.maxForwardMoves != null &&
                        forwardMoves > currentLevel.maxForwardMoves
                    ) {
                        setGameState((prev) => ({
                            ...prev,
                            isPlaying: false,
                            isLost: true,
                            errorMsg: `前进步数超限：本关最多 ${currentLevel.maxForwardMoves} 次前进，已超出。`,
                            playerPos: currentPos,
                            playerDir: currentDir,
                            path: currentPath,
                        }));
                        return;
                    }
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
      const next = currentLevelIndex + 1;
      setMaxReachedLevelIndex((m) => Math.max(m, next));
      setCurrentLevelIndex(next);
    }
  };

  const handleAskAI = async () => {
    setIsAiLoading(true);
    setAiPanelVariant('mentor');
    setAiMessage(null);
    const hint = await getAiHint(currentLevel, commands, gameState.errorMsg);
    setAiMessage(hint);
    setIsAiLoading(false);
  };

  const handleOptimalHint = useCallback(async () => {
    setIsAiLoading(true);
    setAiPanelVariant('optimal');
    setAiMessage(null);
    try {
      const hint = await getOptimalSolutionHint(currentLevel);
      setAiMessage(hint);
    } finally {
      setIsAiLoading(false);
    }
  }, [currentLevel]);

  if (appPhase === 'login') {
    return <LoginScreen onLogin={enterGameAsUser} onGuest={enterAsGuest} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100 selection:bg-sky-500/30 app-backdrop">
      <header className="h-[4.25rem] shrink-0 border-b border-slate-700/80 bg-slate-950/55 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-glow-sm ring-1 ring-white/10 shrink-0">
            <Terminal className="text-white" size={24} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight text-white truncate">
              代码探险 <span className="text-sky-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-[0.18em] uppercase truncate">
              逻辑训练 · 可视化执行
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className={`flex items-center min-w-0 max-w-[120px] sm:max-w-[200px] px-2.5 py-1 rounded-lg border text-[11px] font-mono truncate ${
              persistedUsername
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200/90'
                : 'bg-slate-800/80 border-slate-600 text-slate-400'
            }`}
            title={persistedUsername ? `已登录：${persistedUsername}` : '游客模式'}
          >
            {persistedUsername ? persistedUsername : '游客 · 不存档'}
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80">
            <Cpu size={14} className="text-sky-400" />
            <span className="text-xs font-mono text-slate-300">模拟器在线</span>
          </div>
          <button
            type="button"
            onClick={backToLogin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
            title={persistedUsername ? '退出登录并返回登录页' : '返回登录页'}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{persistedUsername ? '退出' : '登录页'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 animate-fade-up">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 text-xs font-bold border border-sky-500/25 font-mono">
                LV.{currentLevel.id}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentLevel.name}
              </h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{currentLevel.description}</p>
            {storyText && (
              <blockquote className="relative pl-4 border-l-2 border-indigo-500/50 text-sm text-indigo-200/90 italic leading-relaxed">
                {storyText}
              </blockquote>
            )}
            {(currentLevel.requireLoop ||
              currentLevel.requireIf ||
              currentLevel.maxForwardMoves != null ||
              currentLevel.maxCommandsOverride != null) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {currentLevel.requireLoop && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200/95 text-xs font-medium">
                    <Repeat size={13} className="shrink-0" />
                    必须包含 repeat
                  </span>
                )}
                {currentLevel.requireIf && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-200/95 text-xs font-medium">
                    <GitBranch size={13} className="shrink-0" />
                    必须包含 if(障碍)
                  </span>
                )}
                {currentLevel.maxForwardMoves != null && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200/95 text-xs font-medium">
                    <Footprints size={13} className="shrink-0" />
                    前进 ≤ {currentLevel.maxForwardMoves} 次
                  </span>
                )}
                {(currentLevel.maxCommandsOverride != null) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-200/95 text-xs font-medium">
                    <Hash size={13} className="shrink-0" />
                    指令 ≤ {getLevelMaxCommands(currentLevel)} 条
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-right">关卡进度</span>
            <div className="flex flex-wrap gap-1.5 justify-end max-w-[min(100%,420px)]">
              {LEVEL_CONFIGS.map((l, idx) => {
                const unlocked = idx <= maxReachedLevelIndex;
                const active = idx === currentLevelIndex;
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setCurrentLevelIndex(idx)}
                    title={l.name}
                    className={`
                      min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-mono font-bold transition-all border
                      ${active
                        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-glow-sm scale-105 z-10'
                        : unlocked
                          ? 'bg-slate-800/90 text-slate-200 border-slate-600 hover:border-sky-500/50 hover:text-white'
                          : 'bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed'}
                    `}
                  >
                    {l.id}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch min-h-0">
          <div className="lg:col-span-7 flex flex-col gap-5 min-h-[min(70vh,720px)]">
            <div className="flex-1 flex items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/35 backdrop-blur-sm p-5 sm:p-8 shadow-panel relative min-h-[420px]">
              <GameCanvas
                level={currentLevel}
                playerPos={gameState.playerPos}
                playerDir={gameState.playerDir}
                path={gameState.path}
                isWon={gameState.isWon}
                isLost={gameState.isLost}
                errorMsg={gameState.errorMsg}
                isPlaying={gameState.isPlaying}
              />

              {aiMessage && (
                <div
                  className={`absolute top-4 left-4 right-4 z-30 rounded-xl backdrop-blur-md p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                    aiPanelVariant === 'optimal'
                      ? 'border border-sky-400/40 bg-slate-950/90'
                      : 'border border-indigo-400/35 bg-slate-950/90'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ring-1 ring-white/10 ${
                        aiPanelVariant === 'optimal'
                          ? 'bg-gradient-to-br from-sky-500 to-cyan-600'
                          : 'bg-gradient-to-br from-indigo-500 to-violet-600'
                      }`}
                    >
                      {aiPanelVariant === 'optimal' ? (
                        <Info size={18} className="text-white" />
                      ) : (
                        <Cpu size={18} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-display font-semibold text-sm mb-1 ${
                          aiPanelVariant === 'optimal' ? 'text-sky-200' : 'text-indigo-200'
                        }`}
                      >
                        {aiPanelVariant === 'optimal' ? '最优解提示' : 'AI 导师'}
                      </h4>
                      <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{aiMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiMessage(null)}
                      className="shrink-0 w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white text-lg leading-none"
                      aria-label="关闭提示"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleOptimalHint}
                  disabled={isAiLoading}
                  title="获取最优解思路提示"
                  aria-label="获取最优解思路提示"
                  className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center shrink-0 text-sky-400 hover:bg-slate-700/90 hover:border-sky-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <Info size={22} aria-hidden />
                </button>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">参考最优步数</div>
                  <div className="text-xl font-mono font-bold text-white">≈ {currentLevel.optimalSteps}</div>
                  {currentLevel.maxForwardMoves != null && (
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      前进上限 {currentLevel.maxForwardMoves}
                    </div>
                  )}
                </div>
              </div>

              {gameState.isWon ? (
                <button
                  type="button"
                  onClick={handleNextLevel}
                  disabled={currentLevelIndex >= LEVEL_CONFIGS.length - 1}
                  className="rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:pointer-events-none p-4 flex items-center justify-center gap-2 font-display font-bold text-white shadow-[0_16px_40px_-18px_rgba(16,185,129,0.55)] transition-all hover:scale-[1.02] active:scale-[0.99]"
                >
                  <span>{currentLevelIndex >= LEVEL_CONFIGS.length - 1 ? '已全部通关' : '下一关'}</span>
                  <ChevronRight size={22} />
                </button>
              ) : (
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/35 p-4 flex items-center gap-4 opacity-90">
                  <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                    <Star className="text-amber-400/90" size={22} />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">任务状态</div>
                    <div className="text-xl font-mono font-semibold text-slate-200">
                      {gameState.isPlaying ? '执行中…' : gameState.isLost ? '需调整方案' : '待运行'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 lg:min-h-[min(70vh,720px)]">
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
              maxCommands={getLevelMaxCommands(currentLevel)}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;