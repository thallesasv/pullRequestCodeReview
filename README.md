# PR Review AI

GitHub Action e CLI local em TypeScript para análise automatizada de Pull Requests com modelos de linguagem. A ferramenta gera um resumo da alteração, avalia o Pull Request e publica comentários inline quando encontra problemas concretos no diff.

O projeto foi desenvolvido como parte de um Trabalho de Conclusão de Curso em Engenharia de Computação e teve como ponto de partida o [Presubmit AI Code Reviewer](https://github.com/presubmit/ai-reviewer).

## Funcionalidades

- Analisa commits, arquivos e hunks modificados do Pull Request.
- Gera resumo executivo em português brasileiro, incluindo o impacto por arquivo.
- Prioriza arquivos Java e seus impactos, especialmente em aplicações Spring/JPA.
- Analisa outras linguagens somente quando há um problema relevante diretamente relacionado ao funcionamento ou à segurança do Pull Request.
- Publica comentários inline acionáveis quando há evidência direta de um problema real.
- Responde a comentários de revisão relevantes feitos em threads.
- Evita duplicação por meio de assinaturas nas mensagens geradas.
- Permite execução local em modo `--dry-run`, sem publicar alterações.

Os comentários de revisão seguem estas regras:

- são escritos em português brasileiro;
- devem ser curtos, diretos e acionáveis;
- separam o problema da sugestão/solução;
- não devem tratar de formatação, nomenclatura ou refatorações puramente opinativas;
- podem analisar remoções para detectar regressões, mas comentários inline só podem ser ancorados em linhas válidas do lado novo (`RIGHT`);
- o modelo recomenda de zero a oito comentários;
- a aplicação mantém um limite defensivo de até doze comentários inline.

## Tecnologias

- TypeScript e Node.js;
- GitHub Actions e GitHub API;
- AI SDK;
- Anthropic Claude Sonnet.

## Configuração

### Pré-requisitos

- Node.js 24 ou superior para execução como GitHub Action;
- Node.js 18 ou superior para desenvolvimento local, desde que compatível com as dependências instaladas;
- uma conta no GitHub e um token com permissões necessárias;
- uma chave de API da Anthropic;
- `npm` ou `pnpm`.

### Variáveis de ambiente

```env
GITHUB_TOKEN=seu-token
LLM_API_KEY=sua-chave-anthropic
LLM_MODEL=claude-sonnet-5
LLM_PROVIDER=ai-sdk
```

Os modelos reconhecidos são `claude-sonnet-4-5`, `claude-sonnet-4-6` e `claude-sonnet-5`. `LLM_PROVIDER` pode ser omitido, pois o valor padrão é `ai-sdk`.

Para GitHub Enterprise Server, também podem ser definidos:

```env
GITHUB_API_URL=https://github.example.com/api/v3
GITHUB_SERVER_URL=https://github.example.com
```

Regras adicionais de estilo podem ser fornecidas pelo input `style_guide_rules` da Action. No CLI/debug, elas podem ser lidas de `STYLE_GUIDE_RULES`.

## Instalação e desenvolvimento

```bash
git clone https://github.com/thallesasv/pullRequestCodeReview.git
cd pullRequestCodeReview
npm install
```

Os principais scripts são:

```bash
npm test       # executa os testes Jest
npm run build  # gera dist/index.js e dist/cli.js
npm run review # executa o CLI compilado
```

O arquivo `dist/index.js` deve ser atualizado e commitado após mudanças no código-fonte, pois é o bundle usado pela GitHub Action. O `dist/cli.js` é usado pelo script local `review`.

## CLI local

O CLI tenta obter o token nesta ordem:

1. variável `GITHUB_TOKEN`;
2. arquivo `.env`;
3. autenticação local do GitHub CLI (`gh auth login`).

Para executar uma revisão sem publicar comentários:

```bash
npm run review -- --pr 123 --owner thallesasv --repo pullRequestCodeReview --dry-run
```

Para listar Pull Requests:

```bash
npm run review -- --list-prs --owner thallesasv --repo pullRequestCodeReview
```

Opções disponíveis:

```text
--list-prs [--owner <owner>] [--repo <repo>] [--state open|closed|all] [--limit N]
--pr <number> [--owner <owner>] [--repo <repo>] [--dry-run] [--out [path]]
```

`--out` salva a saída do modo dry-run. Se nenhum caminho for informado, o arquivo será salvo em `dry/pr-<número>.txt`.

## GitHub Actions

O workflow precisa conceder acesso de leitura ao conteúdo e acesso de escrita a Pull Requests e issues:

```yaml
name: PR Review AI

permissions:
  contents: read
  pull-requests: write
  issues: write

on:
  pull_request_target:
    types: [opened, synchronize]
  pull_request_review_comment:
    types: [created]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: thallesasv/pullRequestCodeReview@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_PROVIDER: ai-sdk
          LLM_MODEL: claude-sonnet-5
```

O segredo `LLM_API_KEY` é obrigatório. O input opcional `style_guide_rules` pode ser configurado no uso da Action:

```yaml
      - uses: thallesasv/pullRequestCodeReview@main
        with:
          style_guide_rules: |
            Não permita consultas sem paginação.
            Trate erros de validação com resposta HTTP adequada.
```

Os inputs `github_api_url` e `github_server_url` permitem configurar GitHub Enterprise Server.

## Fluxo de execução

```text
Evento do GitHub ou CLI
        |
        v
Carregamento do contexto e autenticação
        |
        v
Coleta de commits, arquivos, diffs e threads
        |
        v
Parsing dos hunks e montagem dos prompts
        |
        v
Inferência Anthropic via AI SDK
        |
        v
Validação estruturada com Zod
        |
        +--> Resumo executivo
        |
        +--> Comentários inline selecionados e publicação
```

Falhas de validação da resposta estruturada podem provocar uma nova tentativa com instruções de JSON estrito. Se a revisão falhar, o fluxo principal continua sem comentários inline. O mesmo princípio é aplicado às respostas de threads: uma falha não publica resposta e não derruba a execução inteira.

## Estrutura principal

```text
src/
  main.ts                 # entrada da GitHub Action
  cli.ts                  # CLI local e dry-run
  config.ts               # configuração e inputs
  context.ts              # contexto da Action e do CLI
  pull_request.ts         # fluxo principal de revisão
  pull_request_comment.ts # respostas a threads
  prompts.ts              # prompts e schemas Zod
  ai.ts                   # seleção de modelo e validação
  diff.ts                 # parsing e formatação de diffs
  messages.ts             # mensagens publicadas
  comments.ts             # assinaturas e threads
  providers/ai-sdk.ts     # integração com Anthropic
```

Para detalhes de implementação, consulte [`DOCUMENTACAO.md`](DOCUMENTACAO.md).
