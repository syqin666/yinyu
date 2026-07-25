// 单向答题器：依次对一组词做 中文→英文 或 英文→中文 测试
// 受控化：支持从断点恢复（initialIndex/initialResults/initialRevealed）并实时上报进度
import { useEffect, useState } from 'react'
import { cnPrompt, enPrompt, enAnswer, cnAnswer, checkEn, checkCn } from '../lib/engine'

export default function Quiz({
  words,
  direction,
  initialIndex = 0,
  initialResults = [],
  initialRevealed = false,
  onComplete,
  onProgress,
}) {
  const [i, setI] = useState(initialIndex)
  const [input, setInput] = useState('')
  const [revealed, setRevealed] = useState(initialRevealed)
  const [results, setResults] = useState(initialResults)

  // 进度变化即上报（供断点续学持久化）
  useEffect(() => {
    onProgress?.({ index: i, results, revealed })
  }, [i, results, revealed, onProgress])

  const word = words[i]
  const prompt = direction === 'cn-en' ? cnPrompt(word) : enPrompt(word)
  const expected = direction === 'cn-en' ? enAnswer(word) : cnAnswer(word)
  const total = words.length

  function submit() {
    const correct = direction === 'cn-en' ? checkEn(input, word) : checkCn(input, word)
    setResults((prev) => [...prev, { id: word['词条ID'], correct }])
    setRevealed(true)
  }

  function next() {
    if (i + 1 >= total) {
      const allCorrect = results.every((r) => r.correct)
      onComplete({ allCorrect, direction })
      return
    }
    setI(i + 1)
    setInput('')
    setRevealed(false)
  }

  return (
    <div className="card p-6 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4 text-sm text-slate-400">
        <span>
          {direction === 'cn-en' ? '中文 → 英文' : '英文 → 中文'} · {i + 1}/{total}
        </span>
        <span>本组进度</span>
      </div>

      <div className="text-2xl font-semibold text-slate-800 mb-1 break-words">{prompt}</div>
      <div className="text-xs text-slate-400 mb-4">
        {direction === 'cn-en' ? '请输入对应的英文单词' : '请输入主要中文释义'}
      </div>

      {!revealed ? (
        <>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="在这里作答…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
          />
          <button className="btn-primary w-full mt-3" onClick={submit}>
            提交
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              results[i]?.correct
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {results[i]?.correct ? '✓ 正确' : '✗ 不正确'} — 正确答案：
            <span className="font-bold">{expected}</span>
          </div>
          <button className="btn-primary w-full" onClick={next}>
            {i + 1 >= total ? '完成本方向' : '下一词'}
          </button>
        </div>
      )}
    </div>
  )
}
