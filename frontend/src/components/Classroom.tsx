import type { Teacher, Student } from '../types'

interface ClassroomProps {
  teacher: Teacher
  students: Student[]
  currentSpeakerId?: string
  onCharacterClick: (character: Teacher | Student) => void
}

export default function Classroom({
  teacher,
  students,
  currentSpeakerId,
  onCharacterClick,
}: ClassroomProps) {
  return (
    <div className="w-full h-full flex flex-col items-center pt-8 pb-4">
      {/* 黒板 */}
      <div className="w-3/4 h-24 bg-green-800 rounded-lg shadow-lg flex items-center justify-center mb-4">
        <span className="text-white text-lg">黒板</span>
      </div>

      {/* 教卓と教員 */}
      <div className="relative mb-8">
        <div className="w-32 h-16 bg-amber-700 rounded shadow-md flex items-center justify-center">
          <span className="text-white text-sm">教卓</span>
        </div>
        <button
          onClick={() => onCharacterClick(teacher)}
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all ${
            currentSpeakerId === teacher.id
              ? 'bg-red-500 ring-4 ring-red-300 scale-110'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {teacher.name.charAt(0)}
        </button>
      </div>

      {/* 生徒席 6列×5行 */}
      <div className="grid grid-cols-6 gap-4">
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => {
            const student = students.find(
              (s) => s.seatPosition.row === row + 1 && s.seatPosition.col === col + 1
            )
            if (!student) {
              return (
                <div
                  key={`${row}-${col}`}
                  className="w-10 h-10 bg-gray-200 rounded"
                />
              )
            }
            return (
              <button
                key={student.id}
                onClick={() => onCharacterClick(student)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all ${
                  currentSpeakerId === student.id
                    ? 'bg-red-500 ring-4 ring-red-300 scale-110'
                    : student.gender === 'male'
                    ? 'bg-sky-400 hover:bg-sky-500'
                    : 'bg-pink-400 hover:bg-pink-500'
                }`}
                title={student.name}
              >
                {student.name.charAt(0)}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
