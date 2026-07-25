import { useRef } from 'react'
import {
  isDue,
  dueWordCount,
  dailyPlan,
  formatDue,
  REVIEW_NODES,
} from '../lib/engine'

const TYPE_LABEL = {
  review: '到期复习',
  random: '随机抽查',
  learn: '新词学习',
}

function groupStatus(g, st, now) {
  const s = st.groups[g.id]
  if (!s || !s.learned) return { text: '未学', cls: 'bg-slate-100 text-slate-500' }
  if (isDue(s, now)) return { text: '待复习', cls: 'bg-amber-100 text-amber-700' }
  return { text: '复习中', cls: 'bg-emerald-100 text-emerald-700' }
}

export default function Dashboard({ state, groups, openSession, resetAll, onAddPhoto, onExportState, onImportState }) {
  const fileRef = useRef(null)
  const now = Date.now()
  const learnedCount = groups.filter((g) => state.groups[g.id]?.learned).length
  const dueCount = dueWordCount(groups, state, now)
  const plan = dailyPlan(groups, state, now)
  const totalWords = groups.reduce((n, g) => n + g.wordIds.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-slate-800">仪表盘</h2>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-soft" onClick={onAddPhoto}>
            📷 照片识别添加
          </button>
          <button className="btn-soft" onClick={onExportState}>
            ⬇️ 导出进度
          </button>
          <button className="btn-soft" onClick={() => fileRef.current?.click()}>
            ⬆️ 导入进度
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportState(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="总词数" value={totalWords} />
        <Stat label="已学组" value={`${learnedCount}/${groups.length}`} />
        <Stat label="今日待复习" value={dueCount} highlight={dueCount > 0} />
        <Stat label="复习节点" value={REVIEW_NODES.length} />
      </div>

      {plan.protectedMode && (
        <div className="card p-4 bg-amber-50 border-amber-200 text-amber-800 text-sm">
          ⚠️ 当前到期复习词超过 30 个，已启用保护线：本轮只安排复习，暂停随机抽查与新词。
        </div>
      )}

      <section className="card p-5">
        <h3 className="font-bold text-slate-800 mb-3">今日任务</h3>
        {plan.tasks.length === 0 ? (
          <p className="text-sm text-slate-400">暂无任务，去「词库」挑一组开始学习吧。</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {plan.tasks.map((t, idx) => {
              const g = groups.find((x) => x.id === t.id)
              const mode = t.type === 'learn' ? 'learn' : 'review'
              return (
                <li key={idx} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">
                    <span className="chip bg-brand-50 text-brand-700 mr-2">
                      {TYPE_LABEL[t.type]}
                    </span>
                    第 {g.index} 组（{g.wordIds.length} 词）
                  </span>
                  <button className="btn-soft" onClick={() => openSession(t.id, mode)}>
                    开始
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-slate-800 mb-3">单元进度</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {groups.map((g) => {
            const s = state.groups[g.id]
            const st = groupStatus(g, state, now)
            const due = isDue(s, now)
            const mode = !s?.learned ? 'learn' : 'review'
            return (
              <button
                key={g.id}
                onClick={() => openSession(g.id, mode)}
                className="card p-3 text-left hover:border-brand-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    {g.unit === '导入单元' ? '导入' : `第 ${g.index} 组`}
                  </span>
                  <span className={`chip ${st.cls}`}>{st.text}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{g.wordIds.length} 词</div>
                {s?.learned && (
                  <div className="text-xs text-slate-400 mt-1">
                    {due ? '现在到期' : `下次 ${formatDue(s.nextDue, now)}`}
                    {s.reviewNode ? ` · ${s.reviewNode}` : ''}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          className="btn-ghost text-rose-600 border-rose-200"
          onClick={() => {
            if (confirm('确定要清空全部学习进度与导入词吗？此操作不可恢复。')) resetAll()
          }}
        >
          清空进度
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className="card p-4 text-center">
      <div className={`text-2xl font-bold ${highlight ? 'text-amber-600' : 'text-brand-700'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  )
}
