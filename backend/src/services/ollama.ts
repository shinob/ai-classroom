import type { Teacher, Student, LessonPhase, Subject } from '../types/index.js'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const MODEL = process.env.OLLAMA_MODEL || 'gemma3'

interface OllamaResponse {
  response: string
}

const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 25000)
const OLLAMA_TIMEOUT_MS_LONG = Number(process.env.OLLAMA_TIMEOUT_MS_LONG || 45000)

function collectSentences(text: string, maxSentences: number): string {
  const cleaned = text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[「」"]/g, '')
    .trim()

  if (!cleaned) return ''

  const sentences = (cleaned.match(/[^。！？!?]+[。！？!?]?/g) || [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, maxSentences)

  if (sentences.length === 0) {
    return ''
  }

  const joined = sentences.join(' ')
  if (/[。！？!?]$/.test(joined)) return joined
  return `${joined}。`
}

function normalizeLongText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[「」"]/g, '')
    .trim()
}

async function generate(
  prompt: string,
  mode: 'teacher' | 'student' | 'long' = 'student'
): Promise<string> {
  const numPredict = mode === 'long' ? 900 : mode === 'teacher' ? 520 : 180
  const temperature = mode === 'long' ? 0.7 : 0.8
  const baseTimeout = mode === 'long' ? OLLAMA_TIMEOUT_MS_LONG : OLLAMA_TIMEOUT_MS

  for (let attempt = 0; attempt < 2; attempt++) {
    const timeoutMs = attempt === 0 ? baseTimeout : Math.floor(baseTimeout * 1.5)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          prompt,
          stream: false,
          options: {
            temperature,
            num_predict: numPredict,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = (await response.json()) as OllamaResponse
      if (mode === 'teacher') {
        return collectSentences(data.response, 8)
      }
      if (mode === 'long') {
        return normalizeLongText(data.response)
      }
      return collectSentences(data.response, 1)
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === 'AbortError'
      if (isAbortError && attempt === 0) {
        console.warn(`Ollama request timed out (${timeoutMs}ms). Retrying once...`)
        continue
      }
      console.error('Ollama generation failed:', error)
      return ''
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return ''
}

const subjectLabels: Record<Subject, string> = {
  english: '英語',
  japanese: '国語',
  math: '数学',
  history: '歴史',
  science: '理科',
  geography: '地理',
}

const phaseLabels: Record<LessonPhase, string> = {
  start: '開始',
  intro: '導入',
  development1: '展開1',
  development2: '展開2',
  summary: 'まとめ',
  end: '終了',
}

const personalityLabels: Record<string, string> = {
  strict: '厳格',
  gentle: '温厚',
  passionate: '情熱的',
  calm: '冷静',
  humorous: 'ユーモラス',
  active: '積極的',
  passive: '消極的',
  talkative: 'おしゃべり',
  serious: '真面目',
  easygoing: 'マイペース',
  rebellious: '反抗的',
}

type TeacherActionType = 'explain' | 'ask_question' | 'respond_to_class' | 'respond_to_student'

export async function generateTeacherUtterance(
  teacher: Teacher,
  subject: Subject,
  lessonGoal: string,
  phaseCurriculum: string,
  grade: number,
  schoolType: string,
  phase: LessonPhase,
  elapsedMinutes: number,
  conversationHistory: string,
  latestUtterance: string,
  expectedResponse: string,
  actionType: TeacherActionType
): Promise<string> {
  const schoolLabel = schoolType === 'elementary' ? '小学校' : schoolType === 'middle' ? '中学校' : '高校'

  const actionInstructions: Record<TeacherActionType, string> = {
    explain: `あなたは教員として、下記カリキュラムの「具体的な問題・課題」に基づいて${subjectLabels[subject]}の知識を教えてください。
- 概念・用語・手順・公式などの具体的な知識を提示すること
- 「〜とは○○のことです」「ポイントは○○です」のように明確に教えること
- 前の発言と重複しない新しい知識・視点を提供すること
- 抽象的な語りではなく、生徒が理解できる具体例や説明を含めること
- 端的に終わらせず、根拠や手順を含めて3〜7文で丁寧に説明すること`,
    ask_question: `直前までの説明内容を踏まえ、生徒の理解を確認する質問を1つしてください。
- 今説明した内容の確認質問にすること
- 「〜は何でしたか？」「〜の場合はどうなりますか？」など具体的に聞くこと`,
    respond_to_class: `クラス全体の反応を受けて、授業内容の理解を深めるコメントをしてください。
- 生徒の反応を短く拾いつつ、カリキュラムの「具体的な問題・課題」に関連する知識を補足すること
- 単なるリアクション（「いいですね」だけ）で終わらず、必ず学習内容を含めること`,
    respond_to_student: `直前の生徒の発言に簡潔に応答した上で、カリキュラムの内容に話を戻してください。
- 回答には短い評価（「そうですね」「いいところに気づきました」等）を付けた上で、授業内容の説明を続けること
- 脱線した話題には深入りせず、本題に戻すこと`,
  }

  const prompt = `あなたは${schoolLabel}${grade}年生の${subjectLabels[subject]}の授業を担当する${teacher.age}歳の${personalityLabels[teacher.personality]}な教員「${teacher.name}」です。

【会話ログ（直近）】
${conversationHistory || '（授業開始）'}

【直前の発話】
${latestUtterance || '（まだ発話なし）'}

【現在の状況】
- 経過時間: ${elapsedMinutes}分 / 45分
- フェーズ: ${phaseLabels[phase]}
- 本時の目標: ${lessonGoal}
- このフェーズのカリキュラム:
${phaseCurriculum}

【指示】
${actionInstructions[actionType]}
このターンで期待される応答: ${expectedResponse}

【重要】
- 発言は本時の目標達成につながる内容にすること
- 発言はこのフェーズのカリキュラムに沿って授業を前進させること
- 会話ログを踏まえ、直前の発話へつながる内容にすること
- 可能なら直前発話のキーワードを1つ受けて話を進めること
- 「本時目標の詳細説明」に書かれた定義・仕組み・手順・誤解ポイントを優先して扱うこと
- explain の場合は最低3文で説明すること
- 同じことを繰り返さないこと
- 発言のみを出力（「」や説明は不要）`

  const response = await generate(prompt, 'teacher')
  return response || getDefaultTeacherUtterance(phase, actionType)
}

function getGradeContext(schoolType: string, grade: number): { age: number; speechStyle: string } {
  if (schoolType === 'elementary') {
    const age = 5 + grade
    if (grade <= 2) {
      return { age, speechStyle: '幼い話し方で、「〜だよ」「〜なの？」「わかんない」など子供らしい言葉遣い。' }
    } else if (grade <= 4) {
      return { age, speechStyle: '少し成長した話し方で、「〜です」も使えるが子供らしさが残る。' }
    } else {
      return { age, speechStyle: '高学年らしく落ち着いた話し方。' }
    }
  } else if (schoolType === 'middle') {
    const age = 12 + grade
    return { age, speechStyle: '中学生らしい話し方。敬語も使えるが、「〜じゃん」などカジュアルな表現も。' }
  } else {
    const age = 15 + grade
    return { age, speechStyle: '高校生らしい話し方。敬語を適切に使用。' }
  }
}

type StudentUtteranceType = 'question' | 'answer' | 'mumble' | 'reaction' | 'agree'

function getPersonalityBehavior(personality: string): string {
  const behaviors: Record<string, string> = {
    active: '積極的で元気よく発言する。手を挙げて答えたがる。声が大きめ。「はい！」「分かります！」など自信を持って話す。',
    passive: '控えめで小声で話す。自分から発言せず、指名されたときだけ答える。「...です」「たぶん...」など自信なさげ。',
    talkative: 'よく喋る。思ったことをすぐ口に出す。「ねえねえ」「あのさ」など話しかける。脱線することも。',
    serious: '真面目で丁寧に話す。正確に答えようとする。「〜だと思います」「〜ではないでしょうか」など論理的。',
    easygoing: 'のんびりマイペース。急がない。「えーと」「うーん」が多い。焦らず自分のペースで話す。',
    rebellious: '反抗的でつっけんどん。「別に」「知らない」「めんどくさい」など投げやり。敬語を使わないことも。',
  }
  return behaviors[personality] || ''
}

function isTeacherLikeUtterance(text: string): boolean {
  const teacherLikePatterns = [
    /^はい、?それでは/,
    /^それでは/,
    /^では、?/,
    /^みなさん/,
    /^皆さん/,
    /説明しましょう/,
    /考えてみましょう/,
    /やってみましょう/,
    /確認しましょう/,
    /まとめると/,
    /宿題/,
    /この問題/,
    /分かる人/,
    /いい質問ですね/,
    /授業/,
    /先生は/,
  ]

  return teacherLikePatterns.some((pattern) => pattern.test(text))
}

export async function generateStudentUtterance(
  student: Student,
  subject: Subject,
  grade: number,
  schoolType: string,
  phase: LessonPhase,
  elapsedMinutes: number,
  conversationHistory: string,
  latestUtterance: string,
  expectedResponse: string,
  utteranceType: StudentUtteranceType
): Promise<string> {
  const schoolLabel = schoolType === 'elementary' ? '小学校' : schoolType === 'middle' ? '中学校' : '高校'
  const { age, speechStyle } = getGradeContext(schoolType, grade)
  const personalityBehavior = getPersonalityBehavior(student.personality)

  const utteranceInstructions: Record<StudentUtteranceType, string> = {
    question: '直前の先生の説明について、分からないことを質問してください。',
    answer: '直前の先生の質問に答えてください。学力に応じた正確さで回答すること。',
    mumble: '授業を聞きながらの独り言やつぶやきを言ってください。',
    reaction: '直前の発言に対する短いリアクションをしてください。',
    agree: '直前の他の生徒の発言に同調してください。',
  }

  const prompt = `あなたは${schoolLabel}${grade}年生（${age}歳）の生徒「${student.name}」です。

【性格と話し方】
${personalityLabels[student.personality]}な性格です。
${personalityBehavior}

【学力】
5段階中${student.academicLevel}
${student.academicLevel >= 4 ? '勉強が得意で、難しい質問にも答えられる。' : ''}
${student.academicLevel <= 2 ? '勉強は苦手で、間違えることもある。' : ''}

【年齢相応の言葉遣い】
${speechStyle}

【会話ログ（直近）】
${conversationHistory || '（授業開始）'}

【直前の発話】
${latestUtterance || '（まだ発話なし）'}

【現在の状況】
- 教科: ${subjectLabels[subject]}
- 経過時間: ${elapsedMinutes}分

【指示】
${utteranceInstructions[utteranceType]}
このターンで期待される応答: ${expectedResponse}

【重要】
- あなたは生徒であり、教員の口調や指示口調で話さないこと
- 「みなさん」「〜しましょう」「〜してください」「授業を始めます」など教員的表現は禁止
- 性格を反映した話し方をすること
- 会話ログを踏まえ、直前の発話に関連した発言をすること
- 可能なら直前発話のキーワードを1つ受けて発言すること
- 発言のみを出力（「」や説明は不要）`

  const response = await generate(prompt, 'student')
  if (!response) {
    return getDefaultStudentUtterance(utteranceType, schoolType, grade, student.personality)
  }

  if (isTeacherLikeUtterance(response)) {
    return getDefaultStudentUtterance(utteranceType, schoolType, grade, student.personality)
  }

  return response
}

export async function generateLessonGoalExplanation(
  subject: Subject,
  schoolType: string,
  grade: number,
  topicName: string,
  lessonGoal: string
): Promise<string> {
  const schoolLabel = schoolType === 'elementary' ? '小学校' : schoolType === 'middle' ? '中学校' : '高校'

  const prompt = `あなたは${schoolLabel}${grade}年の${subjectLabels[subject]}を担当する教員です。
次の依頼に答えてください。

「${lessonGoal}」について説明する文章を生成して下さい。

【条件】
- テーマ: ${topicName}
- 目的: 生徒が授業の45分で理解できるようにする
- 内容は具体的にする（定義、仕組み、手順、よくある誤解、確認問題の観点を含める）
- 抽象的な説明だけで終わらせない
- 端的すぎる説明にしない。丁寧に筋道立てて説明する
- 2〜5段落で出力する
- 見出しは不要
- 日本語で出力する`

  const response = await generate(prompt, 'long')
  return response
}

function getDefaultTeacherUtterance(phase: LessonPhase, actionType: TeacherActionType): string {
  if (actionType === 'ask_question') {
    return 'この問題、分かる人いますか？'
  }
  if (actionType === 'respond_to_student') {
    return 'いい質問ですね。それについて説明しましょう。'
  }

  const defaults: Record<LessonPhase, string> = {
    start: 'はい、それでは授業を始めましょう。',
    intro: '今日は新しい内容を学んでいきます。',
    development1: 'ここが重要なポイントです。',
    development2: 'では、練習問題をやってみましょう。',
    summary: '今日学んだことをまとめると...',
    end: '今日はここまでです。お疲れ様でした。',
  }
  return defaults[phase]
}

function getDefaultStudentUtterance(
  type: StudentUtteranceType,
  schoolType: string,
  grade: number,
  personality?: string
): string {
  // 性格別のデフォルト発言
  if (personality === 'active') {
    const defaults: Record<string, string> = {
      question: 'はい！先生、質問です！',
      answer: 'はい！分かります！',
      mumble: 'よし、分かった！',
      reaction: 'はい！',
      agree: 'うん、そうそう！',
    }
    return defaults[type] || 'はい！'
  }

  if (personality === 'passive') {
    const defaults: Record<string, string> = {
      question: 'あの...ここが...',
      answer: '...たぶん、そうだと思います...',
      mumble: '...難しい...',
      reaction: '...はい。',
      agree: '...うん...',
    }
    return defaults[type] || '...はい。'
  }

  if (personality === 'talkative') {
    const defaults: Record<string, string> = {
      question: 'ねえ先生、これってさ、どういうこと？',
      answer: 'あ、それ知ってる！えっとね...',
      mumble: 'へぇ〜、そうなんだ〜',
      reaction: 'えー、まじで？',
      agree: 'わかるわかる！私もそう思った！',
    }
    return defaults[type] || 'へぇ〜'
  }

  if (personality === 'serious') {
    const defaults: Record<string, string> = {
      question: '先生、一つ確認させてください。',
      answer: 'はい、〜だと思います。',
      mumble: 'なるほど、そういうことか。',
      reaction: 'はい、理解しました。',
      agree: '私もそう考えます。',
    }
    return defaults[type] || 'はい。'
  }

  if (personality === 'easygoing') {
    const defaults: Record<string, string> = {
      question: 'えーと、先生、ここって...',
      answer: 'うーん、たぶん...これかな？',
      mumble: 'ふーん...',
      reaction: 'あー、うん。',
      agree: 'まあ、そうだね〜',
    }
    return defaults[type] || 'うーん...'
  }

  if (personality === 'rebellious') {
    const defaults: Record<string, string> = {
      question: 'なんでそうなるの？',
      answer: '別に...知らない。',
      mumble: 'めんどくさ...',
      reaction: 'ふーん。',
      agree: 'まあね。',
    }
    return defaults[type] || 'ふーん。'
  }

  // 学年別のデフォルト
  if (type === 'agree') {
    if (schoolType === 'elementary' && grade <= 2) return 'うん、そうだよね！'
    if (schoolType === 'elementary') return 'わたしもそう思う！'
    if (schoolType === 'middle') return 'それな'
    return 'たしかに'
  }

  if (schoolType === 'elementary' && grade <= 2) {
    const defaults: Record<string, string> = {
      question: 'せんせい、これなあに？',
      answer: 'うん、わかった！',
      mumble: 'むずかしいなぁ...',
      reaction: 'はーい！',
    }
    return defaults[type] || 'はーい！'
  }

  if (schoolType === 'elementary') {
    const defaults: Record<string, string> = {
      question: '先生、ここがわかりません。',
      answer: 'はい、わかりました。',
      mumble: 'えーと...',
      reaction: 'はい！',
    }
    return defaults[type] || 'はい！'
  }

  if (schoolType === 'middle') {
    const defaults: Record<string, string> = {
      question: '先生、質問いいですか？',
      answer: 'はい、そうだと思います。',
      mumble: 'なるほど...',
      reaction: 'はい。',
    }
    return defaults[type] || 'はい。'
  }

  const defaults: Record<string, string> = {
    question: '先生、質問があるのですが。',
    answer: 'はい、理解しました。',
    mumble: 'そういうことか...',
    reaction: 'はい。',
  }
  return defaults[type] || 'はい。'
}
