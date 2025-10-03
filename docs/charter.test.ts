import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Charter Documentation', () => {
  const docsDir = join(__dirname);
  const charterPath = join(docsDir, 'charter.md');
  const architectureDir = join(docsDir, 'architecture');
  const adrDir = join(docsDir, 'adr');

  it('should have charter.md', () => {
    expect(existsSync(charterPath)).toBe(true);
  });

  it('charter.md should contain required sections', () => {
    const charter = readFileSync(charterPath, 'utf-8');

    // Required sections from issue #1
    expect(charter).toContain('## Vision');
    expect(charter).toContain('## Goals');
    expect(charter).toContain('## Scope');
    expect(charter).toContain('## Non-Functional Requirements');
    expect(charter).toContain('## Service Level Agreements');
    expect(charter).toContain('## Risks');
    expect(charter).toContain('## Success Metrics');
    expect(charter).toContain('## Milestones');
  });

  it('charter.md should define NFRs', () => {
    const charter = readFileSync(charterPath, 'utf-8');

    // NFR categories
    expect(charter).toContain('### Performance');
    expect(charter).toContain('### Reliability');
    expect(charter).toContain('### Scalability');
    expect(charter).toContain('### Security');
    expect(charter).toContain('### Observability');
  });

  it('charter.md should define SLAs with specific values', () => {
    const charter = readFileSync(charterPath, 'utf-8');

    // SLA values
    expect(charter).toMatch(/99\.\d+%.*uptime/i);
    expect(charter).toMatch(/\d+ms/i); // Latency in milliseconds
  });

  it('charter.md should list risks with mitigations', () => {
    const charter = readFileSync(charterPath, 'utf-8');

    // Risk tables should exist
    expect(charter).toContain('### Technical Risks');
    expect(charter).toContain('### Operational Risks');
    expect(charter).toContain('### Business Risks');

    // Risk table structure
    expect(charter).toContain('| Risk |');
    expect(charter).toContain('| Impact |');
    expect(charter).toContain('| Mitigation |');
  });

  it('charter.md should define milestones M0-M4', () => {
    const charter = readFileSync(charterPath, 'utf-8');

    expect(charter).toContain('### M0:');
    expect(charter).toContain('### M1:');
    expect(charter).toContain('### M2:');
    expect(charter).toContain('### M3:');
    expect(charter).toContain('### M4:');
  });
});

describe('Architecture Diagrams', () => {
  const architectureDir = join(__dirname, 'architecture');

  it('should have architecture directory', () => {
    expect(existsSync(architectureDir)).toBe(true);
  });

  it('should have C1 (System Context) diagram', () => {
    const c1Path = join(architectureDir, 'c1-system-context.mmd');
    expect(existsSync(c1Path)).toBe(true);

    const content = readFileSync(c1Path, 'utf-8');
    expect(content).toContain('graph');
    expect(content).toContain('Jesus Platform');
  });

  it('should have C2 (Container) diagram', () => {
    const c2Path = join(architectureDir, 'c2-container.mmd');
    expect(existsSync(c2Path)).toBe(true);

    const content = readFileSync(c2Path, 'utf-8');
    expect(content).toContain('graph');

    // Key containers
    expect(content).toContain('Model Router');
    expect(content).toContain('Agent Runner');
    expect(content).toContain('MCP Server');
    expect(content).toContain('Task Scheduler');
  });

  it('should have C3 (Component) diagram', () => {
    const c3Path = join(architectureDir, 'c3-component.mmd');
    expect(existsSync(c3Path)).toBe(true);

    const content = readFileSync(c3Path, 'utf-8');
    expect(content).toContain('graph');

    // Key components
    expect(content).toContain('Task Executor');
    expect(content).toContain('Retry');
    expect(content).toContain('Router');
  });

  it('C1 diagram should show external systems', () => {
    const c1Path = join(architectureDir, 'c1-system-context.mmd');
    const content = readFileSync(c1Path, 'utf-8');

    // Model providers
    expect(content).toContain('Anthropic');
    expect(content).toContain('OpenAI');

    // External services
    expect(content).toContain('GitHub');
    expect(content).toContain('Prometheus');
    expect(content).toContain('Grafana');
  });

  it('C2 diagram should show model adapters', () => {
    const c2Path = join(architectureDir, 'c2-container.mmd');
    const content = readFileSync(c2Path, 'utf-8');

    expect(content).toContain('Anthropic Adapter');
    expect(content).toContain('OpenAI Adapter');
    expect(content).toContain('Local Adapter');
  });

  it('C3 diagram should show observability components', () => {
    const c3Path = join(architectureDir, 'c3-component.mmd');
    const content = readFileSync(c3Path, 'utf-8');

    expect(content).toContain('Metrics');
    expect(content).toContain('Trace');
    expect(content).toContain('Logger');
    expect(content).toContain('Prometheus');
    expect(content).toContain('OpenTelemetry');
  });
});

