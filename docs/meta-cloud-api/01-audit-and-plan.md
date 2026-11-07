# OSDSarvaya — Meta Cloud API Integration
## First Deliverable: Codebase Audit & Implementation Plan
Status: **awaiting architecture approval** · Date: 2026-11-07 · Branch target: `develop`

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
| R1| Webhook reachability for on-prem appliances | Delivery statuses missing. Mitigation A/B/C above (wizard + cloud relay) |
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

## 7. Phase-wise estimates (per directive sequence)

| Phase | Scope | Est. |
|---|---|---|
| P0 | Audit + call-site doc (this doc) | ✅ done |
| P1 | Provider abstraction skeleton + interface types + DI in engines (call sites routed through messageService; no logic change; behavioral parity tests) | 1.5 d |
| P2 | cloudProvider: config, token validation, connection test, text message send against /phone_number_id/messages endpoint | 1 d |
| P3 | Consent enforcement (ledger table, pre-send check, S-3 fix, backfill from existing contacts, admin UI toggle) | 1.5 d |
| P4 | Template send: template sync + variable mapping UI + 24 h window + campaign-engine integration (kills S-2) | 2 d |
| P5 | Media: upload + media_id cache + document/image/video paths (kills S-4) | 1.5 d |
| P6 | Webhooks: signature verify + event store + async worker + dedupe + status reconciliation UI | 2 d |
| P7 | Campaign preview + cost estimation + pacing mode settings + MESSAGES_PER_HOUR repositioned as pacing | 1 d |
| P8 | provider_logs + monitoring + docs (deploy guide, Meta setup guide for customers) | 1 d |
| P9 | Tests (unit + e2e happy/sad), docs, release prep (v2.1.0) | 1.5 d |
| **Total** | | **~13 dev-days** |

Dependencies: Meta app + permanent token (customer-provided), public HTTPS for webhooks (R1),
customer's number unlinked from legacy sessions.

Wait for architecture approval before implementing
(major structural changes start at P1).
