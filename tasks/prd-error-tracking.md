# PRD: HeyDev Error Tracking

## Introduction

Add automatic error tracking to HeyDev so developers can see JavaScript exceptions, network errors, and console errors alongside user feedback in a unified inbox. When something goes wrong on a user's site, the developer sees it in the same place they see feedback - with full context (browser, OS, page URL, stack trace).

## Goals

- Automatically capture JavaScript runtime errors (exceptions, promise rejections)
- Capture failed network requests (4xx/5xx responses, timeouts)
- Group similar errors together to reduce noise (fingerprint-based deduplication)
- Display errors in the existing inbox alongside feedback with clear visual distinction
- Make error tracking opt-in via widget configuration to minimize default bundle size

## User Stories

### US-001: Add conversation type field to schema
**Description:** As a developer, I need to distinguish between feedback and error conversations in the database.

**Acceptance Criteria:**
- [ ] Add `type` column to conversations table with enum ['feedback', 'error'], default 'feedback'
- [ ] Add `fingerprint` text column (nullable) for error grouping
- [ ] Add `occurrence_count` integer column, default 1
- [ ] Add `last_occurred_at` text column (nullable) for ISO timestamp
- [ ] Export ConversationType type from schema
- [ ] Typecheck passes

### US-002: Create error submission API endpoint
**Description:** As a system, I need an endpoint to receive error reports from the widget.

**Acceptance Criteria:**
- [ ] Create POST `/api/errors` endpoint in new `server/src/routes/errors.ts`
- [ ] Require API key authentication (same as feedback endpoint)
- [ ] Accept body: { error: { type, message, stack?, filename?, lineno?, colno?, url?, status?, method? }, context, session_id }
- [ ] Return { success: true } on success
- [ ] Mount route under protected API in index.ts
- [ ] Typecheck passes

### US-003: Implement error fingerprinting and grouping
**Description:** As a system, I need to group similar errors together so developers aren't overwhelmed.

**Acceptance Criteria:**
- [ ] Create `generateFingerprint(type, message, stack?)` function
- [ ] Fingerprint normalizes stack trace (removes line numbers that vary between deployments)
- [ ] When error submitted, check for existing conversation with same fingerprint
- [ ] If exists: increment occurrence_count, update last_occurred_at, set status='new', clear readAt
- [ ] If not exists: create new conversation with type='error'
- [ ] Typecheck passes

### US-004: Store error occurrences as messages
**Description:** As a system, I need to store each error occurrence for viewing history.

**Acceptance Criteria:**
- [ ] Each error submission creates a message with direction='inbound'
- [ ] Message content JSON includes error details and context
- [ ] Content schema: { error_type, message, stack, filename, lineno, colno, url, status, method, context }
- [ ] Typecheck passes

### US-005: Add type filter to feedback list API
**Description:** As a system, I need to filter the feedback list by type (all/feedback/error).

**Acceptance Criteria:**
- [ ] GET `/api/feedback` accepts optional `type` query param
- [ ] `?type=feedback` returns only feedback conversations
- [ ] `?type=error` returns only error conversations
- [ ] No type param returns all conversations (default behavior unchanged)
- [ ] Response includes `type`, `occurrenceCount`, `lastOccurredAt` fields
- [ ] Typecheck passes

### US-006: Update conversation detail for error fields
**Description:** As a system, I need the conversation detail endpoint to return error-specific information.

**Acceptance Criteria:**
- [ ] GET `/api/feedback/:id` response includes type, occurrenceCount, lastOccurredAt
- [ ] For errors, all messages represent individual occurrences
- [ ] Typecheck passes

### US-007: Add type filter tabs to InboxPage
**Description:** As a user, I want to filter my inbox to see only errors or only feedback.

**Acceptance Criteria:**
- [ ] Add filter row with three buttons: All, Feedback, Errors
- [ ] Clicking a button updates the displayed list
- [ ] Filter persists when switching between Active/Archived tabs
- [ ] All is selected by default
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Add error indicators to FeedbackList
**Description:** As a user, I want to see at a glance which inbox items are errors vs feedback.

**Acceptance Criteria:**
- [ ] Error conversations show a red error icon (e.g., exclamation triangle)
- [ ] Errors with occurrenceCount > 1 show badge like "5 occurrences"
- [ ] Error items have subtle red-tinted styling to stand out
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Add error details to ConversationPage
**Description:** As a user, I want to see full error details including stack trace when viewing an error.

**Acceptance Criteria:**
- [ ] For error conversations, show Error Details section at top
- [ ] Display error message prominently
- [ ] Show stack trace in monospace font with horizontal scroll
- [ ] Show filename:lineno:colno if available
- [ ] Show "X occurrences - Last seen: [relative time]"
- [ ] Each message represents one occurrence, displayed chronologically
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Create widget error capture module
**Description:** As a developer, I need a module that captures JavaScript errors in the browser.

