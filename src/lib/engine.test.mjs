// 引擎逻辑单测（node 运行）
import {
  buildGroups,
  REVIEW_NODES,
  NODE_AFTER_MIN,
  nextNodeOf,
  advanceNode,
  finishLearning,
  isDue,
  dailyPlan,
  checkEn,
  checkCn,
  applyReviewResult,
} from './engine.js'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) {
    pass++
  } else {
    fail++
    console.error('  ✗ FAIL:', msg)
  }
}

// 1) 分组：23 个词 -> [10,10,3]
const fake = Array.from({ length: 23 }, (_, i) => ({
  词条ID: `U1-${String(i + 1).padStart(3, '0')}`,
  单词: `w${i}`,
  单元编号: 'Unit 1',
  一级六级释义: '义',
}))
const groups = buildGroups(fake)
ok(groups.length === 3, '分组数应为 3')
ok(JSON.stringify(groups.map((g) => g.wordIds.length)) === '[10,10,3]', '每组数量 [10,10,3]')

// 2) 节点与间隔
ok(REVIEW_NODES.length === 8, '复习节点应为 8 个')
ok(NODE_AFTER_MIN['即时'] === 30, '即时间隔 30 分钟')
ok(NODE_AFTER_MIN['7天'] === 21600, '7天间隔 21600 分钟')
ok(NODE_AFTER_MIN['15天'] === 1440, '15天间隔 1440 分钟')
ok(nextNodeOf('即时') === '30分钟', '即时->30分钟')
ok(nextNodeOf('随机抽查') === '随机抽查', '随机抽查自环')

// 3) 状态机推进
const g = { learned: false, reviewNode: null, nextDue: null, cnEnStreak: 0, enCnStreak: 0 }
const now = Date.now()
finishLearning(g, now)
ok(g.learned === true, 'finishLearning 标记已学')
ok(g.reviewNode === '30分钟', '学完进入 30分钟 节点')
ok(Math.abs(g.nextDue - (now + 30 * 60000)) < 2000, '学完排程 30 分钟后')

const g2 = { learned: true, reviewNode: '30分钟', nextDue: null, cnEnStreak: 0, enCnStreak: 0 }
advanceNode(g2, now)
ok(g2.reviewNode === '12小时', '30分钟->12小时')
ok(Math.abs(g2.nextDue - (now + 720 * 60000)) < 2000, '30分钟节点排程 720 分钟后')

// 4) 到期判定
const due = { learned: true, nextDue: now - 1000 }
const notDue = { learned: true, nextDue: now + 100000 }
ok(isDue(due, now) === true, '过期应到期')
ok(isDue(notDue, now) === false, '未到时间不应到期')
ok(isDue({ learned: false }, now) === false, '未学不应到期')

// 5) 判定函数
ok(checkEn('Eligible', { 单词: 'eligible' }) === true, 'CN->EN 忽略大小写')
ok(checkEn('wrong', { 单词: 'eligible' }) === false, 'CN->EN 错判')
ok(checkCn('有资格的', { 一级六级释义: '有资格的；符合条件的' }) === true, 'EN->CN 包含主要义项')
ok(checkCn('完全不同', { 一级六级释义: '有资格的' }) === false, 'EN->CN 错判')

// 6) 连续正确清除
const g3 = { cnEnStreak: 0, enCnStreak: 0 }
applyReviewResult(g3, true, false)
ok(g3.cnEnStreak === 1 && g3.enCnStreak === 0, '正确+1 错误归零')
applyReviewResult(g3, true, true)
applyReviewResult(g3, true, true)
applyReviewResult(g3, true, true)
ok(g3.cnEnStreak === 4, '连续 4 次正确累计')

// 7) 每日任务规划
const st = { groups: {} }
groups.forEach((gr) => {
  st.groups[gr.id] = { learned: false, reviewNode: null, nextDue: null }
})
const plan0 = dailyPlan(groups, st, now)
ok(plan0.tasks.every((t) => t.type === 'learn'), '全新状态只有新词任务')
ok(plan0.dueCount === 0 && !plan0.protectedMode, '无到期、未触发保护线')

// 全部已学且全部到期 -> 仅复习任务
const st2 = { groups: {} }
groups.forEach((gr) => {
  st2.groups[gr.id] = { learned: true, reviewNode: '30分钟', nextDue: now - 1 }
})
const plan2 = dailyPlan(groups, st2, now)
ok(plan2.tasks.every((t) => t.type !== 'learn'), '全到期时无新词任务')
ok(plan2.tasks.some((t) => t.type === 'review'), '全到期时含复习任务')
ok(plan2.dueCount === 23, '到期词计数=23')

console.log(`\n引擎单测：${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
