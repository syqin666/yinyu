// 持久化与状态管理：以 localStorage 为事实来源，刷新不丢进度
// 词库 = 初始 73 词（稳定分组） + 可追加的「导入词」（照片识别/手动添加）
import { useEffect, useMemo, useState } from 'react'
import rawWords from '../data/vocab.json'
import seedProgress from '../data/seed-progress.json'
import { buildGroups, finishLearning, advanceNode, applyReviewResult } from './engine'
import { exportState as exportProgress, importState as importProgressRaw } from './progress'

const STORAGE_KEY = 'vocab-app-state-v1'
export const INITIAL_WORDS = rawWords
export const INITIAL_GROUPS = buildGroups(INITIAL_WORDS)
const IMPORT_UNIT = '导入单元'

function freshGroupState(id) {
  return {
    id,
    learned: false,
    learn: { cards: false, cnEn: false, enCn: false, summary: false, immediate: false },
    reviewNode: null,
    nextDue: null,
    cnEnStreak: 0,
    enCnStreak: 0,
    lastReviewed: null,
  }
}

// 由「导入词」构建稳定分组（每 10 词一组，id 形如 导入单元#1）
export function buildImportedGroups(words, size = 10) {
  const groups = []
  for (let i = 0; i < words.length; i += size) {
    const chunk = words.slice(i, i + size)
    groups.push({
      id: `${IMPORT_UNIT}#${groups.length + 1}`,
      unit: IMPORT_UNIT,
      index: groups.length + 1,
      wordIds: chunk.map((w) => w['词条ID']),
      words: chunk,
    })
  }
  return groups
}

export function getAllGroups(state) {
  return [...INITIAL_GROUPS, ...buildImportedGroups(state.importedWords || [])]
}

// 全部单词 = 初始词库 + 导入词（供词库浏览使用）
export function getAllWords(state) {
  return [...INITIAL_WORDS, ...(state.importedWords || [])]
}

// 确保所有当前分组都有进度条目
function ensureGroups(state) {
  const groups = getAllGroups(state)
  let changed = false
  const next = { ...state.groups }
  groups.forEach((g) => {
    if (!next[g.id]) {
      next[g.id] = freshGroupState(g.id)
      changed = true
    }
  })
  return changed ? { ...state, groups: next } : state
}

export function newState() {
  const groups = {}
  INITIAL_GROUPS.forEach((g) => {
    groups[g.id] = freshGroupState(g.id)
  })
  return { version: 1, createdAt: Date.now(), importedWords: [], groups }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // 首次打开（无本地进度）时，载入已迁移的用户进度作为初始态
    if (!raw) return importState(JSON.stringify(seedProgress))
    const parsed = JSON.parse(raw)
    const base = newState()
    const merged = {
      ...base,
      ...parsed,
      importedWords: parsed.importedWords || [],
      groups: { ...base.groups, ...(parsed.groups || {}) },
    }
    return ensureGroups(merged)
  } catch {
    return newState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 忽略写入失败 */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// 进度导出（委托纯逻辑模块，便于单测）
export function exportState(state) {
  return exportProgress(state)
}

// 进度恢复：校验 + 以 newState() 为基线补全分组进度
export function importState(json) {
  return ensureGroups(importProgressRaw(json, newState()))
}

// 全局 React hook
export function useVocabStore() {
  const [state, setState] = useState(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  // 派生分组（随导入词变化）；仅当导入词变化时才重算
  const groups = useMemo(() => getAllGroups(state), [state.importedWords])

  function completeLearn(id, now = Date.now()) {
    setState((s) => {
      const g = s.groups[id] ? { ...s.groups[id] } : freshGroupState(id)
      finishLearning(g, now)
      return { ...s, groups: { ...s.groups, [id]: g } }
    })
  }

  function recordReview(id, cnEnAllCorrect, enCnAllCorrect, now = Date.now()) {
    setState((s) => {
      const g = s.groups[id] ? { ...s.groups[id] } : freshGroupState(id)
      applyReviewResult(g, cnEnAllCorrect, enCnAllCorrect)
      advanceNode(g, now)
      return { ...s, groups: { ...s.groups, [id]: g } }
    })
  }

  function addImportedWords(entries, now = Date.now()) {
    const stamp = now
    const words = entries.map((e, i) => ({
      词条ID: `IMP-${stamp}-${i}`,
      单词: e.单词 || '',
      音标: e.音标 || '',
      音节: e.音节 || '',
      谐音: e.谐音 || '不使用',
      词性: e.词性 || '',
      原始释义: e.原始释义 || e.一级六级释义 || '',
      一级六级释义: e.一级六级释义 || e.原始释义 || '',
      二级释义: e.二级释义 || '',
      三级释义: e.三级释义 || '',
      变形: e.变形 || '',
      主记忆词根: e.主记忆词根 || '',
      '辅助词根/词缀': e['辅助词根/词缀'] || '不使用',
      词源: e.词源 || '',
      例句: e.例句 || '',
      单元编号: IMPORT_UNIT,
      学习状态: '未学',
    }))
    setState((s) => {
      const importedWords = [...(s.importedWords || []), ...words]
      const next = { ...s, importedWords }
      // 为新分组补齐进度
      buildImportedGroups(importedWords).forEach((g) => {
        if (!next.groups[g.id]) next.groups = { ...next.groups, [g.id]: freshGroupState(g.id) }
      })
      return next
    })
    return words.length
  }

  function resetAll() {
    setState(newState())
  }

  function importProgress(json) {
    setState(() => importState(json))
  }

  return { state, groups, completeLearn, recordReview, addImportedWords, resetAll, importProgress }
}
