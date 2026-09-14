<div align="center">
  <h1>
    AI Code Review Bot
  </h1>

  <p><em>Automated Code Review for GitHub Pull Requests using Large Language Models</em></p>

[![GitHub License](https://img.shields.io/github/license/SEU-USUARIO/SEU-REPOSITORIO?color=yellow)](LICENSE)

</div>

<br/>

## Sobre o projeto

Este projeto apresenta uma ferramenta para **revisão automatizada de código em Pull Requests do GitHub utilizando modelos de linguagem de grande escala (LLMs)**.

A ferramenta tem como objetivo auxiliar o processo de Code Review, identificando possíveis problemas no código, sugerindo melhorias e fornecendo comentários relacionados às alterações realizadas em uma Pull Request.

O projeto foi desenvolvido como parte de um **Trabalho de Conclusão de Curso (TCC) em Engenharia de Computação**.

<br/>

## Projeto de origem

A implementação deste projeto teve como ponto de partida o projeto **Presubmit - AI Code Reviewer**, desenvolvido por Presubmit.ai e Bogdan Stanga:

https://github.com/presubmit/ai-reviewer

O projeto original disponibiliza uma ferramenta de revisão de código baseada em inteligência artificial e é distribuído sob a **MIT License**.

A partir dessa implementação, foram realizadas modificações, adaptações e extensões com o objetivo de atender aos requisitos e objetivos definidos para este trabalho acadêmico.

As alterações realizadas neste projeto constituem a contribuição de desenvolvimento deste TCC.

<br/>

## Principais objetivos

* Automatizar parte do processo de revisão de código em Pull Requests;
* Utilizar modelos de linguagem para analisar alterações realizadas no código;
* Identificar possíveis bugs, problemas de qualidade e oportunidades de melhoria;
* Gerar comentários e sugestões relacionados ao código analisado;
* Integrar a solução ao fluxo de desenvolvimento utilizando GitHub Actions;
* Avaliar experimentalmente o desempenho da solução em diferentes cenários.

<br/>

## Funcionalidades

### 🤖 Revisão automatizada

A ferramenta analisa as alterações presentes em Pull Requests e utiliza um modelo de linguagem para identificar possíveis problemas e gerar sugestões de melhoria.

### 🔍 Análise contextual

A análise considera o contexto das alterações realizadas na Pull Request para produzir comentários mais relevantes.

### 💬 Comentários na Pull Request

Os resultados da análise podem ser apresentados diretamente na Pull Request do GitHub, permitindo que o desenvolvedor consulte as sugestões durante o processo de revisão.

### ⚙️ Configuração do modelo

A ferramenta permite configurar o modelo de linguagem utilizado na análise por meio de variáveis de ambiente.

### ⚡ Integração com GitHub Actions

A execução pode ser integrada ao fluxo de desenvolvimento por meio de GitHub Actions, permitindo que a análise seja realizada automaticamente durante o processo de desenvolvimento.

<br/>

## Tecnologias utilizadas

* **TypeScript / JavaScript**
* **Node.js**
* **GitHub Actions**
* **GitHub API**
* **Large Language Models (LLMs)**
* **AI SDK**
* **Anthropic / Claude**
* Outros provedores de modelos de linguagem compatíveis com a implementação

<br/>

## Configuração

### Pré-requisitos

* Node.js 18 ou superior;
* Git;
* Uma conta no GitHub;
* Chave de API de um provedor de modelo de linguagem;
* `pnpm` instalado.

### Instalação

Clone o repositório:

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
cd SEU-REPOSITORIO
```

Instale as dependências:

```bash
pnpm install
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
LLM_API_KEY=sua-chave-de-api
LLM_MODEL=claude-sonnet-4-5
```

Dependendo do provedor utilizado, outras variáveis podem ser necessárias.

<br/>

## Utilização

### Execução local

Compile o projeto:

```bash
pnpm build
```

Para executar uma análise de Pull Request em modo de teste:

```bash
pnpm review -- --pr 123 --dry-run
```

Para salvar o resultado da análise em um arquivo:

```bash
pnpm review -- --pr 123 --dry-run --out
```

Também é possível especificar o repositório:

```bash
pnpm review -- --pr 123 --owner meu-usuario --repo meu-repositorio --dry-run
```

O modo `--dry-run` permite realizar a análise sem publicar alterações na Pull Request.

<br/>

## Integração com GitHub Actions

A ferramenta pode ser integrada a um repositório GitHub por meio de um workflow.

Um exemplo de configuração é:

```yaml
name: AI Code Review

permissions:
  contents: read
  pull-requests: write
  issues: write

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: AI Code Review
        uses: SEU-USUARIO/SEU-REPOSITORIO@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_MODEL: "claude-sonnet-5"
```

> **Observação:** adapte o workflow de acordo com a estrutura e a forma de distribuição da implementação deste projeto.

<br/>

## Processo de revisão

De forma simplificada, o processo de análise segue o fluxo:

```text
Pull Request
     │
     ▼
GitHub API
     │
     ▼
Obtenção das alterações
     │
     ▼
Processamento do código
     │
     ▼
Modelo de Linguagem
     │
     ▼
Análise e geração das sugestões
     │
     ▼
Resultado da revisão
     │
     ▼
Comentários na Pull Request
```

<br/>

## Avaliação experimental

Como parte do TCC, a ferramenta pode ser utilizada em experimentos destinados a avaliar a qualidade das revisões automatizadas.

Entre as métricas consideradas estão:

* precisão das sugestões;
* quantidade de problemas identificados;
* relevância dos comentários;
* tipos de problemas encontrados;
* desempenho em diferentes projetos e linguagens;
* comportamento da ferramenta em diferentes modelos de linguagem.

Os resultados obtidos nos experimentos são apresentados e discutidos no trabalho acadêmico associado a este projeto.

<br/>

## Estrutura do projeto

A estrutura pode ser organizada da seguinte forma:

```text
.
├── .github/
│   └── workflows/
├── src/
│   ├── ...
│   └── ...
├── assets/
├── .env.example
├── LICENSE
├── package.json
├── README.md
└── ...
```

<br/>

## Origem e contribuições

Este projeto é baseado no **Presubmit - AI Code Reviewer**, disponível em:

https://github.com/presubmit/ai-reviewer

O projeto original foi desenvolvido por **Presubmit.ai** e **Bogdan Stanga** e disponibilizado sob a licença MIT.

O código original utilizado como base permanece sujeito aos termos da licença MIT. As modificações e extensões realizadas neste projeto foram desenvolvidas especificamente para os objetivos deste Trabalho de Conclusão de Curso.

A distinção entre componentes provenientes do projeto original e componentes desenvolvidos ou modificados no contexto deste trabalho é apresentada na documentação e no código-fonte do projeto.

<br/>

## Licença

Este projeto utiliza como base código originalmente distribuído sob a **MIT License**.

Os avisos de copyright e o texto da licença do projeto original são mantidos neste repositório conforme exigido pela licença.

### Copyright do projeto original

```text
MIT License

Copyright (c) 2024 Presubmit.ai
Copyright (c) 2024 Bogdan Stanga

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

O texto completo da licença também está disponível no arquivo [`LICENSE`](LICENSE) deste repositório.

<br/>

## Referência

PRESUBMIT.AI; STANGA, Bogdan. **AI Reviewer**. GitHub, 2024. Disponível em: https://github.com/presubmit/ai-reviewer. Acesso em: [data de acesso].

<br/>

## Trabalho de Conclusão de Curso

Este projeto está associado ao Trabalho de Conclusão de Curso desenvolvido no curso de **Engenharia de Computação**.

O trabalho investiga a utilização de modelos de linguagem na automatização do processo de Code Review em Pull Requests do GitHub, buscando avaliar a capacidade da ferramenta de identificar problemas e fornecer sugestões relevantes aos desenvolvedores.
