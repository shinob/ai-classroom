import type { LessonTopic, Subject, SchoolType } from '../types/index.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TOPICS_DIR = join(__dirname, 'topics')

interface TopicJson {
  subject: Subject
  schoolType: SchoolType
  topics: {
    grade: number
    topicName: string
    lessonGoal: string
    introTask: string
    development1Tasks: string[]
    development2Tasks: string[]
    summaryTask: string
  }[]
}

function loadTopicsFromFile(filename: string): LessonTopic[] {
  const raw = readFileSync(join(TOPICS_DIR, filename), 'utf-8')
  const data: TopicJson = JSON.parse(raw)
  return data.topics.map((t, i) => ({
    id: `${data.schoolType}_${t.grade}_${data.subject}_${String(i + 1).padStart(2, '0')}`,
    subject: data.subject,
    schoolType: data.schoolType,
    grade: t.grade,
    topicName: t.topicName,
    lessonGoal: t.lessonGoal,
    introTask: t.introTask,
    development1Tasks: t.development1Tasks,
    development2Tasks: t.development2Tasks,
    summaryTask: t.summaryTask,
  }))
}

// JSON ファイルをすべて読み込み
const jsonFiles = [
  'elementary-japanese.json', 'elementary-math.json', 'elementary-science.json',
  'elementary-geography.json', 'elementary-english.json',
  'middle-japanese.json', 'middle-math.json', 'middle-english.json',
  'middle-science.json', 'middle-geography.json', 'middle-history.json',
  'high-japanese.json', 'high-math.json', 'high-english.json',
  'high-science.json', 'high-geography.json', 'high-history.json',
]

const allTopics: LessonTopic[] = jsonFiles.flatMap(loadTopicsFromFile)

// インデックス（高速ルックアップ用）
const topicIndex = new Map<string, LessonTopic[]>()
for (const topic of allTopics) {
  const key = `${topic.subject}_${topic.schoolType}_${topic.grade}`
  const list = topicIndex.get(key)
  if (list) {
    list.push(topic)
  } else {
    topicIndex.set(key, [topic])
  }
}

export function getTopicsForGradeSubject(
  subject: Subject,
  schoolType: SchoolType,
  grade: number,
): LessonTopic[] {
  return topicIndex.get(`${subject}_${schoolType}_${grade}`) ?? []
}

export function getTopicById(id: string): LessonTopic | undefined {
  return allTopics.find(t => t.id === id)
}
