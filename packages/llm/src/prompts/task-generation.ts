import type { Difficulty, TaskMode, Topic, Track } from "@sequel/contracts"

export type DigestColumn = {
  name: string
  dataType: string
  isPrimaryKey: boolean
  references: string | null
  description: string
  examples: readonly string[]
}

export type DigestTable = {
  schema: string
  name: string
  description: string
  grain: string | null
  rowCount: number | null
  columns: readonly DigestColumn[]
}

export type DigestDataset = {
  slug: string
  name: string
  description: string
  tables: readonly DigestTable[]
}

export type TaskGenerationInput = {
  companyName: string
  asOfDate: string
  maxResultRows: number
  datasets: readonly DigestDataset[]
  target: {
    track: Track
    trackLabel: string
    difficulty: Difficulty
    difficultyLabel: string
    seniorityLabel: string
    topics: readonly Topic[]
    topicLabels: readonly string[]
    datasetSlug: string
    mode: TaskMode
  }
  learner: {
    roleTitle: string
    weakTopics: readonly string[]
    strongTopics: readonly string[]
    recentTitles: readonly string[]
  }
  previousAttempts: readonly { title: string; problem: string }[]
}

const DIFFICULTY_RUBRIC: Record<Difficulty, string> = {
  beginner:
    "Intern level. One table or one straightforward join, simple filters, basic aggregates, ORDER BY and LIMIT. No window functions.",
  intermediate:
    "Junior level. Two to four joins, GROUP BY with HAVING, CASE expressions, date truncation, a CTE or subquery, careful NULL handling.",
  advanced:
    "Mid level. Window functions (ROW_NUMBER, LAG, running totals, moving averages), several CTEs, deduplication, cohorts, funnels or retention, gaps and islands.",
  expert:
    "Senior level. Multi step analytical logic combining windows and CTEs, anomaly detection, sessionization, slowly changing logic, edge cases with ties and NULLs, performance aware SQL.",
}

const MODE_RULES: Record<TaskMode, string> = {
  read: [
    "The task is answered with exactly one read only SELECT statement (CTEs allowed).",
    "referenceSql is that single SELECT. verificationSql must be null.",
    "expectedColumns must list the exact output columns of referenceSql, in order, with aliases in snake_case.",
  ].join("\n"),
  scratch: [
    "The task asks the engineer to build objects in their personal scratch schema: tables, views or populated derived tables built from the shared datasets.",
    "referenceSql is a short script (DDL and DML separated by semicolons) that creates objects with UNQUALIFIED names only, never a schema prefix, never DROP of shared objects, no transactions, no SET commands, no DO blocks.",
    "Read source data with schema qualified names such as fintech.transactions.",
    "verificationSql is one deterministic SELECT that reads the created objects (unqualified names) and returns at most the row limit, ordered by a complete key. It is what gets compared.",
    "expectedColumns must list the exact output columns of verificationSql, in order.",
  ].join("\n"),
}

function renderTable(table: DigestTable): string {
  const header = `${table.schema}.${table.name} (${table.rowCount ?? "unknown"} rows): ${table.description}${table.grain ? ` Grain: ${table.grain}` : ""}`
  const columns = table.columns.map((column) => {
    const flags = [
      column.isPrimaryKey ? "pk" : null,
      column.references ? `fk -> ${column.references}` : null,
    ].filter(Boolean)
    const examples =
      column.examples.length > 0 ? ` e.g. ${column.examples.slice(0, 4).join(", ")}` : ""
    return `  - ${column.name} ${column.dataType}${flags.length ? ` [${flags.join(", ")}]` : ""}: ${column.description}${examples}`
  })
  return [header, ...columns].join("\n")
}

export function renderDatasetDigest(datasets: readonly DigestDataset[]): string {
  return datasets
    .map((dataset) =>
      [
        `## Dataset ${dataset.slug}: ${dataset.name}`,
        dataset.description,
        ...dataset.tables.map(renderTable),
      ].join("\n\n"),
    )
    .join("\n\n")
}

