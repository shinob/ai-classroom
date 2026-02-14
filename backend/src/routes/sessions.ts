import { Hono } from 'hono'
import {
  generateSchoolType,
  generateGrade,
  generateSubject,
  generateTeacher,
  generateStudents,
  selectLessonTopic,
} from '../services/characterGenerator.js'
import { createSession, getSession, getAllSessions, getUtterances, deleteSession } from '../services/db.js'
import { getTopicsForGradeSubject, getTopicById } from '../data/lessonTopics.js'
import { getAvailableSubjects } from '../data/subjectsByGrade.js'
import type { SchoolType, Subject } from '../types/index.js'

const sessions = new Hono()

// Get all sessions
sessions.get('/', async (c) => {
  const allSessions = await getAllSessions()
  return c.json(allSessions)
})

// Get selectable topics by school type and grade
sessions.get('/topics', (c) => {
  const schoolType = c.req.query('schoolType') as SchoolType | undefined
  const gradeText = c.req.query('grade')
  const grade = gradeText ? Number(gradeText) : NaN

  if (!schoolType || Number.isNaN(grade)) {
    return c.json({ error: 'schoolType and grade are required' }, 400)
  }

  const subjects = getAvailableSubjects(schoolType, grade)
  const topics = subjects.flatMap((subject) => getTopicsForGradeSubject(subject, schoolType, grade))
  const unique = topics.filter((topic, idx, arr) => arr.findIndex((t) => t.id === topic.id) === idx)
  unique.sort((a, b) => a.topicName.localeCompare(b.topicName, 'ja'))

  return c.json(unique.map((t) => ({
    id: t.id,
    topicName: t.topicName,
    lessonGoal: t.lessonGoal,
    subject: t.subject,
    schoolType: t.schoolType,
    grade: t.grade,
  })))
})

// Create new session
sessions.post('/', async (c) => {
  let payload: {
    schoolType?: SchoolType
    grade?: number
    topicId?: string
  } = {}
  try {
    payload = await c.req.json()
  } catch {
    // Empty body is allowed. Fallback to random generation.
  }

  let schoolType = payload.schoolType
  let grade = payload.grade
  let subject: Subject | undefined
  let topic = payload.topicId ? getTopicById(payload.topicId) : undefined

  if (topic) {
    schoolType = topic.schoolType
    grade = topic.grade
    subject = topic.subject
  }

  if (!schoolType) {
    schoolType = generateSchoolType()
  }
  if (!grade) {
    grade = generateGrade(schoolType)
  }
  if (!subject) {
    subject = generateSubject(schoolType, grade)
  }
  if (!topic) {
    topic = selectLessonTopic(subject, schoolType, grade)
  }

  const teacher = generateTeacher()
  const students = generateStudents(6)

  const session = await createSession(schoolType, grade, subject, teacher, students, topic.id)
  return c.json(session)
})

// Get specific session
sessions.get('/:id', async (c) => {
  const id = c.req.param('id')
  const session = await getSession(id, { includeGoalExplanation: false })

  if (!session) {
    return c.json({ error: 'Session not found' }, 404)
  }

  return c.json(session)
})

// Get utterances for session
sessions.get('/:id/utterances', async (c) => {
  const id = c.req.param('id')
  const utterances = await getUtterances(id)
  return c.json(utterances)
})

// Delete session and its logs
sessions.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const deleted = await deleteSession(id)

  if (!deleted) {
    return c.json({ error: 'Session not found' }, 404)
  }

  return c.json({ success: true })
})

export default sessions
