# ADR-005: Task Queue Technology Selection

**Status**: Accepted
**Date**: 2025-10-03
**Authors**: Jesus Platform Team
**Relates to**: Issue #9

## Context

The Jesus platform requires a robust task queue to manage agent execution:
- **Scale**: Support 1,000+ concurrent tasks
- **Priority**: Multiple priority lanes (P0-P3) with fair scheduling
- **Durability**: No task loss on service restart or failure
- **GPU-Aware**: Route tasks to nodes with available GPU resources
- **Observability**: Track queue depth, processing time, and throughput
- **Retry Logic**: Automatic retry with exponential backoff
- **Dead Letter Queue**: Capture permanently failed tasks

Options to consider:
1. **Redis**: In-memory, fast, simple, but durability concerns
2. **RabbitMQ**: Feature-rich, durable, complex operations
3. **Kafka**: High throughput, durable, heavy-weight
4. **Cloud Queues**: SQS, Pub/Sub (cloud-specific)
5. **Database Queue**: PostgreSQL-based (simple, but slower)

## Decision

We will use **Redis** with **persistence enabled** as our task queue, supplemented by **PostgreSQL** for task metadata and audit trail.

### Architecture

```
┌──────────────────────────────────────────────────┐
│ Task Submission (API Gateway / CLI)              │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Task Scheduler Service                           │
│ - Validate task                                  │
│ - Assign priority                                │
│ - Check budget                                   │
│ - Write to PostgreSQL (task metadata)            │
│ - Enqueue to Redis (by priority)                 │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Redis (Task Queues)                              │
│ ┌──────────────────────────────────────────────┐ │
│ │ Queue: tasks:p0 (critical)                   │ │
│ │ Queue: tasks:p1 (high)                       │ │
│ │ Queue: tasks:p2 (normal)                     │ │
│ │ Queue: tasks:p3 (low)                        │ │
│ │ Queue: tasks:dlq (dead letter)               │ │
│ └──────────────────────────────────────────────┘ │
│ Persistence: AOF + RDB snapshots                 │
│ Replication: Redis Sentinel (3+ nodes)          │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Agent Runner Workers (Multiple Pods)             │
│ - BLPOP from queues (P0 → P1 → P2 → P3)         │
│ - Execute task (with retry logic)               │
│ - Update PostgreSQL status                      │
│ - Publish metrics to Prometheus                 │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ PostgreSQL (Task Metadata & Audit Trail)         │
│ - task_id, status, retries, created_at, etc.    │
│ - Provides queryable task history                │
│ - Source of truth for task state                │
└──────────────────────────────────────────────────┘
```

### Queue Operations

**Enqueue** (with priority):
```typescript
async function enqueueTask(task: Task): Promise<void> {
  const queueKey = `tasks:p${task.priority}`;

  // 1. Write to PostgreSQL (source of truth)
  await db.query(
    'INSERT INTO tasks (id, priority, status, payload) VALUES ($1, $2, $3, $4)',
    [task.id, task.priority, 'pending', task]
  );

  // 2. Enqueue to Redis
  await redis.rpush(queueKey, task.id);

  // 3. Emit metric
  taskQueueDepth.labels({ priority: `p${task.priority}` }).inc();
}
```

**Dequeue** (priority-based):
```typescript
async function dequeueTask(): Promise<Task | null> {
  // Poll queues in priority order with timeout
  const [queueKey, taskId] = await redis.blpop(
    'tasks:p0', 'tasks:p1', 'tasks:p2', 'tasks:p3',
    30 // 30 second timeout
  );

  if (!taskId) return null;

  // Fetch full task from PostgreSQL
  const task = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);

  // Update status to running
  await db.query(
    'UPDATE tasks SET status = $1, started_at = $2 WHERE id = $3',
    ['running', new Date(), taskId]
  );

  return task.rows[0];
}
```

**Retry** (on failure):
```typescript
async function handleTaskFailure(task: Task, error: Error): Promise<void> {
  const maxRetries = 3;
  const retryCount = task.retries + 1;

  if (retryCount <= maxRetries) {
    // Exponential backoff: 2^retries seconds
    const delaySeconds = Math.pow(2, retryCount);

    await db.query(
      'UPDATE tasks SET retries = $1, status = $2 WHERE id = $3',
      [retryCount, 'retrying', task.id]
    );

    // Re-enqueue after delay using Redis ZADD (sorted set by timestamp)
    const executeAt = Date.now() + (delaySeconds * 1000);
    await redis.zadd('tasks:delayed', executeAt, task.id);
  } else {
    // Move to dead letter queue
    await redis.rpush('tasks:dlq', task.id);
    await db.query(
      'UPDATE tasks SET status = $1, error = $2 WHERE id = $3',
      ['failed', error.message, task.id]
    );
  }
}
```

### Redis Configuration

```yaml
# Persistence (Append-Only File + Snapshots)
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec  # Fsync every second (balance durability/performance)

# RDB Snapshots (backup)
save 900 1      # After 900s if at least 1 key changed
save 300 10     # After 300s if at least 10 keys changed
save 60 10000   # After 60s if at least 10000 keys changed

# Replication (Redis Sentinel for HA)
sentinel monitor jesus-queue redis-master 6379 2
sentinel down-after-milliseconds jesus-queue 5000
sentinel failover-timeout jesus-queue 10000
```

## Consequences

### Positive

