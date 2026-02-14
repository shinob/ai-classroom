import type { SchoolType, Subject } from '../types/index.js'

const subjectsByGrade: Record<string, Subject[]> = {
  // 小学校1-2年: 国語・算数のみ
  'elementary_1': ['japanese', 'math'],
  'elementary_2': ['japanese', 'math'],
  // 小学校3-4年: 国語・算数・理科・社会（地理にマッピング）
  'elementary_3': ['japanese', 'math', 'science', 'geography'],
  'elementary_4': ['japanese', 'math', 'science', 'geography'],
  // 小学校5-6年: 国語・算数・理科・社会・英語
  'elementary_5': ['japanese', 'math', 'science', 'geography', 'english'],
  'elementary_6': ['japanese', 'math', 'science', 'geography', 'english'],
  // 中学校: 全教科
  'middle_1': ['japanese', 'math', 'science', 'geography', 'english', 'history'],
  'middle_2': ['japanese', 'math', 'science', 'geography', 'english', 'history'],
  'middle_3': ['japanese', 'math', 'science', 'geography', 'english', 'history'],
  // 高校: 全教科
  'high_1': ['japanese', 'math', 'science', 'geography', 'english', 'history'],
  'high_2': ['japanese', 'math', 'science', 'geography', 'english', 'history'],
  'high_3': ['japanese', 'math', 'science', 'geography', 'english', 'history'],
}

export function getAvailableSubjects(schoolType: SchoolType, grade: number): Subject[] {
  const key = `${schoolType}_${grade}`
  return subjectsByGrade[key] || ['japanese', 'math']
}
