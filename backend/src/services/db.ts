import { PrismaClient } from '@prisma/client'
import type { Teacher, Student, LessonSession, Utterance, Subject, SchoolType } from '../types/index.js'
import { generateLessonCurriculum } from './curriculumGenerator.js'
import { getTopicsForGradeSubject } from '../data/lessonTopics.js'
import { generateLessonGoalExplanation } from './ollama.js'

const prisma = new PrismaClient()

function getFallbackGoalExplanation(topicName: string, lessonGoal: string): string {
  return `この授業では「${topicName}」を扱い、目標である「${lessonGoal}」に到達することを目指します。導入で前提知識を確認し、展開で具体例と問題演習を通して理解を深め、最後に要点を整理して定着させます。`
}

function isGoalExplanationUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('Unknown argument `goalExplanation`')
}

async function resolveGoalExplanation(
  session: any,
  subject: Subject,
  schoolType: SchoolType,
  topicName: string,
  lessonGoal: string
): Promise<string> {
  if (typeof session.goalExplanation === 'string' && session.goalExplanation.trim().length > 0) {
    return session.goalExplanation
  }

  const generated = await generateLessonGoalExplanation(
    subject,
    schoolType,
    session.grade,
    topicName,
    lessonGoal
  )
  const explanation = generated || getFallbackGoalExplanation(topicName, lessonGoal)

  // goalExplanation カラム未反映環境ではここが失敗しても処理を続行する
  try {
    await prisma.session.update({
      where: { id: session.id },
      data: { goalExplanation: explanation } as any,
    })
  } catch {
    // no-op
  }

  return explanation
}

export async function createSession(
  schoolType: SchoolType,
  grade: number,
  subject: Subject,
  teacher: Teacher,
  students: Student[],
  topicId: string
): Promise<LessonSession> {
  const topics = getTopicsForGradeSubject(subject, schoolType, grade)
  const topic = topics.find((t) => t.id === topicId) || topics[0] || {
    id: topicId || 'fallback',
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

  const generatedGoalExplanation = await generateLessonGoalExplanation(
    subject,
    schoolType,
    grade,
    topic.topicName,
    topic.lessonGoal
  )
  const goalExplanation = generatedGoalExplanation || getFallbackGoalExplanation(topic.topicName, topic.lessonGoal)

  const baseData = {
    schoolType,
    grade,
    subject,
    topicId,
    teacher: {
      create: {
        id: teacher.id,
        name: teacher.name,
        age: teacher.age,
        gender: teacher.gender,
        personality: teacher.personality,
        teachingStyle: teacher.teachingStyle,
        familyEnvironment: teacher.familyEnvironment,
        yearsOfExperience: teacher.yearsOfExperience,
      },
    },
    students: {
      create: students.map((s) => ({
        id: s.id,
        name: s.name,
        gender: s.gender,
        personality: s.personality,
        academicLevel: s.academicLevel,
        concentration: s.concentration,
        hobbies: JSON.stringify(s.hobbies),
        favoriteSubjects: JSON.stringify(s.favoriteSubjects),
        weakSubjects: JSON.stringify(s.weakSubjects),
        familyEnvironment: s.familyEnvironment,
        seatRow: s.seatPosition.row,
        seatCol: s.seatPosition.col,
      })),
    },
  }

  let session: any
  try {
    session = await prisma.session.create({
      data: {
        ...baseData,
        goalExplanation,
      } as any,
      include: {
        teacher: true,
        students: true,
      },
    })
  } catch (error) {
    // 既存Prisma Clientに goalExplanation が未反映なら保存なしで継続
    if (!isGoalExplanationUnsupportedError(error)) {
      throw error
    }
    session = await prisma.session.create({
      data: baseData as any,
      include: {
        teacher: true,
        students: true,
      },
    })
  }

  return mapSessionToLessonSession(session, goalExplanation)
}

export async function getSession(
  id: string,
  _options?: { includeGoalExplanation?: boolean }
): Promise<LessonSession | null> {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      teacher: true,
      students: true,
    },
  })

  if (!session) return null
  return mapSessionToLessonSession(session)
}

