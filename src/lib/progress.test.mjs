// 进度导出/导入纯逻辑单测（node 运行，不依赖 react/json）
import { exportState, importState } from './progress.js'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) pass++
  else {
    fail++
    console.error('  ✗ FAIL:', msg)
  }
}

// 1) 往返一致性
const st = {
  version: 1,
  createdAt: 1,
  importedWords: [{ 词条ID: 'IMP-1' }],
  groups: { g1: { id: 'g1', learned: true } },
}
const json = exportState(st)
const back = importState(json)
ok(back.version === 1, '保留 version')
ok(Array.isArray(back.importedWords) && back.importedWords.length === 1, '保留 importedWords')
ok(back.groups.g1 && back.groups.g1.learned === true, '保留 groups')
ok(typeof back.exportedAt === 'number', '导出时附加 exportedAt')

// 2) 与基线合并：缺失字段由基线补齐
const base = { version: 1, importedWords: [], groups: { g0: { id: 'g0' } } }
const merged = importState(JSON.stringify({ groups: { g1: {} } }), base)
ok(merged.version === 1, '基线 version 生效')
ok(merged.importedWords.length === 0, '基线 importedWords 生效')
ok(merged.groups.g0 && merged.groups.g1, '基线与新 groups 合并')

// 3) 错误格式应抛错
let threw = false
try {
  importState('not json')
} catch {
  threw = true
}
ok(threw, '非法 JSON 抛错')

threw = false
try {
  importState(JSON.stringify({ foo: 1 }))
} catch {
  threw = true
}
ok(threw, '缺少 groups 抛错')

threw = false
try {
  importState(42)
} catch {
  threw = true
}
ok(threw, '非对象抛错')

console.log(`\n进度导入/导出单测：${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
