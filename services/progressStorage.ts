import { LEVEL_CONFIGS } from '../constants';

const USERNAME_KEY = 'daimamaoxian_username';

function progressKey(username: string): string {
  return `daimamaoxian_progress_${username}`;
}

export interface SavedProgress {
  maxReachedLevelIndex: number;
  lastLevelIndex: number;
}

const lastIdx = () => LEVEL_CONFIGS.length - 1;

function clampMaxReached(n: number): number {
  return Math.min(Math.max(0, Math.floor(n)), lastIdx());
}

function clampLastLevel(last: number, maxReached: number): number {
  return Math.min(Math.max(0, Math.floor(last)), maxReached);
}

export function getSavedUsername(): string | null {
  try {
    const v = localStorage.getItem(USERNAME_KEY);
    if (!v) return null;
    const t = v.trim();
    return t.length ? t : null;
  } catch {
    return null;
  }
}

export function setSavedUsername(username: string): void {
  try {
    localStorage.setItem(USERNAME_KEY, username.trim());
  } catch {
    /* ignore */
  }
}

export function clearSavedUsername(): void {
  try {
    localStorage.removeItem(USERNAME_KEY);
  } catch {
    /* ignore */
  }
}

export function loadProgress(username: string): SavedProgress {
  try {
    const raw = localStorage.getItem(progressKey(username));
    if (!raw) {
      return { maxReachedLevelIndex: 0, lastLevelIndex: 0 };
    }
    const p = JSON.parse(raw) as Partial<SavedProgress>;
    const maxReached = clampMaxReached(Number(p.maxReachedLevelIndex) || 0);
    const lastLevel = clampLastLevel(Number(p.lastLevelIndex) || 0, maxReached);
    return { maxReachedLevelIndex: maxReached, lastLevelIndex: lastLevel };
  } catch {
    return { maxReachedLevelIndex: 0, lastLevelIndex: 0 };
  }
}

export function saveProgress(username: string, progress: SavedProgress): void {
  try {
    const maxReached = clampMaxReached(progress.maxReachedLevelIndex);
    const lastLevel = clampLastLevel(progress.lastLevelIndex, maxReached);
    localStorage.setItem(
      progressKey(username),
      JSON.stringify({ maxReachedLevelIndex: maxReached, lastLevelIndex: lastLevel })
    );
  } catch {
    /* ignore */
  }
}

/** 首次挂载时读取：用于恢复登录态与关卡（仅浏览器） */
export function getInitialFromStorage(): {
  username: string | null;
  maxReachedLevelIndex: number;
  lastLevelIndex: number;
} {
  if (typeof localStorage === 'undefined') {
    return { username: null, maxReachedLevelIndex: 0, lastLevelIndex: 0 };
  }
  const username = getSavedUsername();
  if (!username) {
    return { username: null, maxReachedLevelIndex: 0, lastLevelIndex: 0 };
  }
  const p = loadProgress(username);
  return {
    username,
    maxReachedLevelIndex: p.maxReachedLevelIndex,
    lastLevelIndex: p.lastLevelIndex,
  };
}

export function normalizeLoginName(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length > 32) return t.slice(0, 32);
  return t;
}
