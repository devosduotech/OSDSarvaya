# OSDSarvaya — Meta Cloud API Integration
## First Deliverable: Codebase Audit & Implementation Plan
Status: **approved in principle (2026-11-07) — see §7 Decision log; next step: review of §7–§10 before P1** · Date: 2026-11-07 · Branch target: `develop`

Deployment model agreed: **single business per installation** (customer-owned Meta WABA,
no multi-tenancy). Provider interface stays clean for future channels (email/SMS).

---

## 1. Codebase audit

| Module | Lines | Role / notes |
|---|---|---|
| `server/services/whatsappClient.js` | 334 | whatsapp-web.js session client (LocalAuth under `data/.wwebjs_auth`), status state machine, STOP/START opt-in-out listener, template var application, ready-watchdog |
| `server/services/campaignEngine.js` | 496 | In-process campaign runner. Rate limiting via `settings.messagesPerHour` (1–10000, min 5 s/message + ≤50 % jitter), DISTINCT contact selection across groups, opt-in filter, retry loop (`maxRetries`, retries ONLY failed contacts), queue auto-start of next `Queued` run |
| `server/services/notifyEngine.js` | 258 | `/api/notify` engine. Per-message loop, auto-creates contacts (**auto opted-in — risk F/S-3**), opt-out skip, `notification_log` writes, per-key rate override |
| `server/routes/webhooks.js` | 199 | Customer-registered HTTP webhooks (HMAC-SHA256, SSRF-guarded). **Outbound only** — NOT Meta inbound |
| `server/utils/webhookDispatcher.js` | — | Fan-out of `message.sent/failed`, `campaign.*` events |
| `server/routes/notify.js` | 332 | Notification API endpoints, invalid-URL/misconfig messages, queued notifications |
| `server/server.js` | ~490 | Campaign start/schedule/cancel, queued campaign flush on boot, WhatsApp connect/disconnect, graceful shutdown (KEEPS session) |
| `server/database.js` | 420 | sql.js (!). **Whole DB is an in-memory image; `db.run()` persists by exporting the entire file** — O(n) per write at scale; no indexed message store |
| DB tables | 16 | contacts, groups, group_contacts, campaign_templates, campaign_runs (+external_id), reports, failed_messages, settings, activities, licenses, license_cache, admin_user, app_config, api_keys, webhooks, notification_log |
| Frontend | React/Vite | Settings → WhatsApp page (QR/status), Navbar status pill, Contacts opt-in toggle |

**Test tooling:** jest (`server/tests`) + Playwright infra (`playwright.config.js`, `tests/e2e`).

---

## 2. Sending call-site inventory (verified)

Counts: **12 `sendMessage` sites, 4 `getNumberId` sites, 6 `MessageMedia` sites.**

### campaignEngine.processRun — main loop
| # | Line | Behaviour |
|---|---|---|
| 1 | 158 | `getNumberId` with 30 s race timeout → unregistered ⇒ `failed_messages` entry, no retry-class |
| 2 | 182–183 | Video ⇒ `MessageMedia('application/octet-stream')` **with no caption** |
| 3 | 186–187 | Image/document/pdf ⇒ media + `{ caption }` |
| 4 | 193 | **Attachment-failure fallback:** sends text-only; counts as *sent* |
| 5 | 198 | Plain text send |

### campaignEngine.processRun — retry loop (failed contacts only)
| # | Line | Behaviour |
|---|---|---|
| 6 | 312 | `getNumberId` — no race timeout; unregistered ⇒ silently `continue` (row deleted later on success; on unregistered it stays as failed forever) |
| 7 | 321–322 | Video resend (octet-stream bug repeat) |
| 8 | 324–325 | Media + caption resend |
| 9 | 328 | Text resend |

### notifyEngine
| # | Line | Behaviour |
|---|---|---|
| 10 | 24 | `getNumberId` (30 s race) |
| 11–12 | 37–41 | Video / media+caption send |
| 13 | 44 | Text send |

