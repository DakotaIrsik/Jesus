import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import commitlintLoad from '@commitlint/load';
import commitlintLint from '@commitlint/lint';

describe('Commitlint Configuration', () => {
  let config: Awaited<ReturnType<typeof commitlintLoad>>;

  beforeAll(async () => {
    config = await commitlintLoad({}, { file: join(process.cwd(), 'commitlint.config.mjs') });
  });

  it('should load configuration without errors', () => {
    expect(config).toBeDefined();
    expect(config.rules).toBeDefined();
  });

  it('should extend conventional config', () => {
    expect(config.extends).toContain('@commitlint/config-conventional');
  });

  describe('Type Enum Rules', () => {
    it('should enforce valid commit types', () => {
      expect(config.rules?.['type-enum']).toBeDefined();
      const [level, applicable, types] = config.rules?.['type-enum'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('always');
      expect(types).toContain('feat');
      expect(types).toContain('fix');
      expect(types).toContain('docs');
      expect(types).toContain('style');
      expect(types).toContain('refactor');
      expect(types).toContain('perf');
      expect(types).toContain('test');
      expect(types).toContain('build');
      expect(types).toContain('ci');
      expect(types).toContain('chore');
      expect(types).toContain('revert');
    });

    it('should accept valid feat commit', async () => {
      const result = await commitlintLint(
        'feat: add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept valid fix commit', async () => {
      const result = await commitlintLint(
        'fix: resolve bug',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid commit type', async () => {
      const result = await commitlintLint(
        'invalid: this should fail',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'type-enum')).toBe(true);
    });
  });

  describe('Subject Case Rules', () => {
    it('should enforce subject-case rule', () => {
      expect(config.rules?.['subject-case']).toBeDefined();
      const [level, applicable, cases] = config.rules?.['subject-case'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('never');
      expect(cases).toContain('upper-case');
    });

    it('should reject uppercase subject', async () => {
      const result = await commitlintLint(
        'feat: ADD NEW FEATURE',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'subject-case')).toBe(true);
    });

    it('should accept lowercase subject', async () => {
      const result = await commitlintLint(
        'feat: add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept sentence case subject', async () => {
      const result = await commitlintLint(
        'feat: add new Feature component',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Header Max Length Rule', () => {
    it('should enforce header-max-length rule', () => {
      expect(config.rules?.['header-max-length']).toBeDefined();
      const [level, applicable, maxLength] = config.rules?.['header-max-length'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('always');
      expect(maxLength).toBe(100);
    });

    it('should accept header within limit', async () => {
      const result = await commitlintLint(
        'feat: add feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept header at exactly 100 characters', async () => {
      const header = 'feat: ' + 'a'.repeat(94); // 6 + 94 = 100
      const result = await commitlintLint(
        header,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(header.length).toBe(100);
      expect(result.valid).toBe(true);
    });

    it('should reject header exceeding 100 characters', async () => {
      const header = 'feat: ' + 'a'.repeat(95); // 6 + 95 = 101
      const result = await commitlintLint(
        header,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(header.length).toBe(101);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'header-max-length')).toBe(true);
    });
  });

  describe('Body Leading Blank Rule', () => {
    it('should enforce body-leading-blank rule', () => {
      expect(config.rules?.['body-leading-blank']).toBeDefined();
      const [level, applicable] = config.rules?.['body-leading-blank'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('always');
    });

    it('should accept commit with blank line before body', async () => {
      const message = 'feat: add feature\n\nThis is the body of the commit message.';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should reject commit without blank line before body', async () => {
      const message = 'feat: add feature\nThis is the body without blank line.';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'body-leading-blank')).toBe(true);
    });
  });

  describe('Footer Leading Blank Rule', () => {
    it('should enforce footer-leading-blank rule', () => {
      expect(config.rules?.['footer-leading-blank']).toBeDefined();
      const [level, applicable] = config.rules?.['footer-leading-blank'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('always');
    });

    it('should accept commit with blank line before footer', async () => {
      const message =
        'feat: add feature\n\nThis is the body.\n\nBREAKING CHANGE: this breaks things';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept commit with Closes footer', async () => {
      const message = 'feat: add feature\n\nThis is the body.\n\nCloses #123';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Scope Case Rule', () => {
    it('should enforce scope-case rule', () => {
      expect(config.rules?.['scope-case']).toBeDefined();
      const [level, applicable, caseType] = config.rules?.['scope-case'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('always');
      expect(caseType).toBe('kebab-case');
    });

    it('should accept kebab-case scope', async () => {
      const result = await commitlintLint(
        'feat(my-feature): add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should reject camelCase scope', async () => {
      const result = await commitlintLint(
        'feat(myFeature): add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'scope-case')).toBe(true);
    });

    it('should reject PascalCase scope', async () => {
      const result = await commitlintLint(
        'feat(MyFeature): add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'scope-case')).toBe(true);
    });

    it('should reject UPPER_CASE scope', async () => {
      const result = await commitlintLint(
        'feat(MY_FEATURE): add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'scope-case')).toBe(true);
    });

    it('should accept single word lowercase scope', async () => {
      const result = await commitlintLint(
        'feat(api): add new endpoint',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Subject Empty Rule', () => {
    it('should enforce subject-empty rule', () => {
      expect(config.rules?.['subject-empty']).toBeDefined();
      const [level, applicable] = config.rules?.['subject-empty'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('never');
    });

    it('should reject commit with empty subject', async () => {
      const result = await commitlintLint(
        'feat: ',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'subject-empty')).toBe(true);
    });

    it('should reject commit with only scope and no subject', async () => {
      const result = await commitlintLint(
        'feat(api): ',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('Subject Full Stop Rule', () => {
    it('should enforce subject-full-stop rule', () => {
      expect(config.rules?.['subject-full-stop']).toBeDefined();
      const [level, applicable, character] = config.rules?.['subject-full-stop'] || [];
      expect(level).toBe(2); // Error level
      expect(applicable).toBe('never');
      expect(character).toBe('.');
    });

    it('should reject subject ending with period', async () => {
      const result = await commitlintLint(
        'feat: add new feature.',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'subject-full-stop')).toBe(true);
    });

    it('should accept subject without period', async () => {
      const result = await commitlintLint(
        'feat: add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('All Commit Types', () => {
    const commitTypes = [
      { type: 'feat', description: 'add new feature' },
      { type: 'fix', description: 'resolve bug' },
      { type: 'docs', description: 'update documentation' },
      { type: 'style', description: 'format code' },
      { type: 'refactor', description: 'restructure code' },
      { type: 'perf', description: 'improve performance' },
      { type: 'test', description: 'add tests' },
      { type: 'build', description: 'update build system' },
      { type: 'ci', description: 'update CI configuration' },
      { type: 'chore', description: 'update dependencies' },
      { type: 'revert', description: 'revert previous commit' },
    ];

    commitTypes.forEach(({ type, description }) => {
      it(`should accept ${type} commit type`, async () => {
        const result = await commitlintLint(
          `${type}: ${description}`,
          config.rules,
          config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
        );
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Real World Commit Messages', () => {
    it('should accept conventional commit with scope', async () => {
      const result = await commitlintLint(
        'feat(api): add new endpoint for user management',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept conventional commit with breaking change', async () => {
      const message =
        'feat(api): change user endpoint\n\nBREAKING CHANGE: endpoint URL has changed';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept conventional commit with issue reference', async () => {
      const message = 'fix(auth): resolve login bug\n\nCloses #456';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept multi-line commit with body and footer', async () => {
      const message =
        'feat(core): add caching layer\n\nImplement Redis-based caching for improved performance.\nThis reduces database load significantly.\n\nCloses #789';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept commit with multiple references', async () => {
      const message = 'fix(core): resolve critical bugs\n\nFixes #123\nFixes #124\nCloses #125';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept build commit with detailed body', async () => {
      const message =
        'build(deps): upgrade dependencies\n\nUpgrade major dependencies:\n- React 18.0.0\n- TypeScript 5.0.0\n\nBREAKING CHANGE: requires Node.js 20+';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept ci commit', async () => {
      const result = await commitlintLint(
        'ci(github): add deployment workflow',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should accept revert commit', async () => {
      const message = 'revert: revert "feat: add feature X"\n\nThis reverts commit abc123.';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should reject commit with no type', async () => {
      const result = await commitlintLint(
        'add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
    });

    it('should reject empty commit message', async () => {
      const result = await commitlintLint(
        '',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
    });

    it('should reject commit with typo in type', async () => {
      const result = await commitlintLint(
        'featt: add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
    });

    it('should reject commit with missing colon', async () => {
      const result = await commitlintLint(
        'feat add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
    });

    it('should reject commit with PascalCase subject start', async () => {
      const result = await commitlintLint(
        'feat: Add new feature',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.name === 'subject-case')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle commit with special characters in subject', async () => {
      const result = await commitlintLint(
        'feat: add support for @mentions and #hashtags',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should handle commit with numbers in subject', async () => {
      const result = await commitlintLint(
        'feat: upgrade from v1 to v2',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should handle commit with Unicode characters', async () => {
      const result = await commitlintLint(
        'feat: add emoji support 🚀',
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should handle very long body text', async () => {
      const longBody = 'x'.repeat(500);
      const message = `feat: add feature\n\n${longBody}`;
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });

    it('should handle commit with multiple blank lines', async () => {
      const message = 'feat: add feature\n\n\n\nBody with multiple blank lines above';
      const result = await commitlintLint(
        message,
        config.rules,
        config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
      );
      expect(result.valid).toBe(true);
    });
  });
});
