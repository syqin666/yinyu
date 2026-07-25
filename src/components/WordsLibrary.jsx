import { useMemo, useState } from 'react'
import WordCard from './WordCard'

export default function WordsLibrary({ words }) {
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return words
    return words.filter(
      (w) =>
        (w['单词'] || '').toLowerCase().includes(s) ||
        (w['原始释义'] || '').includes(s) ||
        (w['一级六级释义'] || '').includes(s)
    )
  }, [q, words])

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索单词 / 释义…"
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
      />
      <p className="text-sm text-slate-400">共 {filtered.length} 词</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((w) => (
          <div key={w['词条ID']} className="space-y-2">
            <button
              onClick={() => setOpenId(openId === w['词条ID'] ? null : w['词条ID'])}
              className="card p-3 w-full text-left flex items-center justify-between hover:border-brand-300"
            >
              <span>
                <span className="font-semibold text-slate-800">{w['单词']}</span>
                <span className="text-slate-400 text-sm ml-2">{w['一级六级释义']}</span>
              </span>
              <span className="text-slate-300 text-sm">{openId === w['词条ID'] ? '收起' : '详情'}</span>
            </button>
            {openId === w['词条ID'] && <WordCard word={w} />}
          </div>
        ))}
      </div>
    </div>
  )
}
