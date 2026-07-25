import { isDue, dueWordCount, REVIEW_NODES } from '../lib/engine'

export default function Stats({ state, groups }) {
  const now = Date.now()
  const learnedGroups = groups.filter((g) => state.groups[g.id]?.learned)
  const reviewedCount = learnedGroups.filter((g) => g.lastReviewed).length
  const dueCount = dueWordCount(groups, state, now)

  const nodeDist = REVIEW_NODES.map((n) => ({
    node: n,
    count: learnedGroups.filter((g) => state.groups[g.id]?.reviewNode === n).length,
  }))

  const totalWords = groups.reduce((n, g) => n + g.wordIds.length, 0)
  const learnedWords = learnedGroups.reduce((n, g) => n + g.wordIds.length, 0)
  const pct = totalWords ? Math.round((learnedWords / totalWords) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 mb-2">学习概览</h3>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="bg-brand-500 h-3 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          已学 {learnedWords}/{totalWords} 词（{pct}%）
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="已学组" value={`${learnedGroups.length}/${groups.length}`} />
        <Stat label="已复习过" value={reviewedCount} />
        <Stat label="今日待复习" value={dueCount} />
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-slate-800 mb-3">复习节点分布</h3>
        <ul className="space-y-2">
          {nodeDist.map((d) => (
            <li key={d.node} className="flex items-center gap-3 text-sm">
              <span className="w-20 text-slate-500">{d.node}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-brand-400 h-2.5 rounded-full"
                  style={{ width: `${learnedGroups.length ? (d.count / learnedGroups.length) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right text-slate-400">{d.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-xl font-bold text-brand-700">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  )
}
