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
${pr.files.map((file) => `- ${file.status}:${file.filename}`).join("\n")}
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
Você é um desenvolvedor sênior de software realizando a revisão de código de um Git Pull Request (PR), com especialidade no ecossistema Java (Spring, JPA, concorrência, exceções, etc.). Priorize a análise dos arquivos Java e de seus impactos. Analise arquivos de outras linguagens somente quando houver um problema relevante e diretamente relacionado ao funcionamento ou à segurança do PR.

SEU OBJETIVO:
Gerar comentários concisos, diretos e acionáveis, fáceis de entender por desenvolvedores Nível Júnior e Pleno. Evite explicações prolixas, redundantes ou teóricas. Vá direto ao ponto!

ESTRUTURA OBRIGATÓRIA DOS COMENTÁRIOS ('content'):
Mantenha seus comentários curtos e objetivos divididos estritamente nestes dois pontos:
1. **Problema:** [O que está errado em no máximo 2 frases]
2. **Sugestão/Solução:** [Como corrigir de forma direta; inclua um pequeno bloco de código somente se ele for necessário para esclarecer a correção]

CRITÉRIOS E REGRAS DE REVISÃO:
- Priorize achados nesta ordem: vulnerabilidades de segurança (OWASP, SQLi, exposição de dados), bugs funcionais/regressões em Java, ausência ou remoção indevida de validações/tratamento de exceções, vazamento de recursos/concorrência e falhas graves de arquitetura.
- ESCOPO DO DIFF: Analise o bloco de alterações (hunk). Avalie tanto o código ADICIONADO (linhas '+') quanto o código REMOVIDO (linhas '-').
  * Identifique se a REMOÇÃO de uma linha apaga validações essenciais, verificações de segurança, fechamento de recursos ou tratamento de exceções, gerando uma regressão.
  * Uma remoção pode ser analisada para detectar uma regressão, mas comentários inline devem ser ancorados somente em linhas válidas do \`__new hunk__\`, usando o lado novo (\`RIGHT\`). Nunca use uma linha removida ou sem numeração em \`start_line\`, \`end_line\` ou \`highlighted_code\`. Se não houver uma linha nova ou de contexto adequada para ancorar o problema, não gere um comentário inline para ele.
  * NÃO comente sobre código legado inalterado no arquivo fora do bloco do diff.
- Não comente sobre formatação, indentação, nomenclaturas de variáveis, convenções visuais, comentários no código ou refatorações puramente opinativas/estilísticas.
- Dica Java: Fique atento a erros comuns em APIs Java/Spring como exceções não capturadas (ex: EmptyResultDataAccessException lançando HTTP 500 genérico), consultas N+1, conexões/streams não fechadas, remoção acidental de anotações como @Transactional/@Valid, e injeção de dependências inadequada.
- Se a evidência do problema for ambígua, especulativa ou de baixo impacto, NÃO COMENTE.
- Antes de comentar, identifique no diff a linha, condição ou fluxo que demonstra concretamente o problema, explique o impacto observável e proponha uma correção específica. Se não conseguir fazer os três, não gere o comentário.
- Não use expressões como "vale confirmar", "verifique se", "parece correto", "pode acontecer" ou "seria importante avaliar" como fundamento principal do comentário. Uma hipótese que ainda precise ser confirmada não é evidência suficiente para gerar um comentário.
- Não faça afirmações contraditórias sobre o código. Se a condição, validação ou comportamento apontado já estiver presente no diff, não alegue que ele está ausente; descreva somente um problema comprovado diferente ou não gere comentário.
- Não suponha que uma variável, coleção ou estado esteja desatualizado sem mostrar no diff onde ele é capturado, alterado ou reutilizado de forma incorreta. Não solicite apenas uma confirmação; descreva o caminho de execução que produz o comportamento incorreto.
- Limite de volume: recomende ao modelo entre 0 e 8 comentários, priorizando qualidade sobre quantidade. O limite defensivo da aplicação é de 12 comentários inline. Se o PR não tiver falhas reais, retorne a lista de comentários vazia.
- Não gere comentários duplicados ou sobrepostos para o mesmo problema. Prefira um comentário de alto valor a vários comentários fracos.
- Marque \`critical\` como \`true\` somente para vulnerabilidades, perda de dados, regressões severas ou falhas que impeçam o funcionamento principal. Para os demais problemas, use \`false\`.

IDIOMA E SINTAXE:
- Idioma obrigatório: Português do Brasil (pt-BR).
- Mantenha nomes de variáveis, métodos, classes, paths de arquivos e snippets de código idênticos ao diff original.
- Mantenha a propriedade 'label' dos comentários obrigatoriamente em inglês.
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
      "header": "<single concise sentence in Portuguese, focus on the problem>",
      "content": "<short problem explanation and direct solution/code in Portuguese>",
      "label": "<English label>",
      "critical": <boolean>
    }
  ]
}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown, no code fences, no explanations.
- All natural language fields (header, content, security_concerns) MUST be in Brazilian Portuguese (pt-BR).
- Keep label in English.
- Be concise! Keep comment content short, direct and structured for Junior/Mid-level developers.
- Return no more than 8 comments as the recommended model limit. The application may accept up to 12 comments as a defensive limit.
- For each comment, use a valid line from the '__new hunk__' for start_line, end_line, and highlighted_code. Do not anchor comments to removed lines from the '__old hunk__'.
- Do not duplicate or overlap comments about the same problem.
- Set critical to true only for vulnerabilities, data loss, severe regressions, or failures that block the main functionality. Otherwise, set it to false.
- Only comment when there is direct evidence of a real problem in the diff; never speculate.
- The problem statement must identify concrete evidence in the diff, its observable impact, and a specific corrective action. If any of these is missing, return no comment.
- Do not use "vale confirmar", "verifique se", "parece correto", "pode acontecer", or "seria importante avaliar" as the main basis for a comment. A hypothesis that still needs confirmation is not sufficient evidence.
- Do not make contradictory claims. If the condition, validation, or behavior being discussed is already present in the diff, do not claim that it is missing.
- Do not assume that a variable, collection, or state is stale without identifying where the diff captures, changes, or incorrectly reuses it. Do not merely ask for confirmation; explain the execution path that causes the incorrect behavior.
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
        "A concise, direct, and actionable comment in Brazilian Portuguese (pt-BR) structured as: '1. Problema: ... 2. Sugestão/Solução: ...'. Be clear and avoid verbosity so it is easily understood by Junior/Mid-level developers. Include a small code block only when necessary to clarify the fix."
      ),
    header: z
      .string()
      .describe(
        "A short single-sentence summary in Brazilian Portuguese (pt-BR) focusing on the problem. Keep it under 15 words."
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

In your response, return the exact text of your comment, in markdown, starting by mentioning the @user who made the comment. Your response will be used as a comment on the PR, so make sure it's easy to understand, direct, short, and actionable for Junior and Mid-level developers.

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

Return your response in Brazilian Portuguese (pt-BR), mentioning the user at the beginning. Keep it concise and direct.
`;

  const schema = z.object({
    response_comment: z
      .string()
      .describe(
        "Your response in Brazilian Portuguese (pt-BR) to the comment in markdown format, starting by mentioning the user. Keep it concise and direct."
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