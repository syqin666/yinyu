// 进度导出/导入的纯逻辑（不依赖 react / json，便于单测与复用）
export function exportState(state) {
  return JSON.stringify({ ...state, exportedAt: Date.now() })
}

// 导入并校验：整体替换状态，与基线 baseState 合并以保证字段完整。
// baseState 默认提供 version/importedWords/groups 基线（store 层会传入 newState()）。
export function importState(json, baseState) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('文件格式不正确：不是有效的 JSON 对象')
  }
  if (!parsed.groups || typeof parsed.groups !== 'object') {
    throw new Error('文件格式不正确：缺少 groups 字段')
  }
  const base = baseState || { version: 1, importedWords: [], groups: {} }
  return {
    ...base,
    ...parsed,
    version: base.version,
    importedWords: Array.isArray(parsed.importedWords) ? parsed.importedWords : base.importedWords,
    groups: { ...base.groups, ...parsed.groups },
  }
}
