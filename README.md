<div align="center"> <h1> PR Review AI </h1>

<p><em>Revisões de PR inteligentes, instantâneas e com consciência de contexto</em></p>

 
 
 

</div>

<br/>

O PR Review AI é uma ferramenta para revisão automatizada de código em Pull Requests do GitHub utilizando modelos de linguagem de grande escala (LLMs).

Este projeto foi desenvolvido a partir da adaptação e extensão do projeto Presubmit - AI Code Reviewer, disponibilizado sob a licença MIT. A implementação original foi utilizada como base para o desenvolvimento da solução, sobre a qual foram realizadas modificações e implementadas funcionalidades específicas para os objetivos deste Trabalho de Conclusão de Curso (TCC).

A ferramenta tem como objetivo auxiliar o processo de Code Review, identificando possíveis problemas no código, sugerindo melhorias e fornecendo informações relevantes sobre as alterações realizadas em uma Pull Request.

🔍 Análise instantânea e aprofundada de PRs: Detecta bugs, falhas de segurança e oportunidades de otimização em tempo real
🎯 Foque no que importa: Deixe a IA cuidar do básico enquanto pessoas focam em arquitetura e lógica complexa
✨ Geração de título e descrição: Economize tempo deixando a IA gerar título e descrição relevantes para seu PR
💬 Interativo e inteligente: Responde perguntas e gera sugestões de código diretamente no seu PR
⚡ Configuração ultrarrápida: Funciona em 2 minutos com GitHub Actions

<br/>

🤝 Observação: O PR Review AI foi criado para complementar revisores humanos, não para substituí-los. Ele ajuda a identificar problemas de segurança e bugs logo no início, além de fornecer contexto sobre a mudança como um todo, tornando a revisão humana mais eficiente.

<br/>

Origem do projeto e atribuição

Este projeto foi desenvolvido a partir da adaptação e extensão do projeto Presubmit - AI Code Reviewer, desenvolvido por Presubmit.ai e Bogdan Stanga e disponibilizado sob a MIT License.

O projeto original serviu como base para a implementação da solução apresentada neste repositório. A partir dessa implementação, foram realizadas modificações, adaptações e novas funcionalidades com o objetivo de atender aos requisitos e objetivos definidos para este Trabalho de Conclusão de Curso.

As partes do código provenientes do projeto original permanecem sujeitas aos termos da licença MIT. As alterações, extensões e componentes desenvolvidos especificamente para este trabalho foram implementados no contexto deste TCC.

Projeto original

Presubmit - AI Code Reviewer
https://github.com/presubmit/ai-reviewer

Autores do projeto original:

Presubmit.ai
Bogdan Stanga

Licença: MIT License

O aviso de copyright e o texto da licença do projeto original são mantidos neste repositório conforme os termos da licença.

Contribuição deste trabalho

A implementação apresentada neste repositório contém modificações e extensões desenvolvidas especificamente para os objetivos deste TCC.

Entre as contribuições estão alterações na implementação original, adaptações na integração com modelos de linguagem e funcionalidades desenvolvidas para a avaliação da solução no contexto deste trabalho.

A descrição detalhada das modificações realizadas, bem como a distinção entre a implementação original e as contribuições desenvolvidas neste trabalho, é apresentada no TCC.

<br/>

Veja em ação

💡 Veja um exemplo completo de revisão de PR nas imagens abaixo.

A análise automatizada detecta problemas potenciais e fornece insights acionáveis:

<div align="left"> <a href="https://github.com/thallesasv/pullRequestCodeReview/pulls"> <img src="assets/review_example_3.png" alt="Exemplo de revisão de código com IA" width="650"/> </a> </div>

<br/>

Discussões interativas ajudam a esclarecer detalhes de implementação:

<div align="left"> <a href="https://github.com/thallesasv/pullRequestCodeReview/pulls"> <img src="assets/comment_example.png" alt="Exemplo de thread de comentários da IA" width="650"/> </a> </div>

