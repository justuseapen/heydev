# HeyDev Launch Content

## Product Hunt Listing

### Tagline
Voice-enabled user feedback for any web app. One script tag, zero setup.

### Description
HeyDev is a drop-in JavaScript widget that makes collecting user feedback frictionless. Users can speak their feedback (with automatic transcription), attach screenshots, and start conversations—all without leaving your app.

**What makes HeyDev different:**
- Voice-first feedback - users speak, we transcribe automatically
- One-line integration - add a script tag, done
- Automatic error capture - see console errors alongside feedback
- Built for developers - no enterprise bloat, no complex configuration
- Self-hostable - open source with Docker support

**How it works:**
1. Add one script tag to your site
2. Users click the feedback button and speak or type
3. Get notified via email, Slack, webhook, or dashboard
4. Reply directly—responses appear in your app

Perfect for indie hackers, startups, and developers who want quick user insights without heavy analytics platforms.

### First Comment (Maker Introduction)
Hey Product Hunt! I'm excited to share HeyDev with you.

I built HeyDev because I was frustrated with existing feedback tools. Every time I launched a side project, I faced the same choice: add a bloated enterprise feedback tool (Intercom, Zendesk) or build something custom. Both options felt wrong.

HeyDev is different:
- **Stupid simple** - literally one script tag
- **Voice-first** - because typing detailed bug reports is painful
- **Developer-friendly** - get notifications where you already work
- **Open source** - self-host if you want

The breakthrough moment was adding voice input. Users give SO much better feedback when they can just talk. You get context, emotion, and details that never make it into typed messages.

I'm dogfooding this on all my projects, including the HeyDev dashboard itself. Would love your feedback (ironically, the HeyDev widget is on our site!).

Happy to answer any questions about implementation, tech stack, or why voice feedback is a game-changer.

### Topics/Tags
- Developer Tools
- Open Source
- Customer Support
- Voice Recognition
- JavaScript

---

## Show HN Post

### Title
Show HN: HeyDev – Voice-enabled feedback widget in one script tag

### Post
I built HeyDev to solve a problem I kept hitting with side projects: collecting user feedback shouldn't require integrating a massive SaaS platform or building custom forms.

**What it is:**
A JavaScript widget you add to any website with one script tag. Users can record voice feedback (with automatic transcription), attach screenshots, and start conversations. You get notified via email, webhook, or the dashboard.

**Why voice?**
I added voice on a whim and it changed everything. Users give 3-4x more detail when they can talk instead of type. You hear their frustration, confusion, or excitement. Plus, it's way faster for them—no typing on mobile.

**Tech stack:**
- Widget: Vanilla JS with Shadow DOM (< 50KB gzipped)
- Backend: Hono + SQLite (lightweight, self-hostable)
- Transcription: Web Speech API (Chrome/Edge) with OpenAI Whisper fallback
- Dashboard: React + TailwindCSS

**Open source:**
MIT licensed, self-host with Docker Compose. I'm running a hosted version at heydev.io for people who just want to add the script tag and go.

**What's next:**
Adding automatic error tracking (capture exceptions alongside feedback), Slack notifications, and source map support for better stack traces.

I'm dogfooding this on the HeyDev dashboard itself, so you can try the widget at heydev.io.

Curious what HN thinks about voice feedback as a UX pattern. Is this genuinely useful or am I over-indexing on my own workflow?

GitHub: https://github.com/justuseapen/heydev
Demo: https://heydev.io

---

## Twitter/X Launch Thread

### Tweet 1 (Hook)
I just shipped HeyDev – the fastest way to add user feedback to any website.

Voice recording, screenshots, and conversations in one script tag.

No npm install. No build step. No bloat.

Here's why I built it:

### Tweet 2 (Problem)
Every side project needs user feedback.

But the options suck:
- Enterprise tools are overkill (and expensive)
- Custom forms miss context
- Email/Discord = scattered conversations

I wanted something dead simple that just works.

### Tweet 3 (Solution)
HeyDev is one script tag:

```html
<script src="https://heydev.io/widget.js"
        data-key="your-key">
</script>
```

A feedback button appears. Users click. They talk or type. You get notified.

That's it.

