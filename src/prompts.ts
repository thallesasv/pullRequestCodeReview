import { runPrompt } from "./ai";
import { z } from "zod";
import { formatFileDiff, File, FileDiff, generateFileCodeDiff } from "./diff";
import { ReviewCommentThread } from "./comments";
import config from "./config";

type PullRequestSummaryPrompt = {
  prTitle: string;
  prDescription: string;
  commitMessages: string[];
  files: File[];
};

export type PullRequestSummary = {
  title: string;
  description: string;
  files: {
    filename: string;
    summary: string;
    title: string;
  }[];
  type: string[];
};

export async function runSummaryPrompt(
  pr: PullRequestSummaryPrompt
): Promise<PullRequestSummary> {
  let systemPrompt = `You are a helpful assistant that summarizes Git Pull Requests (PRs).`;

  systemPrompt += `Your task is to provide a full description for the PR content - title, type, description and affected file summaries.\n`;

  systemPrompt += `
- Keep in mind that the 'Original title', 'Original description' and 'Commit messages' sections may be partial, simplistic, non-informative or out of date. Hence, compare them to the PR diff code, and use them only as a reference.
- The generated title and description should prioritize the most significant changes.
- When quoting variables or names from the code, use backticks (\`).
- Return a summary for each single affected file or if there is nothing to summarize simply use the status of the change (ie. "Novo arquivo").
- Start the overview with a verb at past tense like "Iniciou", "Comentou", "Gerou" etc...

IMPORTANT: Do not make assumptions about the code outside the diff. Do not assume variable could be optional if you don't see the type declaration. Do not suggest null checks unless you are sure this could lead to a runtime error.
- CRITICAL LANGUAGE RULE: All natural language output must be in Brazilian Portuguese (pt-BR). Keep code identifiers, file paths, and code snippets unchanged. Rewrite any field that comes in English to pt-BR.
\n`;

  let userPrompt = `
Summarize the following PR:

<Original PR Title>${pr.prTitle}</Original PR Title>
<Original PR Description>
${pr.prDescription}
</Original PR Description>
<Commit Messages>
${pr.commitMessages.join("\n")}
</Commit Messages>

<Affected Files>
${pr.files.map((file) => `- ${file.status}: ${file.filename}`).join("\n")}
</Affected Files>

<File Diffs>
${pr.files.map((file) => formatFileDiff(file)).join("\n\n")}
</File Diffs>

Make sure each affected file is summarized and it's part of the returned JSON.
IMPORTANT: Return all natural language fields (title, description, file summaries) in Brazilian Portuguese (pt-BR).
Keep code identifiers, file paths, and code snippets unchanged.
If the summary or titles come in English, rewrite them to pt-BR before returning the final JSON.
`;

  const fileSchema = z.object({
    filename: z.string().describe("The full file path of the relevant file"),
    summary: z
      .string()
      .describe(
        "Concise summary in Brazilian Portuguese (pt-BR) of the file changes in markdown format (max 70 words)"
      ),
    title: z
      .string()
      .describe(
        "An informative title in Brazilian Portuguese (pt-BR) for the changes in this file, describing its main theme (5-10 words)."
      ),
  });

  const schema = z.object({
    title: z
      .string()
      .describe(
        "Informative title in Brazilian Portuguese (pt-BR) of the PR, describing its main theme (10 words max)"
      ),
    description: z
      .string()
      .describe("Informative description in Brazilian Portuguese (pt-BR) of the PR, describing its main theme"),
    files: z
      .array(fileSchema)
      .describe(
        "List of files affected in the PR and summaries of their changes (in Brazilian Portuguese pt-BR)"
      ),
    type: z
      .array(z.string())
      .describe("One or more types that describe this PR's main theme. Keep in English. Example: BUG, TESTS, ENHANCEMENT, DOCUMENTATION, SECURITY, OTHER"),
  });

  return (await runPrompt({
    prompt: userPrompt,
    systemPrompt,
    schema,
  })) as PullRequestSummary;
}

export type AIComment = {
  file: string;
  start_line: number;
  end_line: number;
  highlighted_code: string;
  header: string;
  content: string;
  label: string;
  critical: boolean;
};

export type PullRequestReview = {
  review: {
    estimated_effort_to_review: number;
    score: number;
    has_relevant_tests: boolean;
    security_concerns: string;
  };
  comments: AIComment[];
};

