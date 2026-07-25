// 将种子进度 + 可导入备份重写为：
//   全部分组 = learned:true、reviewNode:"12小时"、nextDue=now+12h、streak=0
// （即「复习中 · 全部处于 12 小时复习阶段」），并保持分组 id 与词库对齐。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED = resolve(__dirname, 'src/data/seed-progress.json')
const IMPORT = resolve(__dirname, '../vocab-progress-import.json')

const seed = JSON.parse(readFileSync(SEED, 'utf8'))
const now = Date.now()
const TWELVE_H = 12 * 60 * 60 * 1000

const ids = Object.keys(seed.groups)
const groups = {}
for (const id of ids) {
  groups[id] = {
    id,
    learned: true,
    learn: { cards: true, cnEn: true, enCn: true, summary: true, immediate: true },
    reviewNode: '12小时',
    nextDue: now + TWELVE_H,
    cnEnStreak: 0,
    enCnStreak: 0,
    lastReviewed: now,
  }
}

const out = { version: 1, createdAt: now, importedWords: [], groups }
const text = JSON.stringify(out, null, 2) + '\n'
writeFileSync(SEED, text, 'utf8')
writeFileSync(IMPORT, text, 'utf8')
console.log(`✅ 已重写 seed + import：${ids.length} 组全部 reviewNode=12小时，nextDue=now+12h`)