<br/>

Uso
Passo 1: Adicione o segredo LLM_API_KEY
Vá em Settings do seu repositório > Secrets and Variables > Actions
Clique em "New repository secret"
Adicione um novo segredo com:
Nome: LLM_API_KEY
Valor: sua chave de API de um destes provedores:
Anthropic Console (Claude)
Passo 2: Crie o workflow do GitHub

Adicione esta GitHub Action ao seu repositório criando .github/workflows/pr-review-ai.yml:

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
      - name: Check required secrets
        run: |
          if [ -z "${{ secrets.LLM_API_KEY }}" ]; then
            echo "Error: LLM_API_KEY secret is not configured"
            exit 1
          fi

      - uses: thallesasv/pullRequestCodeReview@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_MODEL: "claude-sonnet-4-6"

A action requer:

GITHUB_TOKEN: Fornecido automaticamente pelo GitHub Actions
LLM_API_KEY: Sua chave de API, adicionada no passo 1
LLM_MODEL: Modelo LLM utilizado na análise. Garanta que o modelo seja compatível e corresponda ao LLM_API_KEY.
LLM_BASE_URL (opcional): URL base para provedores compatíveis com OpenAI ao utilizar LLM_PROVIDER=ai-sdk (ex.: https://openrouter.ai/api/v1 para OpenRouter).
Usando provedores compatíveis com OpenAI

Para utilizar o OpenRouter ou outros provedores compatíveis com OpenAI com o provedor ai-sdk, adicione a variável de ambiente LLM_BASE_URL:

      - uses: thallesasv/pullRequestCodeReview@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_MODEL: "openai/gpt-4o-mini"
          LLM_PROVIDER: "ai-sdk"
          LLM_BASE_URL: "https://openrouter.ai/api/v1"

Observação: Esta configuração funciona apenas com LLM_PROVIDER=ai-sdk. Ela suporta APIs compatíveis com OpenAI, incluindo OpenRouter, Anyscale, Together AI e outras.

Suporte ao GitHub Enterprise Server

Se você utiliza o GitHub Enterprise Server, pode configurar a action para funcionar com sua instância adicionando estas variáveis de ambiente:

      - uses: thallesasv/pullRequestCodeReview@main
        env:
          GITHUB_API_URL: "https://github.example.com/api/v3"
          GITHUB_SERVER_URL: "https://github.example.com"

Você também pode configurar essas opções utilizando parâmetros de entrada:

      - uses: thallesasv/pullRequestCodeReview@main
        with:
          github_api_url: "https://github.example.com/api/v3"
          github_server_url: "https://github.example.com"

Certifique-se de substituir https://github.example.com pela URL real do seu GitHub Enterprise Server.

<br/>

Recursos
🤖 Revisões inteligentes
Análise aprofundada: Revisão linha a linha com sugestões conscientes de contexto
Resumo automático de PR: Resumos concisos e relevantes das mudanças
Qualidade de código: Detecta bugs, antipadrões e problemas de estilo
Interativo: Responde perguntas e esclarecimentos nos comentários
Sinal alto, baixo ruído: Prioriza comentários de maior impacto com volume adaptativo de observações por revisão
🛡️ Segurança e qualidade
Detecção de vulnerabilidades: Detecta problemas de segurança e segredos vazados
Boas práticas: Aplica padrões de código e diretrizes de segurança
Performance: Identifica possíveis gargalos e oportunidades de otimização
Documentação: Verifica aspectos relacionados à documentação e clareza do código
⚙️ Configurável
Mencione @prreview no título do PR para geração automática
Desative revisões com o comentário @prreview ignore
Profundidade da revisão e áreas de foco configuráveis
Regras e preferências personalizáveis
⚡ Integração sem atrito
Configuração com GitHub Actions
Suporte aos principais provedores de LLM, incluindo Claude, GPT e Gemini
Feedback automatizado em Pull Requests
Execução integrada ao fluxo de desenvolvimento

<br/>

Testes locais com CLI (Dry-Run)

Execute o revisor localmente em PRs reais utilizando sua autenticação do GitHub.

Pré-requisitos
Node.js 18+
GitHub CLI autenticado: gh auth login
Arquivo .env na raiz do repositório com:
LLM_API_KEY=... (sua chave de API)
LLM_MODEL=... (ex.: claude-sonnet-5)
Opcional: LLM_PROVIDER=ai-sdk (padrão)
Opcional: LLM_BASE_URL=... (para provedores compatíveis com OpenAI, como OpenRouter)
Build
pnpm install
pnpm build
Comandos

Listar PRs:

pnpm review -- --list-prs --state open --limit 5

Revisar um PR (dry-run):

pnpm review -- --pr 123 --dry-run

Salvar saída em arquivo:

# Gera automaticamente o nome do arquivo: dry/pr-123.txt
pnpm review -- --pr 123 --dry-run --out

# Caminho de saída personalizado
pnpm review -- --pr 123 --dry-run --out my-review.txt

Especificar repositório:

pnpm review -- --pr 123 --owner myorg --repo myrepo --dry-run

Ou defina no .env:

GITHUB_REPOSITORY=myorg/myrepo
Observações
Usa automaticamente seu gh auth token
O modo --dry-run ignora todas as escritas na API do GitHub e registra o que seria publicado
Sem --dry-run, a revisão será publicada no GitHub
O padrão é o repositório definido pela variável GITHUB_REPOSITORY ou thallesasv/pullRequestCodeReview

<br/>

Avaliação experimental

Este projeto também é utilizado para os experimentos descritos no Trabalho de Conclusão de Curso.

A avaliação busca analisar a utilização de modelos de linguagem na automatização do processo de Code Review, considerando aspectos como:

precisão das sugestões;
relevância dos comentários;
capacidade de identificação de problemas;
tipos de problemas identificados;
comportamento da ferramenta em diferentes Pull Requests;
desempenho utilizando diferentes modelos de linguagem.

Os critérios, procedimentos experimentais, métricas e resultados são apresentados e discutidos no TCC associado a este projeto.

<br/>

Licença

Este projeto contém código derivado do projeto Presubmit - AI Code Reviewer, disponibilizado originalmente sob a MIT License.

O código original utilizado como base permanece sujeito aos termos da licença MIT, incluindo a exigência de preservação dos avisos de copyright e da licença.

Os avisos de copyright dos autores do projeto original são:

Copyright (c) 2024 Presubmit.ai
Copyright (c) 2024 Bogdan Stanga

O texto completo da licença MIT pode ser consultado no arquivo LICENSE deste repositório.

As modificações e extensões realizadas neste repositório foram desenvolvidas no contexto de um Trabalho de Conclusão de Curso em Engenharia de Computação.

<br/>

Referência do projeto original

PRESUBMIT.AI; STANGA, Bogdan. AI Reviewer. GitHub, 2024. Disponível em: https://github.com/presubmit/ai-reviewer. Acesso em: [data de acesso].

<br/>

Trabalho de Conclusão de Curso

Este projeto está associado a um Trabalho de Conclusão de Curso desenvolvido no curso de Engenharia de Computação.

O trabalho investiga a utilização de modelos de linguagem na automatização do processo de Code Review em Pull Requests do GitHub, buscando avaliar a capacidade da ferramenta de identificar problemas e fornecer sugestões relevantes aos desenvolvedores.

<br/>

Mostre seu apoio! ⭐

Se você considera o PR Review AI útil para melhorar o processo de revisão:

Dê uma estrela neste repositório para mostrar seu apoio e ajudar outras pessoas a descobri-lo
Compartilhe sua experiência criando uma GitHub Issue
Considere contribuir para deixá-lo ainda melhor
