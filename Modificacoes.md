# Comparacao entre `ai-reviewer` e `pullRequestCodeReview`

## 1. Escopo da comparacao

Este documento compara o estado atual dos repositorios:

- Repositorio de origem: `C:\Codigos\TCC\ai-reviewer`
- Repositorio derivado: `C:\Codigos\TCC\pullRequestCodeReview`

A comparacao foi feita sobre os arquivos presentes nas duas pastas em 20/09/2026. Diretorios gerados ou locais, como `.git`, `node_modules`, `.venv` e `dist`, foram desconsiderados na comparacao semantica do codigo-fonte. A existencia do diretorio `dist` foi mantida nos dois repositorios, mas seus bundles nao foram analisados linha a linha.

Os dois projetos mantem a mesma arquitetura geral de GitHub Action e CLI em TypeScript. As diferencas abaixo representam o estado atual de cada repositorio; a comparacao nao pretende reconstruir a ordem cronologica de cada commit.

## 2. Resumo executivo

O `pullRequestCodeReview` deixou de ser uma implementacao generica com varios provedores e passou a ser uma ferramenta direcionada ao Anthropic/Claude, com interface e prompts em portugues brasileiro. Tambem recebeu controles para reduzir ruido na revisao, tratamento mais tolerante de falhas de inferencia, compatibilidade com a identidade antiga das mensagens e testes adicionais.

Ao mesmo tempo, foram removidos o provedor SAP AI Core, os adaptadores diretos para Google e OpenAI, o suporte a endpoints compativeis com OpenAI por `LLM_BASE_URL` e varios modelos que existiam no `ai-reviewer`. O workflow e a identidade do projeto foram adaptados para `PR Review AI` e para o repositorio `thallesasv/pullRequestCodeReview`.

## 3. Arquivos que existem somente no `pullRequestCodeReview`

| Arquivo | Conteudo ou finalidade |
| --- | --- |
| `DOCUMENTACAO.md` | Documentacao tecnica em portugues sobre arquitetura, fluxos, configuracao, parsing, CLI e build. |
| `Modificacoes.md` | Este documento comparativo. |
| `pnpm-lock.yaml` | Lockfile adicional para instalacao usando pnpm. |
| `TCC I - Thalles Vercosa V3.pdf` | Artefato academico presente no repositorio derivado. |
| `_tcc_extracted.txt` | Texto extraido associado ao material academico. |
| `.github/workflows/pr-review-ai.yml` | Workflow renomeado e adaptado para o projeto PR Review AI. |
| `src/__tests__/prompts.test.ts` | Testes dos builders de prompt, idioma, foco em achados de alto valor e contrato JSON. |

## 4. Arquivos que existem somente no `ai-reviewer`

| Arquivo | Conteudo ou finalidade |
| --- | --- |
| `.github/workflows/presubmit-review.yml` | Workflow original, com identidade Presubmit.ai e uso de `presubmit/ai-reviewer@latest`. |
| `src/providers/sapaicore.ts` | Implementacao do provedor SAP AI Core, removida do repositorio derivado. |

## 5. Ajustes funcionais no codigo

### 5.1. Provedores, modelos e configuracao de IA

Arquivos principais: `src/ai.ts`, `src/config.ts`, `src/providers/ai-sdk.ts`, `package.json` e `.env.example`.

- O enum de provedores foi reduzido de `ai-sdk` e `sap-ai-sdk` para somente `ai-sdk`.
- O `pullRequestCodeReview` manteve somente `createAnthropic` e removeu `createGoogleGenerativeAI` e `createOpenAI`.
- Os modelos aceitos no estado atual sao:
  - `claude-sonnet-4-5`;
  - `claude-sonnet-4-6`;
  - `claude-sonnet-5`.
