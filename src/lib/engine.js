// 英语背单词系统 —— 记忆引擎（纯逻辑，无 React 依赖）
// 方法论源自参考包：每组 10 词；首次学习→双向测试→即时复习；
// 复习节点 即时→30分钟→12小时→1天→3天→7天→15天→随机抽查；
// 双向分别判定，连续正确 4 次清除；每日任务含 30 词保护线。

export const REVIEW_NODES = [
  '即时',
  '30分钟',
  '12小时',
  '1天',
  '3天',
  '7天',
  '15天',
  '随机抽查',
]

// 完成当前节点后，到下一节点的间隔（分钟）
export const NODE_AFTER_MIN = {
  即时: 30,
  '30分钟': 720,
  '12小时': 1440,
  '1天': 4320,
  '3天': 10080,
  '7天': 21600,
  '15天': 1440,
  随机抽查: 1440,
}

export const GROUP_SIZE = 10
export const CLEAR_STREAK = 4 // 连续正确 4 次清除该题型

// ---------- 词库分组 ----------
export function buildGroups(words, size = GROUP_SIZE) {
  const sorted = [...words].sort((a, b) =>
    String(a['词条ID']).localeCompare(String(b['词条ID']))
  )
  const groups = []
  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size)
    const unit = chunk[0]['单元编号'] || 'Unit 1'
    groups.push({
      id: `${unit}#${groups.length + 1}`,
      unit,
      index: groups.length + 1,
      wordIds: chunk.map((w) => w['词条ID']),
      words: chunk,
    })
  }
  return groups
}

// ---------- 提示/答案构造 ----------
export function cnPrompt(word) {
  const parts = [word['一级六级释义'], word['二级释义'], word['三级释义']]
    .map((s) => (s || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join('；') : word['原始释义'] || ''
}

export function enPrompt(word) {
  return word['单词'] || ''
}

// 中文→英文 期望答案（英文单词）
export function enAnswer(word) {
  return (word['单词'] || '').trim()
}

// 英文→中文 期望答案（一级释义首义项）
export function cnAnswer(word) {
  const base = word['一级六级释义'] || word['原始释义'] || ''
  return base.split(/[；;，,]/)[0].trim()
}

function norm(s) {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s.,;:!?，。；：！？、()（）'']/g, '')
}

// CN→EN：输入应为英文单词
export function checkEn(input, word) {
  return norm(input) === norm(enAnswer(word))
}

// EN→CN：输入应包含主要中文释义
export function checkCn(input, word) {
  const ans = cnAnswer(word)
  if (!ans) return false
  const inNorm = norm(input)
  const ansNorm = norm(ans)
  if (inNorm === ansNorm) return true
  // 允许包含主要义项（含部分匹配，避免标点差异误判）
  return inNorm.includes(ansNorm) || ansNorm.includes(inNorm)
}

// ---------- 复习状态机 ----------
export function isDue(groupState, now = Date.now()) {
  return (
    !!groupState &&
    groupState.learned &&
    groupState.nextDue != null &&
    now >= groupState.nextDue
  )
}

export function dueWordCount(groups, state, now = Date.now()) {
  return groups
    .filter((g) => isDue(state.groups[g.id], now))
    .reduce((n, g) => n + g.wordIds.length, 0)
}

export function nextNodeOf(current) {
  const i = REVIEW_NODES.indexOf(current)
  if (i < 0) return REVIEW_NODES[1] // 默认学完进入 30分钟
  return REVIEW_NODES[Math.min(i + 1, REVIEW_NODES.length - 1)]
}

// 完成一次复习后推进节点并排程
export function advanceNode(groupState, now = Date.now()) {
  const cur = groupState.reviewNode || '即时'
  const next = nextNodeOf(cur)
  groupState.reviewNode = next
  groupState.nextDue = now + (NODE_AFTER_MIN[cur] || 1440) * 60000
  groupState.lastReviewed = now
  return groupState
}

// 完成首次学习：即时复习已做，进入 30分钟 节点
export function finishLearning(groupState, now = Date.now()) {
  groupState.learned = true
  groupState.learn = { cards: true, cnEn: true, enCn: true, summary: true, immediate: true }
  groupState.reviewNode = '30分钟'
  groupState.nextDue = now + NODE_AFTER_MIN['即时'] * 60000
  groupState.cnEnStreak = 0
  groupState.enCnStreak = 0
  groupState.lastReviewed = now
  return groupState
}

// 复习一轮后更新连续正确计数（按题型聚合）
export function applyReviewResult(groupState, cnEnAllCorrect, enCnAllCorrect) {
  groupState.cnEnStreak = cnEnAllCorrect ? (groupState.cnEnStreak || 0) + 1 : 0
  groupState.enCnStreak = enCnAllCorrect ? (groupState.enCnStreak || 0) + 1 : 0
  return groupState
}

// ---------- 每日任务规划（DAY01~DAY04 + 30 词保护线）----------
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function dailyPlan(groups, state, now = Date.now()) {
  const dueGroups = groups.filter((g) => isDue(state.groups[g.id], now))
  const dueCount = dueGroups.reduce((n, g) => n + g.wordIds.length, 0)
  const protectedMode = dueCount > 30

  const learnedGroups = groups.filter((g) => state.groups[g.id].learned)
  const randomIds = shuffle(learnedGroups)
    .slice(0, 2)
    .map((g) => g.id)
  const newIds = groups.filter((g) => !state.groups[g.id].learned).map((g) => g.id)

  const tasks = []
  dueGroups.forEach((g) => tasks.push({ type: 'review', id: g.id }))
  if (!protectedMode) {
    randomIds.forEach((id) => tasks.push({ type: 'random', id }))
    newIds.forEach((id) => tasks.push({ type: 'learn', id }))
  }
  return { tasks, protectedMode, dueCount }
}

// ---------- 时间格式化 ----------
export function formatDue(nextDue, now = Date.now()) {
  if (nextDue == null) return '—'
  const diff = nextDue - now
  if (diff <= 0) return '现在到期'
  const min = Math.round(diff / 60000)
  if (min < 60) return `${min} 分钟后`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} 小时后`
  const d = Math.round(h / 24)
  return `${d} 天后`
}