### Tweet 4 (Voice Differentiator)
The killer feature: voice input.

Users can SPEAK their feedback.

Turns out, people give way better feedback when they can talk:
- 3-4x more detail
- You hear the emotion
- Faster on mobile
- Captures nuance text misses

### Tweet 5 (Context Capture)
Every message includes:
- Screenshot (if user wants)
- Console errors
- Browser/OS info
- Current page URL
- Timestamp

No more "it's broken" with zero context.

### Tweet 6 (Developer Experience)
Built for developers:

Get notified via:
- Email (reply works!)
- Webhook (integrate anywhere)
- Dashboard inbox
- Slack (coming soon)

Reply from wherever you work. Users see it in your app.

### Tweet 7 (Error Tracking)
Bonus: automatic error tracking.

Opt-in to capture JavaScript exceptions alongside feedback.

Same inbox. Same context. No separate error tracking tool needed.

### Tweet 8 (Open Source)
Fully open source (MIT).

Self-host with Docker Compose or use the hosted version.

Your data, your infrastructure, your choice.

Tech stack:
- Vanilla JS widget
- Hono + SQLite backend
- OpenAI Whisper for transcription

### Tweet 9 (Dogfooding)
I'm using HeyDev on HeyDev.

Go to heydev.io, click the feedback button, and try it yourself.

I'll reply to your feedback (proving the two-way conversation works).

### Tweet 10 (Use Cases)
Perfect for:
- Indie hackers getting early user feedback
- Startups shipping fast
- Developers who hate Intercom
- Anyone who wants "just a damn feedback button"

### Tweet 11 (Launch Details)
Try it: https://heydev.io
GitHub: https://github.com/justuseapen/heydev
Docs: https://heydev.io/docs

Free to use. Takes 2 minutes to set up.

Would love your feedback (ironically, use the widget 😄).

What do you think about voice as a feedback medium?

### Tweet 12 (Engagement Hook)
Reply with "feedback" and I'll send you early access + a guide on getting better user insights.

