# ADR-004: Observability Stack - Prometheus, OpenTelemetry, Grafana

**Status**: Accepted
**Date**: 2025-10-03
**Authors**: Jesus Platform Team
**Relates to**: Issues #22, #23

## Context

The Jesus platform requires comprehensive observability to:
1. **Monitor**: Real-time metrics for system health (QPS, latency, errors)
2. **Debug**: Distributed tracing across services (router → adapter → model API)
3. **Analyze**: Cost tracking (tokens, API calls) and usage attribution
4. **Alert**: Proactive notifications for SLO violations
5. **Audit**: Immutable logs with PII redaction for compliance

Key requirements:
- **Cloud-native**: Kubernetes-compatible with auto-discovery
- **Open standards**: Avoid vendor lock-in
- **Low overhead**: <5% performance impact
- **Long-term storage**: 90 days metrics, 30 days traces, 180 days logs
- **Multi-environment**: Dev, staging, prod with different retention policies

We need to choose between:
- Proprietary: DataDog, New Relic, Dynatrace (expensive, vendor lock-in)
- Open Source: Prometheus + OpenTelemetry + Grafana (flexible, self-hosted)
- Cloud Managed: AWS CloudWatch, GCP Operations (cloud-specific)

## Decision

We will adopt an **open-source observability stack** based on:

1. **Prometheus**: Metrics collection and alerting
2. **OpenTelemetry**: Distributed tracing and instrumentation
3. **Grafana**: Dashboards and visualization
4. **Loki** (optional): Log aggregation optimized for Kubernetes
5. **Tempo** (optional): Trace storage backend

### Architecture

```
┌─────────────────────────────────────────────────────┐
│ Jesus Services (Router, Runner, Adapters, MCP)      │
│                                                       │
│  ┌──────────────────────────────────────┐            │
│  │ OpenTelemetry SDK                     │            │
│  │ - Metrics (Prometheus format)         │            │
│  │ - Traces (OTLP protocol)              │            │
│  │ - Structured Logs (JSON + context)    │            │
│  └──────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ OpenTelemetry Collector (Kubernetes DaemonSet)      │
│ - Receive: OTLP, Prometheus, Jaeger                 │
│ - Process: Sampling, filtering, enrichment          │
│ - Export: Prometheus, Tempo, Loki                   │
└─────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Prometheus   │  │ Tempo        │  │ Loki         │
│ (Metrics)    │  │ (Traces)     │  │ (Logs)       │
│              │  │              │  │              │
│ - TSDB       │  │ - S3 backend │  │ - S3 backend │
│ - 90d retain │  │ - 30d retain │  │ - 180d retain│
└──────────────┘  └──────────────┘  └──────────────┘
         │                │                │
         └────────────────┴────────────────┘
                       ▼
              ┌──────────────────┐
              │ Grafana          │
              │ - Dashboards     │
              │ - Alerts         │
              │ - Explore        │
              └──────────────────┘
```

### Instrumentation Standards

**Metrics** (Prometheus format):
```typescript
// Service-level metrics
http_requests_total{service="router", method="POST", path="/route", status="200"}
http_request_duration_seconds{service="router", method="POST", path="/route"}

// Business metrics
model_requests_total{provider="anthropic", model="claude-3-5-sonnet", status="success"}
model_tokens_total{provider="anthropic", model="claude-3-5-sonnet", type="input"}
model_cost_usd_total{provider="anthropic", model="claude-3-5-sonnet"}
task_duration_seconds{status="completed", priority="p1"}

// Resource metrics
gpu_utilization_percent{device="0", model="llama-3.1-70b"}
task_queue_depth{priority="p1"}
```

**Traces** (OpenTelemetry semantic conventions):
```typescript
// Span hierarchy
Span: task.execute (root)
  ├─ Span: router.select_model
  │   └─ Span: adapter.health_check
  ├─ Span: adapter.complete
  │   ├─ Span: http.client (to Anthropic API)
  │   └─ Span: cost.calculate
  └─ Span: artifact.store

// Span attributes
{
  "service.name": "agent-runner",
  "task.id": "task-12345",
  "correlation.id": "abc-def-ghi",
  "model.provider": "anthropic",
  "model.id": "claude-3-5-sonnet-20241022",
  "tokens.input": 1234,
  "tokens.output": 567,
  "cost.usd": 0.0234
}
```

**Logs** (Structured JSON):
```json
{
  "timestamp": "2025-10-03T12:34:56.789Z",
  "level": "info",
  "service": "agent-runner",
  "correlation_id": "abc-def-ghi",
  "task_id": "task-12345",
  "message": "Task completed successfully",
  "duration_ms": 2345,
  "model": "claude-3-5-sonnet",
  "tokens": { "input": 1234, "output": 567 },
  "cost_usd": 0.0234,
  "pii_redacted": true
}
```

## Consequences

### Positive

1. **Vendor Neutral**: Open standards, no lock-in, works anywhere
2. **Cost Effective**: Self-hosted, no per-metric pricing, predictable costs
3. **Kubernetes Native**: First-class support for service discovery and auto-scaling
4. **Rich Ecosystem**: Large community, extensive integrations, mature tooling
5. **Flexible Retention**: Configure per environment (dev: 7d, prod: 90d)
6. **Correlation**: Link metrics, traces, and logs via correlation IDs
7. **Alerting**: Prometheus AlertManager with multi-channel notifications
8. **Dashboards**: Pre-built Grafana dashboards, version-controlled JSON

