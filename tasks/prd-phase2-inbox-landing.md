# PRD: HeyDev Phase 2 - Feedback Inbox & Landing Page

## Introduction

Add a developer-focused landing page and feedback inbox to HeyDev. The landing page explains the product and drives quick signups. The inbox lets developers view, triage, and respond to user feedback in a simple workflow. Both are unified in a single app at heydev.io.

## Goals

- Convert developers to users with a clear, no-nonsense landing page
- Let developers quickly scan and triage incoming feedback
- Enable thoughtful replies to users directly from the dashboard
- Provide simple status management (New → Resolved → Archive)
- Keep the design minimal and vintage-inspired (no fancy animations or fake testimonials)

## User Stories

### US-001: Landing page hero section
**Description:** As a visitor, I want to immediately understand what HeyDev does so I can decide if it's for me.

**Acceptance Criteria:**
- [ ] Hero section with headline explaining the product (e.g., "Frictionless feedback for your web app")
- [ ] Subheadline with 1-sentence value prop
- [ ] "Get Started" button that scrolls to signup or navigates to /login
- [ ] Simple, vintage-inspired design (system fonts, minimal colors, clean layout)
- [ ] No fake testimonials or stock photos
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Landing page features section
**Description:** As a visitor, I want to see key features so I understand what I'm getting.

**Acceptance Criteria:**
- [ ] 3-4 feature cards: Voice input, Screenshot capture, Multi-channel notifications, Two-way conversations
- [ ] Each card has icon, title, and 1-2 sentence description
- [ ] Clean grid layout, no animations
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Landing page installation snippet
**Description:** As a developer, I want to see how easy installation is before signing up.

**Acceptance Criteria:**
- [ ] Code block showing the script tag installation
- [ ] Syntax highlighting for HTML
- [ ] "Copy" button that copies snippet to clipboard
- [ ] Brief explanation above: "Add one line to your site"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Landing page signup CTA
**Description:** As a visitor, I want a clear path to sign up and start using HeyDev.

**Acceptance Criteria:**
- [ ] Email input field with "Get Started" button
- [ ] Submitting triggers magic link flow (reuse existing /api/auth/magic-link)
- [ ] Success message: "Check your email for a login link"
- [ ] Error handling for invalid email
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Landing page footer
**Description:** As a visitor, I want to find additional resources and links.

**Acceptance Criteria:**
- [ ] GitHub link (open source)
- [ ] "Self-host" link to README or docs section
- [ ] Simple copyright notice
- [ ] Minimal design, no newsletter signup or social links
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Add status fields to conversations table
**Description:** As a developer, I need conversation status stored in the database.

**Acceptance Criteria:**
- [ ] Add `status` column to conversations: 'new' | 'resolved' (default 'new')
- [ ] Add `readAt` column (nullable timestamp, null = unread)
- [ ] Add `archivedAt` column (nullable timestamp, null = not archived)
- [ ] Generate and apply migration
- [ ] Typecheck passes

### US-007: Feedback inbox page route and layout
**Description:** As a developer, I want an inbox page to view all my feedback.

**Acceptance Criteria:**
- [ ] New route at /inbox (requires authentication)
- [ ] Page header: "Feedback Inbox"
- [ ] Tabs or filter: "Active" (non-archived) | "Archived"
- [ ] Empty state when no feedback exists
- [ ] Navigation link in dashboard header
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: API endpoint for listing feedback
**Description:** As a system, I need an endpoint to fetch conversations with messages.

**Acceptance Criteria:**
- [ ] GET /api/feedback returns conversations for authenticated user's API key
- [ ] Response includes: conversation id, session_id, status, readAt, archivedAt, createdAt, latest message preview, message count
- [ ] Query params: `archived=true|false` (default false), `status=new|resolved`
- [ ] Sorted by createdAt descending (newest first)
- [ ] Requires session authentication (not API key)
- [ ] Typecheck passes

### US-009: Feedback list component
**Description:** As a developer, I want to see a list of all feedback items.

**Acceptance Criteria:**
- [ ] List shows each conversation as a row/card
- [ ] Each item displays: first message preview (truncated), timestamp, status badge, unread indicator (red dot)
- [ ] Unread items visually distinct (bold text or background)
- [ ] Clicking item navigates to conversation detail
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Conversation detail page
**Description:** As a developer, I want to view the full conversation thread.

**Acceptance Criteria:**
- [ ] Route at /inbox/:conversationId
- [ ] Shows all messages in chronological order
- [ ] User messages styled differently from developer replies
- [ ] Displays context metadata: page URL, browser, OS, viewport, timestamp
- [ ] Shows screenshot if attached (clickable to expand)
- [ ] Shows console errors if any (collapsible)
- [ ] Marks conversation as read when opened (updates readAt)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: API endpoint for single conversation
**Description:** As a system, I need an endpoint to fetch one conversation with all messages.

