# HeyDev

A drop-in JavaScript widget for frictionless user feedback with voice input and multi-channel developer notifications (Slack, email, SMS, webhook).

## Features

- **One-line integration** - Add a script tag to your site
- **Voice input** - Users can speak their feedback with real-time transcription
- **Screenshot capture** - Automatically capture and attach screenshots
- **Context capture** - Browser, OS, viewport, console errors included automatically
- **Multi-channel notifications** - Slack, email, SMS, and webhook support
- **Two-way conversations** - Reply to users directly from your dashboard
- **Self-hostable** - Run on your own infrastructure with Docker

## Quick Start

### Using the Widget

Add the HeyDev widget to your website with a single script tag:

```html
<script
  src="https://cdn.jsdelivr.net/npm/heydev@latest/dist/widget.js"
  data-api-key="your-api-key"
></script>
```

For self-hosted deployments, point to your server:

```html
<script
  src="https://cdn.jsdelivr.net/npm/heydev@latest/dist/widget.js"
  data-api-key="your-api-key"
  data-endpoint="https://your-server.example.com"
></script>
```

### JavaScript API

The widget exposes a global `HeyDev` object:

```javascript
// Open the feedback panel
HeyDev.open();

// Close the feedback panel
HeyDev.close();

// Check if panel is open
HeyDev.isOpen();

// Destroy the widget (cleanup)
HeyDev.destroy();
```

## Self-Hosting

HeyDev can be self-hosted using Docker for complete control over your data.

### Prerequisites

- Docker and Docker Compose installed
- (Optional) OpenAI API key for voice transcription fallback
- (Optional) Resend API key for email notifications

### Quick Deploy

1. Clone the repository:

```bash
git clone https://github.com/your-org/heydev.git
cd heydev
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:

```bash
# Required for voice transcription (Whisper API fallback)
OPENAI_API_KEY=sk-your-key

# Required for email notifications and magic link auth
RESEND_API_KEY=re_your-key
EMAIL_FROM=HeyDev <noreply@yourdomain.com>
```

4. Start the server:

```bash
docker compose up -d
```

5. Verify it's running:

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `OPENAI_API_KEY` | No | OpenAI API key for Whisper transcription fallback |
| `RESEND_API_KEY` | No | Resend API key for email notifications |
| `EMAIL_FROM` | No | From address for emails (default: noreply@heydev.io) |
| `DASHBOARD_URL` | No | Dashboard URL for CORS (default: http://localhost:5174) |

### Data Persistence

Docker Compose creates two named volumes for data persistence:

- `heydev-data` - SQLite database (`/app/server/data`)
- `heydev-uploads` - Uploaded screenshots (`/app/uploads`)

To back up your data:

```bash
# Create backup directory
mkdir -p backup

# Backup database
docker compose exec server cp /app/server/data/heydev.db /tmp/heydev.db
docker compose cp server:/tmp/heydev.db ./backup/

# Backup uploads
docker compose cp server:/app/uploads ./backup/
```

### Stopping the Server

```bash
# Stop without removing data
docker compose stop

# Stop and remove containers (data persists in volumes)
docker compose down

# Stop and remove everything including data
docker compose down -v
```

## Development

### Project Structure

```
heydev/
├── widget/          # Frontend widget (vanilla JS, Shadow DOM)
├── server/          # Backend API (Hono, SQLite)
├── dashboard/       # Admin dashboard (React, TailwindCSS)
├── Dockerfile       # Docker build configuration
├── docker-compose.yml
└── .env.example
```

### Running Locally

```bash
# Install dependencies
npm install

# Run the server in development mode
npm run dev --workspace=server

# Run the widget dev server
npm run dev --workspace=widget

# Run the dashboard dev server
npm run dev --workspace=dashboard
```

### Building

```bash
# Build all workspaces
npm run build --workspaces

# Build just the widget
npm run build --workspace=widget

# Type check all code
npm run typecheck
```

## API Reference

### POST /api/feedback

Submit user feedback.

**Headers:**
- `X-API-Key: your-api-key`

**Body:**
```json
{
  "text": "User feedback message",
  "screenshot_url": "https://...",
  "session_id": "sess_abc123",
  "context": {
    "url": "https://example.com/page",
    "browser": "Chrome",
    "os": "macOS",
    "viewport": { "width": 1920, "height": 1080 },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "timezone": "America/New_York",
    "console_errors": []
  }
}
```

### POST /api/webhook/reply

Send a reply to a user session.

**Headers:**
- `X-API-Key: your-api-key`

**Body:**
```json
{
  "session_id": "sess_abc123",
  "message": "Thanks for your feedback!"
}
```

### Webhook Payload

When you configure a webhook, HeyDev sends:

```json
{
  "event": "feedback.received",
  "feedback": {
    "text": "User message",
    "screenshot_url": "https://..."
  },
  "context": {
    "url": "https://...",
    "browser": "Chrome",
    ...
  },
  "session_id": "sess_abc123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

The webhook includes an `X-HeyDev-Signature` header with an HMAC-SHA256 signature for verification.

## License

MIT
