// 将「词库」里逐词携带的学习进度（学习状态/复习状态/连续正确计数），
// 转换成 Web 应用 importState 兼容的进度 JSON。
// 单一数据源 = 应用自身的 src/data/vocab.json（含 词条ID 与进度字段，分组 id 天然对齐）。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildGroups } from './src/lib/engine.js'
import { importState as importProgressRaw } from './src/lib/progress.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VOCAB = resolve(__dirname, 'src/data/vocab.json')
const OUT = resolve(__dirname, '../vocab-progress-import.json')

const words = JSON.parse(readFileSync(VOCAB, 'utf8'))
const refMap = new Map(words.map((w) => [w['词条ID'], w]))

// 复习状态（词库字段）→ 应用分组态（reviewNode + 距现在的间隔分钟）
// 应用语义：reviewNode = 待做的下一次复习节点名，nextDue = 该次复习到期时间
function mapStatus(status = '') {
  if (status.includes('30分钟')) return { node: '30分钟', mins: 30 }
  if (status.includes('12小时')) return { node: '12小时', mins: 720 }
  if (status.includes('1天')) return { node: '1天', mins: 1440 }
  if (status.includes('3天')) return { node: '3天', mins: 4320 }
  if (status.includes('7天')) return { node: '7天', mins: 21600 }
  if (status.includes('15天')) return { node: '15天', mins: 1440 }
  if (status.includes('随机')) return { node: '随机抽查', mins: 1440 }
  return { node: '30分钟', mins: 30 }
}

const groups = buildGroups(words)
const now = Date.now()
const groupStates = {}
const report = []

for (const g of groups) {
  const refWords = g.wordIds.map((id) => refMap.get(id)).filter(Boolean)
  if (refWords.length === 0) {
    console.warn(`⚠️ 分组 ${g.id} 在词库中找不到词条，跳过`)
    continue
  }
  const rep = mapStatus(refWords[0]['复习状态'])
  const cnEnStreak = Math.min(
    ...refWords.map((w) => parseInt(w['拼写连续正确'], 10) || 0)
  )
  const enCnStreak = Math.min(
    ...refWords.map((w) => parseInt(w['词义连续正确'], 10) || 0)
  )
  groupStates[g.id] = {
    id: g.id,
    learned: true,
    learn: { cards: true, cnEn: true, enCn: true, summary: true, immediate: true },
    reviewNode: rep.node,
    nextDue: now + rep.mins * 60000,
    cnEnStreak,
    enCnStreak,
    lastReviewed: now,
  }
  report.push({
    group: g.id,
    words: g.wordIds.length,
    refStatus: refWords[0]['复习状态'],
    reviewNode: rep.node,
    nextDue: new Date(now + rep.mins * 60000).toISOString(),
    cnEnStreak,
    enCnStreak,
  })
}

const payload = {
  version: 1,
  createdAt: now,
  importedWords: [],
  groups: groupStates,
}

// 用应用自身的导入校验逻辑验证一遍，确保文件可被「导入进度」正常解析
const validated = importProgressRaw(JSON.stringify(payload), {
  version: 1,
  importedWords: [],
  groups: {},
})
if (Object.keys(validated.groups).length !== groups.length) {
  throw new Error('校验失败：分组数量不匹配')
}

writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8')

console.log(`✅ 已生成导入文件：${OUT}`)
console.log(`   分组数：${groups.length} | 已学：${Object.keys(groupStates).length}`)
console.table(report)