- Foram removidos os modelos antigos da lista, incluindo modelos Claude anteriores, modelos GPT e modelos Gemini.
- Foi removida a configuracao de `LLM_BASE_URL`, tanto por variavel de ambiente quanto por input da Action.
- Foram removidas da classe `Config` as variaveis do SAP AI Core: `SAP_AI_CORE_CLIENT_ID`, `SAP_AI_CORE_CLIENT_SECRET`, `SAP_AI_CORE_TOKEN_URL`, `SAP_AI_CORE_BASE_URL` e `SAP_AI_RESOURCE_GROUP`.
- `LLM_API_KEY` voltou a ser obrigatoria para todos os casos, pois nao existe mais a excecao para SAP AI Core.
- O adaptador Anthropic deixou de configurar `baseURL` customizada.
- A temperatura deixou de ser forcada para `0` quando ausente. Ela so e enviada ao AI SDK quando definida e suportada pelo modelo.
- O adaptador passou a registrar no console o modelo e a temperatura recebidos durante a inferencia.
- O campo de schema de inferencia foi generalizado de `z.ZodObject<any, any>` para `z.ZodTypeAny`.

### 5.2. Tratamento de falhas e saida estruturada

Arquivo principal: `src/ai.ts`.

O repositorio derivado adicionou um fluxo de recuperacao para falhas de validacao do retorno da IA:

1. Identifica erros de validacao estruturada, como `TypeValidationError`, `AI_TypeValidationError` e `NoObjectGeneratedError`.
2. Registra um aviso e tenta a inferencia uma segunda vez com instrucoes mais rigorosas para retornar somente JSON.
3. Se a segunda tentativa falhar, extrai uma possivel carga de resposta para diagnostico.
4. Sanitiza o diagnostico antes de registra-lo, ocultando chaves semelhantes a `api_key`, `token`, `secret`, `password`, `authorization` e `cookie`, alem de limitar profundidade, quantidade de itens e tamanho de strings.

Essa logica nao existia no `ai-reviewer`.

### 5.3. Prompts e schemas de revisao

Arquivo principal: `src/prompts.ts`.

- Os prompts de resumo e revisao passaram a exigir portugues brasileiro para os campos de linguagem natural.
- Identificadores, caminhos de arquivos, trechos de codigo e labels continuam preservados conforme as regras do prompt.
- O campo `label` dos comentarios continua em ingles para manter uma categoria estavel de priorizacao.
- O prompt de revisao foi reestruturado e passou a enfatizar apenas problemas concretos, acionaveis e sustentados diretamente pelo diff.
- Foram explicitamente desestimulados comentarios sobre formatacao, nomes, estilo, comentarios e refatoracoes especulativas.
- O volume esperado passou a ser de zero a doze comentarios, com preferencia por poucos achados de alto valor.
- Foram adicionadas as funcoes exportadas `buildReviewSystemPrompt()` e `buildReviewUserPrompt()` para separar a montagem dos prompts.
- O prompt do usuario agora inclui um contrato JSON explicito, sem markdown, cercas de codigo ou explicacoes adicionais.
- Os campos de seguranca e os textos de resumo tambem receberam instrucoes de localizacao para pt-BR.

### 5.4. Selecao, deduplicacao e tolerancia a comentarios

Arquivo principal: `src/pull_request.ts`.

O comportamento original filtrava comentarios inline e publicava apenas comentarios criticos ou com label `typo`. O comportamento atual:

- considera candidatos somente quando existe `end_line`;
- remove duplicidades pela combinacao de arquivo, intervalo de linhas e cabecalho;
- atribui prioridade por criticidade e label;
- prioriza seguranca, bugs, possiveis bugs, possiveis problemas, desempenho e manutenibilidade;
- publica todos os comentarios criticos;
- limita comentarios nao criticos a, no maximo, oito;
- usa doze como limite geral de comentarios inline, descontando os comentarios criticos;
- lista os comentarios nao selecionados como ignorados no resumo.

Tambem foram adicionados:

- reconhecimento de `@prreview` e `@prreviewai` no titulo para regeneracao do titulo;
- frases de ignorar ou pular a revisao para `@prreview` e `@prreviewai`, incluindo as formas com dois-pontos;
- fallback que continua o workflow sem comentarios inline quando a geracao da revisao falha.

