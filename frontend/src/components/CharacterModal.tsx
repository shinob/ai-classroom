import type { Teacher, Student } from '../types'

interface CharacterModalProps {
  character: Teacher | Student
  onClose: () => void
}

function isTeacher(character: Teacher | Student): character is Teacher {
  return 'teachingStyle' in character
}

export default function CharacterModal({ character, onClose }: CharacterModalProps) {
  const personalityLabel = (p: string) => {
    const labels: Record<string, string> = {
      strict: '厳格',
      gentle: '温厚',
      passionate: '情熱的',
      calm: '冷静',
      humorous: 'ユーモラス',
      active: '積極的',
      passive: '消極的',
      talkative: 'おしゃべり',
      serious: '真面目',
      easygoing: 'マイペース',
      rebellious: '反抗的',
    }
    return labels[p] || p
  }

  const teachingStyleLabel = (style: string) => {
    const labels: Record<string, string> = {
      lecture: '講義型',
      dialogue: '対話型',
      practical: '実践型',
    }
    return labels[style] || style
  }

  const familyLabel = (env: string) => {
    const labels: Record<string, string> = {
      both_parents: '両親同居',
      single_parent: '片親',
      grandparents: '祖父母同居',
      alone: '一人暮らし',
    }
    return labels[env] || env
  }

  const concentrationLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    }
    return labels[level] || level
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">{character.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2 text-gray-700">
          <p>
            <span className="font-semibold">性別:</span>{' '}
            {character.gender === 'male' ? '男性' : '女性'}
          </p>
          <p>
            <span className="font-semibold">性格:</span>{' '}
            {personalityLabel(character.personality)}
          </p>
          <p>
            <span className="font-semibold">家庭環境:</span>{' '}
            {familyLabel(character.familyEnvironment)}
          </p>

          {isTeacher(character) ? (
            <>
              <p>
                <span className="font-semibold">年齢:</span> {character.age}歳
              </p>
              <p>
                <span className="font-semibold">指導スタイル:</span>{' '}
                {teachingStyleLabel(character.teachingStyle)}
              </p>
              <p>
                <span className="font-semibold">経験年数:</span>{' '}
                {character.yearsOfExperience}年
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="font-semibold">学力:</span>{' '}
                {'★'.repeat(character.academicLevel)}
                {'☆'.repeat(5 - character.academicLevel)}
              </p>
              <p>
                <span className="font-semibold">集中力:</span>{' '}
                {concentrationLabel(character.concentration)}
              </p>
              <p>
                <span className="font-semibold">趣味:</span>{' '}
                {character.hobbies.join(', ')}
              </p>
              <p>
                <span className="font-semibold">得意科目:</span>{' '}
                {character.favoriteSubjects.map(subjectLabel).join(', ') || 'なし'}
              </p>
              <p>
                <span className="font-semibold">苦手科目:</span>{' '}
                {character.weakSubjects.map(subjectLabel).join(', ') || 'なし'}
              </p>
              <p>
                <span className="font-semibold">座席:</span>{' '}
                {character.seatPosition.row}行{character.seatPosition.col}列
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
