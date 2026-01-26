# PRD: HeyDev Onboarding Overhaul

## Introduction

Overhaul the HeyDev developer onboarding experience to reduce friction and increase successful integrations. Currently, developers struggle with a confusing signup flow, risk losing their API key forever after first view, and have no guidance on what to do after setup. This PRD addresses these pain points with a streamlined multi-step wizard, clear signup paths, and a test integration page to verify everything works.

## Goals

- Reduce time from signup to working widget integration to under 5 minutes
- Eliminate API key loss scenarios with clear regeneration flow
- Guide developers through setup with a step-by-step wizard
- Provide clear distinction between new user signup and returning user login
- Confirm successful integration with a test page before sending users to inbox

## User Stories

### US-001: Consolidate signup/login with clear labeling
**Description:** As a developer, I want clear paths for signing up vs logging in so I don't get confused about which form to use.

**Acceptance Criteria:**
- [ ] Landing page CTA says "Get Started Free" and leads to signup flow
- [ ] Header shows "Log In" link for returning users pointing to /login
- [ ] /login page has heading "Welcome back" with subtext "New to HeyDev? Sign up free"
- [ ] Landing page signup section has heading "Start collecting feedback today"
- [ ] Both forms use the same magic link flow but have distinct messaging
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Create setup wizard container component
**Description:** As a developer, I want a multi-step wizard that guides me through setup so I don't miss any steps.

**Acceptance Criteria:**
- [ ] Create SetupWizard component with step indicator (Step 1 of 4, Step 2 of 4, etc.)
- [ ] Steps are: 1) Generate API Key, 2) Install Widget, 3) Configure Notifications, 4) Test Integration
- [ ] Current step is highlighted, completed steps show checkmark
- [ ] Users can navigate back to completed steps but not skip ahead
- [ ] Wizard state persists in URL params (?step=1, ?step=2, etc.)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Build Step 1 - API Key generation
**Description:** As a developer, I want to generate my API key as the first setup step with clear copy functionality.

**Acceptance Criteria:**
- [ ] Step 1 shows "Generate Your API Key" heading
- [ ] If no key exists, show "Generate API Key" button
- [ ] After generation, display full key with prominent "Copy" button
- [ ] Copy button shows "Copied!" feedback for 2 seconds
- [ ] Warning text: "Save this key securely. You won't be able to view it again."
- [ ] "Continue" button enabled only after key is generated
- [ ] If key already exists, show masked key (hd_live_****...) with "Regenerate" option
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Add API key regeneration with confirmation
**Description:** As a developer, I want to regenerate my API key if I lose it, with a clear warning about consequences.

**Acceptance Criteria:**
- [ ] "Regenerate Key" button visible when key already exists
- [ ] Clicking shows confirmation modal: "Regenerate API Key?"
- [ ] Modal warns: "Your current key will stop working immediately. Update your widget before regenerating."
- [ ] Modal has "Cancel" and "Regenerate" (red/destructive) buttons
- [ ] After confirming, old key is deleted and new key is generated
- [ ] New key displayed with same copy flow as initial generation
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Build Step 2 - Widget installation instructions
**Description:** As a developer, I want clear instructions for installing the widget on my site.

**Acceptance Criteria:**
- [ ] Step 2 shows "Install the Widget" heading
- [ ] Display code snippet with user's actual API key pre-filled
- [ ] Code snippet in syntax-highlighted box with "Copy" button
- [ ] Instructions: "Add this snippet before the closing </body> tag"
- [ ] Show example of where to place it in HTML structure
- [ ] "Back" button returns to Step 1, "Continue" advances to Step 3
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Build Step 3 - Notification configuration
**Description:** As a developer, I want to optionally configure how I receive notifications about new feedback.

**Acceptance Criteria:**
- [ ] Step 3 shows "Get Notified" heading with subtext "Optional - you can set this up later"
- [ ] Show notification channel cards: Email, Webhook (Slack/SMS show "Coming soon" badge)
- [ ] Email card has toggle to enable/disable, input for email address
- [ ] Webhook card has toggle to enable/disable, input for URL
- [ ] "Skip for now" link advances to Step 4 without configuring
- [ ] "Back" button returns to Step 2, "Continue" advances to Step 4
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Build Step 4 - Test integration page
**Description:** As a developer, I want to verify my widget is working before I'm done with setup.

