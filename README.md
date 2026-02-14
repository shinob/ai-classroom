# AI Classroom

授業シミュレーションとリプレイを行う Web アプリです。  
トップページはログ閲覧専用、授業生成は `/admin` から行います。

## 現在の主な機能
- 管理画面で学年（小1〜高3）とトピックを選択して授業生成
- 教員1名 + 生徒6名の45分授業シミュレーション
- 発言ログ保存とリプレイ
- リプレイ時の会話読み上げ（Web Speech API）
- カリキュラム目標説明（`lessonGoal` 解説）を生成し、授業進行プロンプトに反映
- 教員説明の重複抑止（近似重複を含む）

## 技術スタック
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Hono + WebSocket + Prisma
- DB: SQLite
- LLM: Ollama (`gemma3` 既定)

## ディレクトリ
- `frontend/`: UI
- `backend/`: API / WebSocket / シミュレーション / Prisma

## セットアップ
```bash
pnpm install
```

## 開発起動
```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`（既定）

## 環境変数（主なもの）
- `OLLAMA_URL`（既定: `http://localhost:11434`）
- `OLLAMA_MODEL`（既定: `gemma3`）
- `OLLAMA_TIMEOUT_MS`（通常生成タイムアウト、既定: `25000`）
- `OLLAMA_TIMEOUT_MS_LONG`（長文生成タイムアウト、既定: `45000`）
- `PORT`（Backend ポート、既定: `3001`）

## API（主要）
- `GET /api/sessions` 授業一覧
- `GET /api/sessions/topics?schoolType=...&grade=...` 学年別トピック一覧
- `POST /api/sessions` 授業生成
  - body 例: `{ "schoolType": "middle", "grade": 1, "topicId": "middle_1_math_01" }`
  - body 省略時はランダム生成
- `GET /api/sessions/:id` 授業詳細
- `GET /api/sessions/:id/utterances` 発言ログ
- `DELETE /api/sessions/:id` 授業ログ削除

## 画面導線
- `/` : ログ閲覧・リプレイ
- `/admin` : 学年/トピック指定で授業生成
