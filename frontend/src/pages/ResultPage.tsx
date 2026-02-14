import type { LessonSession } from '../types'

interface ResultPageProps {
  session: LessonSession
  onBackToTop: () => void
}

export default function ResultPage({ session, onBackToTop }: ResultPageProps) {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">授業終了</h1>

      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full mb-8">
        <h2 className="text-xl font-bold mb-4">授業サマリー</h2>

        <div className="space-y-2 text-gray-700">
          <p>
            <span className="font-semibold">学校・学年:</span>{' '}
            {schoolTypeLabel(session.schoolType)}{session.grade}年
          </p>
          <p>
            <span className="font-semibold">教科:</span>{' '}
            {subjectLabel(session.subject)}
          </p>
          <p>
            <span className="font-semibold">担当教員:</span>{' '}
            {session.teacher.name}
          </p>
          <p>
            <span className="font-semibold">生徒数:</span>{' '}
            {session.students.length}名
          </p>
        </div>
      </div>

      <button
        onClick={onBackToTop}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        トップへ戻る
      </button>
    </div>
  )
}
