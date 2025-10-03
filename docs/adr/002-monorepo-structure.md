# ADR-002: Monorepo with Polyglot Workspace Support

**Status**: Accepted
**Date**: 2025-10-03
**Authors**: Jesus Platform Team
**Relates to**: Issue #2

## Context

The Jesus platform requires multiple services written in different languages:
- **TypeScript**: MCP server, web dashboard, CLI tools, API gateway
- **Python**: Machine learning integrations, local model adapters, evaluation harness
- **Go** (future): High-performance agent runner and task scheduler

We need to decide between:
1. **Monorepo**: Single repository with all services
2. **Polyrepo**: Multiple repositories, one per service

Key requirements:
- Share common configuration (linting, formatting, CI/CD)
- Enable atomic cross-service changes
- Support different package managers (pnpm for TypeScript, uv for Python)
- Maintain fast CI/CD pipelines
- Allow independent service versioning when needed

## Decision

We will use a **monorepo structure** with **polyglot workspace support**:

**Repository Structure**:
```
jesus/
├── apps/                    # Deployable applications
│   ├── mcp-server/         # TypeScript - Model Context Protocol server
│   ├── agent-runner/       # Go - Agent execution service
│   ├── api-gateway/        # TypeScript - REST/gRPC gateway
│   ├── web-dashboard/      # TypeScript - React UI
│   └── cli/                # TypeScript - CLI tool
├── packages/               # Shared TypeScript libraries
│   ├── logging/            # Structured logging with correlation IDs
│   ├── observability/      # Metrics, traces, health checks
│   ├── types/              # Shared TypeScript types
│   └── config/             # Configuration schemas
├── python-packages/        # Shared Python libraries
│   ├── jesus-adapters/     # Model adapter SDK
│   ├── jesus-eval/         # Evaluation framework
│   └── jesus-ml/           # ML utilities
├── infra/                  # Infrastructure as Code
│   ├── helm/               # Kubernetes Helm charts
│   ├── terraform/          # Cloud infrastructure
│   └── docker/             # Dockerfiles and compose files
├── docs/                   # Documentation
├── examples/               # Example workflows and tutorials
├── tools/                  # Development and build tools
└── .github/                # CI/CD workflows
```

**Package Managers**:
- **pnpm workspaces**: For TypeScript/JavaScript packages
- **uv workspaces**: For Python packages (when available) or Poetry
- **Go modules**: Standard Go dependency management

## Consequences

### Positive

1. **Atomic Changes**: Make cross-service changes in a single PR with guaranteed consistency
2. **Shared Tooling**: Single set of linting, formatting, and CI configuration
3. **Simplified Dependencies**: Shared packages updated automatically across all services
4. **Better Refactoring**: Easy to trace and update all usages of shared code
5. **Unified CI/CD**: Single pipeline with smart caching and change detection
6. **Code Reuse**: Easier to share utilities, types, and configurations
7. **Developer Experience**: Clone once, see entire platform

### Negative

1. **Repository Size**: Larger clone times and disk usage
2. **CI Complexity**: Need smart pipelines to avoid testing unchanged services
3. **Access Control**: Cannot easily restrict access to specific services
4. **Git History**: Noisier commit history with all services
5. **Tooling Constraints**: Need tools that support monorepo patterns

### Mitigation Strategies

1. **Change Detection**: Use Turborepo/Nx to run tasks only for affected packages
2. **Shallow Clones**: Configure CI to use shallow clones (`--depth=1`)
3. **Caching**: Aggressive caching of build artifacts and dependencies
4. **CODEOWNERS**: Use GitHub CODEOWNERS for service-specific reviews
5. **Independent Versioning**: Use Lerna/Changesets for independent package versions

## Alternatives Considered

### Alternative 1: Polyrepo (Multiple Repositories)
- **Pros**: Service independence, smaller repos, simpler CI per service
- **Cons**: Cross-service changes require multiple PRs, duplicate tooling, version drift
- **Rejected**: Too much coordination overhead for tightly coupled services

### Alternative 2: Monorepo with Single Language
- **Pros**: Simpler tooling, uniform development experience
- **Cons**: Not pragmatic - wrong tool for each job (TypeScript for ML, Python for web UI)
- **Rejected**: Language-specific strengths are important

### Alternative 3: Hybrid (Monorepo + Extracted Services)
- **Pros**: Core in monorepo, optional services in separate repos
- **Cons**: Adds complexity, unclear boundaries for what belongs where
- **Rejected**: Premature optimization, can extract later if needed

## Implementation Details

### Workspace Configuration

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json**:
```json
{
  "name": "jesus-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

**Python Workspace** (using uv or pyproject.toml):
```toml
[tool.uv.workspace]
members = ["python-packages/*"]
```

### CI/CD Strategy

**GitHub Actions with Change Detection**:
```yaml
- name: Get changed packages
  uses: tj-actions/changed-files@v40
  with:
    files: |
      apps/**
      packages/**

- name: Run tests for affected
  run: pnpm turbo run test --filter=...[HEAD^]
```

### Versioning Strategy

- **Independent Versioning**: Each app/package can version independently
- **Tool**: Changesets for TypeScript, setuptools-scm for Python
- **Releases**: Automated via CI with conventional commits

## Review Date

This decision should be reviewed:
- After 6 months (2026-04-03)
- If team size exceeds 20 developers
- If CI times exceed 15 minutes consistently

## References

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Google's Monorepo Philosophy](https://research.google/pubs/pub45424/)
- [Nx Monorepo Tools](https://nx.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
