// 把 OCR 识别出的多行文本解析为词条候选
// 启发式：每行 = [英文单词] [音标 /.../ ] [中文释义]
const PHONETIC_RE = /\/([^\/\n]+)\// // 匹配 /.../ 包裹的音标

export function parseOcrText(text) {
  if (!text) return []
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const entries = []
  for (const raw of lines) {
    if (/^[\d\s.、)（-]+$/.test(raw)) continue // 跳过纯序号/标点行

    // 去掉行首序号前缀：1.  2)  3、  (4)  等
    const line = raw.replace(/^\d+[.)、)（-]\s*/, '')
    if (!line) continue

    let rest = line
    let phonetic = ''
    const m = line.match(PHONETIC_RE)
    if (m) {
      phonetic = '/' + m[1].trim() + '/'
      rest = (line.slice(0, m.index) + line.slice(m.index + m[0].length)).trim()
    }

    // 取首个（英文）词作为单词；其余作为释义
    const tokens = rest.split(/\s+/).filter(Boolean)
    let word = ''
    let startIdx = 0
    if (tokens.length && /[a-zA-Z]/.test(tokens[0])) {
      word = tokens[0]
      startIdx = 1
    }
    const meaning = tokens.slice(startIdx).join(' ').trim() || rest.trim()

    if (!word && !meaning) continue
    entries.push({
      单词: word,
      音标: phonetic,
      原始释义: meaning,
      一级六级释义: meaning,
    })
  }
  return entries
}

// 浏览器端 OCR（Tesseract.js，免 API Key，需联网加载语言包）
// v7 通过 createWorker 的 logger 回调上报进度，status==='recognizing text' 时 progress 为 0~1
export async function ocrImage(file, onProgress) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('chi_sim+eng', 1, {
    logger: (m) => {
      if (onProgress && typeof m?.progress === 'number') onProgress({ progress: m.progress })
    },
  })
  const { data } = await worker.recognize(file)
  await worker.terminate()
  return data.text
}
