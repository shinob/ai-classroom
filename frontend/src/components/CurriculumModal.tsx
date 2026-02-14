import type { LessonCurriculum, LessonPhase } from '../types'

interface CurriculumModalProps {
  curriculum: LessonCurriculum
  currentPhase: LessonPhase
  onClose: () => void
}

const phaseLabels: Record<LessonPhase, string> = {
  start: '開始',
  intro: '導入',
  development1: '展開1',
  development2: '展開2',
  summary: 'まとめ',
  end: '終了',
}

export default function CurriculumModal({ curriculum, currentPhase, onClose }: CurriculumModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">授業カリキュラム</h2>
            <p className="text-sm text-gray-600 mt-1">{curriculum.overview}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="閉じる"
          >
            &times;
          </button>
        </div>

        {curriculum.goalExplanation && (
          <section className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-800 mb-2">本時目標の解説</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{curriculum.goalExplanation}</p>
          </section>
        )}

        <div className="space-y-3">
          {curriculum.phases.map((phasePlan) => {
            const isCurrent = phasePlan.phase === currentPhase

            return (
              <section
                key={phasePlan.phase}
                className={`rounded-lg border p-4 ${
                  isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-800">
                    {phaseLabels[phasePlan.phase]}: {phasePlan.title}
                  </h3>
                  {isCurrent && (
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-600 text-white">
                      現在のフェーズ
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-2">
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
