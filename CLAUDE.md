# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Classroom (AIクラスルーム) - An educational simulation web application that runs virtual classroom sessions with 1 teacher and AI-generated students. The classroom is rendered from an overhead view with character dialogue displayed in speech bubbles, simulating 45-minute lessons. All lesson dialogue is generated via Ollama (Gemma3 model).

## Development Commands

```bash
# Install dependencies
npx pnpm install

# Start development servers (frontend on :3000, backend on :3001)
npx pnpm dev

# Start individually
npx pnpm dev:frontend
npx pnpm dev:backend

# Database
npx pnpm db:migrate         # Run Prisma migrations
npx pnpm db:studio          # Open Prisma Studio

# Build / Lint / Test
npx pnpm build
npx pnpm lint
npx pnpm test               # Vitest (no tests written yet)
```

Run single-package commands with pnpm filter:
```bash
npx pnpm --filter frontend lint
npx pnpm --filter backend test
```

## Architecture

pnpm monorepo with two packages: `frontend/` and `backend/`.

### Frontend (React + Vite + Tailwind + Framer Motion)

- **No router** — uses a state machine in `App.tsx` with states: `top` → `generating` → `classroom` → `result`
- **No global state** — props drilling from App.tsx, each page manages its own state
- **Pages**: `TopPage` (session list), `GeneratingPage` (loading), `ClassroomPage` (main view), `ResultPage` (summary)
- **WebSocket client** lives in `ClassroomPage.tsx` — connects to `ws://localhost:3001/ws?sessionId={id}`, sends `start`/`playback`/`seek`, receives `utterance`/`phase_change`/`time_update`/`lesson_end`
- **Replay mode** is client-side only: iterates over saved utterances without WebSocket
- **Vite proxy**: `/api/*` and `/ws` are proxied to backend in dev (configured in `vite.config.ts`)

### Backend (Hono + Prisma + SQLite)

- **Entry point**: `src/index.ts` — sets up HTTP routes, WebSocket endpoint, CORS
- **REST API** (`src/routes/sessions.ts`): CRUD for sessions at `/api/sessions/`
- **WebSocket** (`/ws?sessionId={id}`): creates a `LessonSimulator` per connection, cleaned up on disconnect
- **Services** (`src/services/`):
  - `lessonSimulator.ts` — core simulation engine with phase timeline, conversation state machine, 2-second tick interval
  - `ollama.ts` — LLM prompt engineering, personality-aware/grade-aware utterance generation, fallback defaults if Ollama unavailable
  - `characterGenerator.ts` — random attribute generation with balanced distributions (gender, personality, academic level)
  - `curriculumGenerator.ts` — generates structured lesson plans per phase
  - `db.ts` — Prisma operations, maps DB records to TypeScript types, computes lessonGoal/curriculum dynamically
- **Prisma schema** (`prisma/schema.prisma`): Session, Teacher (1:1), Student (many:1), Utterance (many:1, indexed on sessionId+timestamp)
- **Ollama config**: defaults to `http://localhost:11434` with `gemma3` model (env vars: `OLLAMA_URL`, `OLLAMA_MODEL`)

### Type Sharing

Types are **duplicated** between `frontend/src/types/index.ts` and `backend/src/types/index.ts`. When modifying shared types (SchoolType, Subject, Teacher, Student, Utterance, LessonPhase, etc.), update both files.

### Lesson Simulation Flow

1. `POST /api/sessions` creates session with random teacher + students in DB
2. Frontend opens WebSocket, sends `{ type: 'start' }`
3. `LessonSimulator` ticks every 2 seconds (= 0.5 lesson-minutes), generating utterances via Ollama
4. Conversation state machine prevents overlapping dialogue: `idle` → `teacher_explaining` → optionally `pending student response`
5. Utterances are saved to DB and sent to frontend via WebSocket
6. At 45 minutes, `lesson_end` event fires

### Lesson Phases (45-minute timeline)

`start` (0-1min) → `intro` (1-8min) → `development1` (8-25min) → `development2` (25-35min) → `summary` (35-42min) → `end` (42-45min)

## Documentation

- **PROJECT.md** — 詳細な仕様書（日本語）
- **TASKS.md** — 実装タスク一覧と進捗管理