type PullRequestReviewPrompt = {
  prTitle: string;
  prDescription: string;
  prSummary: string;
  files: FileDiff[];
};

export function buildReviewSystemPrompt(styleGuideRules?: string): string {
  const styleGuideSection =
    styleGuideRules && styleGuideRules.length > 0
      ? `\nGuidelines for the review, such as style guides, conventions, or best practices. Violations should result in a critical comment:\n${styleGuideRules}`
      : "";

  return `
<IMPORTANT INSTRUCTIONS>
You are an experienced senior software engineer reviewing a Git Pull Request (PR). Your goal is to find high-value, actionable issues with clear evidence from the diff.

Prioritize only issues that could cause a real bug, security problem, regression, incorrect behavior, missing validation, data loss, data exposure, concurrency issues, or a significant maintainability problem. Do not comment on formatting, naming, comments, style, or speculative refactors.
Priorize apenas problemas que possam causar um bug real, problema de segurança, regressão, comportamento incorreto, falta de validação, perda ou exposição de dados, problemas de concorrência ou um problema significativo de manutenção. Não comente sobre formatação, nomes, comentários, estilo ou refatorações especulativas.

Focus only on new code added in the diff (lines starting with '+'). Review only issues with direct evidence in the changed code. If the evidence is weak, ambiguous, speculative, or the change is low-risk, return no comment.
Revise apenas o código novo adicionado no diff (linhas iniciadas com '+'). Analise apenas problemas com evidência direta no trecho alterado. Se a evidência for fraca, ambígua, especulativa ou a mudança for de baixo risco, não comente.

Before commenting, ask: (1) is there a concrete problem in the changed code? (2) is the impact real and user-visible? (3) is the fix actionable and specific? If any answer is no, do not comment.
Antes de comentar, responda: (1) há um problema concreto no código alterado? (2) o impacto é real e visível ao usuário? (3) a correção é acionável e específica? Se qualquer resposta for não, não comente.

Comment volume policy: avoid both under-reporting and noisy over-reporting. Return 0 to 12 comments, preferring quality over quantity. Typical range is 2 to 8 comments when real issues exist. For small or low-risk changes, 0 to 3 comments is expected.
Política de volume de comentários: evite tanto subnotificação quanto excesso de ruído. Retorne de 0 a 12 comentários, priorizando qualidade sobre quantidade. A faixa típica é de 2 a 8 comentários quando houver problemas reais. Para mudanças pequenas ou de baixo risco, o esperado é 0 a 3 comentários.

Prioritize findings in this order: security vulnerabilities, real bugs/regressions, missing or weak validation, incorrect API/HTTP behavior, high-impact maintainability risks (for example dependency injection anti-patterns that increase coupling), and then other substantial issues.
Priorize os achados nesta ordem: vulnerabilidades de segurança, bugs/regressões reais, ausência ou fraqueza de validações, comportamento incorreto de API/HTTP, riscos relevantes de manutenibilidade (por exemplo anti-padrões de injeção de dependência que aumentam acoplamento) e, depois, outros problemas substanciais.

Avoid duplicate reports, overlapping findings, and repeated comments on the same issue. Prefer a single high-value comment over multiple weak ones.
Evite relatos duplicados, achados sobrepostos e comentários repetidos sobre o mesmo problema. Prefira um comentário de alto valor em vez de vários fracos.

Use markdown formatting only inside the comment text. Each comment should explain the problem, why it matters, and the expected corrective action.
Use markdown apenas dentro do texto do comentário. Cada comentário deve explicar o problema, por que ele importa e a ação corretiva esperada.

Important constraints:
- Keep natural language in Brazilian Portuguese (pt-BR).
- Preserve code identifiers, method names, file paths, and code snippets exactly as they appear in the diff.
- Keep comments[].label in English.
- Do not make assumptions about code outside the diff.
- If no actionable issue is found, return an empty comments array.
- If the change is a test addition or a documentation-only change, do not flag it unless there is a real defect or risk.
${styleGuideSection}
</IMPORTANT INSTRUCTIONS>

FINAL INSTRUCTION:
Return ONLY a valid JSON object. No markdown fences, no explanations.
`;
}

