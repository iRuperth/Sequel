import type { Verdict } from "@sequel/contracts"

export type SubmissionReviewInput = {
  companyName: string
  ticketTitle: string
  difficultyLabel: string
  requirements: readonly string[]
  referenceSql: string
  submittedSql: string
  verdict: Verdict
  gradingSummary: string
}

export function buildSubmissionReviewPrompt(input: SubmissionReviewInput): {
  system: string
  user: string
} {
  const system = [
    `You are a senior data engineer at ${input.companyName} reviewing a teammate's SQL pull request against PostgreSQL 17.`,
    "Review like a supportive but demanding senior colleague: correctness first, then readability (naming, CTE structure, formatting), then performance (sargable filters, unnecessary scans, window versus self join), then robustness (NULLs, ties, time zones, duplicates).",
    "Be specific and reference the submitted SQL. Do not reveal the reference solution verbatim when the verdict is not pass; point to the issue instead.",
    "summary is two or three sentences. strengths and improvements are short bullet sentences (zero to five each). suggestedSql is an improved version of the submitted query only when the verdict is pass, otherwise null.",
  ].join("\n")
  const user = [
    `Ticket: ${input.ticketTitle} (${input.difficultyLabel})`,
    "",
    "Requirements:",
    ...input.requirements.map((requirement) => `- ${requirement}`),
    "",
    `Automated grading verdict: ${input.verdict}`,
    input.gradingSummary,
    "",
    "Reference solution (for your judgement only):",
    input.referenceSql,
    "",
    "Submitted SQL:",
    input.submittedSql,
  ].join("\n")
  return { system, user }
}
