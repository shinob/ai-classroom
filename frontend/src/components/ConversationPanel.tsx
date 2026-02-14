import { useEffect, useRef, useState, useCallback } from 'react'
import type { Utterance } from '../types'

interface ConversationPanelProps {
  utterances: Utterance[]
  currentSpeakerId?: string
  allowReadAloud?: boolean
}

export default function ConversationPanel({
  utterances,
  currentSpeakerId,
  allowReadAloud = false,
}: ConversationPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isReading, setIsReading] = useState(false)
  const spokenIdsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<Utterance[]>([])
  const isSpeakingRef = useRef(false)
  const prevLengthRef = useRef(0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [utterances])

  const stopReadAloud = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isSpeakingRef.current = false
    queueRef.current = []
    spokenIdsRef.current = new Set()
    setIsReading(false)
  }, [])

  const speakNext = useCallback(() => {
    if (!('speechSynthesis' in window)) return
    if (!isReading || isSpeakingRef.current) return

    const next = queueRef.current.shift()
    if (!next) return

    isSpeakingRef.current = true
    const utterance = new SpeechSynthesisUtterance(`${next.speakerName}。${next.content}`)
    utterance.lang = 'ja-JP'
    utterance.rate = 1
    utterance.pitch = 1

    utterance.onend = () => {
      isSpeakingRef.current = false
      speakNext()
    }

    utterance.onerror = () => {
      isSpeakingRef.current = false
      speakNext()
    }

    window.speechSynthesis.speak(utterance)
  }, [isReading])

  const startReadAloud = useCallback(() => {
    if (!('speechSynthesis' in globalThis)) {
      alert('このブラウザでは読み上げ機能を利用できません。')
      return
    }

    window.speechSynthesis.cancel()
    isSpeakingRef.current = false
    spokenIdsRef.current = new Set()
    queueRef.current = [...utterances]
    utterances.forEach((u) => spokenIdsRef.current.add(u.id))
    setIsReading(true)
  }, [utterances])

  useEffect(() => {
    if (isReading) {
      speakNext()
    }
  }, [isReading, speakNext])

  useEffect(() => {
    if (!isReading) {
      prevLengthRef.current = utterances.length
      return
    }

    if (utterances.length < prevLengthRef.current) {
      window.speechSynthesis.cancel()
      isSpeakingRef.current = false
      spokenIdsRef.current = new Set()
      queueRef.current = [...utterances]
      utterances.forEach((u) => spokenIdsRef.current.add(u.id))
      prevLengthRef.current = utterances.length
      speakNext()
      return
    }

    const newlyAdded = utterances.filter((u) => !spokenIdsRef.current.has(u.id))
    if (newlyAdded.length > 0) {
      newlyAdded.forEach((u) => spokenIdsRef.current.add(u.id))
      queueRef.current.push(...newlyAdded)
      speakNext()
    }

    prevLengthRef.current = utterances.length
  }, [utterances, isReading, speakNext])

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-gray-700">会話ログ</h2>
          {allowReadAloud && (
            <button
              onClick={isReading ? stopReadAloud : startReadAloud}
              className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                isReading
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isReading ? '読み上げ停止' : '読み上げ開始'}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {utterances.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">授業開始を待っています...</p>
        ) : (
          utterances.map((utterance) => (
            <div
              key={utterance.id}
              className={`p-2 rounded-lg transition-all ${
                utterance.speakerId === currentSpeakerId
                  ? 'ring-2 ring-red-300 bg-red-50'
                  : utterance.speakerType === 'teacher'
                  ? 'bg-blue-50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    utterance.speakerType === 'teacher' ? 'bg-blue-500' : 'bg-pink-400'
                  }`}
                >
                  {utterance.speakerName.charAt(0)}
                </span>
                <span className="font-semibold text-sm text-gray-700">
                  {utterance.speakerName}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatTime(utterance.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-800 pl-8">{utterance.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
