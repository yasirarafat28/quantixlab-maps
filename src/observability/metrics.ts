import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'qlm_' });
export const requests = new Counter({
  name: 'qlm_http_requests_total', help: 'Gateway HTTP requests', labelNames: ['operation', 'status', 'project'], registers: [registry],
});
export const latency = new Histogram({
  name: 'qlm_http_request_duration_seconds', help: 'Gateway request latency', labelNames: ['operation'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20], registers: [registry],
});
export const active = new Gauge({
  name: 'qlm_http_active_requests', help: 'Active requests', labelNames: ['operation'], registers: [registry],
});
export const upstreamLatency = new Histogram({
  name: 'qlm_upstream_request_duration_seconds', help: 'Provider request latency', labelNames: ['provider'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20], registers: [registry],
});
export const upstreamFailures = new Counter({
  name: 'qlm_upstream_failures_total', help: 'Provider request failures', labelNames: ['provider', 'kind'], registers: [registry],
});
export const rateLimitRejections = new Counter({
  name: 'qlm_rate_limit_rejections_total', help: 'Rejected requests', labelNames: ['operation'], registers: [registry],
});
export const providerReady = new Gauge({
  name: 'qlm_provider_ready', help: 'Provider readiness', labelNames: ['provider'], registers: [registry],
});
export const datasetAge = new Gauge({ name: 'qlm_dataset_age_seconds', help: 'Age of the active dataset', registers: [registry] });
export const datasetInfo = new Gauge({ name: 'qlm_dataset_info', help: 'Active dataset metadata', labelNames: ['release'], registers: [registry] });