### Outbound gates
- `notify.js:33,99,205` and `server.js:151` hard-gate on `waStatus !== 'CONNECTED'`.

### Named defects to fix while abstracting (S-numbers)
- **S-1** sends to "not registered" numbers return ≠ actionable error on retry (stays failed forever).
- **S-2** attachment-failure fallback silently re-counts as `sent` (report inaccuracy; also a *cost*/compliance issue).
- **S-3** notify auto-creates contacts opted-in (=1) — violates "no unsolicited messaging" rule.
- **S-4** video always sent as `application/octet-stream` without caption.
- **S-5** no message-ID from provider → delivery can't be correlated post-hoc (status = "fire-and-forget").

---

## 3. Proposed provider interface (approved direction)

```
server/services/whatsapp/
  index.js               // public API consumed by engines
  messageService.js      // sendWhatsAppMessage() + consent projection + logging
  providerFactory.js     // 'session' | 'cloud' from config; explicit, never auto-failover
  sessionProvider.js     // wraps legacy whatsappClient.js (kept, unchanged behaviour)
  cloudProvider.js       // Graph API: text/template/image/document/interactive
  mediaService.js        // upload → media_id cache (per WABA) → reuse
  templateService.js     // sync approved templates from Graph API
  webhookService.js      // inbound Meta webhooks (verify + process async)
  creditMonitor.js       // messaging-limit/quality + error classification
  consentService.js      // pre-send consent validation ledger
```

### messageService contract (typed messages)
```js
sendWhatsAppMessage({
  to,                                  // E.164
  type: 'text' | 'template' | 'image' | 'document' | 'interactive',
  message?,                            // text (24 h service window)
  template?: { name, language, parameters: { body: [...] } },
  media?: { wabaId, mediaId | mimeType, data, filename, caption? },
  metadata: { campaignRunId?, contactId?, apiKeyId?, externalId? }
});
// → { provider(messageId)/handoff, status: 'queued'|'sent'|'failed'|'skipped',
//     providerErrorCode?, providerErrorTitle?, providerDetail? }
validateConsent(to)                     // BEFORE every marketing send
getCampaignPreview({ template, groups })// contacts, eligible, est. cost
```

Rules: messageService owns consent, logging, provider-side error classification,
duplicate reconciliation; engines own pacing/UI only. `providerFactory` resolution
is **explicit config — no automatic fallback** from cloud to session (per F).

---

## 4. Database migration plan

Pattern today: inline `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... try/catch`.
Proposed: first **versioned migrations table** `schema_migrations(version, applied_at)`,
then additive-only migrations (never destructive) excluded from backup restore.

New tables (single-instance scope — one customer, no tenant columns):

| Table | Purpose / key columns |
|---|---|
| `whatsapp_config` | 1-row: provider, phone_number_id, waba_id, graph_version, verified_at, status (+ idempotent-upsert) |
| `whatsapp_templates` | meta_id, name, language, category, component_json, status (synced from Graph API), last_synced_at |
| `whatsapp_media` | file_hash, waba_id, meta_media_id, mime, filename; upload-once cache |
| `whatsapp_activity_ids` | provider message id → run/contact/apiKey correlation; dedupe key |
| `contact_consents` | phone, opted-in/out ledger (source, timestamp, message snapshot) |
| `message_delivery_events` | message_id, status enum(sent/delivered/read/failed), timestamp, error_code/title, received_at |
| `provider_logs` | request/response redacted (token, phone numbers partially masked) |

Extended columns: `notification_log.provider_message_id`, `campaign_runs.provider` snapshot,
`failed_messages` gets `error_code` (transient-vs-permanent classification).

Modifier: `campaign_runs` gains `paused` state + `parentId` for retry segments.

Secret storage: TLS in DB not needed initially (single instance, encrypted at rest is a v2.0.3-goal),
but a dedicated `secrets` table encrypted via `app_config.key` (AES-256-GCM) for the token,
**redacted on every read path; no token in logs/exports/backup files** (filter during export).

---

## 5. API integration plan (Meta Cloud API)