export async function getAllSessions(): Promise<LessonSession[]> {
  const sessions = await prisma.session.findMany({
    include: {
      teacher: true,
      students: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return Promise.all(sessions.map((session) => mapSessionToLessonSession(session, undefined, false)))
}

export async function saveUtterance(utterance: Utterance): Promise<void> {
  await prisma.utterance.create({
    data: {
      id: utterance.id,
      sessionId: utterance.sessionId,
      speakerId: utterance.speakerId,
      speakerType: utterance.speakerType,
      speakerName: utterance.speakerName,
      content: utterance.content,
      timestamp: utterance.timestamp,
      phase: utterance.phase,
    },
  })
}

export async function getUtterances(sessionId: string): Promise<Utterance[]> {
  const utterances = await prisma.utterance.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
  })

  return utterances.map((u) => ({
    id: u.id,
    sessionId: u.sessionId,
    speakerId: u.speakerId,
    speakerType: u.speakerType as 'teacher' | 'student',
    speakerName: u.speakerName,
    content: u.content,
    timestamp: u.timestamp,
    phase: u.phase as Utterance['phase'],
  }))
}

export async function deleteSession(id: string): Promise<boolean> {
  try {
    await prisma.session.delete({
      where: { id },
    })
    return true
  } catch {
    return false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mapSessionToLessonSession(
  session: any,
  precomputedGoalExplanation?: string,
  generateMissingGoalExplanation: boolean = true
): Promise<LessonSession> {
  const schoolType = session.schoolType as SchoolType
  const subject = session.subject as Subject
  const topicId = session.topicId as string

  // Find the topic from data
  const topics = getTopicsForGradeSubject(subject, schoolType, session.grade)
  const topic = topics.find((t) => t.id === topicId) || topics[0] || {
    id: topicId || 'fallback',
    subject,
    schoolType,
    grade: session.grade,
    topicName: '基礎学習',
    lessonGoal: '基礎的な内容を理解し、説明できる',
    introTask: '前回の内容を振り返る',
    development1Tasks: ['基本問題に取り組む'],
    development2Tasks: ['応用問題に取り組む'],
    summaryTask: '今日学んだことをまとめる',
  }
  const goalExplanation = precomputedGoalExplanation
    || (generateMissingGoalExplanation
      ? await resolveGoalExplanation(
        session,
        subject,
        schoolType,
        topic.topicName,
        topic.lessonGoal
      )
      : (typeof session.goalExplanation === 'string' ? session.goalExplanation : ''))

  return {
    id: session.id,
    schoolType,
    grade: session.grade,
    subject,
    topicName: topic.topicName,
    lessonGoal: topic.lessonGoal,
    curriculum: generateLessonCurriculum(subject, schoolType, session.grade, topic.lessonGoal, topic, goalExplanation),
    teacher: session.teacher
      ? {
          id: session.teacher.id,
          name: session.teacher.name,
          age: session.teacher.age,
          gender: session.teacher.gender as 'male' | 'female',
          personality: session.teacher.personality as Teacher['personality'],
          teachingStyle: session.teacher.teachingStyle as Teacher['teachingStyle'],
          familyEnvironment: session.teacher.familyEnvironment as Teacher['familyEnvironment'],
          yearsOfExperience: session.teacher.yearsOfExperience,
        }
      : null!,
    students: session.students.map((s: any) => ({
      id: s.id,
      name: s.name,
      gender: s.gender as 'male' | 'female',
      personality: s.personality as Student['personality'],
      academicLevel: s.academicLevel,
      concentration: s.concentration as Student['concentration'],
      hobbies: JSON.parse(s.hobbies),
      favoriteSubjects: JSON.parse(s.favoriteSubjects),
      weakSubjects: JSON.parse(s.weakSubjects),
      familyEnvironment: s.familyEnvironment as Student['familyEnvironment'],
      seatPosition: { row: s.seatRow, col: s.seatCol },
    })),
    createdAt: session.createdAt.toISOString(),
  }
}

export { prisma }
