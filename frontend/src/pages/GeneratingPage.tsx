import { useEffect, useRef, useState } from 'react'
import type { GenerationRequest, LessonSession } from '../types'

interface GeneratingPageProps {
  onComplete: (session: LessonSession) => void
  request: GenerationRequest | null
}

export default function GeneratingPage({ onComplete, request }: GeneratingPageProps) {
  const isGenerating = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const REQUEST_TIMEOUT_MS = 120000

  useEffect(() => {
    if (isGenerating.current) return
    isGenerating.current = true

    const generateSession = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        const response = await fetch('/api/sessions', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: request ? JSON.stringify(request) : '{}',
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const session = await response.json()
        onComplete(session)
      } catch (error) {
        console.error('Failed to generate session:', error)
        setErrorMessage('授業設定の生成に失敗しました。しばらく待って再試行してください。')
        isGenerating.current = false
      }
    }

    generateSession()
  }, [onComplete, request])

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">設定生成に失敗しました</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              再試行
            </button>
            <a href="/admin" className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">
              管理画面へ戻る
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-8"></div>
        <h2 className="text-2xl font-bold mb-4">設定を生成中...</h2>
        <p className="text-gray-500">教員と生徒6名のキャラクターを生成しています（最大2分）</p>
      </div>
    </div>
  )
}
