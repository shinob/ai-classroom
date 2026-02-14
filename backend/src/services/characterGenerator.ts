import { randomUUID } from 'crypto'
import {
  Teacher,
  Student,
  SchoolType,
  Subject,
  LessonTopic,
  TeacherPersonality,
  TeachingStyle,
  StudentPersonality,
  ConcentrationLevel,
  FamilyEnvironment,
} from '../types/index.js'
import { lastNames, maleFirstNames, femaleFirstNames, hobbies } from '../data/names.js'
import { getAvailableSubjects } from '../data/subjectsByGrade.js'
import { getTopicsForGradeSubject } from '../data/lessonTopics.js'

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomItems<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateName(gender: 'male' | 'female'): string {
  const lastName = randomItem(lastNames)
  const firstName = gender === 'male' ? randomItem(maleFirstNames) : randomItem(femaleFirstNames)
  return `${lastName} ${firstName}`
}

export function generateSchoolType(): SchoolType {
  return randomItem<SchoolType>(['elementary', 'middle', 'high'])
}

export function generateGrade(schoolType: SchoolType): number {
  switch (schoolType) {
    case 'elementary':
      return randomInt(1, 6)
    case 'middle':
    case 'high':
      return randomInt(1, 3)
  }
}

export function generateSubject(schoolType: SchoolType, grade: number): Subject {
  const available = getAvailableSubjects(schoolType, grade)
  return randomItem(available)
}

export function selectLessonTopic(subject: Subject, schoolType: SchoolType, grade: number): LessonTopic {
  const topics = getTopicsForGradeSubject(subject, schoolType, grade)
  if (topics.length === 0) {
    // Fallback topic if no data found
    return {
      id: `${subject}_fallback`,
      subject,
      schoolType,
      grade,
      topicName: '基礎学習',
      lessonGoal: '基礎的な内容を理解し、説明できる',
      introTask: '前回の内容を振り返る',
      development1Tasks: ['基本問題に取り組む'],
      development2Tasks: ['応用問題に取り組む'],
      summaryTask: '今日学んだことをまとめる',
    }
  }
  return randomItem(topics)
}

export function generateTeacher(): Teacher {
  const gender = randomItem<'male' | 'female'>(['male', 'female'])
  const age = randomInt(23, 60)
  const yearsOfExperience = Math.min(age - 22, randomInt(1, 35))

  return {
    id: randomUUID(),
    name: generateName(gender),
    age,
    gender,
    personality: randomItem<TeacherPersonality>(['strict', 'gentle', 'passionate', 'calm', 'humorous']),
    teachingStyle: randomItem<TeachingStyle>(['lecture', 'dialogue', 'practical']),
    familyEnvironment: randomItem<FamilyEnvironment>(['both_parents', 'single_parent', 'grandparents', 'alone']),
    yearsOfExperience,
  }
}

export function generateStudents(count: number = 6): Student[] {
  const students: Student[] = []

  // 6人の場合、各性格を1人ずつ配置
  const personalities: StudentPersonality[] = [
    'active',
    'passive',
    'talkative',
    'serious',
    'easygoing',
    'rebellious',
  ]

  // Gender balance: 3 male, 3 female (shuffled)
  const genders: Array<'male' | 'female'> = ['male', 'male', 'male', 'female', 'female', 'female']
    .sort(() => Math.random() - 0.5) as Array<'male' | 'female'>

  // Academic levels: 1-5 distributed (1, 2, 3, 3, 4, 5)
  const academicLevels = [1, 2, 3, 3, 4, 5].sort(() => Math.random() - 0.5)

  for (let i = 0; i < count; i++) {
    const gender = genders[i]
    const col = i + 1

    const allSubjects: Subject[] = ['english', 'japanese', 'math', 'history', 'science', 'geography']
    const favoriteSubjects = randomItems(allSubjects, 1, 2)
    const remainingSubjects = allSubjects.filter((s) => !favoriteSubjects.includes(s))
    const weakSubjects = randomItems(remainingSubjects, 0, 2)

    students.push({
      id: randomUUID(),
      name: generateName(gender),
      gender,
      personality: personalities[i],
      academicLevel: academicLevels[i],
      concentration: randomItem<ConcentrationLevel>(['low', 'medium', 'high']),
      hobbies: randomItems(hobbies, 1, 3),
      favoriteSubjects,
      weakSubjects,
      familyEnvironment: randomItem<FamilyEnvironment>([
        'both_parents',
        'single_parent',
        'grandparents',
        'alone',
      ]),
      seatPosition: { row: 1, col },
    })
  }

  return students
}