- **Auth:** system-user token (never user token). Stored encrypted; passed from env (`WA_CLOUD_TOKEN`) → optional migration to encrypted per-install config.
- **Endpoints used:** `GET /v{v}/me`, `GET /{phone_number_id}`, `POST /{phone_number_id}/messages`, `POST /{waba_id}/media`, `GET /{waba_id}/message_templates`
- **API version:** configurable via `settings` or env (`GRAPH_API_VERSION`), default = latest stable; pinned at first-run and logged (no implicit auto-bump on major).
- **Webhook verification:** GET `hub.mode=subscribe&hub.verify_token=...` → 200 `hub.challenge`; POST with `X-Hub-Signature-256` HMAC-SHA256 of the raw body using the **Meta app secret** (a second, separate secret from existing OS webhooks). Durable event table + async worker; idempotency via (wamid, event_type, ts) unique constraint.
- **Webhook delivery for on-prem:** customer server usually behind NAT. Options (decision needed):
  - A: **Relay endpoint** on OSDuo infra that forwards to the customer's tunnel (e.g., ngrok/cloudflared/Pinggy); customer connects via a short public tunnel URL during setup
  - B: degrade to "sent" status only (no delivered/read) for on-prem customers
  - C: periodic manual reconciliation only
  - Recommended: A (branding "OSDSarvaya Status Relay" in customer setup wizard).
- **24-hour service window:** template required outside window; UI enforces (disable free-form outside, hint inside).
- **Concurrency:** Graph API is synchronous; current in-process queue with jitter remains valid.
- **Cost estimation:** current Meta pricing = per-message by category (marketing/utility/auth/service), not per-bill-connection-type (rate card varies by country/category; the app surfaces an editable rate card in config; not hardcoded).

---

## 6. Risks & dependencies

| # | Risk | Impact / mitigation |
|---|---|---|
| R1| Webhook reachability for on-prem appliances | Resolved decision: Option A Cloud Status Relay (§7, §9; full design: `02-cloud-status-relay-design.md`) |
| R2| Customer's phone number previously linked elsewhere (incl. old QR session) | Number re-registration required; install migration checklist |
| R3| Meta template approval latency + rejection | Campaign start blocked on approval; UI shows status + alternatives |
| R4| sql.js write-on-revenue-per-message amplifies write IO at scale | Keep `message_delivery_events` bulked; accepted already in ROADMAP v2.2.0; at 10k msg/h it's fine; mitigated by batch writes |
| R5| '#1–#3' audits (default JWT secret, hardcoded ERPNext creds, license routes) remain open | Blocks commercial posture more than Cloud API does; dedicated for v2.0.3 — do not bundle |
| R6| Token leak perimeter grows | System-user token has full WABA; narrow scope, credential isolation, redacted provider_logs redacted per directive) |
| R7| Consent gaps on current data (S-3) and notification auto-opt-in | Add pre-send consent enforcement (order corrected per directive) |
| R8| Single-instance appliances break silently (customer infra) | Add heartbeat + alert email + admin expiry notice surfaced in UI |
| R9| Telegram/other channels later? | Provider interface stays channel-agnostic (decided) |

**Non-negotiables honored:** no auto session-fallback, consent-first, Cloud-API primary.

---

## 7. Decision log — approver conditions (2026-11-07)