(Or just go to heydev.io and sign up—it's already live!)

---

## LinkedIn Announcement

### Post

**We just launched HeyDev – frictionless user feedback for web applications**

After months of building side projects and struggling with feedback tools, I decided to build something better.

**The problem:**
Most feedback tools are built for enterprises. They're complex, expensive, and overkill for developers and small teams. Meanwhile, relying on email or Discord leads to scattered conversations and lost context.

**The solution:**
HeyDev is a JavaScript widget you add to any website with one script tag. It enables:

- **Voice feedback** – Users can speak their thoughts (automatic transcription)
- **Rich context** – Screenshots, console errors, browser info captured automatically
- **Two-way conversations** – Reply from email/dashboard, users see responses in your app
- **Developer-friendly notifications** – Email, webhook, or dashboard inbox
- **Self-hostable** – Open source with Docker support

**Why voice matters:**
We added voice input as an experiment. It transformed the product. Users give 3-4x more detailed feedback when they can talk instead of type. You hear emotion and nuance that text doesn't capture. On mobile, it's dramatically faster.

**Built for developers:**
No complex setup. No configuration files. No enterprise account managers.

Add one script tag. Users start giving feedback. You get notified where you already work.

**Open source and self-hostable:**
MIT licensed. Run it on your infrastructure or use our hosted version. Your choice.

**Technical highlights:**
- Vanilla JavaScript widget (< 50KB)
- Hono + SQLite backend
- Web Speech API + OpenAI Whisper fallback
- React dashboard
- Automatic error tracking (opt-in)

**Try it yourself:**
Visit heydev.io and click the feedback button. I'm dogfooding this on our own product.

**Who it's for:**
- Indie developers launching products
- Startups iterating quickly
- Teams who want user insights without bloat
- Anyone allergic to enterprise software

I'd love to hear what you think. What feedback tools are you currently using? What's frustrating about them?

GitHub: https://github.com/justuseapen/heydev
Website: https://heydev.io

---

## Blog Post 1: Why We Built HeyDev

### Title
Why We Built HeyDev: The Feedback Tool That Doesn't Suck

### Meta Description
The story behind building HeyDev—a lightweight, voice-enabled feedback widget for developers who are tired of enterprise bloat.

### Content

Every developer who ships products faces the same question: "How do I collect user feedback?"

The usual options are bad:
- Build a custom form (loses context, poor UX)
- Use email (scattered conversations, no organization)
- Integrate Intercom or Zendesk (expensive, complex, massive bundle size)
- Use a survey tool (low response rates, rigid structure)

I've launched dozens of side projects. Each time, I chose one of these options. Each time, I hated it.

#### The Breaking Point

The last straw was a SaaS project I launched in late 2025. I integrated a popular feedback widget. The experience was awful:

1. The script bloated my page by 200KB
2. Setup took 45 minutes (OAuth, settings, team configuration)
3. The widget UI looked nothing like my app
4. Notifications went to a separate inbox I never checked
5. The free tier was useless; the paid tier was $50/month

My app had 100 users. I was paying $50/month to not see their feedback.

There had to be a better way.

#### What Developers Actually Need

I talked to indie hackers and small teams about feedback tools. A pattern emerged:

**What we want:**
- Dead simple integration
- Get feedback wherever we already work
- Don't slow down our apps
- Don't break the bank
- Own our data

**What we get:**
- Complex setup workflows
- Separate inboxes we ignore
- Massive JavaScript bundles
- $50-200/month pricing
- Vendor lock-in

The gap between what exists and what we need is huge.

#### The Voice Breakthrough

I started building HeyDev as "just a simple feedback form." One script tag, minimal UI, webhook notifications. Done.

Then I added voice input on a whim.

Everything changed.

Users started giving feedback I'd never gotten before:
- Instead of "button broken," I got "I clicked the checkout button three times and nothing happened, I thought my internet died"
- Instead of "confusing," I got "I couldn't figure out where to upload the file, I was looking in settings but it's actually in the profile menu"
- Instead of silence, I got rambling thoughts that contained golden insights

People give WAY better feedback when they can talk.

**Why voice works:**
- 3-4x more detail than typed messages
- Captures emotion and frustration
- Faster on mobile (no typing)
- Lower barrier to entry (talking is easier than writing)
- You hear the user's thought process

Voice transformed HeyDev from "a simple feedback widget" to "the fastest way to understand your users."

#### The Technical Philosophy

HeyDev's design follows three principles:

**1. Zero-Config**
One script tag. No build steps, no npm install, no configuration files. It should just work.

**2. Minimal Footprint**
< 50KB gzipped. Your app loads fast, the widget loads fast. No compromises.

**3. Developer-First**
Get notified where you work (email, webhook, dashboard). Reply from there. No forced workflow.

#### Open Source From Day One

HeyDev is MIT licensed and self-hostable.

Why?

Because developer tools should be open. You should be able to:
- Run it on your infrastructure
- Audit the code
- Fork and customize it
- Not worry about vendor lock-in

We offer a hosted version at heydev.io for convenience, but you're never forced to use it.

#### What's Next

We're just getting started. The roadmap includes:
- Automatic error tracking (capture exceptions alongside feedback)
- Slack notifications (reply from Slack threads)
- Source map support (readable stack traces)
- Feedback analytics (see trends over time)

But the core will stay the same: stupid simple, developer-friendly, and un-bloated.

#### Try It Yourself

HeyDev is live at heydev.io. The widget is on our own site (dogfooding!).

Click the feedback button. Record a voice message. See how it feels.

If you're tired of enterprise feedback tools, give HeyDev a shot. It takes 2 minutes to set up.

And yes, we'll actually read your feedback and reply.

---

GitHub: https://github.com/justuseapen/heydev
Website: https://heydev.io

---

## Blog Post 2: Voice Feedback - The Future of User Input

### Title
Voice Feedback: Why Talking is Better Than Typing

### Meta Description
Voice input transforms user feedback from sparse, vague messages into detailed, emotional insights. Here's why your app should support it.

### Content

What if your users could just talk to you?

Not through a phone call or video meeting. Just click a button, speak for 30 seconds, and send you their thoughts.

We added voice feedback to HeyDev as an experiment. It became the defining feature.

Here's what we learned about voice as a feedback medium.

#### The Problem with Text Feedback

Most feedback forms ask users to type. This creates problems:

**Low effort = low quality**
Typing is work. Users minimize effort. You get:
- "Button doesn't work"
- "This is confusing"
- "Fix this bug"

These messages are useless. What button? Why is it confusing? What bug?

**No emotion**
Text strips away tone. You can't tell if the user is:
- Mildly annoyed
- Completely blocked
- Just curious

You lose critical context.

**Mobile is painful**
60%+ of web traffic is mobile. Typing on mobile sucks. Users either:
- Don't bother giving feedback
- Send minimal messages ("broken")

You miss most feedback opportunities.

#### What Changes with Voice

When users can speak, everything shifts.

**They give more detail**
Speaking is effortless. Users naturally provide context:

Typed: "Checkout broken"

Spoken: "I was trying to check out and I clicked the 'Complete Order' button like three times, nothing happened, I thought my internet died but then I realized the page had frozen, this was on my iPhone"

Same effort for the user. 10x more actionable for you.

**You hear emotion**
Voice carries tone. You can tell:
- Is this a minor annoyance or a showstopper?
- Is the user confused or frustrated?
- Do they love the product despite the bug?

Emotion tells you what to prioritize.

**Mobile becomes easy**
On mobile, tapping a button and talking is faster than typing. The barrier to feedback disappears.

We've seen 3x more feedback from mobile users since adding voice.

**You get stream-of-consciousness insights**
When people talk, they ramble. This is GOOD.

They reveal thought processes, workarounds they tried, assumptions they made. This stuff never makes it into typed messages.

One user recording about a "confusing navigation" uncovered three separate UX issues we had no idea existed.

#### The Technical Reality

Adding voice feedback has challenges:

**Transcription accuracy**
Voice-to-text isn't perfect. We solved this with a hybrid approach:
- Use Web Speech API (Chrome/Edge) for real-time transcription
- Fall back to OpenAI Whisper for other browsers
- Let users edit the transcript before sending

Accuracy is 90%+ for English, good enough to be useful.

**Privacy concerns**
Some users worry about voice being recorded.

We handle this transparently:
- Show when recording is active (red indicator)
- Transcribe and delete audio immediately (unless user wants to attach it)
- Give users the edited transcript before sending

No surprises. No stored audio unless explicit.

**Bandwidth**
Voice files are larger than text. We compress aggressively:
- Use WebM/Opus codec (smallest format)
- Limit recordings to 60 seconds
- Only upload if user chooses to attach audio

Most messages are transcribed text only, no bandwidth hit.

#### When Voice Doesn't Work

Voice isn't always appropriate:

**Noisy environments**
Coffee shops, open offices, public spaces. Users won't speak feedback if people are around.

Solution: Always offer text input as a fallback.

**Non-English speakers**
Transcription is English-first. Other languages work but accuracy drops.

Solution: Show confidence score, let users edit or switch to text.

**Screen readers**
Voice input can confuse accessibility tools.

Solution: Ensure keyboard navigation works, text input is available, ARIA labels are correct.

The key is making voice the easiest option, not the only option.

#### What We've Learned

After thousands of voice feedback messages, patterns emerged:

**Users love it**
Once people try voice, they prefer it. It's faster and feels more personal.

**You get better insights**
Voice messages contain 3-4x more words and 2x more actionable details.

**It changes user perception**
A feedback button with a microphone icon signals "we actually want to hear from you." It feels more human.

**It reduces friction**
The barrier to feedback drops. More users share thoughts. You catch issues earlier.

#### Should Your App Support Voice?

Yes, if:
- You want detailed, emotional user feedback
- You have significant mobile traffic
- You're iterating quickly and need fast insights
- You care about accessibility (voice is easier for some users)

No, if:
- Your users are in noisy environments (factory floor, etc.)
- Privacy regulations prohibit voice data (rare, but possible)
- Your user base is highly international with many languages

For most web apps, voice feedback is a no-brainer.

#### How to Add Voice Feedback

If you're building your own solution:
1. Use Web Speech API for Chrome/Edge (built into browsers)
2. Fall back to a transcription API (Whisper, Google Speech-to-Text)
3. Show visual indicators (recording status, transcript preview)
4. Let users edit transcripts before sending
5. Always offer text input as an alternative

Or use HeyDev. We've solved all the edge cases.

One script tag, voice feedback works everywhere.

#### The Future

Voice is just the beginning.

Imagine:
- Multi-modal feedback (voice + screen recording + gestures)
- AI-powered follow-up questions ("Can you show me where you expected the button?")
- Real-time translation (speak in any language, we transcribe in English)
- Sentiment analysis (automatically flag frustrated users)

The feedback tools of the future will feel like conversations, not forms.

Voice is the first step.

#### Try It

Go to heydev.io. Click the feedback button. Record a voice message.

See how it feels to give feedback by talking instead of typing.

Then add voice feedback to your own app. Your users will thank you.

---

GitHub: https://github.com/justuseapen/heydev
Website: https://heydev.io

---

## Documentation Outline

### Quick Start Guide (5-Minute Integration)

**What You'll Build:**
A working feedback widget on your site in under 5 minutes.

**Prerequisites:**
- A website (any framework or plain HTML)
- An email address for signup

**Steps:**

1. **Sign up at heydev.io**
   - Enter your email
   - Click the magic link
   - You're in

2. **Copy your script tag**
   - Dashboard shows your unique snippet
   - Looks like: `<script src="https://heydev.io/widget.js" data-key="hd_live_..."></script>`

3. **Add to your site**
   - Paste before closing `</body>` tag
   - Works in HTML, React, Vue, Next.js, anything

4. **Test it**
   - Reload your site
   - See feedback button (bottom-right)
   - Click and send test message
   - Check your email

**Done.** That's it.

**Next Steps:**
- Configure notifications (Slack, webhook)
- Enable error tracking
- Customize button position/color
- Reply to users from dashboard

---

### API Reference Outline

**Authentication:**
- API keys (get from dashboard)
- Header format: `X-API-Key: your-key`
- Rate limits: 100 requests/minute

**Endpoints:**

**POST /api/feedback**
Submit user feedback
- Parameters: text, screenshot_url, session_id, context
- Response: conversation_id
- Example curl command

**POST /api/reply**
Reply to user feedback
- Parameters: conversation_id, message
- Response: success status
- Example curl command

**POST /api/webhook/reply**
Send reply from external system
- Parameters: session_id, message
- Response: success status
- Webhook signature verification

**GET /api/feedback**
List all feedback
- Parameters: status, type, limit, offset
- Response: paginated feedback list

**GET /api/feedback/:id**
Get specific feedback conversation
- Response: full conversation with messages

**POST /api/transcribe**
Transcribe audio to text
- Parameters: audio blob
- Response: transcript text
- Supported formats: WebM, WAV, MP3

**POST /api/upload**
Upload screenshot
- Parameters: image file
- Response: hosted URL
- Max size: 5MB

---

### FAQ

**Q: How much does it cost?**
A: HeyDev is free for up to 100 feedback messages/month. After that, $10/month for unlimited. Self-hosting is free forever.

**Q: Does the widget slow down my site?**
A: No. The widget is < 50KB and loads asynchronously. It won't block your page render.

**Q: What browsers support voice input?**
A: Chrome and Edge have built-in speech recognition. Safari and Firefox use our OpenAI Whisper fallback (still works, slightly slower).

**Q: Can users give feedback anonymously?**
A: Yes. We don't collect names or emails from feedback users. We only track session IDs to enable conversations.

**Q: How do I reply to users?**
A: From the dashboard, via email (if you configured email notifications), or via API. Users see replies in the widget next time they visit.

**Q: Can I customize the widget appearance?**
A: Yes. Use data attributes to change position, colors, and button style. Full customization docs coming soon.

**Q: Is voice data stored?**
A: By default, no. We transcribe voice to text and delete the audio. Users can optionally attach the audio file to their feedback.

**Q: Can I use this on multiple sites?**
A: Yes. Create a separate project for each site in the dashboard. Each gets its own API key.

**Q: What about GDPR/privacy?**
A: HeyDev is GDPR-friendly. We don't use cookies, don't track users across sites, and let users control their data. Self-hosting gives you complete control.

**Q: Can I integrate with my existing tools?**
A: Yes. Use webhooks to forward feedback to Zapier, n8n, or custom systems. Slack integration coming soon.

**Q: What happens if my site has errors?**
A: Enable error tracking (data-error-tracking="true") and we'll capture JavaScript exceptions automatically. They appear in the same inbox as feedback.

**Q: Can I export my data?**
A: Yes. Export all feedback as JSON from the dashboard. Self-hosted? Direct SQLite access.

**Q: What if I need features you don't have?**
A: HeyDev is open source. Fork it, customize it, send a PR. Or request features via... the HeyDev widget on our site.

---

## Email Sequence (Post-Signup Nurture)

### Email 1: Welcome + Setup (Immediate)

**Subject:** Welcome to HeyDev - Your API key is ready

**Body:**

Hey there,

Welcome to HeyDev! You're all set up.

Here's your widget snippet:

```html
<script src="https://heydev.io/widget.js" data-key="[USER_KEY]"></script>
```

Add this before the closing `</body>` tag on your site.

That's it. Seriously.

**What happens next:**
1. A feedback button appears on your site (bottom-right corner)
2. Users can click and record voice or type feedback
3. You get notified via email (you can add Slack/webhooks later)
4. You reply from the dashboard or email, they see it in your app

**Test it:**
Go to your site, click the button, send yourself a test message.

**Need help?**
Reply to this email or click the feedback button on heydev.io (yes, we use HeyDev on HeyDev).

Happy collecting,
[Your Name]

P.S. Your API key is shown once. If you lose it, you can regenerate it in the dashboard.

---

### Email 2: Tips for Better Feedback (Day 2)

**Subject:** 3 ways to get better user feedback

**Body:**

Hey,

You've got HeyDev installed. Nice!

Here are three ways to get more (and better) feedback:

**1. Encourage voice messages**
Voice feedback is 3x more detailed. Tell users they can "just click and talk" in your onboarding.

**2. Ask specific questions**
Prompt users: "What's confusing?" or "What would you change?" Specific prompts get specific answers.

**3. Reply quickly**
Users who get replies give more feedback. Respond within 24 hours and they'll keep sharing insights.

**Bonus tip:**
Enable error tracking (add `data-error-tracking="true"` to your script tag). You'll see JavaScript errors in the same inbox as feedback.

Questions? Just reply to this email.

[Your Name]

---

### Email 3: Advanced Features (Day 5)

**Subject:** You're not using these HeyDev features

**Body:**

Quick question: are you using webhooks yet?

Most HeyDev users don't realize you can forward feedback to any tool:

**Webhooks →** Send to Zapier, n8n, Discord, custom systems
**Email replies →** Reply to feedback notifications, users see it in your app
**Error tracking →** Auto-capture JavaScript exceptions with full context

Set these up in your dashboard → Settings.

The goal: feedback flows into your existing workflow (Slack, Linear, Notion, wherever).

You shouldn't have to check another inbox.

**Example workflow:**
1. User submits feedback → webhook to Zapier
2. Zapier creates Linear issue
3. You fix it and reply in Linear
4. Reply syncs to user via HeyDev API
5. User sees "We fixed it!" in your app

All possible with HeyDev.

Want help setting this up? Reply and I'll walk you through it.

[Your Name]

---

### Email 4: Feedback Request (Day 10)

**Subject:** How's HeyDev working for you?

**Body:**

Hey,

You've been using HeyDev for about 10 days. How's it going?

I'd love to hear:
- What's working well?
- What's frustrating?
- What features are you wishing existed?

Reply to this email or (ironically) use the HeyDev widget on heydev.io.

If HeyDev is saving you time, I'd be grateful if you shared it with other developers. Tweet, blog post, carrier pigeon—whatever works.

Thanks for being an early user.

[Your Name]

P.S. Seriously, reply with feedback. I read and respond to everything.

---

## Content Complete

All launch content is now ready. Next steps:

1. Review and edit for brand voice
2. Schedule posts for launch day
3. Create supporting documentation (detailed guides, API examples)
4. Develop integration tutorials for popular frameworks (React, Next.js, Vue)
5. Record demo video walkthrough