**Acceptance Criteria:**
- [ ] Step 4 shows "Test Your Integration" heading
- [ ] Input field for "Enter your website URL" with placeholder "https://yoursite.com"
- [ ] "Open Test Page" button opens URL in new tab
- [ ] Instructions: "1. Open your site, 2. Look for the feedback button, 3. Submit a test message"
- [ ] Below instructions, show "Waiting for test feedback..." with spinner
- [ ] Poll GET /api/feedback every 3 seconds to check for new feedback
- [ ] When feedback received, show success state: "It works! Your first feedback arrived."
- [ ] Success state shows "Go to Inbox" button
- [ ] "Skip test" link goes directly to inbox
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Add setup completion tracking
**Description:** As a system, I need to track which setup steps a user has completed so they can resume.

**Acceptance Criteria:**
- [ ] Add `setup_completed_at` column to users table (nullable timestamp)
- [ ] Add `setup_step` column to users table (integer 1-4, default 1)
- [ ] GET /api/auth/me returns setup_step and setup_completed_at
- [ ] PATCH /api/auth/setup-step endpoint to update current step
- [ ] When user completes step 4, set setup_completed_at to now
- [ ] Typecheck passes

### US-009: Auto-redirect based on setup state
**Description:** As a returning user, I want to be redirected to the right place based on my setup progress.

**Acceptance Criteria:**
- [ ] After magic link verification, check user's setup_step
- [ ] If setup not complete (setup_completed_at is null), redirect to /setup?step={setup_step}
- [ ] If setup complete, redirect to /inbox
- [ ] /setup page loads correct step from URL param or user's saved step
- [ ] Typecheck passes

### US-010: Update header navigation for setup state
**Description:** As a user, I want the navigation to reflect whether I'm in setup or regular dashboard mode.

**Acceptance Criteria:**
- [ ] During setup (setup_completed_at is null), header shows "HeyDev" logo only, no nav links
- [ ] After setup complete, header shows: HeyDev logo, Inbox (with unread badge), Setup, Log out
- [ ] "Setup" link in nav goes to /setup but shows completed state, not wizard
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Create post-setup settings page
**Description:** As a user who completed setup, I want to access my settings to change API key or notifications.

**Acceptance Criteria:**
- [ ] /setup for completed users shows settings view (not wizard)
- [ ] Settings view has sections: API Key, Widget Installation, Notifications
- [ ] API Key section shows masked key with "Regenerate" button
- [ ] Widget section shows copy-able snippet
- [ ] Notifications section shows current config with edit buttons
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Landing page signup CTA labeled "Get Started Free", login link says "Log In"
- FR-2: /login page for returning users with "Welcome back" messaging
- FR-3: Setup wizard with 4 steps: API Key → Install Widget → Notifications → Test
- FR-4: API key shown once after generation with copy button and warning
- FR-5: API key regeneration requires confirmation modal with warning
- FR-6: Widget snippet pre-populated with user's actual API key
- FR-7: Notification setup is optional with "Skip for now" option
- FR-8: Test integration page polls for incoming feedback to verify widget works
- FR-9: Setup progress saved to database, users resume where they left off
- FR-10: Completed setup redirects to inbox, incomplete setup redirects to wizard
- FR-11: Post-setup /setup page shows settings view instead of wizard

## Non-Goals

- No changes to the actual widget functionality
- No new notification channel implementations (Slack/SMS remain "coming soon")
- No analytics or usage tracking dashboard
- No team/organization features
- No API key expiration or rotation scheduling
- No widget customization UI (colors, position, etc.)

## Design Considerations

- Wizard steps should feel lightweight, not overwhelming
- Each step should be completable in under 30 seconds
- Use existing Tailwind styling patterns from the codebase
- Progress indicator should be prominent but not distracting
- Success states should feel celebratory (checkmarks, green colors)
- Error states should be helpful with clear recovery actions

## Technical Considerations

- Setup state stored in users table (setup_step, setup_completed_at)
- Wizard state also in URL params for shareability/refresh resilience
- Polling for test feedback uses existing GET /api/feedback endpoint
- Reuse existing modal components for regeneration confirmation
- API key generation/regeneration uses existing /api/keys endpoints

## Success Metrics

- New users complete setup wizard in under 5 minutes
- 90%+ of users who start setup complete all 4 steps
- Zero support requests about "lost API key" (regeneration flow handles it)
- Test integration step catches widget installation issues before users get stuck

## Open Questions

- Should we add an email notification when setup is complete with a summary?
- Should the test integration step have a timeout with troubleshooting tips?
- Should we track which step users drop off at for funnel analysis?
