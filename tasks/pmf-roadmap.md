# Product-Market Fit Roadmap: HeyDev
**Assessment Date**: January 26, 2026
**Status**: 70% Ready - Not Ready for Public Launch

---

## Executive Summary

HeyDev has built a technically solid feedback widget with unique differentiation (voice input, error tracking, self-hosting). The core feedback loop works end-to-end, and key features like error tracking and multi-project support are complete. However, **critical gaps in notification channels, monetization strategy, and distribution prevent a successful public launch**.

**Verdict**: Ready for private beta with technical early adopters. Not ready for Product Hunt or public launch.

**Estimated time to PMF-ready**: 3-4 weeks (assuming one engineer full-time)

---

## What's Working: The 70%

### Core Feedback Loop (Complete)
- Widget loads via script tag with API key authentication
- Users can submit feedback via voice (Web Speech API) or text
- Screenshot capture with html2canvas
- Rich context capture (URL, browser, OS, console errors, viewport)
- Feedback appears in dashboard inbox within seconds
- Developers can reply, users see responses in real-time via SSE
- Conversation history persists per session
- **Assessment**: This is production-ready and works well.

### Error Tracking (Complete)
- Automatic capture of JavaScript exceptions and unhandled promise rejections
- Network error tracking (optional, configurable)
- Fingerprint-based grouping to reduce noise
- Error occurrences tracked with timestamps
- Unified inbox shows both feedback and errors with filtering
- **Assessment**: Differentiator vs competitors. Well-executed.

### Developer Onboarding (Complete)
- 4-step setup wizard: API Key → Install Widget → Notifications → Test
- Magic link authentication (no passwords)
- Test integration page with polling to verify first feedback
- API key regeneration with proper warnings
- Setup state persists, users resume where they left off
- **Assessment**: Smooth experience, reduces setup friction significantly.

### Multi-Project Support (Complete)
- Projects table for organizing feedback by application
- Project selector in dashboard
- Each project has its own API key
- **Assessment**: Essential for agencies or developers with multiple apps.

### Self-Hosting (Complete)
- Docker Compose setup with SQLite
- Volume persistence for database and uploads
- Health checks and restart policies
- Clear documentation in README
- **Assessment**: Strong differentiator. Appeals to privacy-conscious devs.

### Notification Channels (Partial)
- Email notifications: Working with Resend integration
- Webhook notifications: Working with signature verification and retry queue
- Slack: Marked "coming soon" but not implemented
- SMS: Marked "coming soon" but not implemented
- **Assessment**: Email + webhook is minimal viable, but Slack is marketed heavily.

---

## What's Missing: The Critical 30%

### 1. Slack Integration (US-008) - **Launch Blocker**
**Impact**: High
**Effort**: Medium (2-3 days)
**Why it's critical**:
- Landing page features Slack prominently with icon and description
- Slack is the #1 developer communication tool
- Competitors (Canny, UserVoice) all have Slack
- Current "coming soon" badge creates credibility gap

**What needs to be built**:
- OAuth flow to connect workspace (Slack app with bot token)
- Channel selection UI in dashboard
- Slack Events API handler for threaded replies
- Slack Block formatting for feedback messages
- Store Slack channel config in channels table

**Acceptance criteria from PRD (US-008)**:
- OAuth flow connects HeyDev to developer's Slack workspace
- Developer selects target channel for feedback
- Feedback appears in configured channel within 5 seconds
- Message includes: feedback text, screenshot (if any), page URL, browser info, timestamp
- Console errors shown in collapsible section
- Developer replies in Slack thread are captured via Slack Events API
- Reply is pushed to user's browser via WebSocket/SSE

**Recommendation**: This MUST ship before public launch. It's the most requested integration.

---

### 2. Pricing Model - **Monetization Blocker**
**Impact**: High
**Effort**: Low (1 day)
**Why it's critical**:
- No revenue model = no business
- Users need to know what they're getting into
- Competitors have clear pricing (Intercom: $39/mo, Canny: $50/mo)
- Landing page says "Get Started Free" but doesn't explain limits

