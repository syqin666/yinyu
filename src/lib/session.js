// 进行中会话的持久化（独立 localStorage key，与总进度 state 隔离）
// 纯逻辑（createSessionState / restoreSession）不依赖浏览器环境，便于单测。
const KEY = 'vocab-app-session-v1'

export function createSessionState(groupId, mode) {
  return {
    groupId,
    mode,
    phase: 'cards',
    cnRes: null,
    enRes: null,
    quizCn: { index: 0, results: [], revealed: false },
    quizEn: { index: 0, results: [], revealed: false },
    finished: false,
  }
}

// 校验原始对象是否一份有效的进行中会话；非法返回 null
export function restoreSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.groupId !== 'string' || typeof raw.mode !== 'string') return null
  if (typeof raw.phase !== 'string') return null
  return {
    groupId: raw.groupId,
    mode: raw.mode,
    phase: raw.phase,
    cnRes: raw.cnRes ?? null,
    enRes: raw.enRes ?? null,
    quizCn: raw.quizCn || { index: 0, results: [], revealed: false },
    quizEn: raw.quizEn || { index: 0, results: [], revealed: false },
    finished: !!raw.finished,
  }
}

// ---- 浏览器端存储（仅在运行时调用）----
export function persistSession(sess) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sess))
  } catch {
    /* 忽略写入失败 */
  }
}

export function readSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function dropSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
