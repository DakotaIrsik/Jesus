import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { join } from 'node:path';

describe('Security Workflow Configuration', () => {
  const workflowPath = join(process.cwd(), '.github', 'workflows', 'security.yml');
  let workflow: any;

  try {
    const content = readFileSync(workflowPath, 'utf8');
    workflow = parse(content);
  } catch (error) {
    // Workflow file might not exist in test environment
  }

  it('should have valid workflow structure', () => {
    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Security Scans');
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

  it('should run on schedule (daily)', () => {
    expect(workflow.on.schedule).toBeDefined();
    expect(workflow.on.schedule[0].cron).toBe('0 2 * * *');
  });

  describe('NPM Audit Job', () => {
    it('should use self-hosted runner', () => {
      expect(workflow.jobs['npm-audit']['runs-on']).toBe('self-hosted');
    });

    it('should checkout code', () => {
      const checkoutStep = workflow.jobs['npm-audit'].steps.find(
        (step: any) => step.uses && step.uses.includes('actions/checkout')
      );
      expect(checkoutStep).toBeDefined();
    });

    it('should setup Node.js 20', () => {
      const nodeStep = workflow.jobs['npm-audit'].steps.find(
        (step: any) => step.name === 'Setup Node.js'
      );
      expect(nodeStep).toBeDefined();
      expect(nodeStep.with['node-version']).toBe('20');
    });

    it('should install pnpm', () => {
      const pnpmStep = workflow.jobs['npm-audit'].steps.find(
        (step: any) => step.name === 'Install pnpm'
      );
      expect(pnpmStep).toBeDefined();
      expect(pnpmStep.uses).toContain('pnpm/action-setup');
    });

    it('should run pnpm audit with moderate level', () => {
      const auditStep = workflow.jobs['npm-audit'].steps.find(
        (step: any) => step.name === 'Run npm audit'
      );
      expect(auditStep).toBeDefined();
      expect(auditStep.run).toContain('pnpm audit');
      expect(auditStep.run).toContain('--audit-level=moderate');
      expect(auditStep['continue-on-error']).toBe(true);
    });
  });

  describe('Python Audit Job', () => {
    it('should use self-hosted runner', () => {
      expect(workflow.jobs['pip-audit']['runs-on']).toBe('self-hosted');
    });

    it('should setup Python 3.11', () => {
      const pythonStep = workflow.jobs['pip-audit'].steps.find(
        (step: any) => step.name === 'Setup Python'
      );
      expect(pythonStep).toBeDefined();
      expect(pythonStep.with['python-version']).toBe('3.11');
    });

    it('should install and run pip-audit', () => {
      const installStep = workflow.jobs['pip-audit'].steps.find(
        (step: any) => step.name === 'Install pip-audit'
      );
      const auditStep = workflow.jobs['pip-audit'].steps.find(
        (step: any) => step.name === 'Run pip-audit'
      );

      expect(installStep).toBeDefined();
      expect(installStep.run).toContain('pip install pip-audit');
      expect(auditStep).toBeDefined();
      expect(auditStep.run).toContain('pip-audit');
      expect(auditStep['continue-on-error']).toBe(true);
    });
  });

  describe('OSV Scanner Job', () => {
    it('should use self-hosted runner', () => {
      expect(workflow.jobs['osv-scanner']['runs-on']).toBe('self-hosted');
    });

    it('should install OSV Scanner', () => {
      const installStep = workflow.jobs['osv-scanner'].steps.find(
        (step: any) => step.name === 'Install OSV Scanner'
      );
      expect(installStep).toBeDefined();
      expect(installStep.run).toContain('osv-scanner');
      expect(installStep.run).toContain('chmod +x');
      expect(installStep.run).toContain('sudo mv');
    });

    it('should run OSV Scanner recursively', () => {
      const scanStep = workflow.jobs['osv-scanner'].steps.find(
        (step: any) => step.name === 'Run OSV Scanner'
      );
      expect(scanStep).toBeDefined();
      expect(scanStep.run).toContain('osv-scanner --recursive');
      expect(scanStep.run).toContain('--skip-git');
      expect(scanStep['continue-on-error']).toBe(true);
    });
  });

  describe('Secret Scanning Job', () => {
    it('should use self-hosted runner', () => {
      expect(workflow.jobs['secret-scanning']['runs-on']).toBe('self-hosted');
    });

    it('should setup Python 3.11', () => {
      const pythonStep = workflow.jobs['secret-scanning'].steps.find(
        (step: any) => step.name === 'Setup Python'
      );
      expect(pythonStep).toBeDefined();
      expect(pythonStep.with['python-version']).toBe('3.11');
    });

    it('should install detect-secrets', () => {
      const installStep = workflow.jobs['secret-scanning'].steps.find(
        (step: any) => step.name === 'Install detect-secrets'
      );
      expect(installStep).toBeDefined();
      expect(installStep.run).toContain('pip install detect-secrets');
    });

    it('should scan and audit secrets', () => {
      const scanStep = workflow.jobs['secret-scanning'].steps.find(
        (step: any) => step.name === 'Run detect-secrets'
      );
      expect(scanStep).toBeDefined();
      expect(scanStep.run).toContain('detect-secrets scan');
      expect(scanStep.run).toContain('--baseline .secrets.baseline');
      expect(scanStep.run).toContain('detect-secrets audit');
    });
  });

  describe('Security Best Practices', () => {
    it('should use pinned versions for critical actions', () => {
      const checkoutActions: any[] = [];
      Object.values(workflow.jobs).forEach((job: any) => {
        job.steps.forEach((step: any) => {
          if (step.uses && step.uses.includes('actions/checkout')) {
            checkoutActions.push(step.uses);
          }
        });
      });

      checkoutActions.forEach((action) => {
        expect(action).toMatch(/@v\d+/);
      });
    });

    it('should use continue-on-error for non-blocking scans', () => {
      const auditSteps = [
        workflow.jobs['npm-audit'].steps.find((s: any) => s.name === 'Run npm audit'),
        workflow.jobs['pip-audit'].steps.find((s: any) => s.name === 'Run pip-audit'),
        workflow.jobs['osv-scanner'].steps.find((s: any) => s.name === 'Run OSV Scanner'),
      ];

      auditSteps.forEach((step) => {
        expect(step['continue-on-error']).toBe(true);
      });
    });

    it('should have all jobs on self-hosted runners', () => {
      Object.values(workflow.jobs).forEach((job: any) => {
        expect(job['runs-on']).toBe('self-hosted');
      });
    });
  });
});