**Proposed pricing strategy**:
```
FREE TIER (Public Beta)
- 100 feedback items/month
- 1 project
- Email + Webhook notifications
- Community support (GitHub)

STARTER ($19/mo)
- 1,000 feedback items/month
- 3 projects
- All notification channels (Slack, Email, Webhook, SMS)
- Error tracking included
- Email support

PRO ($49/mo)
- 10,000 feedback items/month
- Unlimited projects
- Priority support
- Custom branding (remove "Powered by HeyDev")
- SSO (future)

SELF-HOSTED (Free/Open Source)
- Unlimited everything
- You manage infrastructure
- Community support
- Optional paid support contract ($99/mo)
```

**What needs to be built**:
- Pricing page in dashboard (new route `/pricing`)
- Subscription management (Stripe integration)
- Usage tracking and quota enforcement in API
- Upgrade prompts when approaching limits
- Billing page in dashboard

**Quick Win**: Launch with "Public Beta - Free" and defer Stripe integration. Add pricing page as documentation of future plans.

---

### 3. Widget Distribution - **CDN Strategy Unclear**
**Impact**: Medium
**Effort**: Low (1 day)
**Why it's critical**:
- README says `cdn.jsdelivr.net/npm/heydev@latest/dist/widget.js`
- But package isn't published to npm
- Landing page and setup wizard say `https://heydev.io/widget.js`
- Current setup serves widget from dashboard Docker container (works but not ideal)

**Options**:
1. **Publish to npm** - Standard for OSS projects, auto-syncs to jsDelivr
2. **Serve from heydev.io** - Current approach, simple but requires CDN (Cloudflare)
3. **Dual distribution** - npm for self-hosters, heydev.io for SaaS users

**Recommendation**: Publish to npm as `@heydev/widget`. Update docs and setup wizard to use jsDelivr URL. Keep heydev.io/widget.js as alias.

**What needs to be built**:
- Publish widget package to npm
- Update landing page and setup wizard with correct URL
- Add versioning strategy (semantic versioning)
- Document how to pin to specific version

---

### 4. Try Before You Signup - **Discovery Friction**
**Impact**: Medium
**Effort**: Low (half day)
**Why it's critical**:
- Current flow: Email → Magic link → Setup wizard → Install widget → Test
- Developers want to see the widget before committing
- Competitors have live demos (Intercom has interactive demo on homepage)

**Options**:
1. **Live demo page** - Dedicated route with widget embedded, no auth required
2. **Sandbox mode** - Generate temporary API keys, auto-expire after 24 hours
3. **Video walkthrough** - Loom or YouTube embed on landing page

**Recommendation**: Start with option 3 (video), add option 1 (demo page) before launch.

**What needs to be built** (for interactive demo):
- `/demo` route in dashboard (public, no auth)
- Demo API key that points to a demo inbox
- Demo inbox shows sample feedback from "Test User"
- Widget embedded on demo page with voice recording enabled
- Banner: "This is a demo. Sign up to get your own widget."

---

### 5. Competitive Positioning - **ICP Unclear**
**Impact**: Medium
**Effort**: Low (documentation)
**Why it's critical**:
- Current positioning: "Frictionless feedback for your web app"
- Generic - could apply to any feedback tool
- Unique strengths (voice, error tracking, self-hosting) buried in feature list

**Who is HeyDev for?** (Based on product design)

**Primary ICP: Indie Developers & Small SaaS Teams**
- Building web apps with small teams (1-5 people)
- Want feedback but don't need enterprise features
- Value simplicity over complex workflows
- Prefer self-service tools
- Open source friendly

**Secondary ICP: Agencies with Multiple Clients**
- Need to manage feedback for many client sites
- Projects feature enables per-client organization
- Self-hosting option appeals to privacy-conscious clients

**NOT for**:
- Enterprise teams needing SAML SSO, compliance (SOC2, HIPAA)
- Product managers wanting roadmaps and voting features (Canny)
- Marketing teams doing NPS surveys (Delighted)