**Acceptance Criteria:**
- [ ] Create `widget/src/utils/errorCapture.ts`
- [ ] `installErrorCapture(callback)` sets up window.onerror handler
- [ ] Captures: message, stack (via error object), filename, lineno, colno
- [ ] `uninstallErrorCapture()` restores original handler
- [ ] Prevents capturing HeyDev's own errors
- [ ] Typecheck passes

### US-011: Add promise rejection capture
**Description:** As a developer, I want to capture unhandled promise rejections.

**Acceptance Criteria:**
- [ ] Add `window.onunhandledrejection` handler in errorCapture.ts
- [ ] Convert rejection reason to error format (message, stack if Error object)
- [ ] error_type is 'exception' for both onerror and unhandledrejection
- [ ] Typecheck passes

### US-012: Create error submission service
**Description:** As a developer, I need a service to send captured errors to the server.

**Acceptance Criteria:**
- [ ] Create `widget/src/services/submitError.ts`
- [ ] `submitError({ error, endpoint, apiKey })` POSTs to `/api/errors`
- [ ] Includes session_id and context (reuse existing captureContext)
- [ ] Handles network failures gracefully (logs to console, doesn't throw)
- [ ] Prevents infinite loop (don't capture errors from submitting errors)
- [ ] Typecheck passes

### US-013: Add network error capture
**Description:** As a developer, I want to optionally capture failed HTTP requests.

**Acceptance Criteria:**
- [ ] Add `installNetworkCapture(callback)` to errorCapture.ts
- [ ] Wraps global fetch to detect 4xx/5xx responses and network failures
- [ ] Captures: url, method, status, first 200 chars of response text
- [ ] error_type is 'network'
- [ ] Excludes requests to HeyDev API (prevents loops)
- [ ] `uninstallNetworkCapture()` restores original fetch
- [ ] Typecheck passes

### US-014: Integrate error capture with widget
**Description:** As a developer, I want error tracking to be opt-in via widget configuration.

**Acceptance Criteria:**
- [ ] Read `data-error-tracking` attribute from script tag (true/false)
- [ ] When enabled, call installErrorCapture and installNetworkCapture
- [ ] Captured errors are submitted via submitError service
- [ ] Add to HeyDev global API: `HeyDev.captureError(error)` for manual capture
- [ ] Cleanup error capture on HeyDev.destroy()
- [ ] Typecheck passes

### US-015: Add error tracking configuration options
**Description:** As a developer, I want fine-grained control over what errors are captured.

**Acceptance Criteria:**
- [ ] Support `data-capture-exceptions` attribute (default: true)
- [ ] Support `data-capture-network` attribute (default: true)
- [ ] Each type can be independently enabled/disabled
- [ ] Document new attributes in widget.ts comments
- [ ] Typecheck passes

### US-016: Add HeyDev widget to HeyDev dashboard (dogfooding)
**Description:** As the HeyDev team, we want to use HeyDev on our own dashboard to collect feedback and track errors.

**Acceptance Criteria:**
- [ ] Add HeyDev widget script tag to `dashboard/index.html`
- [ ] Use production endpoint (https://heydev.io) with a dedicated API key
- [ ] Enable error tracking (`data-error-tracking="true"`)
- [ ] Widget should appear on all dashboard pages (landing, inbox, setup, conversation)
- [ ] Create `VITE_HEYDEV_API_KEY` environment variable for the widget API key
- [ ] Add `VITE_HEYDEV_API_KEY` to `.env.example` with instructions
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Errors are stored in the conversations table with type='error'
- FR-2: Errors with matching fingerprints are grouped (same conversation)
- FR-3: Each error occurrence creates a message record for history
- FR-4: Unified inbox shows both feedback and errors with filter options
- FR-5: Error tracking in widget is opt-in (off by default)
- FR-6: Widget captures exceptions, rejections, and optionally network errors
- FR-7: Error capture avoids infinite loops (doesn't capture its own errors)

## Non-Goals

- No error notifications via webhook/email/Slack (add later)
- No source map support for stack trace deobfuscation
- No error rate limiting or sampling
- No error severity levels or priority sorting
- No full-text search of error messages
- No server-side error tracking endpoint (can be added later)

## Technical Considerations

- Extend existing conversations/messages model (no new tables)
- Fingerprint hash should be deterministic and URL-safe
- Widget error capture adds ~2-3KB gzipped to bundle
- Network capture wraps fetch globally - must be careful about side effects
- SQLite index on (api_key_id, type, fingerprint) for fast lookups

## Success Metrics

- Errors captured and displayed within 5 seconds of occurrence
- Similar errors properly grouped (same fingerprint = same conversation)
- Inbox performance unchanged with 1000+ error conversations
- Widget bundle size increase < 5KB gzipped

## Open Questions

- Should we add error rate limiting to prevent flood of errors?
- Should network errors capture request body (privacy concerns)?
- Should we add a "mark all as resolved" bulk action for errors?