**Acceptance Criteria:**
- [ ] GET /api/feedback/:conversationId returns full conversation
- [ ] Response includes: all messages, context from first message, status, timestamps
- [ ] Returns 404 if conversation doesn't exist or doesn't belong to user
- [ ] Requires session authentication
- [ ] Typecheck passes

### US-012: Mark conversation as read API
**Description:** As a system, I need to mark conversations as read.

**Acceptance Criteria:**
- [ ] PATCH /api/feedback/:conversationId/read sets readAt to current timestamp
- [ ] Returns updated conversation
- [ ] Requires session authentication
- [ ] Typecheck passes

### US-013: Reply composer in conversation detail
**Description:** As a developer, I want to reply to users from the dashboard.

**Acceptance Criteria:**
- [ ] Text area at bottom of conversation detail page
- [ ] "Send Reply" button (disabled when empty)
- [ ] Submitting calls existing POST /api/webhook/reply with session_id
- [ ] New message appears in thread immediately after send
- [ ] Clears input after successful send
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-014: Resolve/unresolve conversation
**Description:** As a developer, I want to mark conversations as resolved and undo if needed.

**Acceptance Criteria:**
- [ ] "Mark Resolved" button on conversation detail page (when status is 'new')
- [ ] "Reopen" button when status is 'resolved'
- [ ] PATCH /api/feedback/:conversationId/status endpoint accepts { status: 'new' | 'resolved' }
- [ ] Status change reflected immediately in UI
- [ ] Resolved conversations show visual indicator in list
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-015: Archive/unarchive conversation
**Description:** As a developer, I want to archive resolved conversations to clean up my inbox.

**Acceptance Criteria:**
- [ ] "Archive" button on conversation detail (visible when resolved)
- [ ] PATCH /api/feedback/:conversationId/archive sets archivedAt timestamp
- [ ] PATCH /api/feedback/:conversationId/unarchive clears archivedAt
- [ ] Archived conversations hidden from main list, visible in "Archived" tab
- [ ] Can unarchive from archived view
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Unread count badge in navigation
**Description:** As a developer, I want to see how many unread items I have at a glance.

**Acceptance Criteria:**
- [ ] "Inbox" nav link shows badge with unread count (e.g., "Inbox (3)")
- [ ] Count fetched from API on dashboard load
- [ ] Badge hidden when count is 0
- [ ] GET /api/feedback/unread-count endpoint returns { count: number }
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-017: Update landing page as new homepage
**Description:** As a system, the landing page should be the default route.

**Acceptance Criteria:**
- [ ] "/" route shows landing page (not the old HomePage)
- [ ] Authenticated users can still access "/" (see landing page)
- [ ] Dashboard/inbox accessible at "/inbox" and "/setup"
- [ ] Navigation shows different links based on auth state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Landing page loads at "/" with hero, features, code snippet, signup form, footer
- FR-2: Landing page signup form triggers magic link authentication
- FR-3: Conversations have status ('new' | 'resolved'), readAt, and archivedAt fields
- FR-4: Inbox page lists all non-archived conversations, newest first
- FR-5: Inbox supports filtering by archived status and conversation status
- FR-6: Clicking a conversation marks it as read and shows detail view
- FR-7: Developer can reply via text input, message delivered to user via SSE
- FR-8: Conversations can be resolved, reopened, archived, and unarchived
- FR-9: Unread count shown in navigation badge
- FR-10: All inbox/conversation endpoints require session authentication (not API key)

## Non-Goals

- No team/multi-user inbox (single developer per API key for now)
- No canned responses or reply templates
- No file attachments in replies
- No tagging or categorization
- No full-text search (simple list only)
- No real-time updates to inbox (manual refresh)
- No fancy animations or transitions
- No testimonials or social proof on landing page

## Design Considerations

- **Aesthetic:** Simple, vintage-inspired, almost utilitarian
- **Typography:** System fonts only (fast, native feel)
- **Colors:** Minimal palette - black text, white background, one accent color
- **Layout:** Clean grid, generous whitespace, no clutter
- **Feedback list:** Simple rows with clear visual hierarchy
- **Conversation view:** Chat-style but not bubbly, more like email thread

## Technical Considerations

- Reuse existing authentication system (magic links, sessions)
- Reuse existing message/conversation tables (add status columns)
- Reply composer uses existing POST /api/webhook/reply internally
- Landing page is part of dashboard React app (not separate)
- All new endpoints use session auth middleware (already exists for /api/keys, /api/channels)

## Success Metrics

- Developer can go from landing page to first feedback received in under 5 minutes
- Inbox loads in under 1 second with 100 conversations
- Can triage (read + resolve) a feedback item in under 30 seconds
- Reply reaches user's widget within 5 seconds of sending

## Open Questions

- Should resolved conversations auto-archive after X days?
- Should we add keyboard shortcuts for triage (j/k navigation, r to resolve)?
- Do we need a "bulk resolve" or "bulk archive" action?