**Positioning Statement (Proposed)**:
> "HeyDev is the simplest way to collect feedback from your users. Add one line of code, and your users can record voice feedback, attach screenshots, and have conversations with your team. Unlike bloated tools built for enterprise, HeyDev is designed for indie developers and small teams who want feedback, not a second full-time job."

**Differentiators to emphasize**:
1. **Voice-first feedback** - Unique in the market
2. **Automatic error tracking** - Combines feedback + error monitoring
3. **Self-hosting option** - Appeals to privacy-conscious devs
4. **One-line install** - No build step, no npm packages
5. **Open source** - Audit the code, contribute features

---

## Launch Blockers: Must-Haves Before Going Public

### Tier 1: Absolutely Required
1. ✅ Core feedback loop working end-to-end
2. ✅ Dashboard with inbox and conversation view
3. ✅ Setup wizard with test integration
4. ❌ **Slack integration** (US-008)
5. ❌ **Pricing page** (even if payments deferred)
6. ❌ **Widget published to npm/CDN**
7. ❌ **Live demo or video walkthrough**

### Tier 2: Should Have (Can Launch Without)
8. ✅ Email notifications
9. ✅ Webhook notifications
10. ✅ Error tracking
11. ✅ Multi-project support
12. ❌ SMS notifications (defer to v1.1)
13. ❌ Usage quotas and enforcement
14. ❌ Stripe integration (can launch with "free beta")

### Tier 3: Nice to Have (Post-Launch)
15. Analytics dashboard for developers (non-goal per PRD)
16. User identification and profiles
17. Feedback voting or prioritization
18. Public roadmap feature
19. Dark mode for dashboard (widget has it)
20. Mobile app or mobile SDK

---

## PMF Metrics to Track

### Pre-Launch Indicators
- **Setup completion rate**: % of users who complete all 4 wizard steps
- **Time to first feedback**: Minutes from signup to first feedback received
- **Widget installation rate**: % of users who generate API key and install widget

### Post-Launch Indicators
- **Daily/Weekly Active Users**: Users who log into dashboard
- **Feedback volume**: Average feedbacks per project per week
- **Reply rate**: % of feedback items that receive developer reply
- **Retention**: % of users who return after 7 days, 30 days
- **NPS**: Ask users "How likely are you to recommend HeyDev?" (after 2 weeks)

### PMF Signals to Watch For
- **Unsolicited testimonials**: Users tweeting or blogging about HeyDev
- **Feature requests from paying users**: Sign of engagement
- **Organic referrals**: Users inviting teammates without prompting
- **Churn reasons**: Why do users stop using it? (Too expensive? Missing Slack? Bug?)

**PMF Benchmark**:
- 40%+ of users say they'd be "very disappointed" if HeyDev disappeared
- 60%+ weekly retention after 4 weeks
- 10+ teams upgrading to paid tier in first 90 days (if pricing launched)

---

## Feature Prioritization: What to Build Next

### Framework: Value vs Effort
Using RICE scoring (Reach × Impact × Confidence / Effort):

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|---------|-------|--------|------------|--------|------------|----------|
| Slack Integration | 90% | 3 | 100% | 2 | 135 | P0 |
| Pricing Page | 100% | 2 | 100% | 0.5 | 400 | P0 |
| Widget npm Publish | 100% | 2 | 100% | 0.5 | 400 | P0 |
| Interactive Demo | 80% | 2 | 80% | 0.5 | 256 | P0 |
| Usage Quotas | 60% | 2 | 90% | 2 | 54 | P1 |
| SMS Integration | 30% | 2 | 80% | 2 | 24 | P2 |
| Analytics Dashboard | 40% | 1 | 60% | 4 | 6 | P3 |
| User Profiles | 50% | 1 | 70% | 3 | 12 | P3 |
| Dark Mode Dashboard | 20% | 1 | 90% | 1 | 18 | P3 |

**P0: Must Ship Before Launch**
1. Slack Integration
2. Pricing Page
3. Widget CDN Publishing
4. Interactive Demo

**P1: Ship in First Month Post-Launch**
5. Usage Quotas
6. Stripe Integration
7. Email Verification
8. Better Error Handling

