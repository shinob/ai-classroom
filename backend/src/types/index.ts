export type SchoolType = 'elementary' | 'middle' | 'high'

export type Subject = 'english' | 'japanese' | 'math' | 'history' | 'science' | 'geography'

export type TeacherPersonality = 'strict' | 'gentle' | 'passionate' | 'calm' | 'humorous'

export type TeachingStyle = 'lecture' | 'dialogue' | 'practical'

export type StudentPersonality = 'active' | 'passive' | 'talkative' | 'serious' | 'easygoing' | 'rebellious'

export type ConcentrationLevel = 'low' | 'medium' | 'high'

export type FamilyEnvironment = 'both_parents' | 'single_parent' | 'grandparents' | 'alone'

export interface Teacher {
  id: string
  name: string
  age: number
  gender: 'male' | 'female'
  personality: TeacherPersonality
  teachingStyle: TeachingStyle
  familyEnvironment: FamilyEnvironment
  yearsOfExperience: number
}

export interface Student {
  id: string
  name: string
  gender: 'male' | 'female'
  personality: StudentPersonality
  academicLevel: number
  concentration: ConcentrationLevel
  hobbies: string[]
  favoriteSubjects: Subject[]
  weakSubjects: Subject[]
  familyEnvironment: FamilyEnvironment
  seatPosition: { row: number; col: number }
}

export interface LessonTopic {
  id: string
  subject: Subject
  schoolType: SchoolType
  grade: number
  topicName: string
  lessonGoal: string
  introTask: string
  development1Tasks: string[]
  development2Tasks: string[]
  summaryTask: string
}

export interface LessonSession {
  id: string
  schoolType: SchoolType
  grade: number
  subject: Subject
  topicName: string
  lessonGoal: string
  curriculum: LessonCurriculum
  teacher: Teacher
  students: Student[]
  createdAt: string
}

export interface CurriculumPhasePlan {
  phase: LessonPhase
  title: string
  objective: string
  teacherActions: string[]
  studentActions: string[]
  tasks: string[]
  checkpoint: string
}

export interface LessonCurriculum {
  overview: string
  goalExplanation: string
  phases: CurriculumPhasePlan[]
}

export type LessonPhase = 'start' | 'intro' | 'development1' | 'development2' | 'summary' | 'end'

export interface Utterance {
  id: string
  sessionId: string
  speakerId: string
  speakerType: 'teacher' | 'student'
  speakerName: string
  content: string
  timestamp: number
  phase: LessonPhase
}

export interface LessonState {
  phase: LessonPhase
  elapsedMinutes: number
  utterances: Utterance[]
}
