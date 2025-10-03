# Architecture Decision Records (ADR) Index

This directory contains Architecture Decision Records (ADRs) documenting key architectural decisions for the Jesus AI platform.

## What is an ADR?

An ADR captures an important architectural decision along with its context and consequences. Each ADR describes:
- **Title**: Short noun phrase describing the decision
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: Forces at play (technical, political, social, project)
- **Decision**: The change we're proposing or have agreed to
- **Consequences**: Positive and negative outcomes from this decision

## ADR Template

```markdown
# ADR-XXX: [Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded by ADR-YYY]
**Date**: YYYY-MM-DD
**Authors**: [Names]

## Context

[What is the issue that we're seeing that is motivating this decision or change?]

## Decision

[What is the change that we're proposing and/or doing?]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Cost/Risk 1]
- [Cost/Risk 2]

## Alternatives Considered

- **Alternative 1**: [Brief description and why rejected]
- **Alternative 2**: [Brief description and why rejected]
```

## Active ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-license-selection.md) | License Selection for Commercial Protection | Accepted | 2025-10-03 |
| [002](002-monorepo-structure.md) | Monorepo with Polyglot Workspace Support | Accepted | 2025-10-03 |
| [003](003-model-adapter-interface.md) | Model Adapter Interface and Plugin Architecture | Accepted | 2025-10-03 |
| [004](004-observability-stack.md) | Observability Stack: Prometheus, OpenTelemetry, Grafana | Accepted | 2025-10-03 |
| [005](005-task-queue-technology.md) | Task Queue Technology Selection | Accepted | 2025-10-03 |

## Superseded ADRs

None yet.

## Process

1. **Proposal**: Create ADR with "Proposed" status via pull request
2. **Discussion**: Team reviews and discusses in PR comments
3. **Decision**: Merge PR and update status to "Accepted"
4. **Implementation**: Reference ADR in implementation PRs
5. **Maintenance**: Update status to "Superseded" when replaced by newer ADR

## References

- [ADR GitHub Organization](https://adr.github.io/)
- [Michael Nygard's ADR Template](https://github.com/joelparkerhenderson/architecture-decision-record)
