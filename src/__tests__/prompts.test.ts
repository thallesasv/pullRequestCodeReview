import { buildReviewSystemPrompt, buildReviewUserPrompt } from '../prompts';

describe('review prompt builders', () => {
  it('uses concise instructions focused on high-value actionable findings', () => {
    const systemPrompt = buildReviewSystemPrompt('Use camelCase.');

    expect(systemPrompt).toContain('Priorize apenas problemas');
    expect(systemPrompt).toContain('máximo de 5 comentários');
    expect(systemPrompt).toContain('Use camelCase.');
  });

  it('keeps the PR context and strict JSON contract in the user prompt', () => {
    const userPrompt = buildReviewUserPrompt({
      prTitle: 'Atualiza fluxo de autenticação',
      prDescription: 'Corrige validação do token',
      prSummary: 'Resumo da mudança',
      files: [],
    });

    expect(userPrompt).toContain('<PR title>');
    expect(userPrompt).toContain('Return ONLY a valid JSON object');
    expect(userPrompt).toContain('"comments": []');
  });
});
