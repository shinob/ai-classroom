import { useState } from 'react'
import TopPage from './pages/TopPage'
import AdminPage from './pages/AdminPage'
import GeneratingPage from './pages/GeneratingPage'
import ClassroomPage from './pages/ClassroomPage'
import ResultPage from './pages/ResultPage'
import type { GenerationRequest, LessonSession, Utterance } from './types'

export type AppState = 'top' | 'admin' | 'generating' | 'classroom' | 'result'

const initialLandingState: AppState = window.location.pathname === '/admin' ? 'admin' : 'top'

function App() {
  const [appState, setAppState] = useState<AppState>(initialLandingState)
  const [session, setSession] = useState<LessonSession | null>(null)
  const [replayUtterances, setReplayUtterances] = useState<Utterance[] | null>(null)
  const [generationRequest, setGenerationRequest] = useState<GenerationRequest | null>(null)

  const handleGenerate = (request: GenerationRequest) => {
    setGenerationRequest(request)
    setAppState('generating')
  }

  const handleSessionCreated = (newSession: LessonSession) => {
    setSession(newSession)
    setReplayUtterances(null)
    setAppState('classroom')
  }

  const handleLessonEnd = () => {
    setAppState('result')
  }

  const handleBackToTop = () => {
    setSession(null)
    setReplayUtterances(null)
    setGenerationRequest(null)
    setAppState(initialLandingState)
  }

  const handleReplay = async (sessionId: string) => {
    try {
      const [sessionRes, utterancesRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/utterances`),
      ])

      if (!sessionRes.ok || !utterancesRes.ok) {
        throw new Error('Failed to load replay data')
      }

      const sessionData = (await sessionRes.json()) as LessonSession
      const utterancesData = (await utterancesRes.json()) as Utterance[]

      setSession(sessionData)
      setReplayUtterances(utterancesData)
      setAppState('classroom')
    } catch (error) {
      console.error('Failed to replay session:', error)
      alert('授業ログの読み込みに失敗しました。時間をおいて再試行してください。')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {appState === 'top' && (
        <TopPage onReplay={handleReplay} />
      )}
      {appState === 'admin' && (
        <AdminPage onGenerate={handleGenerate} />
      )}
      {appState === 'generating' && (
        <GeneratingPage onComplete={handleSessionCreated} request={generationRequest} />
      )}
      {appState === 'classroom' && session && (
        <ClassroomPage
          session={session}
          onLessonEnd={handleLessonEnd}
          replayUtterances={replayUtterances}
        />
      )}
      {appState === 'result' && session && (
        <ResultPage session={session} onBackToTop={handleBackToTop} />
      )}
    </div>
  )
}

export default App
