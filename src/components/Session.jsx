// 学习/复习会话：完整卡 → 中文→英文 → 英文→中文 → 核对卡 → 排程
// 支持断点续学：进度持久化到 localStorage，刷新/退出后可从中断处继续。
import { useEffect, useState } from 'react'
import WordCard from './WordCard'
import Quiz from './Quiz'
import {
  readSession,
  restoreSession,
  persistSession,
  dropSession,
} from '../lib/session'

function phaseLabel(p) {
  return (
    {
      cards: '浏览卡片',
      'quiz-cn-en': '中文 → 英文',
      'quiz-en-cn': '英文 → 中文',
      summary: '核对卡片',
    }[p] || p
  )
}

export default function Session({ group, mode, onExit, onLearnComplete, onReviewRecord }) {
  const isReview = mode === 'review'
  const groupTitle =
    group.unit === '导入单元'
      ? `导入单元 · 第 ${group.index} 组`
      : `第 ${group.index} 组`

  const [phase, setPhase] = useState('cards')
  const [cnRes, setCnRes] = useState(null)
  const [enRes, setEnRes] = useState(null)
  const [quizCn, setQuizCn] = useState({ index: 0, results: [], revealed: false })
  const [quizEn, setQuizEn] = useState({ index: 0, results: [], revealed: false })

  // 进入时检测未完成会话（同组同模式）
  const [resume, setResume] = useState(() => {
    const saved = restoreSession(readSession())
    if (saved && saved.groupId === group.id && saved.mode === mode && !saved.finished) {
      return saved
    }
    return null
  })

  // 进度变化即持久化（等待用户选择「继续/重开」时不写）
  useEffect(() => {
    if (resume) return
    persistSession({
      groupId: group.id,
      mode,
      phase,
      cnRes,
      enRes,
      quizCn,
      quizEn,
      finished: false,
    })
  }, [resume, phase, cnRes, enRes, quizCn, quizEn, group.id, mode])

  function startResume() {
    setPhase(resume.phase)
    setCnRes(resume.cnRes)
    setEnRes(resume.enRes)
    setQuizCn(resume.quizCn)
    setQuizEn(resume.quizEn)
    setResume(null)
  }

  function restart() {
    dropSession()
    setPhase('cards')
    setCnRes(null)
    setEnRes(null)
    setQuizCn({ index: 0, results: [], revealed: false })
    setQuizEn({ index: 0, results: [], revealed: false })
    setResume(null)
  }

  function finish() {
    const cnAll = cnRes?.allCorrect ?? false
    const enAll = enRes?.allCorrect ?? false
    if (isReview) onReviewRecord(group.id, cnAll, enAll)
    else onLearnComplete(group.id)
    dropSession()
    onExit()
  }

  // 恢复提示：让用户决定继续或重开
  if (resume) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {isReview ? `复习 · ${groupTitle}` : `首次学习 · ${groupTitle}`}
          </h2>
          <button className="btn-ghost" onClick={onExit}>
            退出
          </button>
        </div>
        <div className="card p-5 bg-brand-50 border-brand-200">
          <p className="text-sm text-brand-800">
            发现上次未完成的会话（阶段：{phaseLabel(resume.phase)}），是否从中断处继续？
          </p>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary" onClick={startResume}>
              继续学习
            </button>
            <button
              className="btn-ghost border-rose-200 text-rose-600"
              onClick={restart}
            >
              重新开始
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'cards') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {isReview ? `复习 · ${groupTitle}` : `首次学习 · ${groupTitle}`}
          </h2>
          <button className="btn-ghost" onClick={onExit}>
            退出
          </button>
        </div>
        <p className="text-sm text-slate-500">
          先通读本组完整学习卡（共 {group.words.length} 词），记住音标、释义与记忆线索。
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {group.words.map((w) => (
            <WordCard key={w['词条ID']} word={w} />
          ))}
        </div>
        <button className="btn-primary w-full" onClick={() => setPhase('quiz-cn-en')}>
          开始测试：中文 → 英文
        </button>
      </div>
    )
  }

  if (phase === 'quiz-cn-en') {
    return (
      <Quiz
        words={group.words}
        direction="cn-en"
        initialIndex={quizCn.index}
        initialResults={quizCn.results}
        initialRevealed={quizCn.revealed}
        onComplete={(r) => {
          setCnRes(r)
          setPhase('quiz-en-cn')
        }}
        onProgress={setQuizCn}
      />
    )
  }

  if (phase === 'quiz-en-cn') {
    return (
      <Quiz
        words={group.words}
        direction="en-cn"
        initialIndex={quizEn.index}
        initialResults={quizEn.results}
        initialRevealed={quizEn.revealed}
        onComplete={(r) => {
          setEnRes(r)
          setPhase('summary')
        }}
        onProgress={setQuizEn}
      />
    )
  }

  // summary
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">核对完整卡片</h2>
      <p className="text-sm text-slate-500">
        双向测试已完成，对照本组完整卡片查漏补缺。
        {isReview
          ? '完成后将按复习节点排程下一次复习。'
          : '即时复习已完成，完成后将进入 30 分钟节点的间隔复习。'}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {group.words.map((w) => (
          <WordCard key={w['词条ID']} word={w} />
        ))}
      </div>
      <button className="btn-primary w-full" onClick={finish}>
        {isReview ? '完成复习并排程' : '完成本轮并排程复习'}
      </button>
    </div>
  )
}
