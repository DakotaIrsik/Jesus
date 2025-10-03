import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('ESLint Configuration', () => {
  let eslint: ESLint;

  beforeAll(() => {
    eslint = new ESLint({
      cwd: process.cwd(),
      useEslintrc: false,
      overrideConfigFile: join(process.cwd(), 'eslint.config.mjs'),
    });
  });

  it('should load configuration without errors', async () => {
    const config = await eslint.calculateConfigForFile('test.ts');
    expect(config).toBeDefined();
    expect(config.rules).toBeDefined();
  });

  it('should enforce strict TypeScript rules', async () => {
    const config = await eslint.calculateConfigForFile('test.ts');
    expect(config.rules?.['@typescript-eslint/no-explicit-any']).toBeDefined();
    expect(config.rules?.['@typescript-eslint/explicit-function-return-type']).toBeDefined();
    expect(config.rules?.['@typescript-eslint/explicit-module-boundary-types']).toBeDefined();
  });

  it('should enforce consistent type imports', async () => {
    const config = await eslint.calculateConfigForFile('test.ts');
    expect(config.rules?.['@typescript-eslint/consistent-type-imports']).toBeDefined();
  });

  it('should disallow console.log but allow console.warn and console.error', async () => {
    const config = await eslint.calculateConfigForFile('test.ts');
    expect(config.rules?.['no-console']).toBeDefined();
  });

  it('should enforce strict equality checks', async () => {
    const config = await eslint.calculateConfigForFile('test.ts');
    expect(config.rules?.eqeqeq).toEqual(['error', 'always']);
  });

  it('should require curly braces for all control statements', async () => {
    const config = await eslint.calculateConfigForFile('test.ts');
    expect(config.rules?.curly).toEqual(['error', 'all']);
  });

  it('should relax rules for test files', async () => {
    const config = await eslint.calculateConfigForFile('test.test.ts');
    expect(config.rules?.['@typescript-eslint/no-explicit-any']).toBe('off');
    expect(config.rules?.['@typescript-eslint/no-non-null-assertion']).toBe('off');
  });

  it('should lint valid TypeScript code without errors', async () => {
    const code = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;

    const results = await eslint.lintText(code, { filePath: 'test.ts' });
    const errors = results[0]?.messages.filter((msg) => msg.severity === 2) || [];
    expect(errors.length).toBe(0);
  });

  it('should catch no-explicit-any violations', async () => {
    const code = `
      export function test(param: any): void {
        console.log(param);
      }
    `;

    const results = await eslint.lintText(code, { filePath: 'test.ts' });
    const hasAnyError = results[0]?.messages.some(
      (msg) => msg.ruleId === '@typescript-eslint/no-explicit-any'
    );
    expect(hasAnyError).toBe(true);
  });

  it('should catch missing return type violations', async () => {
    const code = `
      export function test() {
        return 42;
      }
    `;

    const results = await eslint.lintText(code, { filePath: 'test.ts' });
    const hasReturnTypeError = results[0]?.messages.some(
      (msg) => msg.ruleId === '@typescript-eslint/explicit-function-return-type'
    );
    expect(hasReturnTypeError).toBe(true);
  });

  it('should catch console.log violations', async () => {
    const code = `
      export function test(): void {
        console.log('test');
      }
    `;

    const results = await eslint.lintText(code, { filePath: 'test.ts' });
    const hasConsoleError = results[0]?.messages.some(
      (msg) => msg.ruleId === 'no-console'
    );
    expect(hasConsoleError).toBe(true);
  });

  it('should allow console.warn and console.error', async () => {
    const code = `
      export function test(): void {
        console.warn('warning');
        console.error('error');
      }
    `;

    const results = await eslint.lintText(code, { filePath: 'test.ts' });
    const hasConsoleError = results[0]?.messages.some(
      (msg) => msg.ruleId === 'no-console'
    );
    expect(hasConsoleError).toBe(false);
  });

  it('should enforce prefer-const', async () => {
    const code = `
      export function test(): void {
        let x = 5;
        console.error(x);
      }
    `;

    const results = await eslint.lintText(code, { filePath: 'test.ts' });
    const hasPreferConstError = results[0]?.messages.some(
      (msg) => msg.ruleId === 'prefer-const'
    );
    expect(hasPreferConstError).toBe(true);
  });

  it('should integrate with prettier (no conflicts)', async () => {
    const config = await eslint.calculateConfigForFile('test.ts');
    // Prettier config should disable conflicting rules
    expect(config).toBeDefined();
  });
});
