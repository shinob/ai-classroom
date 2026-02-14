import { randomUUID } from 'crypto'
import type {
  Teacher,
  Student,
  Subject,
  LessonPhase,
  Utterance,
  LessonState,
  LessonCurriculum,
} from '../types/index.js'
import { generateTeacherUtterance, generateStudentUtterance } from './ollama.js'

interface LessonSimulatorConfig {
  sessionId: string
  teacher: Teacher
  students: Student[]
  subject: Subject
  lessonGoal: string
  curriculum: LessonCurriculum
  grade: number
  schoolType: string
  onUtterance: (utterance: Utterance) => void
  onPhaseChange: (phase: LessonPhase) => void
  onTimeUpdate: (elapsedMinutes: number) => void
  onLessonEnd: () => void
}

interface PhaseConfig {
  phase: LessonPhase
  startMinute: number
  endMinute: number
}

const PHASES: PhaseConfig[] = [
  { phase: 'start', startMinute: 0, endMinute: 1 },
  { phase: 'intro', startMinute: 1, endMinute: 8 },
  { phase: 'development1', startMinute: 8, endMinute: 25 },
  { phase: 'development2', startMinute: 25, endMinute: 35 },
  { phase: 'summary', startMinute: 35, endMinute: 42 },
  { phase: 'end', startMinute: 42, endMinute: 45 },
]

type ConversationState =
  | 'teacher_explaining'      // 教員が説明中
  | 'teacher_asked_question'  // 教員が質問した
  | 'student_asked_question'  // 生徒が質問した
  | 'student_answered'        // 生徒が回答した
  | 'student_reacted'         // 生徒がリアクションした
  | 'idle'                    // 特に流れなし

export class LessonSimulator {
  private config: LessonSimulatorConfig
  private elapsedMinutes: number = 0
  private currentPhase: LessonPhase = 'start'
  private isPlaying: boolean = false
  private playbackSpeed: number = 1
  private intervalId: ReturnType<typeof setInterval> | null = null
  private utterances: Utterance[] = []
  private isGenerating: boolean = false
  private conversationState: ConversationState = 'idle'
  private lastSpeakerId: string = ''
  private pendingResponseFrom: 'teacher' | 'student' | null = null
  private lastQuestionAsker: Student | null = null
  private teacherFallbackIndex: number = 0
  private studentFallbackIndex: number = 0
  private explainCountSinceQuestion: number = 0

  constructor(config: LessonSimulatorConfig) {
    this.config = config
  }

  start() {
    this.isPlaying = true
    this.scheduleNextTick()
    this.generateStartSequence()
  }

  private async generateStartSequence() {
    const classRepStudent = this.config.students.find((s) => s.personality === 'active') || this.config.students[0]

    await this.addUtterance({
      speakerId: classRepStudent.id,
      speakerType: 'student',
      speakerName: classRepStudent.name,
      content: '起立！',
      phase: 'start',
    })

    await this.delay(1000)

    await this.addUtterance({
      speakerId: classRepStudent.id,
      speakerType: 'student',
      speakerName: classRepStudent.name,
      content: '礼！',
      phase: 'start',
    })

    await this.delay(1000)

    await this.addUtterance({
      speakerId: classRepStudent.id,
      speakerType: 'student',
      speakerName: classRepStudent.name,
      content: '着席！',
      phase: 'start',
    })

    await this.delay(1000)

    await this.addUtterance({
      speakerId: this.config.teacher.id,
      speakerType: 'teacher',
      speakerName: this.config.teacher.name,
      content: `今日の目標は「${this.config.lessonGoal}」です。`,
      phase: 'start',
    })

    // 教員の最初の挨拶と通常進行に移行
    await this.delay(1000)
    this.conversationState = 'idle'
    this.pendingResponseFrom = null
  }

