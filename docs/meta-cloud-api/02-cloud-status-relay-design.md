# OSDSarvaya Cloud Status Relay — Component Design
Component owner: OSDuo · Deploys to: OSDuo cloud (single small VPS) · Related: `01-audit-and-plan.md §9`

## 1. Purpose
A narrow webhook **transport** service between Meta and independent OSDSarvaya installs.
It is NOT an OSDSarvaya backend: no contacts, no campaigns, no message content.
Each customer installation remains fully independent; the relay only carries
delivery-status events the customer's instance cannot otherwise receive
(on-prem servers have no inbound HTTPS from Meta).

## 2. Topology
```
Meta Cloud API (per-customer Meta App)
      │ HTTPS webhook POST (X-Hub-Signature-256)
      ▼
osdsarvaya-status-relay   (public HTTPS, OSDuo-hosted)
      │ store, dedupe, retain (retry/DLQ per policy)
      ▼
Customer OSDSarvaya instance ── outbound scheduled pull (HTTPS + API key) ──▶ relay
      │
      └─ process → message_delivery_events → campaign reports / notification_log → POST /ack (cursor advance)
```

## 3. Meta webhook handling
| Concern | Decision |
|---|---|
| Callback URL | `https://relay.<osduo-domain>/meta/<install_id>` — path carries the install so one Meta-app config maps to exactly one relay tenant |
| GET verify | `hub.mode=subscribe`, `hub.challenge` echo; verify token comes from relay's install registry (per-Meta-app record) |
| POST authenticity | `X-Hub-Signature-256` = HMAC-SHA256(raw body, **per-customer Meta App secret**). Timing-safe compare. Body stored verbatim until processed (parse afterwards) |
| Change notifications | `messages` field only; `message_statuses` objects parsed (wamid, status, timestamp, errors, recipient_id masked at rest) |
| PII minimization | Store wamid, status enum, timestamps, error codes/titles, and the raw payload only for the retention window needed for replay; **no message content ever passes through relay in statuses** |
| Ordering | Accept out-of-order; instances reconcile by `(wamid, status, timestamp)` monotonic rules |
| Duplicates | Dedupe key `(install_id, wamid, status, timestamp)` unique in store; replays are no-ops |

## 4. Instance-facing Pull API (outbound only from customer)
Auth: per-install API key (`RELAY_API_KEY`), stored hashed by relay; all requests HMAC-signed
(`X-OSD-Install`, `X-OSD-Timestamp`, `X-OSD-Signature` = HMAC(key, `${method}${path}${timestamp}${body}`))
to prevent shoulder-surf/replay on the polling channel.

| Endpoint | Behaviour |
|---|---|
| `GET /v1/events?cursor=<opaque>&limit=` | Events with `_seq > cursor` in stable ascending order; server-side filter by install; `hasMore` hint |
| `POST /v1/ack` `{cursor}` | Advances the durable cursor atomically; idempotent (rewinds-safe: ack only moves forward, cursor not strictly) |
| `GET /v1/health` `<no auth>` | Liveness + backlog metrics (no PII) |
| `POST /v1/registerkeys` | Admin-only: rotate per-install API key |

Processing model: instance pulls every 5–10 s (jittered) while connected; exponential backoff on relay outage; events processed sequentially per install; statuses applied to `message_delivery_events` + reports **idempotently** (S-5/D6). Un-acked events remain in store until TTL retention expires (default 7 d, configurable per install).

## 5. Data, retention & compliance
- Durable store: SQLite (start) with WAL — sized for ~10⁵ events/day; Postgres migration path documented, not implemented initially.
- Retention default 7 d; max per config; purge job + manual purge API (admin).
- Durable queue semantics: acknowledge-after-process (never after receive). Relay retry/DLQ alarms if backlog > N.
- Data protection: encryption at rest via relay master key (envelope-encrypt payload); TLS 1.2+ for all endpoints.
- Access control: per-install API keys rotateable; Meta app secrets stored ENCRYPTED; ops access recorded in an audit log; no message content in Relay logs.

## 6. Ops runbook (owner: OSDuo)
- Deploy: Docker image `ghcr.io/devosduotech/osdsarvaya-status-relay:<tag>`; systemd/one-VPS; `docker compose` provided alongside repo docs.
- Monitoring: backlog size, DLQ count, webhook latency p95, error rate by install, disk use; alert on backlog > threshold for 10 min.
- Cost: single small VPS shared across installs (independent of customer count scaling; horizontal scale-out documented if needed).
- Failure modes: Meta unreachable (relay retries GET/POST streaming), store full (alarms + purge), instance offline (events retained until retention expiry — reporting gap documented to admin, reconciliation on recovery).

## 7. Acceptance criteria (relay)
1. Verify GET challenge with per-app token; reject wrong token without echo.
2. Reject POST with missing/invalid `X-Hub-Signature-256` (400, logged, stored count only).
3. Duplicate Meta deliveries produce exactly one stored event per dedupe key.
4. Pull returns events in stable order and only for the authenticated install.
5. Cursor advance is atomic & idempotent; a crashed instance resumes exactly where it left.
6. Retention purge removes only processed/expired events; nothing unsent to instances older than retention is silently dropped without ops visibility (alarms).
7. Keys rotate without downtime (old key accepted for `X-OSD-Signature` for ≤ configured overlap window).
8. Ops can register a new install with `install_id`, `meta_app_secret`, `phone_number_id` mapping in one admin call; no relays restart required.
9. Load test: 1000 events/min sustained, 3 install identities concurrent, zero data loss, backlog drains < 60 s post-recovery.

## 8. Out of scope (deliberately)
- Multi-tenancy for OSDSarvaya itself; relay is transport-only.
- Interactive message rendering, campaign retries, template management — these act in the app instances, not the relay.
- Push-through-tunnels to customer networks (superseded by pull model).