export function buildTaskGenerationPrompt(input: TaskGenerationInput): {
  system: string
  user: string
} {
  const system = [
    `You are a senior analytics engineering lead at ${input.companyName}. You write realistic work tickets for data team members (interns, analysts, data engineers, data scientists) that they must solve with PostgreSQL against the company warehouse.`,
    "",
    "# Warehouse",
    `The warehouse is PostgreSQL 17. Data is a snapshot as of ${input.asOfDate}; treat that date as today. Never use now(), current_date, current_timestamp, random() or other volatile functions; use explicit date literals relative to the as of date instead.`,
    "",
    renderDatasetDigest(input.datasets),
    "",
    "# How to write a ticket",
    "- Write it as the stakeholder would: a real person with a role and team, explaining in two to four short paragraphs why they need this and what decision it supports. First person, plain business English, no markdown headings.",
    "- requirements turn the ask into precise, testable definitions: which statuses count, how to treat NULLs, time window boundaries (inclusive or exclusive), rounding, how to break ties, which columns to output. A competent engineer must be able to produce exactly the expected result from the requirements alone.",
    "- acceptanceCriteria are short checklist items a reviewer would verify.",
    "- hints are exactly three, progressive: first a nudge on the approach, then the key technique, then a near solution outline. Never paste the full solution.",
    "- explanation describes the reference approach in two to four sentences, mentioning pitfalls.",
    "- estimatedMinutes is a realistic time for the target seniority.",
    "",
    "# SQL rules for referenceSql and verificationSql",
    "- Must run on PostgreSQL 17 using only the tables and columns listed above, schema qualified (for example fintech.transactions).",
    "- Must be fully deterministic: every ORDER BY ends with a unique key so ties are broken; round numeric outputs with ROUND(value::numeric, 2) unless the requirements say otherwise.",
    `- The final result must return between 1 and ${input.maxResultRows} rows. Prefer focused outputs (top N, monthly series, segment summaries) over raw dumps.`,
    "- Output column names are snake_case aliases and must match expectedColumns exactly, in order.",
    "- Set orderMatters to true only when the requirements explicitly demand a specific row order; then the reference ORDER BY must implement it.",
    "- Do not rely on data quality problems being absent: duplicates, NULLs and late records exist in the data, and good tickets sometimes ask the engineer to handle them explicitly.",
    "",
    "# Difficulty rubric",
    ...Object.entries(DIFFICULTY_RUBRIC).map(([level, rule]) => `- ${level}: ${rule}`),
  ].join("\n")

  const target = input.target
  const user = [
    "Write one new ticket with these parameters.",
    "",
    `- Track: ${target.trackLabel} (${target.track})`,
    `- Difficulty: ${target.difficultyLabel} (${target.difficulty}), seniority ${target.seniorityLabel}`,
    `- Primary dataset: ${target.datasetSlug}. Joining other datasets is allowed only if it is natural.`,
    `- Topics to exercise: ${target.topicLabels.join(", ")} (${target.topics.join(", ")})`,
    `- Mode: ${target.mode}`,
    "",
    "# Mode rules",
    MODE_RULES[target.mode],
    "",
    "# Learner",
    `- Role: ${input.learner.roleTitle}`,
    `- Weaker topics: ${input.learner.weakTopics.join(", ") || "none yet"}`,
    `- Stronger topics: ${input.learner.strongTopics.join(", ") || "none yet"}`,
    `- Recent ticket titles to avoid repeating: ${input.learner.recentTitles.join(" | ") || "none"}`,
    "",
    "Set the output fields track, difficulty, topics, datasetSlugs and mode to match the parameters above (topics may add at most one closely related topic).",
    ...(input.previousAttempts.length > 0
      ? [
          "",
          "# Previous attempts were rejected by automated validation. Fix these problems:",
          ...input.previousAttempts.map((attempt) => `- "${attempt.title}": ${attempt.problem}`),
        ]
      : []),
  ].join("\n")

  return { system, user }
}
