import { useState } from 'react'
import { useVocabStore, getAllWords } from './lib/store'
import Dashboard from './components/Dashboard'
import WordsLibrary from './components/WordsLibrary'
import Stats from './components/Stats'
import Session from './components/Session'
import PhotoImport from './components/PhotoImport'

const TABS = [
  { key: 'dashboard', label: '仪表盘' },
  { key: 'library', label: '词库' },
  { key: 'stats', label: '统计' },
]

export default function App() {
  const { state, groups, completeLearn, recordReview, addImportedWords, resetAll, importProgress, exportState } =
    useVocabStore()
  const [view, setView] = useState({ name: 'dashboard' })
  const [showPhoto, setShowPhoto] = useState(false)

  function openSession(groupId, mode) {
    setView({ name: 'session', groupId, mode })
  }

  // 导入完成后跳回仪表盘，并显示导入单元进度
  function handleImport(entries) {
    const n = addImportedWords(entries)
    setShowPhoto(false)
    setView({ name: 'dashboard' })
    return n
  }

  // 导出进度为 JSON 文件（备份/迁移）
  function handleExportState() {
    const json = exportState(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vocab-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // 从 JSON 文件导入进度（确认后整体覆盖）
  function handleImportState(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        if (confirm('导入将覆盖当前进度与导入词，确定继续？')) {
          importProgress(reader.result)
        }
      } catch (e) {
        alert('导入失败：' + (e?.message || e))
      }
    }
    reader.onerror = () => alert('读取文件失败')
    reader.readAsText(file)
  }

  const group =
    view.name === 'session' ? groups.find((g) => g.id === view.groupId) : null

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-brand-700 text-lg">英语背单词系统</div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setView({ name: t.key })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  view.name === t.key || (view.name === 'session' && t.key === 'dashboard')
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {view.name === 'session' && group ? (
          <Session
            group={group}
            mode={view.mode}
            onExit={() => setView('dashboard')}
            onLearnComplete={completeLearn}
            onReviewRecord={recordReview}
          />
        ) : view.name === 'library' ? (
          <WordsLibrary words={getAllWords(state)} />
        ) : view.name === 'stats' ? (
          <Stats state={state} groups={groups} />
        ) : (
          <Dashboard
            state={state}
            groups={groups}
            openSession={openSession}
            resetAll={resetAll}
            onAddPhoto={() => setShowPhoto(true)}
            onExportState={handleExportState}
            onImportState={handleImportState}
          />
        )}
      </main>

      {showPhoto && (
        <PhotoImport onClose={() => setShowPhoto(false)} onImport={handleImport} />
      )}
    </div>
  )
}
