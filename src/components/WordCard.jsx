// 完整学习卡：展示单词的 16 个字段（空字段不显示）
const FIELDS = [
  ['单词', '单词'],
  ['音标', '音标'],
  ['音节', '音节'],
  ['谐音', '谐音'],
  ['词性', '词性'],
  ['原始释义', '原始释义'],
  ['一级六级释义', '一级六级释义'],
  ['二级释义', '二级释义'],
  ['三级释义', '三级释义'],
  ['变形', '变形'],
  ['主记忆词根', '主记忆词根'],
  ['辅助词根/词缀', '辅助词根/词缀'],
  ['词源', '词源'],
  ['例句', '例句'],
]

export default function WordCard({ word, compact = false }) {
  if (!word) return null
  const shown = FIELDS.filter(([, key]) => (word[key] || '').trim())
  return (
    <div className="card p-4 flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-lg font-bold text-brand-700">{word['单词']}</span>
        {word['音标'] && <span className="text-slate-400 text-sm">{word['音标']}</span>}
        {word['词性'] && (
          <span className="chip bg-slate-100 text-slate-500">{word['词性']}</span>
        )}
      </div>
      {word['音节'] && (
        <div className="text-xs text-slate-400">音节 {word['音节']}</div>
      )}
      {!compact && (
        <dl className="mt-1 grid grid-cols-1 gap-1 text-sm">
          {shown.map(([label, key]) => (
            <div key={key} className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-400">{label}</dt>
              <dd className="text-slate-700">{word[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