### 5.5. Respostas a comentarios de review

Arquivo principal: `src/pull_request_comment.ts`.

Se a geracao da resposta para uma thread falhar, o repositorio derivado registra avisos e encerra esse fluxo sem publicar resposta, evitando que a falha da IA derrube a Action inteira. No repositorio de origem, a excecao era propagada.

### 5.6. Identidade, compatibilidade e mensagens publicadas

Arquivos principais: `src/messages.ts` e `src/comments.ts`.

- A identidade visivel foi alterada de Presubmit.ai para PR Review AI.
- As assinaturas novas usam `prreview.ai`:
  - `<!-- prreview.ai: overview message -->`;
  - `<!-- prreview.ai: comment -->`;
  - `<!-- prreview.ai: payload -- ... -- prreview.ai: payload -->`.
- Os comentarios passaram a incluir a assinatura `_autogenerated by PR Review AI_`.
- O codigo continua reconhecendo assinaturas antigas `presubmit.ai`, `@presubmit` e `@presubmitai`, permitindo localizar threads e mensagens criadas pela implementacao anterior.
- Tambem foram adicionadas as mencoes `@prreview` e `@prreviewai` como marcadores de relevancia.
- Mensagens de carregamento, resumo e revisao foram traduzidas para portugues brasileiro.
- Labels de comentarios sao traduzidas para exibicao, por exemplo `possible bug` para `possivel bug`, `security` para `seguranca` e `maintainability` para `manutenibilidade`.
- O login interno usado para identificar comentarios proprios foi alterado de `presubmit` para `prreview`.

### 5.7. CLI

Arquivo principal: `src/cli.ts`.

O fluxo e os comandos do CLI permaneceram essencialmente iguais. Foram alterados apenas:

- o repositorio padrao de `presubmit/ai-reviewer` para `thallesasv/pullRequestCodeReview`;
- os exemplos de uso exibidos na ajuda.

As opcoes de listar PRs, selecionar PR, executar `--dry-run` e salvar com `--out` continuam presentes.

## 6. Testes e cobertura

- Foi adicionado `src/__tests__/prompts.test.ts`, cobrindo instrucoes de alto valor, portugues brasileiro, regras de estilo e contrato JSON.
- `src/__tests__/pull_request.test.ts` recebeu um caso que verifica a publicacao de comentario nao critico relevante.
- Os mocks do Octokit foram reorganizados nesse teste para incluir `pulls.createReviewComment` e `pulls.createReview` no local esperado.
- `src/__tests__/messages.test.ts` foi atualizado para esperar textos e labels em portugues.
- `src/__tests__/config.test.ts` deixou de testar `LLM_BASE_URL`, pois esse recurso foi removido.
- Os demais testes permanecem funcionalmente proximos aos testes de origem, com ajustes decorrentes da nova identidade e das mensagens localizadas.

## 7. Dependencias e build

### Dependencias removidas ou substituidas

No `package.json` atual:

- o nome do pacote mudou de `ai-reviewer` para `pr-review-ai`;
- `@ai-sdk/google` foi removido;
- `@ai-sdk/openai` foi removido;
- `@langchain/core` foi removido;
- `axios` foi removido;
- `@ai-sdk/anthropic` foi atualizado de `^0.0.56` para `^2.0.95`;
- `ai` foi atualizado de `^3.4.33` para `^5.0.244`.

Os scripts de desenvolvimento, build, teste, inicio e CLI permanecem com a mesma finalidade. O `package-lock.json` foi regenerado de acordo com essas alteracoes e o `pnpm-lock.yaml` foi adicionado.

### Action e workflow

