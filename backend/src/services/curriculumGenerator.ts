import type { LessonCurriculum, LessonPhase, LessonTopic, SchoolType, Subject } from '../types/index.js'

function schoolLabel(type: SchoolType): string {
  if (type === 'elementary') return '小学校'
  if (type === 'middle') return '中学校'
  return '高校'
}

function subjectLabel(subject: Subject): string {
  const labels: Record<Subject, string> = {
    english: '英語',
    japanese: '国語',
    math: '数学',
    history: '歴史',
    science: '理科',
    geography: '地理',
  }
  return labels[subject]
}

function plan(
  phase: LessonPhase,
  title: string,
  objective: string,
  teacherActions: string[],
  studentActions: string[],
  tasks: string[],
  checkpoint: string
) {
  return { phase, title, objective, teacherActions, studentActions, tasks, checkpoint }
}

function concreteTeacherStepsForIntro(topic: LessonTopic, lessonGoal: string): string[] {
  return [
    `${topic.introTask} を使って既習事項を2〜3問確認する`,
    `「${topic.topicName}」で扱う重要語句を板書し、語句の意味を短く定義する`,
    `本時の目標「${lessonGoal}」に対して、授業の見通し（導入→展開→まとめ）を共有する`,
  ]
}

function concreteTeacherStepsForDevelopment1(topic: LessonTopic): string[] {
  return topic.development1Tasks.map(
    (task) => `${task}（手順: 用語・概念の説明 → 具体例の提示 → 理解確認の発問）`
  )
}

function concreteTeacherStepsForDevelopment2(topic: LessonTopic): string[] {
  return topic.development2Tasks.map(
    (task) => `${task}（手順: 個人で実施 → ペア/グループで確認 → 全体で要点共有）`
  )
}

function concreteSummarySteps(topic: LessonTopic, lessonGoal: string): string[] {
  return [
    `${topic.summaryTask} を実施し、学習内容を自分の言葉で再構成させる`,
    `本時の目標「${lessonGoal}」の達成度を3段階で自己評価させる`,
    '誤答や誤解が多かった点を1つ取り上げ、正しい考え方を再説明する',
  ]
}

export function generateLessonCurriculum(
  subject: Subject,
  schoolType: SchoolType,
  grade: number,
  lessonGoal: string,
  topic: LessonTopic,
  goalExplanation: string
): LessonCurriculum {
  const school = schoolLabel(schoolType)
  const subjectText = subjectLabel(subject)

  return {
    overview: `${school}${grade}年 ${subjectText}「${topic.topicName}」。本時の目標「${lessonGoal}」の達成に向け、導入→展開→まとめの順に進行する。`,
    goalExplanation: goalExplanation || `本時の目標「${lessonGoal}」に関する要点を、定義・具体例・確認問題の観点で段階的に理解する。`,
    phases: [
      plan(
        'start',
        '開始',
        `「${topic.topicName}」の学習準備を整え、本時の到達点を明確にする`,
        [
          '授業開始の号令後、姿勢・用具・ノート準備を確認する',
          `本時の目標「${lessonGoal}」を黒板に明示する`,
          `本時で扱う内容（${topic.topicName}）と評価観点を短く伝える`,
        ],
        ['目標と評価観点を確認し、学習準備を完了する'],
        [
          '本時の目標をノート冒頭に書く',
          '今日の学習で特に意識する点を1つ決める',
        ],
        '全員が目標を言語化でき、授業に入る準備が整っている'
      ),
      plan(
        'intro',
        '導入',
        `「${topic.topicName}」の前提知識を具体例ベースで確認する`,
        concreteTeacherStepsForIntro(topic, lessonGoal),
        ['既習事項の確認問題に答える', '新出語句の意味を自分の言葉で説明する'],
        [
          topic.introTask,
          '確認問題（口頭またはミニ小テスト）で理解度を可視化する',
        ],
        '本題に必要な前提知識を8割以上の生徒が説明できる'
      ),
      plan(
        'development1',
        '展開1',
        `「${topic.topicName}」の主要概念・解法/読解手順を理解する`,
        concreteTeacherStepsForDevelopment1(topic),
        ['要点をノートに整理する', '確認発問に対して根拠付きで回答する'],
        [
          ...topic.development1Tasks,
          '理解確認として短い確認問題を1題解く（または1問に回答する）',
        ],
        '主要概念・手順を使って基礎問題/基礎問いに自力で対応できる'
      ),
      plan(
        'development2',
        '展開2',
        '理解した内容を使って、演習・表現・説明の実践に取り組む',
        concreteTeacherStepsForDevelopment2(topic),
        ['課題に取り組む', 'つまずきを言語化して質問する', '他者の考えを取り入れて解答/表現を改善する'],
        [
          ...topic.development2Tasks,
          '途中で自己点検を行い、解き方・考え方を1回見直す',
        ],
        `本時の目標「${lessonGoal}」に沿って、実践課題を最後まで完了できる`
      ),
      plan(
        'summary',
        'まとめ',
        '本時で学んだ内容を定着させ、目標達成度を確認する',
        concreteSummarySteps(topic, lessonGoal),
        ['学習内容を要点化して説明する', '残った疑問を明確化する'],
        [
          topic.summaryTask,
          '授業の要点を3行で記述し、次時への課題を1つ書く',
        ],
        '何を理解できて何が課題かを生徒自身が具体的に説明できる'
      ),
      plan(
        'end',
        '終了',
        '次時につながる復習観点を明確にして授業を終える',
        ['次回の学習内容との接続を具体的に伝える', '家庭学習で行う復習方法を1つ提示する'],
        ['振り返りを提出する', '次時までの課題を確認する'],
        ['「今日できるようになったこと」と「次に練習したいこと」を各1つ記述する'],
        '次時までに行うべき復習行動を全員が把握している'
      ),
    ],
  }
}
