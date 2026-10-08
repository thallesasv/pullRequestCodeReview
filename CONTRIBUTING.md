# Contributing

Thank you for your interest in contributing to PR Review AI!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies with `npm install` or `pnpm install`
4. Create a new branch for your feature/fix: `git checkout -b feature-name`

## Development Setup

### Prerequisites

- Node.js (LTS version recommended) + Typescript
- [Github personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- Anthropic API key
- Node.js 24 or later for the GitHub Action
- (optional) pnpm package manager

## Development Workflow

1. Make your changes in a feature branch
2. Commit your changes using conventional commits:
   - `feat: add new feature`
   - `fix: resolve bug`
   - `docs: update documentation`
   - `test: add tests`
   - `refactor: improve code structure`
3. Open Pull Request against main repo

## Testing

1. Configure the environment variables used by the local CLI in `.env` or in the shell:

   ```env
   GITHUB_TOKEN=...
   LLM_API_KEY=...
   LLM_MODEL=claude-sonnet-5
   LLM_PROVIDER=ai-sdk
   ```

2. Run the local CLI against a Pull Request:

   ```bash
   npm run review -- --pr 123 --owner owner --repo repository --dry-run
   ```

   Use `--list-prs` to list Pull Requests and `--out [path]` to save the dry-run output.

3. Run the tests and build before opening a Pull Request:

   ```bash
   npm test
   npm run build
   ```

## Pull Request Process

1. Update the README.md with details of significant changes if applicable
2. Ensure your PR description clearly describes the problem and solution
3. Link any related issues using GitHub keywords (e.g., "Fixes #123")
4. Make sure all checks pass on your PR
5. Request review from maintainers

## Questions or Need Help?

- Open an issue for questions
- Join our community discussions

## License

By contributing to PR Review AI, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing to make PR Review AI better! 🚀
