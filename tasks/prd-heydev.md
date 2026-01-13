# PRD: HeyDev - Frictionless Feedback Widget

## Introduction

HeyDev is a drop-in JavaScript widget that enables users to submit feedback via voice or text, with instant delivery to developers via their preferred channel: Slack, email, SMS, or custom webhooks. Optimized for vibe-coded apps where quick iteration matters, HeyDev captures rich context (screenshots, console errors, browser info) and enables threaded conversations between users and developers.

The tool is designed as a micro-service: minimal footprint, single script include, open-source with optional SaaS hosting for zero-config setup. Developers choose how they want to receive feedback - no lock-in to any specific platform.

## Goals

- Provide a single `<script>` tag integration that works on any web page
- Enable voice-first feedback with real-time transcription
- Deliver feedback instantly via developer's preferred channel (Slack, email, SMS, webhook)
- Allow developers to reply from their notification channel, with responses appearing in the widget
- Ship as open-source with optional hosted SaaS for quick starts
- Keep the entire system lightweight (micro-tool, not a platform)

## User Stories

### US-001: Script Tag Integration
**Description:** As a developer, I want to add HeyDev to my app with a single script tag so that setup takes under 1 minute.

**Acceptance Criteria:**
- [ ] Widget loads via `<script src="https://cdn.heydev.io/widget.js" data-api-key="xxx"></script>`
- [ ] No additional dependencies required
- [ ] Widget initializes automatically on page load
- [ ] Works on any domain without CORS configuration
- [ ] Bundle size under 50KB gzipped
- [ ] Typecheck passes

### US-002: Floating Feedback Button
**Description:** As a user, I want to see a subtle feedback button in the bottom-right corner so I can submit feedback from any page.

**Acceptance Criteria:**
- [ ] Circular button fixed to bottom-right (24px from edges)
- [ ] Icon indicates feedback/chat purpose
- [ ] Button has hover state and subtle entrance animation
- [ ] Button is configurable (position, color) via data attributes
- [ ] Clicking opens the feedback panel
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Voice Recording with Transcription
**Description:** As a user, I want to record my feedback by voice so I can quickly explain issues without typing.

**Acceptance Criteria:**
- [ ] Prominent microphone button in feedback panel
- [ ] Visual recording indicator (pulsing, waveform, or timer)
- [ ] Real-time transcription appears as user speaks
- [ ] Uses Web Speech API when available (Chrome, Edge)
- [ ] Falls back to cloud transcription (Whisper API) on unsupported browsers
- [ ] User can edit transcribed text before sending
- [ ] Recording stops on button click or 60-second limit
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Text Input Fallback
**Description:** As a user, I want to type my feedback if I prefer not to use voice.

**Acceptance Criteria:**
- [ ] Text area visible alongside or instead of voice option
- [ ] Placeholder text guides user ("What's on your mind?")
- [ ] Submit button enabled when text is non-empty
- [ ] Keyboard shortcut (Cmd/Ctrl+Enter) to submit
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Rich Context Capture
**Description:** As a developer, I want automatic context included with feedback so I can understand and reproduce issues.

