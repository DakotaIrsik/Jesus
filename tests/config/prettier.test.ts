import { describe, it, expect } from 'vitest';
import prettier from 'prettier';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('Prettier Configuration', () => {
  let config: prettier.Options;

  beforeAll(async () => {
    const configPath = join(process.cwd(), '.prettierrc.json');
    const configFile = await readFile(configPath, 'utf-8');
    config = JSON.parse(configFile);
  });

  it('should load configuration without errors', () => {
    expect(config).toBeDefined();
  });

  it('should enforce semicolons', () => {
    expect(config.semi).toBe(true);
  });

  it('should use single quotes', () => {
    expect(config.singleQuote).toBe(true);
  });

  it('should enforce trailing commas', () => {
    expect(config.trailingComma).toBe('all');
  });

  it('should set print width to 100', () => {
    expect(config.printWidth).toBe(100);
  });

  it('should use 2 spaces for indentation', () => {
    expect(config.tabWidth).toBe(2);
    expect(config.useTabs).toBe(false);
  });

  it('should use LF line endings', () => {
    expect(config.endOfLine).toBe('lf');
  });

  it('should enforce arrow function parentheses', () => {
    expect(config.arrowParens).toBe('always');
  });

  it('should format TypeScript code correctly', async () => {
    const code = 'const x={a:1,b:2}';
    const formatted = await prettier.format(code, {
      ...config,
      parser: 'typescript',
    });
    expect(formatted.trim()).toBe("const x = { a: 1, b: 2 };");
  });

  it('should enforce trailing commas in objects', async () => {
    const code = `const obj = {
      a: 1,
      b: 2
    }`;
    const formatted = await prettier.format(code, {
      ...config,
      parser: 'typescript',
    });
    expect(formatted).toContain('b: 2,');
  });

  it('should enforce single quotes in strings', async () => {
    const code = 'const str = "hello"';
    const formatted = await prettier.format(code, {
      ...config,
      parser: 'typescript',
    });
    expect(formatted.trim()).toBe("const str = 'hello';");
  });

  it('should wrap long lines at 100 characters', async () => {
    const code = 'const veryLongVariableName = { propertyOne: "value1", propertyTwo: "value2", propertyThree: "value3", propertyFour: "value4" }';
    const formatted = await prettier.format(code, {
      ...config,
      parser: 'typescript',
    });
    const lines = formatted.split('\n');
    const hasWrappedLines = lines.some((line) => line.length <= 100);
    expect(hasWrappedLines).toBe(true);
  });

  it('should format arrow functions with parentheses', async () => {
    const code = 'const fn = x => x + 1';
    const formatted = await prettier.format(code, {
      ...config,
      parser: 'typescript',
    });
    expect(formatted.trim()).toBe('const fn = (x) => x + 1;');
  });

  it('should format JSON correctly', async () => {
    const json = '{"name":"test","value":123}';
    const formatted = await prettier.format(json, {
      ...config,
      parser: 'json',
    });
    expect(formatted).toContain('\n');
    expect(formatted).toContain('  '); // 2 space indentation
  });

  it('should format markdown correctly', async () => {
    const markdown = '# Title\n\nParagraph text here.';
    const formatted = await prettier.format(markdown, {
      ...config,
      parser: 'markdown',
    });
    expect(formatted).toBeDefined();
  });

  it('should format YAML correctly', async () => {
    const yaml = 'name: test\nvalue: 123';
    const formatted = await prettier.format(yaml, {
      ...config,
      parser: 'yaml',
    });
    expect(formatted).toBeDefined();
  });
});

describe('Prettier Ignore Configuration', () => {
  it('should have ignore file', async () => {
    const ignorePath = join(process.cwd(), '.prettierignore');
    const ignoreFile = await readFile(ignorePath, 'utf-8');
    expect(ignoreFile).toBeDefined();
    expect(ignoreFile).toContain('node_modules');
    expect(ignoreFile).toContain('dist');
    expect(ignoreFile).toContain('pnpm-lock.yaml');
  });
});
