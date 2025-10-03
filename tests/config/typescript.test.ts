import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type * as ts from 'typescript';

describe('TypeScript Configuration', () => {
  let tsConfig: {
    compilerOptions: ts.CompilerOptions;
    include: string[];
    exclude: string[];
  };

  beforeAll(async () => {
    const configPath = join(process.cwd(), 'tsconfig.json');
    const configFile = await readFile(configPath, 'utf-8');
    tsConfig = JSON.parse(configFile);
  });

  it('should load configuration without errors', () => {
    expect(tsConfig).toBeDefined();
    expect(tsConfig.compilerOptions).toBeDefined();
  });

  describe('Language and Environment', () => {
    it('should target ES2022', () => {
      expect(tsConfig.compilerOptions.target).toBe('ES2022');
    });

    it('should use ES2022 lib', () => {
      expect(tsConfig.compilerOptions.lib).toContain('ES2022');
    });

    it('should use NodeNext module system', () => {
      expect(tsConfig.compilerOptions.module).toBe('NodeNext');
      expect(tsConfig.compilerOptions.moduleResolution).toBe('NodeNext');
    });
  });

  describe('Strict Type Checking', () => {
    it('should enable strict mode', () => {
      expect(tsConfig.compilerOptions.strict).toBe(true);
    });

    it('should enforce no implicit any', () => {
      expect(tsConfig.compilerOptions.noImplicitAny).toBe(true);
    });

    it('should enforce strict null checks', () => {
      expect(tsConfig.compilerOptions.strictNullChecks).toBe(true);
    });

    it('should enforce strict function types', () => {
      expect(tsConfig.compilerOptions.strictFunctionTypes).toBe(true);
    });

    it('should enforce strict bind call apply', () => {
      expect(tsConfig.compilerOptions.strictBindCallApply).toBe(true);
    });

    it('should enforce strict property initialization', () => {
      expect(tsConfig.compilerOptions.strictPropertyInitialization).toBe(true);
    });

    it('should enforce no implicit this', () => {
      expect(tsConfig.compilerOptions.noImplicitThis).toBe(true);
    });

    it('should enforce always strict', () => {
      expect(tsConfig.compilerOptions.alwaysStrict).toBe(true);
    });
  });

  describe('Additional Checks', () => {
    it('should enforce no unused locals', () => {
      expect(tsConfig.compilerOptions.noUnusedLocals).toBe(true);
    });

    it('should enforce no unused parameters', () => {
      expect(tsConfig.compilerOptions.noUnusedParameters).toBe(true);
    });

    it('should enforce no implicit returns', () => {
      expect(tsConfig.compilerOptions.noImplicitReturns).toBe(true);
    });

    it('should enforce no fallthrough cases', () => {
      expect(tsConfig.compilerOptions.noFallthroughCasesInSwitch).toBe(true);
    });

    it('should enforce no unchecked indexed access', () => {
      expect(tsConfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    });

    it('should enforce no implicit override', () => {
      expect(tsConfig.compilerOptions.noImplicitOverride).toBe(true);
    });

    it('should enforce no property access from index signature', () => {
      expect(tsConfig.compilerOptions.noPropertyAccessFromIndexSignature).toBe(true);
    });
  });

  describe('Emit Configuration', () => {
    it('should generate declaration files', () => {
      expect(tsConfig.compilerOptions.declaration).toBe(true);
      expect(tsConfig.compilerOptions.declarationMap).toBe(true);
    });

    it('should generate source maps', () => {
      expect(tsConfig.compilerOptions.sourceMap).toBe(true);
    });

    it('should output to dist directory', () => {
      expect(tsConfig.compilerOptions.outDir).toBe('./dist');
    });

    it('should remove comments', () => {
      expect(tsConfig.compilerOptions.removeComments).toBe(true);
    });

    it('should import helpers', () => {
      expect(tsConfig.compilerOptions.importHelpers).toBe(true);
    });
  });

  describe('Interop Configuration', () => {
    it('should enable esModuleInterop', () => {
      expect(tsConfig.compilerOptions.esModuleInterop).toBe(true);
    });

    it('should allow synthetic default imports', () => {
      expect(tsConfig.compilerOptions.allowSyntheticDefaultImports).toBe(true);
    });

    it('should enforce consistent casing', () => {
      expect(tsConfig.compilerOptions.forceConsistentCasingInFileNames).toBe(true);
    });

    it('should use isolated modules', () => {
      expect(tsConfig.compilerOptions.isolatedModules).toBe(true);
    });
  });

  describe('Advanced Configuration', () => {
    it('should skip lib check', () => {
      expect(tsConfig.compilerOptions.skipLibCheck).toBe(true);
    });

    it('should resolve JSON modules', () => {
      expect(tsConfig.compilerOptions.resolveJsonModule).toBe(true);
    });
  });

  describe('Path Mapping', () => {
    it('should configure base URL', () => {
      expect(tsConfig.compilerOptions.baseUrl).toBe('.');
    });

    it('should configure monorepo paths', () => {
      expect(tsConfig.compilerOptions.paths).toBeDefined();
      expect(tsConfig.compilerOptions.paths?.['@jesus/core/*']).toBeDefined();
      expect(tsConfig.compilerOptions.paths?.['@jesus/utils/*']).toBeDefined();
      expect(tsConfig.compilerOptions.paths?.['@jesus/*']).toBeDefined();
    });
  });

  describe('Include/Exclude Configuration', () => {
    it('should include workspace directories', () => {
      expect(tsConfig.include).toContain('apps/**/*');
      expect(tsConfig.include).toContain('packages/**/*');
      expect(tsConfig.include).toContain('tools/**/*');
    });

    it('should exclude node_modules and build directories', () => {
      expect(tsConfig.exclude).toContain('node_modules');
      expect(tsConfig.exclude).toContain('dist');
      expect(tsConfig.exclude).toContain('build');
    });

    it('should exclude test files', () => {
      expect(tsConfig.exclude).toContain('**/*.spec.ts');
      expect(tsConfig.exclude).toContain('**/*.test.ts');
    });
  });
});