**Acceptance Criteria:**
- [ ] Captures current page URL
- [ ] Captures browser and OS info (user agent parsed)
- [ ] Captures viewport dimensions
- [ ] Captures timestamp (user's local time + timezone)
- [ ] Captures recent console errors (last 5)
- [ ] Generates anonymous session ID for conversation continuity
- [ ] Typecheck passes

### US-006: Screenshot Capture
**Description:** As a user, I want to include a screenshot with my feedback so the developer can see exactly what I see.

**Acceptance Criteria:**
- [ ] "Attach screenshot" button in feedback panel
- [ ] Uses html2canvas or similar to capture visible viewport
- [ ] Shows thumbnail preview before sending
- [ ] User can remove screenshot before sending
- [ ] Screenshot uploaded to backend and included in Slack message
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Notification Channel Configuration
**Description:** As a developer, I want to choose how I receive feedback notifications so I can use my preferred workflow.

**Acceptance Criteria:**
- [ ] Dashboard shows notification channel options: Slack, Email, SMS, Webhook
- [ ] Developer can enable multiple channels simultaneously
- [ ] Each channel has its own configuration section
- [ ] Channel settings saved per API key
- [ ] Test notification button for each configured channel
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Slack Integration
**Description:** As a developer, I want feedback posted to my Slack channel so I can respond from Slack.

**Acceptance Criteria:**
- [ ] OAuth flow connects HeyDev to developer's Slack workspace
- [ ] Developer selects target channel for feedback
- [ ] Feedback appears in configured channel within 5 seconds
- [ ] Message includes: feedback text, screenshot (if any), page URL, browser info, timestamp
- [ ] Message formatted with Slack blocks for readability
- [ ] Console errors shown in collapsible section
- [ ] Developer replies in Slack thread are captured via Slack Events API
- [ ] Reply is pushed to user's browser via WebSocket/SSE
- [ ] Typecheck passes

### US-009: Email Integration
**Description:** As a developer, I want feedback sent to my email so I can respond via email reply.

**Acceptance Criteria:**
- [ ] Developer enters email address in dashboard
- [ ] Email verification required before activation
- [ ] Feedback sent as formatted HTML email within 5 seconds
- [ ] Email includes: feedback text, screenshot inline, page URL, browser info, timestamp
- [ ] Reply-to address configured for bidirectional communication
- [ ] Developer email replies are parsed and forwarded to user's widget
- [ ] Typecheck passes

### US-010: SMS Integration
**Description:** As a developer, I want feedback sent via SMS for urgent notifications.

**Acceptance Criteria:**
- [ ] Developer enters phone number in dashboard
- [ ] Phone verification via OTP required before activation
- [ ] SMS sent within 5 seconds of feedback submission
- [ ] SMS contains: truncated feedback text (160 char limit), link to full feedback
- [ ] Link opens web view with full context and reply capability
- [ ] Developer can reply via SMS, response forwarded to user's widget
- [ ] Uses Twilio or similar SMS provider
- [ ] Typecheck passes

### US-011: Webhook Integration
**Description:** As a developer, I want feedback sent to a custom webhook so I can integrate with any system.

**Acceptance Criteria:**
- [ ] Developer enters webhook URL in dashboard
- [ ] Webhook receives POST request with JSON payload
- [ ] Payload includes: feedback text, screenshot URL, page URL, browser info, timestamp, session ID, console errors
- [ ] Webhook must respond with 2xx within 5 seconds or marked as failed
- [ ] Failed webhooks retried 3 times with exponential backoff
- [ ] Developer can configure custom headers (for auth tokens)
- [ ] Webhook signature (HMAC) for payload verification
- [ ] Test webhook button sends sample payload
- [ ] Typecheck passes

### US-012: Webhook Reply Endpoint
**Description:** As a developer, I want to send replies back to users via API so I can integrate with custom systems.

**Acceptance Criteria:**
- [ ] POST `/api/webhook/reply` endpoint for sending replies to users
- [ ] Request includes: session ID, message text
- [ ] API key authentication required
- [ ] Reply pushed to user's widget via WebSocket/SSE
- [ ] Returns success/failure status
- [ ] Typecheck passes

### US-013: User Reply to Developer
**Description:** As a user, I want to continue the conversation after the developer responds.

**Acceptance Criteria:**
- [ ] After developer replies, user can send follow-up messages
- [ ] Follow-up routed through same notification channel(s)
- [ ] Conversation history shown in widget panel
- [ ] Voice input available for follow-ups too
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-014: Backend API Service
**Description:** As a system, I need a lightweight backend to relay messages between widget and notification channels.

**Acceptance Criteria:**
- [ ] POST `/api/feedback` - receives feedback, routes to configured channels, returns conversation ID
- [ ] POST `/api/reply` - receives user reply, routes to configured channels
- [ ] POST `/api/transcribe` - receives audio blob, returns transcription (Whisper fallback)
- [ ] POST `/api/upload` - receives screenshot, returns hosted URL
- [ ] POST `/api/webhook/reply` - receives developer reply from external systems
- [ ] WebSocket/SSE endpoint for pushing developer replies to widget
- [ ] Incoming endpoints for Slack Events, email (inbound parse), SMS (Twilio webhook)
- [ ] API key authentication for all endpoints
- [ ] Rate limiting (10 requests/minute per session)
- [ ] Typecheck passes

### US-015: Developer Dashboard - API Key & Channel Management
**Description:** As a developer, I want to create an API key and configure my notification channels.

**Acceptance Criteria:**
- [ ] Simple web page with authentication (magic link or OAuth)
- [ ] API key generated and displayed (copy button)
- [ ] Shows script tag snippet with API key pre-filled
- [ ] Notification channel configuration (Slack, Email, SMS, Webhook)
- [ ] Toggle to enable/disable each channel
- [ ] Channel-specific settings (Slack channel, email address, phone number, webhook URL)
- [ ] Webhook secret key displayed for signature verification
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Self-Hosting Support
**Description:** As a developer, I want to self-host HeyDev so I control my data.

**Acceptance Criteria:**
- [ ] Docker Compose file for one-command deployment
- [ ] Environment variables for Slack credentials, storage config
- [ ] README with self-hosting instructions
- [ ] Widget can point to custom backend URL via data attribute
- [ ] No hard-coded references to hosted SaaS endpoints
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Widget must load asynchronously and not block page render
- FR-2: Widget must work without cookies (session ID stored in sessionStorage)
- FR-3: Voice transcription must start within 500ms of button press
- FR-4: Feedback must be delivered to all enabled channels within 5 seconds of submission
- FR-5: Developer replies must appear in widget within 3 seconds
- FR-6: Widget must gracefully degrade if JavaScript errors occur on host page
- FR-7: All API endpoints must validate API key before processing
- FR-8: Screenshots must be resized to max 1200px width before upload
- FR-9: Audio recordings must be compressed before upload (WebM/Opus)
- FR-10: Widget must be accessible (keyboard navigable, screen reader compatible)
- FR-11: Webhook payloads must include HMAC signature for verification
- FR-12: Failed webhook deliveries must retry 3 times with exponential backoff
- FR-13: Email and SMS channels must verify ownership before activation
- FR-14: All notification channels must support bidirectional communication

## Non-Goals

- No feedback analytics dashboard (just raw notifications)
- No user authentication/accounts (anonymous feedback only)
- No feedback categorization or tagging
- No integration with Discord or Teams in MVP (use webhook for custom integrations)
- No mobile SDK (web widget only)
- No offline support (requires network connection)
- No message queuing beyond webhook retries

## Design Considerations

- Widget should feel native and unobtrusive (subtle shadow, rounded corners)
- Use system fonts for fastest load and native feel
- Primary action (voice) should be visually prominent
- Collapse to minimal state when not in use
- Respect user's prefers-reduced-motion setting
- Dark mode support (auto-detect or configurable)

## Technical Considerations

- **Frontend Widget:** Vanilla JS or Preact for minimal bundle size
- **Backend:** Node.js with Express or Hono (lightweight)
- **Real-time:** Socket.io or Server-Sent Events for developer replies
- **Storage:** S3-compatible for screenshots (Cloudflare R2 for cost)
- **Transcription Fallback:** OpenAI Whisper API
- **Slack:** Bolt SDK for simplified Slack integration
- **Email:** SendGrid or Resend for outbound, inbound parsing for replies
- **SMS:** Twilio for send/receive
- **Hosting (SaaS):** Fly.io or Railway for simple deployment
- **Database:** SQLite or Postgres for session/conversation/channel config storage

## Webhook Payload Schema

```json
{
  "event": "feedback.created" | "feedback.reply",
  "timestamp": "2024-01-15T10:30:00Z",
  "conversation_id": "conv_abc123",
  "session_id": "sess_xyz789",
  "feedback": {
    "text": "The button doesn't work on mobile",
    "screenshot_url": "https://...",
    "audio_url": "https://..."
  },
  "context": {
    "url": "https://example.com/checkout",
    "browser": "Chrome 120",
    "os": "macOS 14.2",
    "viewport": "1440x900",
    "timestamp": "2024-01-15T10:30:00Z",
    "timezone": "America/New_York",
    "console_errors": [
      {"message": "TypeError: Cannot read property...", "timestamp": "..."}
    ]
  },
  "signature": "sha256=abc123..."
}
```

## Success Metrics

- Widget loads in under 200ms on 3G connection
- 90% of feedback delivered to all channels within 5 seconds
- Voice transcription accuracy above 90% for English
- Developer can go from signup to receiving first feedback in under 5 minutes
- Self-hosting setup completes in under 15 minutes
- Webhook delivery success rate above 99% (excluding recipient errors)

## Open Questions

1. Should we support multiple Slack channels (e.g., route by page/section)?
2. Should the widget show previous feedback history for returning users?
3. Do we need a "send anonymously" toggle, or is anonymous the default?
4. Should we offer a hosted screenshot storage option or require developers to bring their own S3?
5. What happens when a notification channel disconnects or fails repeatedly?
6. Should webhook failures trigger fallback to another channel?
7. For email replies, how do we handle quoted text and signatures in parsing?