### Negative

1. **Operational Burden**: Must manage Prometheus, Tempo, Loki, Grafana ourselves
2. **Storage Costs**: Long retention requires significant disk/S3 storage
3. **Learning Curve**: Team must learn PromQL, LogQL, Grafana query languages
4. **No Built-in APM**: Unlike DataDog, no out-of-box application performance monitoring
5. **Configuration Complexity**: Many components to configure and maintain

### Mitigation Strategies

1. **Managed Options**: Use Grafana Cloud for non-production environments to reduce ops burden
2. **Tiered Storage**: Hot data in SSD, cold data in S3 with lifecycle policies
3. **Training**: Invest in team training for observability stack
4. **Helm Charts**: Use community Helm charts (kube-prometheus-stack, tempo, loki)
5. **Automation**: Infrastructure as Code (Terraform) for entire stack

## Alternatives Considered

### Alternative 1: DataDog (Full APM Suite)
- **Pros**: Turnkey solution, excellent UX, ML-powered insights, no ops burden
- **Cons**: Expensive ($31/host/month + $5/million spans), vendor lock-in, unclear pricing at scale
- **Rejected**: Cost prohibitive at scale, prefer open source

### Alternative 2: AWS CloudWatch + X-Ray
- **Pros**: Fully managed, integrates with AWS services, no infrastructure
- **Cons**: AWS-only, expensive for high cardinality metrics, poor query language
- **Rejected**: Multi-cloud requirement, limited flexibility

### Alternative 3: Elastic Stack (ELK)
- **Pros**: Unified logging and metrics, powerful search, familiar tooling
- **Cons**: Heavy resource usage, complex licensing (Elastic License vs SSPL), not Prometheus-native
- **Rejected**: Prefer Prometheus standard, licensing concerns

### Alternative 4: Jaeger + Prometheus + ELK (Best of Breed)
- **Pros**: Mature tools, well-documented, large ecosystems
- **Cons**: More components to manage, different query languages
- **Rejected**: OpenTelemetry unifies Jaeger use case

## Implementation Plan

### Phase 1: Metrics (Week 7)
- Deploy Prometheus via kube-prometheus-stack Helm chart
- Instrument services with OpenTelemetry Metrics SDK
- Create initial Grafana dashboards (system health, HTTP metrics)
- Configure AlertManager for critical alerts (service down, high error rate)

### Phase 2: Tracing (Week 8)
- Deploy Tempo with S3 backend
- Deploy OpenTelemetry Collector as DaemonSet
- Instrument services with OpenTelemetry Tracing SDK
- Create trace-based dashboards (latency breakdown, error traces)

### Phase 3: Logging (Week 9)
- Deploy Loki with S3 backend
- Implement structured logging library with PII redaction
- Ship logs via Promtail or OpenTelemetry Collector
- Create log exploration dashboards

### Phase 4: Dashboards & Alerts (Week 10)
- Business metrics: cost per task, tokens per model, queue depth
- SLO dashboards: uptime, P95 latency, error rate
- Cost dashboards: spend by provider, user, team
- Alert rules: SLO violations, budget thresholds, anomaly detection

### Helm Chart Example

```yaml
# infra/helm/values/prometheus.yaml
kube-prometheus-stack:
  prometheus:
    prometheusSpec:
      retention: 90d
      storageSpec:
        volumeClaimTemplate:
          spec:
            resources:
              requests:
                storage: 100Gi

  grafana:
    adminPassword: ${GRAFANA_ADMIN_PASSWORD}
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus:9090
      - name: Tempo
        type: tempo
        url: http://tempo:3100
      - name: Loki
        type: loki
        url: http://loki:3100

    dashboardProviders:
      - name: 'jesus-dashboards'
        folder: 'Jesus Platform'
        type: file
        options:
          path: /var/lib/grafana/dashboards/jesus

  alertmanager:
    config:
      route:
        receiver: 'slack'
        group_by: ['alertname', 'cluster', 'service']
      receivers:
        - name: 'slack'
          slack_configs:
            - api_url: ${SLACK_WEBHOOK_URL}
              channel: '#alerts-prod'
```

## Metrics to Collect

### Infrastructure Metrics
- CPU, memory, disk, network per container
- Kubernetes pod/node health
- GPU utilization (NVIDIA DCGM exporter)

### Application Metrics
- HTTP request rate, latency (P50/P95/P99), error rate
- Task queue depth, processing time
- Model adapter health check status

### Business Metrics
- Tasks per hour/day
- Tokens consumed (input/output) per model
- Cost per task, per user, per team
- Model selection frequency (primary vs fallback)

### SLO Metrics
- Availability (uptime %)
- Latency (P95 < 5s)
- Error rate (< 1%)
- Budget utilization (current vs limit)

## Review Date

This decision should be reviewed:
- After 3 months of production use (2026-01-03)
- If operational burden exceeds 1 person-week/month
- If storage costs exceed $500/month

## References

- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Observability Stack](https://grafana.com/oss/)
- [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
