# ADR-054: Observability & Alerting Architecture

## Status
Accepted

## Context
Production remote-support operations require real-time visibility into active connection counts, HTTP error rates, memory footprint, and WebRTC relay quality.

## Decision
We implement a unified telemetry stack:
1. Standardized `/health` (deep dependency check), `/ready` (readiness probe), and `/live` (liveness probe) endpoints across all backend services.
2. Standard Prometheus metric format (`/metrics`) exposed by API and Signaling services tracking request counts, error counts, active sessions, and ICE candidate exchange rates.
3. Prometheus alerting rules (`alerts.yml`) configured with AlertManager webhook dispatching for error rates > 5% and excessive resource consumption.

## Consequences
- Continuous monitoring of service health and quick detection of degradations.
- Out-of-the-box integration with Prometheus, Grafana, and Kubernetes operators.