  private scheduleNextTick() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    const tickInterval = 2000 / this.playbackSpeed

    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.tick()
      }
    }, tickInterval)
  }

  private async tick() {
    if (this.isGenerating) return

    this.elapsedMinutes += 0.5
    this.config.onTimeUpdate(this.elapsedMinutes)

    const newPhase = this.getPhaseForTime(this.elapsedMinutes)
    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase
      this.config.onPhaseChange(newPhase)
      await this.addUtterance({
        speakerId: this.config.teacher.id,
        speakerType: 'teacher',
        speakerName: this.config.teacher.name,
        content: this.getPhaseTransitionMessage(newPhase),
        phase: newPhase,
      })
      // フェーズが変わったら会話状態をリセット
      this.conversationState = 'idle'
      this.pendingResponseFrom = null
    }

    if (this.elapsedMinutes >= 45) {
      this.stop()
      this.config.onLessonEnd()
      return
    }

    // 会話を生成
    await this.generateConversation()
  }

  private async generateConversation() {
    if (this.isGenerating) return
    this.isGenerating = true

    try {
      // 応答待ちの場合は応答を生成
      if (this.pendingResponseFrom === 'teacher') {
        await this.generateTeacherResponse()
        return
      }

      if (this.pendingResponseFrom === 'student') {
        await this.generateStudentResponse()
        return
      }

      // 通常の会話フロー
      const rand = Math.random()
      const forceTeacher = this.shouldForceTeacherTurn()
      const teacherLeadProbability = this.getTeacherLeadProbability()

      // 教員が主導する確率を高く
      if (forceTeacher || rand < teacherLeadProbability) {
        await this.generateTeacherAction()
      } else {
        await this.generateStudentAction()
      }
    } finally {
      this.isGenerating = false
    }
  }

  private async generateTeacherAction() {
    const historyText = this.buildConversationHistoryForPrompt(12)
    const latestUtterance = this.getLatestUtteranceForPrompt()

    // フェーズに応じた行動を決定
    const actionType = this.selectTeacherActionType()

    const content = await this.generateTeacherUtteranceWithRetry(
      actionType,
      historyText,
      latestUtterance
    )

    if (content) {
      const added = await this.addUtterance({
        speakerId: this.config.teacher.id,
        speakerType: 'teacher',
        speakerName: this.config.teacher.name,
        content,
        phase: this.currentPhase,
      })

      if (!added) return

      // 質問した場合は生徒の応答を待つ（explain 時の偶発的な疑問形は質問扱いしない）
      if (actionType === 'ask_question') {
        this.conversationState = 'teacher_asked_question'
        this.pendingResponseFrom = 'student'
        this.explainCountSinceQuestion = 0
      } else {
        this.conversationState = 'teacher_explaining'
        this.explainCountSinceQuestion++
        // 説明後、生徒がリアクションする可能性（低め）
        if (Math.random() < 0.15) {
          this.pendingResponseFrom = 'student'
        }
      }
    }
  }

  private async generateTeacherUtteranceWithRetry(
    actionType: 'explain' | 'ask_question' | 'respond_to_class' | 'respond_to_student',
    historyText: string,
    latestUtterance: string
  ): Promise<string> {
    const expectedResponse = this.getExpectedTeacherResponse(actionType)
    const maxAttempts = actionType === 'ask_question' ? 1 : 3

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const content = await generateTeacherUtterance(
        this.config.teacher,
        this.config.subject,
        this.config.lessonGoal,
        this.getCurrentPhaseCurriculumPrompt(),
        this.config.grade,
        this.config.schoolType,
        this.currentPhase,
        this.elapsedMinutes,
        historyText,
        latestUtterance,
        expectedResponse,
        actionType
      )

      if (!content) continue
      if (actionType !== 'ask_question' && this.isTeacherExplanationRepeated(content)) continue
      return content
    }

    return ''
  }

  private async generateTeacherResponse() {
    // 生徒の質問に答える
    const historyText = this.buildConversationHistoryForPrompt(12)
    const latestUtterance = this.getLatestUtteranceForPrompt()

    const content = await this.generateTeacherUtteranceWithRetry(
      'respond_to_student',
      historyText,
      latestUtterance
    )

    if (content) {
      const added = await this.addUtterance({
        speakerId: this.config.teacher.id,
        speakerType: 'teacher',
        speakerName: this.config.teacher.name,
        content,
        phase: this.currentPhase,
      })

      if (!added) return

      this.conversationState = 'idle'
      this.pendingResponseFrom = null
      this.lastQuestionAsker = null
    }
  }

  private async generateStudentAction() {
    const student = this.selectStudentToSpeak()
    const historyText = this.buildConversationHistoryForPrompt(10)
    const latestUtterance = this.getLatestUtteranceForPrompt()

    // 行動タイプを決定
    let utteranceType: 'question' | 'answer' | 'mumble' | 'reaction' | 'agree'

    if (this.conversationState === 'student_reacted') {
      // 他の生徒がリアクションした後は同調することが多い
      utteranceType = Math.random() < 0.6 ? 'agree' : 'mumble'
    } else {
      utteranceType = this.selectStudentUtteranceType(student)
    }

    const content = await generateStudentUtterance(
      student,
      this.config.subject,
      this.config.grade,
      this.config.schoolType,
      this.currentPhase,
      this.elapsedMinutes,
      historyText,
      latestUtterance,
      this.getExpectedStudentResponse(utteranceType),
      utteranceType
    )

    if (content) {
      const added = await this.addUtterance({
        speakerId: student.id,
        speakerType: 'student',
        speakerName: student.name,
        content,
        phase: this.currentPhase,
      })

      if (!added) return

      if (utteranceType === 'question') {
        this.conversationState = 'student_asked_question'
        this.pendingResponseFrom = 'teacher'
        this.lastQuestionAsker = student
      } else if (utteranceType === 'reaction' || utteranceType === 'agree') {
        this.conversationState = 'student_reacted'
        // 他の生徒もリアクションする可能性（低め、教員の説明ターンを優先）
        if (Math.random() < 0.15) {
          this.pendingResponseFrom = 'student'
        } else {
          this.pendingResponseFrom = null
        }
      } else {
        this.conversationState = 'idle'
        this.pendingResponseFrom = null
      }
    }
  }

  private async generateStudentResponse() {
    // 教員の質問に答える、または他の生徒に反応
    const student = this.selectStudentToAnswer()
    const historyText = this.buildConversationHistoryForPrompt(10)
    const latestUtterance = this.getLatestUtteranceForPrompt()

    let utteranceType: 'question' | 'answer' | 'mumble' | 'reaction' | 'agree'

    if (this.conversationState === 'teacher_asked_question') {
      utteranceType = 'answer'
    } else if (this.conversationState === 'student_reacted') {
      utteranceType = Math.random() < 0.5 ? 'agree' : 'reaction'
    } else {
      utteranceType = 'reaction'
    }

    const content = await generateStudentUtterance(
      student,
      this.config.subject,
      this.config.grade,
      this.config.schoolType,
      this.currentPhase,
      this.elapsedMinutes,
      historyText,
      latestUtterance,
      this.getExpectedStudentResponse(utteranceType),
      utteranceType
    )

    if (content) {
      const added = await this.addUtterance({
        speakerId: student.id,
        speakerType: 'student',
        speakerName: student.name,
        content,
        phase: this.currentPhase,
      })

      if (!added) return

      if (utteranceType === 'answer') {
        this.conversationState = 'student_answered'
        // 教員がフォローアップする可能性（低め、次ターンで explain に戻す）
        if (Math.random() < 0.25) {
          this.pendingResponseFrom = 'teacher'
        } else {
          this.pendingResponseFrom = null
        }
      } else {
        this.conversationState = 'student_reacted'
        this.pendingResponseFrom = null
      }
    }
  }

  private selectStudentToSpeak(): Student {
    const weights = this.config.students.map((s) => {
      let weight = 1
      if (s.personality === 'active') weight *= 2.5
      if (s.personality === 'talkative') weight *= 2
      if (s.personality === 'passive') weight *= 0.3
      if (s.personality === 'serious') weight *= 1.5
      if (s.concentration === 'high') weight *= 1.5
      // 直前に話した生徒は選ばれにくい
      if (s.id === this.lastSpeakerId) weight *= 0.2
      return weight
    })

    return this.weightedRandomSelect(weights)
  }

  private selectStudentToAnswer(): Student {
    const weights = this.config.students.map((s) => {
      let weight = 1
      if (s.personality === 'active') weight *= 2
      if (s.personality === 'serious') weight *= 2
      if (s.academicLevel >= 4) weight *= 2
      if (s.personality === 'passive') weight *= 0.5
      if (s.id === this.lastSpeakerId) weight *= 0.3
      return weight
    })

    return this.weightedRandomSelect(weights)
  }

  private weightedRandomSelect(weights: number[]): Student {
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < this.config.students.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return this.config.students[i]
      }
    }

    return this.config.students[0]
  }

  private selectStudentUtteranceType(student: Student): 'question' | 'answer' | 'mumble' | 'reaction' | 'agree' {
    const rand = Math.random()

    if (this.currentPhase === 'development1' || this.currentPhase === 'development2') {
      // 質問率を抑え、教員の説明時間を確保
      if (student.personality === 'active' && rand < 0.15) return 'question'
      if (rand < 0.08) return 'question'
      if (rand < 0.55) return 'mumble'
      return 'reaction'
    }

    if (this.currentPhase === 'summary' || this.currentPhase === 'end') {
      if (rand < 0.1) return 'question'
      if (rand < 0.7) return 'reaction'
      return 'agree'
    }

    if (rand < 0.05) return 'question'
    if (rand < 0.45) return 'mumble'
    return 'reaction'
  }

  private getRecentHistory(count: number): Utterance[] {
    return this.utterances.slice(-count)
  }

  private buildConversationHistoryForPrompt(count: number): string {
    const history = this.getRecentHistory(count)
    return history
      .map((u) => {
        const minutes = Math.floor(u.timestamp)
        const seconds = Math.floor((u.timestamp - minutes) * 60)
        const time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        return `[${time}](${u.phase}) ${u.speakerType === 'teacher' ? '教員' : '生徒'} ${u.speakerName}: ${u.content}`
      })
      .join('\n')
  }

  private getLatestUtteranceForPrompt(): string {
    const last = this.utterances[this.utterances.length - 1]
    if (!last) return ''
    return `${last.speakerType === 'teacher' ? '教員' : '生徒'} ${last.speakerName}: ${last.content}`
  }

  private getExpectedTeacherResponse(
    actionType: 'explain' | 'ask_question' | 'respond_to_class' | 'respond_to_student'
  ): string {
    if (actionType === 'ask_question') {
      return '直前説明に関連する確認質問を1つ出し、生徒の応答を引き出す'
    }
    if (actionType === 'respond_to_student') {
      return '生徒の直前発言に具体的に返答し、次の学習行動につなげる'
    }
    if (actionType === 'respond_to_class') {
      return '生徒の反応を拾って補足し、次の活動へつなげる'
    }
    return '前の流れを受けて説明を前進させ、授業目標に近づける'
  }

  private getExpectedStudentResponse(utteranceType: 'question' | 'answer' | 'mumble' | 'reaction' | 'agree'): string {
    if (utteranceType === 'answer') {
      return '教員の直前質問に短く具体的に答える'
    }
    if (utteranceType === 'question') {
      return '直前説明の不明点を1点だけ質問する'
    }
    if (utteranceType === 'agree') {
      return '直前発話に短く同調する'
    }
    if (utteranceType === 'reaction') {
      return '直前発話への短い反応を返す'
    }
    return '授業内容に関連する独り言を短く述べる'
  }

  private async addUtterance(params: {
    speakerId: string
    speakerType: 'teacher' | 'student'
    speakerName: string
    content: string
    phase: LessonPhase
  }): Promise<boolean> {
    let content = params.content
    const teacherRepeated = params.speakerType === 'teacher' && this.isTeacherExplanationRepeated(content)
    if (this.isRecentDuplicate(content) || teacherRepeated) {
      content = this.getAlternativeContent(params.speakerType, params.phase, content)
    }

    // 代替後も重複する場合はこの発話を破棄して次サイクルで再生成
    const teacherRepeatedAfterFallback = params.speakerType === 'teacher' && this.isTeacherExplanationRepeated(content)
    if (this.isRecentDuplicate(content) || teacherRepeatedAfterFallback) {
      return false
    }

    const utterance: Utterance = {
      id: randomUUID(),
      sessionId: this.config.sessionId,
      speakerId: params.speakerId,
      speakerType: params.speakerType,
      speakerName: params.speakerName,
      content,
      timestamp: this.elapsedMinutes,
      phase: params.phase,
    }

    this.utterances.push(utterance)
    this.lastSpeakerId = params.speakerId
    this.config.onUtterance(utterance)
    return true
  }

  private getPhaseForTime(minutes: number): LessonPhase {
    for (const config of PHASES) {
      if (minutes >= config.startMinute && minutes < config.endMinute) {
        return config.phase
      }
    }
    return 'end'
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms / this.playbackSpeed))
  }

  setPlayback(isPlaying: boolean, speed: number) {
    this.isPlaying = isPlaying
    this.playbackSpeed = speed
    this.scheduleNextTick()
  }

  seek(minutes: number) {
    this.elapsedMinutes = minutes
    this.currentPhase = this.getPhaseForTime(minutes)
    this.config.onTimeUpdate(minutes)
    this.config.onPhaseChange(this.currentPhase)
  }

  stop() {
    this.isPlaying = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getUtterances(): Utterance[] {
    return this.utterances
  }

  getState(): LessonState {
    return {
      phase: this.currentPhase,
      elapsedMinutes: this.elapsedMinutes,
      utterances: this.utterances,
    }
  }

  private normalizeForCompare(text: string): string {
    return text
      .replace(/[「」"'`]/g, '')
      .replace(/[。！？!?、,.\s]/g, '')
      .toLowerCase()
      .trim()
  }

  private isRecentDuplicate(content: string): boolean {
    const normalized = this.normalizeForCompare(content)
    if (!normalized) return true

    const recent = this.utterances.slice(-8)
    return recent.some((u) => this.normalizeForCompare(u.content) === normalized)
  }

  private isTeacherExplanationRepeated(content: string): boolean {
    const normalized = this.normalizeForCompare(content)
    if (!normalized) return true

    const recentTeacherUtterances = this.utterances
      .filter((u) => u.speakerType === 'teacher')
      .slice(-6)

    return recentTeacherUtterances.some((u) => {
      const previous = this.normalizeForCompare(u.content)
      if (previous === normalized) return true
      if (normalized.length < 14 || previous.length < 14) return false
      return this.computeNgramJaccard(normalized, previous, 3) >= 0.82
    })
  }

  private computeNgramJaccard(a: string, b: string, n: number): number {
    const aNgrams = this.buildNgramSet(a, n)
    const bNgrams = this.buildNgramSet(b, n)
    if (aNgrams.size === 0 || bNgrams.size === 0) return 0

    let intersection = 0
    for (const gram of aNgrams) {
      if (bNgrams.has(gram)) intersection++
    }

    const union = aNgrams.size + bNgrams.size - intersection
    return union === 0 ? 0 : intersection / union
  }

  private buildNgramSet(text: string, n: number): Set<string> {
    const grams = new Set<string>()
    if (text.length < n) {
      grams.add(text)
      return grams
    }

    for (let i = 0; i <= text.length - n; i++) {
      grams.add(text.slice(i, i + n))
    }

    return grams
  }

  private getAlternativeContent(
    speakerType: 'teacher' | 'student',
    phase: LessonPhase,
    originalContent: string
  ): string {
    const teacherAlternatives: Record<LessonPhase, string[]> = {
      start: [
        'では、今日の授業を始めます。',
        'それでは準備ができたので始めましょう。',
        'みなさん、今日もよろしくお願いします。',
      ],
      intro: [
        'まずは今日の学習内容を確認しましょう。',
        '導入として前回のポイントを振り返ります。',
        '今日のテーマを最初に押さえましょう。',
      ],
      development1: [
        'ここは特に大事なので丁寧に確認します。',
        '今の説明をもとに次の例を見ていきます。',
        'この考え方を使って別の問題にも挑戦しましょう。',
      ],
      development2: [
        'それでは練習問題に取り組みましょう。',
        '今の内容を使って自分で解いてみてください。',
        '手順を意識してもう一問やってみましょう。',
      ],
      summary: [
        '最後に今日のポイントを整理します。',
        'まとめとして重要語句を確認しましょう。',
        '今日学んだ内容を一度振り返ります。',
      ],
      end: [
        '今日の授業はここまでです。',
        '本日の学習は以上です。お疲れさまでした。',
        '次回までに今日の内容を復習しておいてください。',
      ],
    }

    const studentAlternatives = [
      'なるほど、少し分かってきた。',
      'えっと、もう一度考えてみます。',
      '今の説明でイメージできました。',
      'ここ、ちょっと難しいです。',
      '分かった気がします。',
      'もう少しで解けそうです。',
      'はい、考えてみます。',
      'ありがとうございます、理解できました。',
    ]

    const pool = speakerType === 'teacher' ? teacherAlternatives[phase] : studentAlternatives
    const startIndex = speakerType === 'teacher' ? this.teacherFallbackIndex : this.studentFallbackIndex

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[(startIndex + i) % pool.length]
      if (!this.isRecentDuplicate(candidate) && this.normalizeForCompare(candidate) !== this.normalizeForCompare(originalContent)) {
        if (speakerType === 'teacher') {
          this.teacherFallbackIndex = startIndex + i + 1
        } else {
          this.studentFallbackIndex = startIndex + i + 1
        }
        return candidate
      }
    }

    return originalContent
  }

  private shouldForceTeacherTurn(): boolean {
    const recent = this.getRecentHistory(2)
    return recent.length >= 2 && recent.every((u) => u.speakerType === 'student')
  }

  private getTeacherLeadProbability(): number {
    switch (this.currentPhase) {
      case 'start':
      case 'intro':
        return 0.9
      case 'development1':
        return 0.8
      case 'development2':
        return 0.75
      case 'summary':
      case 'end':
        return 0.9
      default:
        return 0.8
    }
  }

  private selectTeacherActionType(): 'explain' | 'ask_question' | 'respond_to_class' {
    const rand = Math.random()
    const canAskQuestion = this.explainCountSinceQuestion >= 2

    let action: 'explain' | 'ask_question' | 'respond_to_class'

    switch (this.currentPhase) {
      case 'start':
        action = 'explain'
        break
      case 'intro':
        action = (canAskQuestion && rand < 0.15) ? 'ask_question' : 'explain'
        break
      case 'development1':
        if (canAskQuestion && rand < 0.20) action = 'ask_question'
        else if (rand < 0.35) action = 'respond_to_class'
        else action = 'explain'
        break
      case 'development2':
        if (canAskQuestion && rand < 0.25) action = 'ask_question'
        else if (rand < 0.40) action = 'respond_to_class'
        else action = 'explain'
        break
      case 'summary':
      case 'end':
        action = rand < 0.35 ? 'respond_to_class' : 'explain'
        break
      default:
        action = 'explain'
    }

    // 質問がガードされた場合は explain にフォールバック
    if (action === 'ask_question' && !canAskQuestion) {
      action = 'explain'
    }

    return action
  }

  private getPhaseTransitionMessage(phase: LessonPhase): string {
    const phasePlan = this.getCurriculumPlanByPhase(phase)
    const messages: Record<LessonPhase, string> = {
      start: `それでは始めます。今日の目標は「${this.config.lessonGoal}」です。`,
      intro: `導入に入ります。${phasePlan?.objective || '前提となる内容を確認してから本題に入ります。'}`,
      development1: `展開に入ります。${phasePlan?.objective || '大事なポイントを順番に説明します。'}`,
      development2: `次は演習です。${phasePlan?.objective || '今学んだ内容を使って考えてみましょう。'}`,
      summary: `最後にまとめです。${phasePlan?.checkpoint || '今日の目標に対して何ができるようになったか確認します。'}`,
      end: `授業を終えます。${phasePlan?.checkpoint || '学んだことを振り返って次につなげましょう。'}`,
    }
    return messages[phase]
  }

  private getCurriculumPlanByPhase(phase: LessonPhase) {
    return this.config.curriculum.phases.find((p) => p.phase === phase)
  }

  private getCurrentPhaseCurriculumPrompt(): string {
    const plan = this.getCurriculumPlanByPhase(this.currentPhase)
    if (!plan) {
      return 'このフェーズで必要な学習活動を進め、目標達成につなげる。'
    }

    return [
      `本時目標の詳細説明: ${this.config.curriculum.goalExplanation}`,
      `フェーズ名: ${plan.title}`,
      `到達目標: ${plan.objective}`,
      `教員の活動: ${plan.teacherActions.join(' / ')}`,
      `生徒の活動: ${plan.studentActions.join(' / ')}`,
      `具体的な問題・課題: ${plan.tasks.join(' / ')}`,
      `確認観点: ${plan.checkpoint}`,
    ].join('\n')
  }
}
