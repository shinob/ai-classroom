import { useState, useEffect, useCallback } from 'react'
import type { LessonSession, Utterance, LessonPhase, Student, Teacher } from '../types'
import Classroom from '../components/Classroom'
import ConversationPanel from '../components/ConversationPanel'
import ControlBar from '../components/ControlBar'
import InfoBar from '../components/InfoBar'
import CharacterModal from '../components/CharacterModal'
import CurriculumModal from '../components/CurriculumModal'

interface ClassroomPageProps {
  session: LessonSession
  onLessonEnd: () => void
  replayUtterances?: Utterance[] | null
}

export default function ClassroomPage({
  session,
  onLessonEnd,
  replayUtterances = null,
}: ClassroomPageProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [phase, setPhase] = useState<LessonPhase>('start')
  const [hasLessonStarted, setHasLessonStarted] = useState(replayUtterances !== null)
  const [isWsConnected, setIsWsConnected] = useState(false)
  const [currentUtterance, setCurrentUtterance] = useState<Utterance | null>(null)
  const [utterances, setUtterances] = useState<Utterance[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Student | Teacher | null>(null)
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const isReplay = replayUtterances !== null

  useEffect(() => {
    setIsPlaying(true)
    setPlaybackSpeed(1)
    setElapsedMinutes(0)
    setPhase('start')
    setHasLessonStarted(isReplay)
    setIsWsConnected(false)
    setCurrentUtterance(null)
    setUtterances([])
    setSelectedCharacter(null)
    setIsCurriculumOpen(false)
  }, [session.id, isReplay])

  useEffect(() => {
    if (isReplay) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const websocket = new WebSocket(`${wsProtocol}://${window.location.host}/ws?sessionId=${session.id}`)

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'connected':
          setIsWsConnected(true)
          break
        case 'utterance':
          setCurrentUtterance(data.utterance)
          setUtterances((prev) => [...prev, data.utterance])
          break
        case 'phase_change':
          setPhase(data.phase)
          break
        case 'time_update':
          setElapsedMinutes(data.elapsedMinutes)
          break
        case 'lesson_end':
          onLessonEnd()
          break
      }
    }

    setWs(websocket)

    return () => {
      setIsWsConnected(false)
      websocket.close()
    }
  }, [isReplay, session.id, onLessonEnd])

  useEffect(() => {
    if (isReplay) return

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'playback', isPlaying, speed: playbackSpeed }))
    }
  }, [isReplay, ws, isPlaying, playbackSpeed])

  useEffect(() => {
    if (!isReplay || !replayUtterances) return

    const visibleUtterances = replayUtterances.filter((u) => u.timestamp <= elapsedMinutes)
    setUtterances(visibleUtterances)
    setCurrentUtterance(visibleUtterances.length > 0 ? visibleUtterances[visibleUtterances.length - 1] : null)

    const newPhase = getPhaseForTime(elapsedMinutes)
    setPhase(newPhase)

    if (elapsedMinutes >= 45) {
      setIsPlaying(false)
      onLessonEnd()
    }
  }, [isReplay, replayUtterances, elapsedMinutes, onLessonEnd])

  useEffect(() => {
    if (!isReplay || !isPlaying) return

    const intervalMs = 2000 / playbackSpeed
    const timer = setInterval(() => {
      setElapsedMinutes((prev) => Math.min(45, prev + 0.5))
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isReplay, isPlaying, playbackSpeed])

  const handleSeek = useCallback((minutes: number) => {
    if (isReplay) {
      setElapsedMinutes(minutes)
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'seek', minutes }))
      setElapsedMinutes(minutes)
    }
  }, [isReplay, ws])

  const handleCharacterClick = useCallback((character: Student | Teacher) => {
    setSelectedCharacter(character)
  }, [])

  const handleStartLesson = useCallback(() => {
    if (isReplay) {
      setHasLessonStarted(true)
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'start' }))
      setHasLessonStarted(true)
    }
  }, [isReplay, ws])

  const phaseLabel = (p: LessonPhase) => {
    const labels: Record<LessonPhase, string> = {
      start: '開始',
      intro: '導入',
      development1: '展開1',
      development2: '展開2',
      summary: 'まとめ',
      end: '終了',
    }
    return labels[p]
  }

  const subjectLabel = (subject: string) => {
    const labels: Record<string, string> = {
      english: '英語',
      japanese: '国語',
      math: '数学',
      history: '歴史',
      science: '理科',
      geography: '地理',
    }
    return labels[subject] || subject
  }

  const schoolTypeLabel = (type: string) => {
    switch (type) {
      case 'elementary': return '小学校'
      case 'middle': return '中学校'
      case 'high': return '高校'
      default: return type
    }
  }

  const getPhaseForTime = (minutes: number): LessonPhase => {
    if (minutes < 1) return 'start'
    if (minutes < 8) return 'intro'
    if (minutes < 25) return 'development1'
    if (minutes < 35) return 'development2'
    if (minutes < 42) return 'summary'
    return 'end'
  }

  if (!isReplay && !hasLessonStarted) {
    return (
      <div className="min-h-screen bg-amber-50 p-6 md:p-10">
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-slate-800 text-white px-6 py-5">
            <h1 className="text-2xl font-bold mb-2">授業開始前の確認</h1>
            <p className="text-sm text-slate-200">
              生成されたトピックのカリキュラムを確認してから授業を開始できます。
            </p>
            <p className="text-sm text-slate-200 mt-2">
              {schoolTypeLabel(session.schoolType)}
              {session.grade}年 / {subjectLabel(session.subject)} / {session.topicName}
            </p>
            <p className="text-sm text-slate-200 mt-1">
              本時の目標: {session.lessonGoal}
            </p>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-bold mb-3">カリキュラム</h2>
            <p className="text-sm text-gray-700 mb-4">{session.curriculum.overview}</p>
            {session.curriculum.goalExplanation && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-800 mb-2">本時目標の解説</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {session.curriculum.goalExplanation}
                </p>
              </div>
            )}

            <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
              {session.curriculum.phases.map((phasePlan) => (
                <section
                  key={phasePlan.phase}
                  className="rounded-lg border border-gray-200 p-4 bg-white"
                >
                  <h3 className="font-bold text-gray-800 mb-2">
                    {phaseLabel(phasePlan.phase)}: {phasePlan.title}
                  </h3>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">到達目標:</span> {phasePlan.objective}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">教員の活動:</span> {phasePlan.teacherActions.join(' / ')}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">生徒の活動:</span> {phasePlan.studentActions.join(' / ')}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">具体的な問題・課題:</span> {phasePlan.tasks.join(' / ')}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">確認観点:</span> {phasePlan.checkpoint}
                  </p>
                </section>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {isWsConnected ? '接続完了: 授業を開始できます' : 'サーバー接続中...'}
            </p>
            <button
              onClick={handleStartLesson}
              disabled={!isWsConnected}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-5 rounded-lg transition-colors"
            >
              授業を開始
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-amber-50 overflow-hidden">
      <InfoBar
        schoolType={schoolTypeLabel(session.schoolType)}
        grade={session.grade}
        subject={subjectLabel(session.subject)}
        topicName={session.topicName}
        lessonGoal={session.lessonGoal}
        phase={phaseLabel(phase)}
        elapsedMinutes={elapsedMinutes}
      />

      <div className="flex-1 flex min-h-0">
        {/* 左側: 会話ログ */}
        <ConversationPanel
          utterances={utterances}
          currentSpeakerId={currentUtterance?.speakerId}
          allowReadAloud={isReplay}
        />

        {/* 右側: 教室ビュー */}
        <div className="flex-1 overflow-hidden relative">
          <button
            onClick={() => setIsCurriculumOpen(true)}
            className="absolute top-3 right-3 z-10 bg-slate-800 text-white text-sm font-semibold px-3 py-2 rounded shadow hover:bg-slate-700"
          >
            カリキュラム
          </button>
          <Classroom
            teacher={session.teacher}
            students={session.students}
            currentSpeakerId={currentUtterance?.speakerId}
            onCharacterClick={handleCharacterClick}
          />
        </div>
      </div>

      <ControlBar
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        elapsedMinutes={elapsedMinutes}
        totalMinutes={45}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onSpeedChange={setPlaybackSpeed}
        onSeek={handleSeek}
      />

      {selectedCharacter && (
        <CharacterModal
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
        />
      )}

      {isCurriculumOpen && (
        <CurriculumModal
          curriculum={session.curriculum}
          currentPhase={phase}
          onClose={() => setIsCurriculumOpen(false)}
        />
      )}
    </div>
  )
}
