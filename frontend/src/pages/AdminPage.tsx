import { useEffect, useState } from 'react'
import type { GenerationRequest, SchoolType, TopicOption } from '../types'

interface AdminPageProps {
  onGenerate: (request: GenerationRequest) => void
}

interface GradeOption {
  key: string
  schoolType: SchoolType
  grade: number
  label: string
}

const gradeOptions: GradeOption[] = [
  { key: 'elementary-1', schoolType: 'elementary', grade: 1, label: '小1' },
  { key: 'elementary-2', schoolType: 'elementary', grade: 2, label: '小2' },
  { key: 'elementary-3', schoolType: 'elementary', grade: 3, label: '小3' },
  { key: 'elementary-4', schoolType: 'elementary', grade: 4, label: '小4' },
  { key: 'elementary-5', schoolType: 'elementary', grade: 5, label: '小5' },
  { key: 'elementary-6', schoolType: 'elementary', grade: 6, label: '小6' },
  { key: 'middle-1', schoolType: 'middle', grade: 1, label: '中1' },
  { key: 'middle-2', schoolType: 'middle', grade: 2, label: '中2' },
  { key: 'middle-3', schoolType: 'middle', grade: 3, label: '中3' },
  { key: 'high-1', schoolType: 'high', grade: 1, label: '高1' },
  { key: 'high-2', schoolType: 'high', grade: 2, label: '高2' },
  { key: 'high-3', schoolType: 'high', grade: 3, label: '高3' },
]

const subjectLabels: Record<string, string> = {
  english: '英語',
  japanese: '国語',
  math: '数学',
  history: '歴史',
  science: '理科',
  geography: '地理',
}

export default function AdminPage({ onGenerate }: AdminPageProps) {
  const [gradeKey, setGradeKey] = useState<string>('middle-1')
  const [topics, setTopics] = useState<TopicOption[]>([])
  const [topicId, setTopicId] = useState<string>('')
  const [loadingTopics, setLoadingTopics] = useState(false)

  const selectedGrade = gradeOptions.find((option) => option.key === gradeKey) || gradeOptions[0]

  useEffect(() => {
    const loadTopics = async () => {
      setLoadingTopics(true)
      setTopicId('')
      try {
        const response = await fetch(
          `/api/sessions/topics?schoolType=${selectedGrade.schoolType}&grade=${selectedGrade.grade}`
        )
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = (await response.json()) as TopicOption[]
        setTopics(data)
        if (data.length > 0) {
          setTopicId(data[0].id)
        }
      } catch (error) {
        console.error('Failed to load topics:', error)
        setTopics([])
      } finally {
        setLoadingTopics(false)
      }
    }

    loadTopics()
  }, [selectedGrade.grade, selectedGrade.schoolType])

  const selectedTopic = topics.find((topic) => topic.id === topicId) || null

  const handleGenerate = () => {
    if (!topicId) return
    onGenerate({ schoolType: selectedGrade.schoolType, grade: selectedGrade.grade, topicId })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">管理画面</h1>

      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6 mb-8 space-y-5">
        <div>
          <label htmlFor="grade" className="block text-sm font-semibold text-gray-700 mb-2">
            学年
          </label>
          <select
            id="grade"
            value={gradeKey}
            onChange={(e) => setGradeKey(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {gradeOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-semibold text-gray-700 mb-2">
            トピック
          </label>
          <select
            id="topic"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            disabled={loadingTopics || topics.length === 0}
            className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
          >
            {loadingTopics && <option value="">トピックを読み込み中...</option>}
            {!loadingTopics && topics.length === 0 && <option value="">選択可能なトピックがありません</option>}
            {!loadingTopics && topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                [{subjectLabels[topic.subject] || topic.subject}] {topic.topicName}
              </option>
            ))}
          </select>
        </div>

        {selectedTopic && (
          <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold mb-1">このトピックの到達目標</p>
            <p>{selectedTopic.lessonGoal}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={!topicId || loadingTopics}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xl font-bold py-4 px-8 rounded-lg shadow-lg mb-8 transition-colors"
      >
        新しい授業を生成
      </button>

      <a href="/" className="text-blue-700 underline">
        ログ閲覧ページへ戻る
      </a>
    </div>
  )
}