describe('Architecture Decision Records (ADRs)', () => {
  const adrDir = join(__dirname, 'adr');

  it('should have ADR directory', () => {
    expect(existsSync(adrDir)).toBe(true);
  });

  it('should have ADR index (000-index.md)', () => {
    const indexPath = join(adrDir, '000-index.md');
    expect(existsSync(indexPath)).toBe(true);

    const content = readFileSync(indexPath, 'utf-8');
    expect(content).toContain('Architecture Decision Records');
    expect(content).toContain('ADR');
  });

  it('should have at least 5 ADRs as per acceptance criteria', () => {
    const adr001 = join(adrDir, '001-license-selection.md');
    const adr002 = join(adrDir, '002-monorepo-structure.md');
    const adr003 = join(adrDir, '003-model-adapter-interface.md');
    const adr004 = join(adrDir, '004-observability-stack.md');
    const adr005 = join(adrDir, '005-task-queue-technology.md');

    expect(existsSync(adr001)).toBe(true);
    expect(existsSync(adr002)).toBe(true);
    expect(existsSync(adr003)).toBe(true);
    expect(existsSync(adr004)).toBe(true);
    expect(existsSync(adr005)).toBe(true);
  });

  const adrTests = [
    { file: '001-license-selection.md', title: 'License Selection' },
    { file: '002-monorepo-structure.md', title: 'Monorepo' },
    { file: '003-model-adapter-interface.md', title: 'Model Adapter' },
    { file: '004-observability-stack.md', title: 'Observability' },
    { file: '005-task-queue-technology.md', title: 'Task Queue' }
  ];

  adrTests.forEach(({ file, title }) => {
    describe(`ADR: ${file}`, () => {
      const adrPath = join(adrDir, file);
      let content: string;

      it(`${file} should exist`, () => {
        expect(existsSync(adrPath)).toBe(true);
        content = readFileSync(adrPath, 'utf-8');
      });

      it(`${file} should have required sections`, () => {
        content = content || readFileSync(adrPath, 'utf-8');

        expect(content).toContain('# ADR-');
        expect(content).toContain('**Status**:');
        expect(content).toContain('**Date**:');
        expect(content).toContain('## Context');
        expect(content).toContain('## Decision');
        expect(content).toContain('## Consequences');
        expect(content).toContain('## Alternatives Considered');
      });

      it(`${file} should list positive consequences`, () => {
        content = content || readFileSync(adrPath, 'utf-8');
        expect(content).toContain('### Positive');
      });

      it(`${file} should list negative consequences`, () => {
        content = content || readFileSync(adrPath, 'utf-8');
        expect(content).toContain('### Negative');
      });

      it(`${file} should have accepted status`, () => {
        content = content || readFileSync(adrPath, 'utf-8');
        expect(content).toMatch(/\*\*Status\*\*:\s*Accepted/);
      });
    });
  });

  it('ADR-001 should select a license', () => {
    const adr001 = readFileSync(join(adrDir, '001-license-selection.md'), 'utf-8');

    // Should mention a specific license
    expect(adr001).toMatch(/BUSL|SSPL|MIT|Apache|GPL|Elastic License/);
  });

  it('ADR-002 should define monorepo structure', () => {
    const adr002 = readFileSync(join(adrDir, '002-monorepo-structure.md'), 'utf-8');

    expect(adr002).toContain('apps/');
    expect(adr002).toContain('packages/');
  });

  it('ADR-003 should define model adapter interface', () => {
    const adr003 = readFileSync(join(adrDir, '003-model-adapter-interface.md'), 'utf-8');

    expect(adr003).toContain('interface');
    expect(adr003).toContain('adapter');
    expect(adr003).toMatch(/Anthropic|OpenAI|Claude|GPT/);
  });

  it('ADR-004 should select observability stack', () => {
    const adr004 = readFileSync(join(adrDir, '004-observability-stack.md'), 'utf-8');

    expect(adr004).toMatch(/Prometheus|Grafana|OpenTelemetry|DataDog|New Relic/);
  });

  it('ADR-005 should select task queue technology', () => {
    const adr005 = readFileSync(join(adrDir, '005-task-queue-technology.md'), 'utf-8');

    expect(adr005).toMatch(/Redis|RabbitMQ|Kafka|SQS|PostgreSQL/);
  });
});

describe('Documentation Quality', () => {
  it('all markdown files should have proper headings', () => {
    const files = [
      'charter.md',
      'architecture/README.md',
      'adr/000-index.md',
      'adr/001-license-selection.md'
    ];

    files.forEach((file) => {
      const path = join(__dirname, file);
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf-8');
        expect(content).toMatch(/^#\s+.+/m); // Has at least one h1 heading
      }
    });
  });

  it('charter.md should be comprehensive (>5000 chars)', () => {
    const charter = readFileSync(join(__dirname, 'charter.md'), 'utf-8');
    expect(charter.length).toBeGreaterThan(5000);
  });

  it('each ADR should be substantial (>2000 chars)', () => {
    const adrs = [
      '001-license-selection.md',
      '002-monorepo-structure.md',
      '003-model-adapter-interface.md',
      '004-observability-stack.md',
      '005-task-queue-technology.md'
    ];

    adrs.forEach((adr) => {
      const content = readFileSync(join(__dirname, 'adr', adr), 'utf-8');
      expect(content.length).toBeGreaterThan(2000);
    });
  });
});