- `action.yml` mudou o nome, a descricao e o autor para `PR Review AI`.
- O runtime da Action mudou de Node.js 20 para Node.js 24.
- O workflow derivado mudou de `Presubmit.ai` para `PR Review AI`.
- O uso mudou de `presubmit/ai-reviewer@latest` para `thallesasv/pullRequestCodeReview@main`.
- O modelo configurado no workflow mudou de `gpt-4o-mini` para `claude-sonnet-5`.
- O workflow derivado usa o evento `pull_request`; o workflow original tambem declarava `pull_request_review_comment` para respostas em threads.
- O arquivo de exemplo de ambiente foi reduzido ao fluxo Anthropic e passou a usar o repositorio `thallesasv/pullRequestCodeReview`.

## 8. Arquivos compartilhados com alteracoes menores

- `CONTRIBUTING.md`: houve ajuste de conteudo, sem mudanca identificada no nucleo do fluxo de revisao.
- `LICENSE`: recebeu uma declaracao de que o projeto deriva do `presubmit/ai-reviewer`, referencia a MIT License e contexto do TCC.
- `README.md`: foi totalmente adaptado para portugues e para o contexto academico, com secoes sobre objetivos, funcionalidades, configuracao, CLI, workflow e avaliacao experimental. Foram removidas as secoes especificas de provedores OpenAI-compativeis, SAP AI Core e exemplos da marca Presubmit.ai.
- `jest.config.ts`, `jest.setup.ts`, `tsconfig.json`, `src/main.ts`, `src/context.ts`, `src/diff.ts`, `src/octokit.ts` e `src/__mocks__` nao apresentaram diferencas relevantes entre os arquivos comparados.

## 9. O que deixou de existir no `pullRequestCodeReview`

Em relacao ao `ai-reviewer`, nao estao mais disponiveis:

1. O provedor SAP AI Core e seu arquivo `src/providers/sapaicore.ts`.
2. O suporte direto aos provedores Google Generative AI e OpenAI.
3. O suporte a `LLM_BASE_URL` e a APIs compativeis com OpenAI, como OpenRouter e Anyscale.
4. A lista ampla de modelos GPT, Gemini, Claude antigos e modelos SAP AI Core.
5. A dependencia `@langchain/core` e o uso de `axios` associado a integracoes antigas.
6. O workflow original `presubmit-review.yml` como arquivo; o workflow correspondente foi substituido por `pr-review-ai.yml`.
7. Os testes especificos de carregamento de `LLM_BASE_URL`.
8. O fluxo de workflow documentado explicitamente para `pull_request_review_comment`; embora o handler continue no codigo, o workflow atual comparado nao declara esse gatilho.
9. A identidade e os textos originais da marca Presubmit.ai nas mensagens novas. A compatibilidade para localizar mensagens antigas, entretanto, foi preservada no codigo.

## 10. O que passou a existir no `pullRequestCodeReview`

Em relacao ao `ai-reviewer`, o repositorio atual passou a conter:

1. Restricao operacional aos modelos Anthropic Claude Sonnet 4.5, 4.6 e 5.
2. Prompts e mensagens em portugues brasileiro.
3. Prompts separados em builders reutilizaveis, com contrato JSON estrito.
4. Retry para falhas de schema e diagnostico sanitizado de payloads invalidos.
5. Deduplicacao, priorizacao e limite de comentarios inline.
6. Tratamento tolerante de falhas no review principal e em respostas de threads.
7. Reconhecimento de aliases `@prreview` e `@prreviewai`.
8. Compatibilidade de leitura com assinaturas antigas `presubmit.ai`.
9. Novo workflow, nova identidade da Action e runtime Node.js 24.
10. Teste dedicado para builders de prompt e teste de comentario nao critico relevante.
11. Documentacao tecnica, material academico e lockfile do pnpm.

## 11. Observacao sobre artefatos gerados

Os dois repositorios contem `dist/`, mas os arquivos empacotados sao artefatos de build e podem variar mesmo quando o codigo-fonte e equivalente. Para uma atualizacao de release, o `dist/index.js` e o `dist/cli.js` do `pullRequestCodeReview` devem ser regenerados com o script `build` depois das alteracoes em `src/`.
