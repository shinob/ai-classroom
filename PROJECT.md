# AIクラスルーム 仕様（現行）

## 概要
教員1名・生徒6名の授業を自動進行でシミュレートし、発言ログを保存・リプレイできるアプリ。  
授業生成は管理画面で行い、トップページはログ閲覧専用とする。

## 主要仕様
- 授業時間は45分固定
- フェーズ: `start` / `intro` / `development1` / `development2` / `summary` / `end`
- 生成キャラクター:
  - 教員1名（性格・指導スタイルなどランダム）
  - 生徒6名（性格は6タイプを各1名）
- 教科・トピック:
  - 管理画面で学年（小1〜高3）を先に選択
  - 選択学年に対応するトピック一覧から選んで生成

## 画面
1. `/`（トップ）
  - 過去授業一覧
  - リプレイ開始
  - ログ削除
2. `/admin`（管理画面）
  - 学年選択
  - トピック選択
  - 授業生成
3. 生成中画面
  - 生成中表示（タイムアウトあり）
4. 教室画面
  - 会話ログ
  - 教室俯瞰表示
  - 再生/停止/速度/シーク
  - キャラクター詳細
5. リザルト画面

## 会話生成・授業進行
- WebSocket 経由で授業進行イベントを配信
- 教員の行動タイプ:
  - `explain`
  - `ask_question`
  - `respond_to_class`
  - `respond_to_student`
- 重複抑止:
  - 完全一致重複除外
  - 教員発話は近似重複（n-gram類似）も除外
- 教員説明は「短文で終わらせない」指示をプロンプトに反映

## カリキュラム目標説明（lessonGoal）
- `lessonGoal` について Ollama で説明文を生成
- 生成結果を `curriculum.goalExplanation` に反映
- 授業進行時プロンプトの `本時目標の詳細説明` として利用
- 保存カラム未対応環境でも、取得時に再生成して授業進行へ反映可能

## リプレイ
- 発言ログをDBから取得して時系列再生
- シーク対応
- リプレイ時のみ会話ログ読み上げボタンを表示
  - Web Speech API で発言者名 + 発話を読み上げ

## API（概要）
- `GET /api/sessions`
- `GET /api/sessions/topics`
- `POST /api/sessions`
- `GET /api/sessions/:id`
- `GET /api/sessions/:id/utterances`
- `DELETE /api/sessions/:id`
- `GET /ws?sessionId=...`

## 使用技術
- Frontend: React, TypeScript, Vite, Tailwind, Framer Motion
- Backend: Hono, WebSocket, Prisma
- DB: SQLite
- LLM: Ollama（既定モデル `gemma3`）
