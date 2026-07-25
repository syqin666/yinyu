// OCR 文本解析单测
import { parseOcrText } from './photo.js'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) pass++
  else {
    fail++
    console.error('  ✗ FAIL:', msg)
  }
}

const sample = `1. abandon /əˈbændən/ 抛弃；放弃
2. ability /əˈbɪləti/ 能力
banana /bənɑːnə/ 香蕉
3.
culture /ˈkʌltʃə(r)/ 文化；文明`

const r = parseOcrText(sample)
ok(r.length === 4, `应解析出 4 条（跳过空行与纯序号行），实际 ${r.length}`)
ok(r[0].单词 === 'abandon', '首词 abandon')
ok(r[0].音标 === '/əˈbændən/', `音标提取: ${r[0].音标}`)
ok(r[0].一级六级释义 === '抛弃；放弃', '释义提取')
ok(r[1].单词 === 'ability' && r[1].音标 === '/əˈbɪləti/', '第二行')
ok(r[2].单词 === 'banana' && r[2].一级六级释义 === '香蕉', '无序号行也能解析')
ok(r[3].单词 === 'culture', '第四行')

// 无音标行
const r2 = parseOcrText('hello 你好')
ok(r2.length === 1 && r2[0].单词 === 'hello' && r2[0].一级六级释义 === '你好', '无音标回退')

// 空输入
ok(parseOcrText('').length === 0 && parseOcrText('   \n ').length === 0, '空输入返回空数组')

console.log(`\n解析单测：${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
