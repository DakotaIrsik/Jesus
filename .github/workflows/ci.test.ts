import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { join } from 'node:path';

describe('CI Workflow Configuration', () => {
  const workflowPath = join(process.cwd(), '.github', 'workflows', 'ci.yml');
  let workflow: any;

  try {
    const content = readFileSync(workflowPath, 'utf8');
    workflow = parse(content);
  } catch (error) {
    // Workflow file might not exist in test environment
  }

  it('should have valid workflow structure', () => {
    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('CI');
    expect(workflow.on).toBeDefined();
    expect(workflow.jobs).toBeDefined();
  });

  it('should trigger on push to main and next branches', () => {
    expect(workflow.on.push.branches).toContain('main');
    expect(workflow.on.push.branches).toContain('next');
  });

  it('should trigger on pull requests to main and next branches', () => {
    expect(workflow.on.pull_request.branches).toContain('main');
    expect(workflow.on.pull_request.branches).toContain('next');
  });

  it('should have concurrency control', () => {
    expect(workflow.concurrency).toBeDefined();
    expect(workflow.concurrency.group).toContain('github.workflow');
    expect(workflow.concurrency['cancel-in-progress']).toBe(true);
  });

  describe('Lint Job', () => {
    it('should use self-hosted runner', () => {
      expect(workflow.jobs.lint['runs-on']).toBe('self-hosted');
    });

    it('should have reasonable timeout', () => {
      expect(workflow.jobs.lint['timeout-minutes']).toBe(10);
    });

    it('should checkout code', () => {
      const checkoutStep = workflow.jobs.lint.steps.find(
        (step: any) => step.name === 'Checkout code'
      );
      expect(checkoutStep).toBeDefined();
      expect(checkoutStep.uses).toContain('actions/checkout@');
    });

    it('should setup pnpm and Node.js', () => {
      const pnpmStep = workflow.jobs.lint.steps.find((step: any) => step.name === 'Setup pnpm');
      const nodeStep = workflow.jobs.lint.steps.find((step: any) => step.name === 'Setup Node.js');

      expect(pnpmStep).toBeDefined();
      expect(nodeStep).toBeDefined();
      expect(nodeStep.with['node-version']).toBe('20');
      expect(nodeStep.with.cache).toBe('pnpm');
    });

    it('should install dependencies with frozen lockfile', () => {
      const installStep = workflow.jobs.lint.steps.find(
        (step: any) => step.name === 'Install dependencies'
      );
      expect(installStep.run).toContain('pnpm install --frozen-lockfile');
    });

    it('should run lint, format check, and type check', () => {
      const lintStep = workflow.jobs.lint.steps.find((step: any) => step.name === 'Run ESLint');
      const formatStep = workflow.jobs.lint.steps.find(
        (step: any) => step.name === 'Check formatting'
      );
      const typeStep = workflow.jobs.lint.steps.find(
        (step: any) => step.name === 'Run type checking'
      );

      expect(lintStep.run).toContain('pnpm lint');
      expect(formatStep.run).toContain('pnpm format:check');
      expect(typeStep.run).toContain('pnpm type-check');
    });
  });

  describe('Test Job', () => {
    it('should use self-hosted runner', () => {
      expect(workflow.jobs.test['runs-on']).toBe('self-hosted');
    });

    it('should have reasonable timeout', () => {
      expect(workflow.jobs.test['timeout-minutes']).toBe(15);
    });

    it('should have fail-fast disabled in matrix', () => {
      expect(workflow.jobs.test.strategy['fail-fast']).toBe(false);
    });

    it('should test on self-hosted runner with Node 20', () => {
      expect(workflow.jobs.test.strategy.matrix.os).toContain('self-hosted');
      expect(workflow.jobs.test.strategy.matrix['node-version']).toContain('20');
    });

    it('should setup Python for multi-language tests', () => {
      const pythonStep = workflow.jobs.test.steps.find(
        (step: any) => step.name === 'Setup Python'
      );
      expect(pythonStep).toBeDefined();
      expect(pythonStep.with['python-version']).toBe('3.11');
      expect(pythonStep.with.cache).toBe('pip');
    });

    it('should build packages before testing', () => {
      const buildStep = workflow.jobs.test.steps.find((step: any) => step.name === 'Build packages');
      expect(buildStep.run).toContain('pnpm build');
    });

    it('should run tests', () => {
      const testStep = workflow.jobs.test.steps.find((step: any) => step.name === 'Run tests');
      expect(testStep.run).toContain('pnpm test');
    });

    it('should generate and upload coverage reports', () => {
      const coverageStep = workflow.jobs.test.steps.find(
        (step: any) => step.name === 'Generate coverage report'
      );
      const uploadStep = workflow.jobs.test.steps.find(
        (step: any) => step.name === 'Upload coverage reports'
      );

      expect(coverageStep).toBeDefined();
      expect(coverageStep['continue-on-error']).toBe(true);
      expect(uploadStep).toBeDefined();
      expect(uploadStep.with.path).toContain('coverage/');
    });
  });

  describe('SBOM Job', () => {
    it('should use self-hosted runner', () => {
      expect(workflow.jobs.sbom['runs-on']).toBe('self-hosted');
    });

    it('should generate CycloneDX SBOM', () => {
      const sbomStep = workflow.jobs.sbom.steps.find(
        (step: any) => step.name === 'Generate SBOM (CycloneDX)'
      );
      expect(sbomStep).toBeDefined();
      expect(sbomStep.run).toContain('cyclonedx-npm');
      expect(sbomStep['continue-on-error']).toBe(true);
    });

    it('should generate dependency tree', () => {
      const treeStep = workflow.jobs.sbom.steps.find(
        (step: any) => step.name === 'Generate NPM dependency tree'
      );
      expect(treeStep).toBeDefined();
      expect(treeStep.run).toContain('pnpm list --json');
    });

    it('should upload SBOM artifacts with long retention', () => {
      const uploadStep = workflow.jobs.sbom.steps.find(
        (step: any) => step.name === 'Upload SBOM artifacts'
      );
      expect(uploadStep).toBeDefined();
      expect(uploadStep.with['retention-days']).toBe(90);
    });
  });

  describe('Docker Build Job', () => {
    it('should only run on PRs or main branch', () => {
      expect(workflow.jobs['docker-build'].if).toBeDefined();
      expect(workflow.jobs['docker-build'].if).toContain('pull_request');
      expect(workflow.jobs['docker-build'].if).toContain("refs/heads/main");
    });

    it('should setup Docker Buildx', () => {
      const buildxStep = workflow.jobs['docker-build'].steps.find(
        (step: any) => step.name === 'Set up Docker Buildx'
      );
      expect(buildxStep).toBeDefined();
      expect(buildxStep.uses).toContain('docker/setup-buildx-action@');
    });

    it('should use GitHub Actions cache', () => {
      const buildStep = workflow.jobs['docker-build'].steps.find(
        (step: any) => step.name === 'Build Docker image (test only)'
      );
      expect(buildStep.with['cache-from']).toContain('type=gha');
      expect(buildStep.with['cache-to']).toContain('type=gha');
    });

    it('should not push images (test only)', () => {
      const buildStep = workflow.jobs['docker-build'].steps.find(
        (step: any) => step.name === 'Build Docker image (test only)'
      );
      expect(buildStep.with.push).toBe(false);
    });
  });

  describe('Status Check Job', () => {
    it('should depend on required jobs', () => {
      expect(workflow.jobs['status-check'].needs).toContain('lint');
      expect(workflow.jobs['status-check'].needs).toContain('test');
      expect(workflow.jobs['status-check'].needs).toContain('sbom');
    });

    it('should always run regardless of previous job status', () => {
      expect(workflow.jobs['status-check'].if).toBe('always()');
    });

    it('should fail if any required job failed', () => {
      const checkStep = workflow.jobs['status-check'].steps.find(
        (step: any) => step.name === 'Check job status'
      );
      expect(checkStep.run).toContain('needs.lint.result');
      expect(checkStep.run).toContain('needs.test.result');
      expect(checkStep.run).toContain('needs.sbom.result');
      expect(checkStep.run).toContain('exit 1');
    });
  });
});