1. **Performance**: Redis offers <1ms latency for queue operations
2. **Simple Operations**: No complex queue semantics, easy to reason about
3. **Priority Queues**: Native support via multiple lists + BLPOP
4. **Kubernetes Native**: Easy to deploy via Helm (redis-ha chart)
5. **Observability**: Built-in INFO metrics, Prometheus exporter available
6. **Delayed Tasks**: ZADD sorted sets for scheduled/retry tasks
7. **Low Resource Usage**: Minimal memory footprint compared to Kafka/RabbitMQ
8. **Ecosystem**: Mature client libraries for all languages

### Negative

1. **Durability Trade-off**: AOF with `everysec` can lose 1s of tasks on crash
2. **Single-Threaded**: Redis is single-threaded (though very fast)
3. **Memory Bound**: Large queues consume RAM (mitigated by persistence)
4. **No Built-in Retries**: Must implement retry logic ourselves
5. **Limited Query**: Cannot query queue contents easily (use PostgreSQL for that)

### Mitigation Strategies

1. **Dual-Write Pattern**: Always write to PostgreSQL first, Redis second
2. **Sentinel for HA**: Use Redis Sentinel with 3+ nodes for automatic failover
3. **Monitoring**: Alert on queue depth > threshold to detect processing issues
4. **Dead Letter Queue**: Capture failed tasks for manual inspection
5. **PostgreSQL as Source of Truth**: Use Redis as fast queue, PostgreSQL for durability

## Alternatives Considered

### Alternative 1: RabbitMQ
- **Pros**: Durable by default, rich features (TTL, dead letters, priority), AMQP standard
- **Cons**: More complex operations, higher resource usage, slower than Redis
- **Rejected**: Overkill for our use case, prefer simplicity

### Alternative 2: Apache Kafka
- **Pros**: High throughput, durable, distributed, supports millions of messages
- **Cons**: Heavy-weight, complex setup, overkill for task queue (better for event streaming)
- **Rejected**: Too complex for current scale (1k tasks, not millions)

### Alternative 3: AWS SQS / GCP Pub/Sub
- **Pros**: Fully managed, auto-scaling, pay-per-use, no ops burden
- **Cons**: Cloud-specific (multi-cloud goal), higher latency (100ms+), unpredictable costs
- **Rejected**: Prefer self-hosted for multi-cloud portability

### Alternative 4: PostgreSQL LISTEN/NOTIFY + Table Queue
- **Pros**: No additional infrastructure, ACID guarantees, simple queries
- **Cons**: Not designed for high-throughput queues, locking contention, slower
- **Rejected**: Cannot meet 1k concurrent task requirement

### Alternative 5: BullMQ (Redis-based queue library)
- **Pros**: Built on Redis, TypeScript-native, built-in retries, delayed jobs, priority
- **Cons**: Another abstraction layer, specific to Node.js
- **Considered**: May adopt BullMQ as implementation detail, but Redis is foundation

## GPU-Aware Scheduling

For GPU resource awareness, we'll use **Kubernetes Node Labels + Affinity**:

```yaml
# Label GPU nodes
kubectl label nodes gpu-node-1 gpu=nvidia-a100
kubectl label nodes gpu-node-2 gpu=nvidia-a100

# Task requests GPU via annotation
task:
  id: task-123
  gpu_required: true
  gpu_type: "nvidia-a100"  # Optional: specific GPU type
  gpu_memory: "40GB"

# Runner Pod uses Node Affinity
apiVersion: v1
kind: Pod
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: gpu
            operator: In
            values:
            - nvidia-a100
  containers:
  - name: runner
    resources:
      limits:
        nvidia.com/gpu: 1
```

**Scheduler Logic**:
1. Task specifies GPU requirement in metadata
2. Scheduler queries Kubernetes API for available GPU nodes
3. Only enqueue GPU tasks if GPU capacity available
4. Runner pods request GPU via resource limits
5. Kubernetes schedules pod to appropriate node

## Implementation Plan

### Week 5: Redis Setup
- Deploy Redis with Sentinel (Helm chart: redis-ha)
- Configure AOF persistence + RDB snapshots
- Create priority queue structure (p0, p1, p2, p3, dlq)
- Set up Prometheus exporter for Redis metrics

### Week 6: Scheduler Service
- Implement task validation and priority assignment
- Dual-write to PostgreSQL + Redis
- Budget checking before enqueue
- Dead letter queue handling

### Week 7: Worker Implementation
- BLPOP from priority queues
- Retry logic with exponential backoff
- PostgreSQL status updates
- Graceful shutdown (finish current task)

### Week 8: GPU Awareness
- Kubernetes node labeling
- GPU capacity tracking
- Task → Node affinity mapping
- GPU utilization metrics

## Metrics to Track

```prometheus
# Queue depth by priority
task_queue_depth{priority="p0"} 5
task_queue_depth{priority="p1"} 23
task_queue_depth{priority="p2"} 145

# Task processing time
task_processing_duration_seconds{priority="p1", status="completed"} 12.5

# Task throughput
task_dequeue_total{priority="p1"} 1523

# Dead letter queue
task_dlq_total{reason="max_retries"} 7

# Redis health
redis_connected_clients 42
redis_used_memory_bytes 2147483648
redis_uptime_seconds 86400
```

## Review Date

This decision should be reviewed:
- After 3 months of production use (2026-01-03)
- If queue depth consistently exceeds 10k tasks
- If Redis becomes performance bottleneck

## References

- [Redis Persistence](https://redis.io/docs/management/persistence/)
- [Redis Sentinel](https://redis.io/docs/management/sentinel/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Kubernetes GPU Scheduling](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
