// 进行中会话持久化纯逻辑单测（node 运行，不依赖浏览器）
import { createSessionState, restoreSession } from './session.js'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) pass++
  else {
    fail++
    console.error('  ✗ FAIL:', msg)
  }
}

// 1) 新建会话初始结构
const s = createSessionState('Unit 1#1', 'learn')
ok(s.groupId === 'Unit 1#1' && s.mode === 'learn', '创建会话含 groupId/mode')
ok(s.phase === 'cards', '初始 phase 为 cards')
ok(s.quizCn.index === 0 && Array.isArray(s.quizCn.results), 'quizCn 初始结构')
ok(s.finished === false, '初始未完成')

// 2) 合法恢复
const raw = {
  groupId: 'g1',
  mode: 'review',
  phase: 'quiz-en-cn',
  cnRes: { allCorrect: true, direction: 'cn-en' },
  enRes: null,
  quizCn: { index: 3, results: [{ id: 'a', correct: true }], revealed: false },
  quizEn: { index: 1, results: [], revealed: false },
}
const r = restoreSession(raw)
ok(r && r.groupId === 'g1' && r.phase === 'quiz-en-cn', '恢复基础字段')
ok(r.cnRes && r.cnRes.allCorrect === true, '恢复 cnRes')
ok(r.quizCn.index === 3 && r.quizCn.results.length === 1, '恢复 quizCn 进度')
ok(r.quizEn.index === 1, '恢复 quizEn 进度')

// 3) 缺失/非法返回 null
ok(restoreSession(null) === null, 'null 返回 null')
ok(restoreSession(42) === null, '非对象返回 null')
ok(restoreSession({ groupId: 'x' }) === null, '缺 mode 返回 null')
ok(restoreSession({ mode: 'learn' }) === null, '缺 groupId 返回 null')
ok(restoreSession({ groupId: 'x', mode: 'learn' }) === null, '缺 phase 返回 null')

console.log(`\n会话持久化单测：${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
