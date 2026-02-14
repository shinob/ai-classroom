import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { WSContext } from 'hono/ws'
import sessions from './routes/sessions.js'
import { getSession, saveUtterance } from './services/db.js'
import { LessonSimulator } from './services/lessonSimulator.js'
import type { Utterance } from './types/index.js'

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.use('*', cors())

// API routes
app.route('/api/sessions', sessions)

// Store active simulators
const simulators = new Map<string, LessonSimulator>()

// WebSocket endpoint
app.get(
  '/ws',
  upgradeWebSocket((c) => {
    const sessionId = c.req.query('sessionId')

    return {
      onOpen: async (_event: Event, ws: WSContext) => {
        if (!sessionId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Session ID required' }))
          ws.close()
          return
        }

        const session = await getSession(sessionId)
        if (!session) {
          ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }))
          ws.close()
          return
        }

        // Create simulator for this session
        const simulator = new LessonSimulator({
          sessionId,
          teacher: session.teacher,
          students: session.students,
          subject: session.subject,
          lessonGoal: session.lessonGoal,
          curriculum: session.curriculum,
          grade: session.grade,
          schoolType: session.schoolType,
          onUtterance: async (utterance: Utterance) => {
            ws.send(JSON.stringify({ type: 'utterance', utterance }))
            await saveUtterance(utterance)
          },
          onPhaseChange: (phase) => {
            ws.send(JSON.stringify({ type: 'phase_change', phase }))
          },
          onTimeUpdate: (elapsedMinutes) => {
            ws.send(JSON.stringify({ type: 'time_update', elapsedMinutes }))
          },
          onLessonEnd: () => {
            ws.send(JSON.stringify({ type: 'lesson_end' }))
            simulators.delete(sessionId)
          },
        })

        simulators.set(sessionId, simulator)

        ws.send(JSON.stringify({ type: 'connected', session }))
      },
      onMessage: (event: MessageEvent, ws: WSContext) => {
        if (!sessionId) return

        const simulator = simulators.get(sessionId)
        if (!simulator) return

        try {
          const data = JSON.parse(event.data.toString())

          switch (data.type) {
            case 'start':
              simulator.start()
              break
            case 'playback':
              simulator.setPlayback(data.isPlaying, data.speed)
              break
            case 'seek':
              simulator.seek(data.minutes)
              break
          }
        } catch (error) {
          console.error('WebSocket message error:', error)
        }
      },
      onClose: () => {
        if (sessionId) {
          const simulator = simulators.get(sessionId)
          if (simulator) {
            simulator.stop()
            simulators.delete(sessionId)
          }
        }
      },
    }
  })
)

const port = parseInt(process.env.PORT || '3001', 10)

const server = serve({
  fetch: app.fetch,
  port,
  hostname: '::',
})

injectWebSocket(server)

console.log(`Server running at http://localhost:${port}`)