| # | Decision | Ruling |
|---|---|---|
| D1 | Webhook strategy | **Option A — Cloud Status Relay** (pull-based; no inbound firewall access for customers). Relay is a narrow, independently deployable transport service — NOT a shared OSDSarvaya backend. Design constraints: §9; full design: `02-cloud-status-relay-design.md` |
| D2 | Token storage | `WA_CLOUD_TOKEN` env var for first release (temporarily approved). Never exposed via settings API/frontend; masked in logs; identifiers (Phone Number ID, WABA ID, Graph version) live in app config. Interface must allow encrypted local secret storage to replace env vars later without changing the provider interface |
| D3 | Release split | **v2.1.0**: Cloud API foundation + consent enforcement + text/template sending + essential delivery tracking/reporting. **v2.2.0**: media-enhancement, advanced reporting, encrypted secret storage UI, integrations. v2.1.0 MUST NOT ship as a partially functional connector |
| D4 | Audit defects S-1…S-5 | **Mandatory** in this track (see §9.3); consent enforcement before campaign execution is enabled |
| D5 | Security criticals (v2.0.3 items) | **Release blocker** for v2.1.0 — fix and release as v2.0.3 first (recommended; ~2–3 d) or fold into v2.1.0. Do not carry unresolved criticals into the new release |
| D6 | Provider rules reaffirmed | No automatic Cloud→session fallback; session provider only as explicitly selected legacy mode; consent + opt-out checked **immediately before every send** (not only at campaign creation); distinguish API-accepted vs sent/delivered/read/failed; idempotent webhook processing |
| D7 | Deployment model | One independent installation per customer with customer-owned WABA; **no multi-tenancy** anywhere in app or relay |
| D8 | Estimates | 13 dev-days = preliminary, subject to relay scope (≈4–5 d + ops) and phase breakdown below |

## 8. Revised release boundaries & acceptance criteria

### 8.1 v2.0.3 — Security criticals (pre-requisite, recommended immediate)
JWT-secret enforcement, ERPNext credential removal/rotation, unauthenticated license routes. Acceptance: security tests added; instance refuses weak secrets; history-rotation plan documented.

### 8.2 v2.1.0 — Cloud API foundation (end-to-end commercial workflow)
Scope: P1 abstraction skeleton → Cloud provider connection + token validation → consent enforcement → template send (sync + variable mapping + 24 h window) → delivery webhook events via relay client → accurate reporting. Includes mandatory S-1, S-2 (never text-fallback-counted-as-sent), S-3, S-4 (correct MIME/caption in the session path at minimum), S-5.

**Acceptance criteria (must all pass on a real Meta Cloud API account + customer-shaped on-prem install):**
1. Configure connection via identifiers + `WA_CLOUD_TOKEN`; connection test validates phone number id and reports account quality/limits; restart keeps config.
2. Verified system-user token works; masked in every diagnostic/log/API response.
3. Templates sync from Meta; campaign selects an approved template; variable mapping UI maps `${contact.*}` to template positional parameters; rejected/missing templates block send with clear UI error.
4. Pre-flight consent gate: every send re-validates consent immediately pre-send; opt-outs suppressed even mid-campaign (S-3), auditable in `contact_consents`.
5. Campaign execution uses cloud provider; per-message provider IDs stored and correlated (S-5); invalid/unregistered numbers are reported **failed/invalid** with a Meta-comparable reason and never silently skipped (S-1).
6. Delivery statuses (accepted/sent/delivered/read/failed with Meta error codes) populate `message_delivery_events` and campaign reports/`notification_log` via the relay pull client; duplicate deliveries do not double-count (idempotency verified by replaying recorded events).
7. Zero automatic session fallback: cloud failure with a session provider configured still surfaces error and DOES NOT switch (negative test exists).
8. Legacy session mode still selectable and functional for QR-based dev/test use.
9. Full test suite green; e2e for happy + failure paths; docs: customer Meta setup guide + relay admin guide.
10. Failure classification: transient → retry per policy; permanent → mark failed; account restriction signals pause the campaign silently to the customer admin (visible status + error).

### 8.3 S-defect sign-offs (in scope of v2.1.0)
| Defect | Required final behaviour (acceptance) |
|---|---|
| S-1 | Number unregistered ⇒ `failed_messages.error_code` set, single classified evaluation, never retried, appears in reports as `invalid_recipient` |
| S-2 | Attachment send failure ⇒ row recorded as `failed` with the original provider error; text-only fallback allowed for *deliberate* marketing choice but must produce `degraded` status, never `sent` |
| S-3 | `/api/notify` & campaign flows never create consent; contact created without marketing consent is excluded from sends until an explicit consent record exists |
| S-4 | Correct MIME detection (video `video/*` upload incl. caption when supported); session path and cloud path share the media pipeline |
| S-5 | Every send records provider message id (`whatsapp_activity_ids`); reconciliation job matches night/day deltas |