export function buildReviewUserPrompt(pr: PullRequestReviewPrompt): string {
  return `
<PR title>
${pr.prTitle}
</PR title>

<PR Description>
${pr.prDescription}
</PR Description>

<PR Summary>
${pr.prSummary}
</PR Summary>

<PR File Diffs>
${pr.files.map((file) => generateFileCodeDiff(file)).join("\n\n")}
</PR File Diffs>

RESPONSE FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "review": {
    "estimated_effort_to_review": <number 1-5>,
    "score": <number 0-100>,
    "has_relevant_tests": <boolean>,
    "security_concerns": "<string in Portuguese (pt-BR)>"
  },
  "comments": [
    {
      "file": "<filename>",
      "start_line": <number>,
      "end_line": <number>,
      "highlighted_code": "<code snippet>",
      "header": "<single sentence in Portuguese>",
      "content": "<detailed explanation in Portuguese>",
      "label": "<English label>",
      "critical": <boolean>
    }
  ]
}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown, no code fences, no explanations
- All natural language fields (header, content, security_concerns) MUST be in Brazilian Portuguese (pt-BR)
- Keep label in English
- Only comment when there is direct evidence of a real problem in the diff; never speculate or invent issues
- Prefer high-impact issues and avoid noisy, low-value comments
- If no issues found, return empty comments array: "comments": []
`;
}

export async function runReviewPrompt(
  pr: PullRequestReviewPrompt
): Promise<PullRequestReview> {
  const systemPrompt = buildReviewSystemPrompt(config.styleGuideRules);
  const userPrompt = buildReviewUserPrompt(pr);

  const commentSchema = z.object({
    file: z.string().describe("The full file path of the relevant file"),
    start_line: z
      .number()
      .describe(
        "The relevant line number, from a '__new hunk__' section, where the comment starts (inclusive). Should correspond to the prefix of the first line in the 'highlighted_code' snippet. If comment spans a single line, it should equal the 'end_line'"
      ),
    end_line: z
      .number()
      .describe(
        "The relevant line number, from a '__new hunk__' section, where the comment ends (inclusive). Should correspond to the prefix of the last line in the 'highlighted_code' snippet. If comment spans a single line, it should equal the 'start_line'"
      ),
    content: z
      .string()
      .describe(
        "An actionable comment in Brazilian Portuguese (pt-BR) to enhance, improve or fix the new code introduced in the PR. Use markdown formatting."
      ),
    header: z
      .string()
      .describe(
        "A concise, single-sentence overview in Brazilian Portuguese (pt-BR) of the comment. Focus on the 'what'. Be general, and avoid method or variable names."
      ),
    highlighted_code: z
      .string()
      .describe(
        "A short code snippet from a '__new hunk__' section that the comment is applicable for.Include only complete code lines, without line numbers. This snippet should represent the full specific PR code targeted for comment, at its first line should match 'startLine' and last line match 'endLine'. If the code snippet is a single line, that line should match both 'startLine' and 'endLine'"
      ),
    label: z
      .string()
      .describe(
        "A single, descriptive label in English that best characterizes the suggestion type. Possible labels include 'security', 'possible bug', 'possible issue', 'performance', 'enhancement', 'best practice', 'maintainability', 'readability', and 'typo'. Other relevant English labels are also acceptable."
      ),
    critical: z
      .boolean()
      .describe(
        "True if the comment is critical and the PR should not be merged without addressing the comment. False otherwise."
      ),
  });

  const reviewSchema = z.object({
    estimated_effort_to_review: z
      .number()
      .min(1)
      .max(5)
      .describe(
        "Estimate, on a scale of 1-5 (inclusive), the time and effort required to review this PR by an experienced and knowledgeable developer. 1 means short and easy review , 5 means long and hard review. Take into account the size, complexity, quality, and the needed changes of the PR code diff."
      ),
    score: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Rate this PR on a scale of 0-100 (inclusive), where 0 means the worst possible PR code, and 100 means PR code of the highest quality, without any bugs or performance issues, that is ready to be merged immediately and run in production at scale."
      ),
    has_relevant_tests: z
      .boolean()
      .describe(
        "True if the PR includes relevant tests added or updated. False otherwise."
      ),
    security_concerns: z
      .string()
      .describe(
        "In Brazilian Portuguese (pt-BR), explain whether this PR code introduces possible vulnerabilities such as exposure of sensitive information (e.g., API keys, secrets, passwords), or security concerns like SQL injection, XSS, CSRF, and others. Answer 'Nao' (without explaining why) if there are no possible issues. If there are security concerns or issues, start your answer with a short header, such as: 'Exposicao de informacoes sensiveis: ...', 'SQL injection: ...' etc. Explain your answer. Be specific and give examples if possible"
      ),
  });

  const baseReviewSchema = z.object({
    review: reviewSchema.describe("The full review of the PR"),
    comments: z
      .array(commentSchema)
      .describe(
        "Comments about possible bugs, security concerns, code quality, typos or regressions introduced in this PR."
      ),
  });

  const schema = z.preprocess((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }

    const record = value as Record<string, unknown>;
    if ("review" in record && "comments" in record) {
      return record;
    }

    // Some models/providers return the payload wrapped in an extra key
    // such as "$parameter" or "$PARAMETER_NAME".
    for (const nestedValue of Object.values(record)) {
      if (
        nestedValue &&
        typeof nestedValue === "object" &&
        !Array.isArray(nestedValue)
      ) {
        const nested = nestedValue as Record<string, unknown>;
        if ("review" in nested && "comments" in nested) {
          return nested;
        }
      }
    }

    return value;
  }, baseReviewSchema);

  return (await runPrompt({
    prompt: userPrompt,
    systemPrompt,
    schema,
  })) as PullRequestReview;
}

