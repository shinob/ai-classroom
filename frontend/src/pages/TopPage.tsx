import { useState, useEffect } from 'react'
import type { LessonSession } from '../types'

interface TopPageProps {
  onReplay: (sessionId: string) => void
}

export default function TopPage({ onReplay }: TopPageProps) {
  const [sessions, setSessions] = useState<LessonSession[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const schoolTypeLabel = (type: string) => {
    switch (type) {
      case 'elementary': return '小学校'
      case 'middle': return '中学校'
      case 'high': return '高校'
      default: return type
    }
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

  const handleDelete = async (sessionId: string) => {
    const ok = window.confirm('この授業ログを削除しますか？')
    if (!ok) return

    setDeletingId(sessionId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('delete failed')
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (error) {
      console.error('Failed to delete session:', error)
      window.alert('削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">AIクラスルーム</h1>
      <a
        href="/admin"
        className="text-blue-700 underline mb-10"
      >
        新しい授業を生成する場合は管理画面へ
      </a>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">過去の授業</h2>
        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500">まだ授業の記録がありません</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <div className="w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-3">
                  <button
                    onClick={() => onReplay(session.id)}
                    className="text-left flex-1"
                  >
                    <span className="font-bold">{schoolTypeLabel(session.schoolType)}{session.grade}年</span>
                    <span className="ml-4">{subjectLabel(session.subject)}</span>
                    <span className="ml-2 text-gray-600">— {session.topicName}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                    className="px-3 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                  >
                    {deletingId === session.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
