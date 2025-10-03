# Architecture Documentation

This directory contains C4 architecture diagrams for the Jesus AI agent orchestration platform.

## C4 Model Overview

The C4 model provides a hierarchical set of architecture diagrams:

1. **System Context (C1)**: High-level view of the platform and its interactions with external systems
2. **Container (C2)**: Major services, applications, and data stores within the platform
3. **Component (C3)**: Internal components within key containers (Runner, Router, MCP Server)

## Diagrams

### C1: System Context Diagram
**File**: `c1-system-context.mmd`

Shows Jesus platform interactions with:
- **Users**: Developers, Operators, AI Agents
- **Model Providers**: Anthropic, OpenAI, Local Models
- **External Services**: GitHub, OIDC, Secret Store, Object Storage
- **Observability**: Prometheus, Grafana, ELK/Cloud Logging

### C2: Container Diagram
**File**: `c2-container.mmd`

Key containers:
- **Client Layer**: CLI, Web Dashboard, API Clients
- **API Gateway**: REST/gRPC with authentication
- **Core Services**: Model Router, Agent Runner, Task Scheduler
- **Model Adapters**: Anthropic, OpenAI, Local (llama.cpp/vLLM)
- **MCP Server**: JSON-RPC 2.0 with filesystem, GitHub, and test runner tools
- **Support Services**: Budget tracking, artifact storage, logging with PII redaction
- **Data Stores**: Task Queue (Redis/RabbitMQ), Metadata DB (PostgreSQL), Artifact Store (S3)

### C3: Component Diagram
**File**: `c3-component.mmd`

Detailed breakdowns:

**Agent Runner Service**:
- API Layer: gRPC/REST endpoints, health checks
- Execution Engine: Task executor, retry logic, dependency graph resolution
- State Management: State machine (PENDING→RUNNING→DONE), context management
- Integration: Router client, MCP client, artifact client
- Observability: Metrics (Prometheus), traces (OpenTelemetry), structured logging

**Model Router Service**:
- Routing Engine: Route selection, fallback chains, load balancing
- Adapter Management: Plugin registry, health checking, rate limiting
- Cost Tracking: Token counting, cost calculation per provider

**MCP Server**:
- Protocol Layer: JSON-RPC 2.0 handler, dynamic tool registry
- Tool Implementations: Filesystem, GitHub operations, test runner
- Security Layer: Path validation, secret scanning

## Rendering Diagrams

These diagrams use Mermaid syntax and can be rendered in:

1. **GitHub**: View `.mmd` files directly on GitHub
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: https://mermaid.live/
4. **Documentation Sites**: Docusaurus, MkDocs with mermaid plugin

## Architecture Principles

1. **Modularity**: Clear separation of concerns between services
2. **Pluggability**: Model adapters are interchangeable plugins
3. **Fail-Safe**: Explicit fallback chains for graceful degradation
4. **Observable**: All operations emit metrics, logs, and traces
5. **Secure**: PII redaction, secret management, path validation
6. **Cost-Aware**: Track spending at every level
7. **Cloud-Native**: Kubernetes-first with horizontal scaling

## Related Documentation

- [Charter](../charter.md): Vision, scope, NFRs, SLAs, risks
- [ADRs](../adr/): Architecture decision records
- [API Reference](../api/): Generated API documentation (coming soon)