**P2: Ship in First Quarter**
9. SMS Integration
10. User Identification
11. Widget Customization UI
12. Export Feedback

---

## Recommended Launch Plan

### Phase 1: Private Beta (Weeks 1-2)
**Goal**: Validate with 10-20 friendly developers

**Tasks**:
- [ ] Ship Slack integration (US-008)
- [ ] Create pricing page (no payment yet)
- [ ] Publish widget to npm
- [ ] Record 2-minute demo video
- [ ] Write launch announcement blog post
- [ ] Set up feedback channels (HeyDev dogfooding, Discord/Slack community)
- [ ] Invite 20 trusted developers from personal network

**Success Criteria**:
- 10+ developers complete setup and install widget
- 5+ developers submit feedback via their own sites
- Zero critical bugs reported
- Positive feedback on Slack integration
- Average setup time under 10 minutes

### Phase 2: Public Launch (Week 3)
**Goal**: Get first 100 users

**Distribution channels**:
1. **Product Hunt**: Submit on Tuesday or Thursday (best days)
2. **Hacker News**: "Show HN: HeyDev - Voice feedback widget for web apps"
3. **Reddit**: r/SideProject, r/webdev, r/javascript
4. **Twitter/X**: Tweet with demo video, tag relevant influencers
5. **Indie Hackers**: Post in "Show IH" section
6. **Dev.to**: Write technical article about building the widget

**Messaging**:
- Headline: "Add voice feedback to your web app in 60 seconds"
- Hook: "Users record feedback while showing you exactly what they see"
- CTA: "Try the demo" or "Add to your site free"

### Phase 3: Iterate Based on Feedback (Week 4+)
**Goal**: Get to 40%+ "very disappointed" score

**Activities**:
- Weekly user interviews (5 per week)
- Ship top 3 requested features
- Fix all critical bugs within 24 hours
- Improve onboarding based on drop-off data
- Experiment with pricing (if traffic allows)

---

## Pricing Strategy Recommendation

### Freemium Model (Recommended)

**Free Tier**:
- 100 feedback items/month
- 1 project
- Email + Webhook notifications
- Community support
- HeyDev branding in widget

**Paid Tiers**:

```
STARTER: $19/mo
- 1,000 feedback items/month
- 3 projects
- Slack + SMS notifications
- Email support (24hr response)
- Remove branding

PRO: $49/mo
- 10,000 feedback items/month
- Unlimited projects
- Priority support (4hr response)
- Custom widget domain
- SSO (future)

ENTERPRISE: Custom
- Unlimited feedback
- On-premise deployment support
- SLA guarantees
- Custom integrations
```

**Self-Hosted**: Always free, optional support contract ($99/mo)

---

## Final Recommendation

### Launch Checklist

**Must complete before public launch**:
- [ ] Ship Slack integration (US-008)
- [ ] Add pricing page to dashboard
- [ ] Publish widget to npm
- [ ] Create interactive demo page
- [ ] Record 2-minute demo video
- [ ] Write Product Hunt launch post
- [ ] Set up analytics on HeyDev dashboard (dogfooding)
- [ ] Prepare FAQ
- [ ] Test widget on 5 different sites

**Timeline**: 2-3 weeks if working full-time, 4-6 weeks if part-time

**Launch Date**: Aim for a Tuesday in mid-February 2026

---

## Conclusion

HeyDev has **70% of what it needs for PMF**. The core product works, onboarding is smooth, and key differentiators (voice, error tracking, self-hosting) are in place.

**The missing 30%**:
1. Slack integration (promised but not delivered)
2. Pricing clarity (no monetization plan)
3. Distribution (widget not on CDN)
4. Discovery (no demo, high friction)

**Timeline to launch-ready**: 3-4 weeks

**Recommended next steps**:
1. Ship Slack integration (2-3 days)
2. Add pricing page (1 day)
3. Publish to npm (1 day)
4. Create demo page (half day)
5. Private beta with 20 devs (1 week)
6. Public launch on Product Hunt (Week 3)

**Success criteria**: If 40%+ of early users say they'd be "very disappointed" without HeyDev after 30 days, you've achieved PMF.
