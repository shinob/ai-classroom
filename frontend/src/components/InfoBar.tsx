interface InfoBarProps {
  schoolType: string
  grade: number
  subject: string
  topicName: string
  lessonGoal: string
  phase: string
  elapsedMinutes: number
}

export default function InfoBar({
  schoolType,
  grade,
  subject,
  topicName,
  lessonGoal,
  phase,
  elapsedMinutes,
}: InfoBarProps) {
  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white shadow-md px-6 py-3 flex items-start justify-between gap-6">
      <div className="flex items-start gap-6 min-w-0">
        <div className="shrink-0">
          <span className="text-gray-500 text-sm">学校・学年</span>
          <p className="font-bold">{schoolType}{grade}年</p>
        </div>
        <div className="shrink-0">
          <span className="text-gray-500 text-sm">教科</span>
          <p className="font-bold">{subject} — {topicName}</p>
        </div>
        <div className="shrink-0">
          <span className="text-gray-500 text-sm">フェーズ</span>
          <p className="font-bold">{phase}</p>
        </div>
        <div className="min-w-0 max-w-xl">
          <span className="text-gray-500 text-sm">本時の目標</span>
          <p className="font-bold truncate" title={lessonGoal}>{lessonGoal}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-gray-500 text-sm">経過時間</span>
        <p className="font-bold text-2xl font-mono">{formatTime(elapsedMinutes)}</p>
      </div>
    </div>
  )
}
