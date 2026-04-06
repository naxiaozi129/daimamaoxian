import React, { useState } from 'react';
import { Terminal, LogIn, UserRound, Ghost } from 'lucide-react';
import { normalizeLoginName } from '../services/progressStorage';

interface LoginScreenProps {
  onLogin: (username: string) => void;
  onGuest: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGuest }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = normalizeLoginName(name);
    if (!n) {
      setError('请输入用户名（1～32 个字符）。');
      return;
    }
    setError(null);
    onLogin(n);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 app-backdrop">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur-md shadow-panel p-8 animate-fade-up">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-glow-sm ring-1 ring-white/10 mb-4">
            <Terminal className="text-white" size={30} strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            代码探险 <span className="text-sky-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            登录后可保存关卡进度，下次打开将自动回到上次进度。
            <br />
            <span className="text-slate-500">游客模式不保存，每次从第 1 关开始。</span>
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="login-name" className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
              用户名
            </label>
            <div className="relative">
              <UserRound
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
                strokeWidth={2}
              />
              <input
                id="login-name"
                type="text"
                autoComplete="username"
                placeholder="例如：explorer01"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-600 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 font-mono text-sm"
                maxLength={32}
              />
            </div>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 border border-sky-500/30 shadow-glow-sm transition-all active:scale-[0.99]"
          >
            <LogIn size={20} strokeWidth={2} />
            登录并继续
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-slate-900/90 text-slate-500 font-mono">或</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onGuest}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-600/80 transition-colors"
        >
          <Ghost size={20} strokeWidth={2} />
          游客进入（不保存进度）
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