### 8.4 v2.2.0 — Enhancement release
Media upload + `whatsapp_media` reuse pipeline (Phase 5 full), interactive messages, cost estimation & analytics (rate card), encrypted secrets UI, provider_logs retention tooling, ERP/CRM integrations, quality/limit monitoring alarms.

## 9. Cloud Status Relay — accepted design constraints
- Pull-based: instances poll on schedule; relay never pushes through customer firewalls.
- Relay stores events durably, keyed by `install_id` (+ phone_number_id mapping), with dedupe-before-store and retry/retention policy; **minimizes PII** (statuses carry wamid/error refs, not message content).
- Distinct secrets: per-install API key for pull/ack; Meta app secret for webhook signature verification; relay verify token for the GET challenge.
- Ops: backlog/dlq alarms, health endpoint, per-install key rotation, retention default 7 d (configurable), DPA note for customer data processing.

## 10. Revised phase breakdown & estimates

### OSDSarvaya application track
| Phase | Scope | Est. | Release |
|---|---|---|---|
| P1 | Provider abstraction skeleton: `services/whatsapp/` package, messageService contract, engines routed through it with behavioral parity (session mode unchanged), S-1/S-2/S-4 fixed in the unified path | 2 d | — (prereq) |
| P2 | Cloud provider: config (`whatsapp_config`), `WA_CLOUD_TOKEN`, connection test & token quality/limit probe, text send | 1 d | v2.1.0 |
| P3 | Consent enforcement: `contact_consents` ledger, pre-send validation hook in messageService (D6), S-3 removal + data backfill, admin UI consent view | 1.5 d | v2.1.0 |
| P4 | Template workflow: `templateService` sync, variable mapping UI, 24 h window enforcement, campaign engine integration | 2 d | v2.1.0 |
| P5 | Delivery pipeline: relay client (pull + ack + cursor), `whatsapp_activity_ids` correlation, `message_delivery_events`, report/log reconciliation, idempotent dedupe (S-5) | 2 d | v2.1.0 |
| P6 | Campaign preview (consent/eligibility counts, message plan), pacing settings repositioning, provider_logs (redacted), pause/resume surface | 1.5 d | v2.1.0 |
| P7 | Tests: unit (provider, consent, classification, dedupe), e2e happy + failure + replay suite, customer Meta setup guide + troubleshooting doc | 1.5 d | v2.1.0 (~9.5 d) |
| P8 | Enhanced media (upload-once `whatsapp_media` cache), interactive messages, cost estimation rate card + analytics | 3 d | v2.2.0 |
| P9 | Encrypted secrets storage (replace env token via UI), quality/limit monitoring alarms, per-install ops hardening | 2 d | v2.2.0 |

### Cloud Status Relay track (independently deployable component)
| Item | Scope | Est. |
|---|---|---|
| R-1 | Deployable Node service skeleton, multi-install routing by `install_id`, health/metrics endpoints | 1 d |
| R-2 | Meta webhook endpoint: GET verify (per-app token), POST signature verify, canonical parse, dedupe-before-store, durable event store (SQLite/Postgres) | 1.5 d |
| R-3 | Pull API: `GET /events?cursor` + `POST /ack` with per-install API key (hashed), request signing, rate limits | 1 d |
| R-4 | Retention/retry/DLQ policies, backlog alarms, ops runbook + deployment guide | 1 d |
| **Relay total** | | **~4.5 d + ops setup** |

**Combined: ~14 dev-days application + ~5 dev-days relay (+ ops)** — preliminary, per D8.

Dependencies & prerequisites: Meta app with permanent system-user token (customer), unlisted phone number (unlink legacy QR session first), v2.0.3 security fix released or bundled (D5), public HTTPS for the relay only.

Next step: review of §7–§10 + `02-cloud-status-relay-design.md`. Implementation starts at P1 and R-1 only after that review.