type ReviewCommentPrompt = {
  commentThread: ReviewCommentThread;
  commentFileDiff: FileDiff;
};

export type ReviewCommentResponse = {
  response_comment: string;
  action_requested: boolean;
};

export async function runReviewCommentPrompt({
  commentThread,
  commentFileDiff,
}: ReviewCommentPrompt): Promise<ReviewCommentResponse> {
  let systemPrompt = `You are a helpful senior software engineer that reviews comments on Git Pull Requests (PRs). Your task is to provide a response to a comment on a PR review. The comment might be part of a longer comment thread, so make sure to respond to the specific comment and not the whole thread.

The comment thread is specific to a line or multiple lines of code in a specific file. Keep that in mind when writing your response, but do not assume the code is complete or correct. Also, the comment might request you to suggest some changes or improvements outside the code snippet, so judge accordingly.

In your response, return the exact text of your comment, in markdown, starting by mentioning the @user who made the comment. Your response will be used as a comment on the PR, so make sure it's easy to understand and actionable.

Write your response in Brazilian Portuguese (pt-BR). Keep code identifiers, file paths, and snippets unchanged.
CRITICAL LANGUAGE RULE: If your drafted response is in English, rewrite it to pt-BR before returning.

Comments from @prreview are yours.

IMPORTANT: Do not respond with generic comments like "Thanks for the PR!" or "Let me know if you need any help". If the input comment is not actionable, return an empty string. Do not offer to help unless asked.
`;

  const startLine =
    commentThread.comments[0].start_line || commentThread.comments[0].line;
  const endLine = commentThread.comments[0].line;


  let userPrompt = `
Below you'll see the full comment thread, but you should focus specifically on the last comment.
<Comment Thread>
${commentThread.comments
      .map(
        (comment) =>
          `<author>@${comment.user.login}</author>\n<comment>${comment.body}</comment>`
      )
      .join("\n")}
</Comment Thread>

<Comment Scope>
  <Lines>${startLine} - ${endLine}</Lines>
  <Hunk>
    ${commentThread.comments[0].diff_hunk}
  </Hunk>
</Comment Scope>

<Comment File Diff>
${generateFileCodeDiff(commentFileDiff)}
</Comment File Diff>

Return your response in Brazilian Portuguese (pt-BR), mentioning the user at the beginning.
`;

  const schema = z.object({
    response_comment: z
      .string()
      .describe(
        "Your response in Brazilian Portuguese (pt-BR) to the comment in markdown format, starting by mentioning the user"
      ),
    action_requested: z
      .boolean()
      .describe(
        "True if the input comment required an action from you. False otherwise."
      ),
  });

  return (await runPrompt({
    prompt: userPrompt,
    systemPrompt,
    schema,
  })) as ReviewCommentResponse;
}
