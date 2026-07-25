import { useState } from 'react'
import { parseOcrText, ocrImage } from '../lib/photo'

const EMPTY = { 单词: '', 音标: '', 词性: '', 一级六级释义: '' }

export default function PhotoImport({ onClose, onImport }) {
  const [tab, setTab] = useState('photo') // photo | text
  const [file, setFile] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [entries, setEntries] = useState([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  async function runOcr() {
    if (!file) return
    setBusy(true)
    setError('')
    setProgress('正在加载识别引擎并识别…（首次需联网下载中文语言包，请稍候）')
    try {
      const text = await ocrImage(file, (p) =>
        setProgress(`识别中… ${Math.round((p.progress || 0) * 100)}%`)
      )
      setOcrText(text)
      setEntries(parseOcrText(text))
      setProgress('')
    } catch (e) {
      setError('识别失败：' + (e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  function runParse() {
    setEntries(parseOcrText(ocrText))
  }

  function update(i, field, val) {
    setEntries((es) => es.map((e, j) => (j === i ? { ...e, [field]: val } : e)))
  }
  function remove(i) {
    setEntries((es) => es.filter((_, j) => j !== i))
  }
  function addRow() {
    setEntries((es) => [...es, { ...EMPTY }])
  }

  function confirm() {
    const valid = entries
      .map((e) => ({
        单词: (e.单词 || '').trim(),
        音标: (e.音标 || '').trim(),
        词性: (e.词性 || '').trim(),
        一级六级释义: (e.一级六级释义 || '').trim(),
      }))
      .filter((e) => e.单词)
    if (valid.length === 0) {
      setError('至少需要一个有效的单词（单词不能为空）。')
      return
    }
    onImport(valid)
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl max-h-[88vh] overflow-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">照片识别添加单词</h2>
          <button className="btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          {[
            ['photo', '📷 照片识别'],
            ['text', '📝 粘贴文本'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`btn ${tab === k ? 'btn-primary' : 'btn-ghost'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'photo' && (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            <button className="btn-primary" disabled={!file || busy} onClick={runOcr}>
              {busy ? '识别中…' : '开始识别'}
            </button>
            {progress && <p className="text-xs text-slate-500">{progress}</p>}
          </div>
        )}

        {tab === 'text' && (
          <div className="space-y-2">
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows={5}
              placeholder="把单词书/照片里的文字粘贴到这里，每行一个词。格式：单词 /音标/ 释义"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand-400 outline-none"
            />
            <button className="btn-primary" onClick={runParse}>
              解析文本
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}

        {entries.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                已识别 {entries.length} 条，请核对/修正：
              </span>
              <button className="btn-soft text-xs" onClick={addRow}>
                + 加一行
              </button>
            </div>
            <div className="grid grid-cols-[1fr_1fr_0.6fr_1.4fr_auto] gap-2 text-xs text-slate-400 px-1">
              <span>单词</span>
              <span>音标</span>
              <span>词性</span>
              <span>释义</span>
              <span />
            </div>
            {entries.map((e, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_0.6fr_1.4fr_auto] gap-2 items-center">
                <input
                  value={e.单词}
                  onChange={(ev) => update(i, '单词', ev.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  placeholder="word"
                />
                <input
                  value={e.音标}
                  onChange={(ev) => update(i, '音标', ev.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  placeholder="/fəˈnetɪk/"
                />
                <input
                  value={e.词性}
                  onChange={(ev) => update(i, '词性', ev.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  placeholder="n."
                />
                <input
                  value={e.一级六级释义}
                  onChange={(ev) => update(i, '一级六级释义', ev.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  placeholder="释义"
                />
                <button
                  className="text-rose-500 text-xs px-1"
                  onClick={() => remove(i)}
                >
                  删
                </button>
              </div>
            ))}
            <button className="btn-primary w-full mt-2" onClick={confirm}>
              确认导入 {entries.filter((e) => e.单词.trim()).length} 个词
            </button>
            <p className="text-xs text-slate-400">
              导入的词会进入「导入单元」，作为新分组追加在已有词库之后，并立即可学习/复习。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
