# HeyDev Production Readiness Checklist

**Assessment Date**: 2026-01-26
**Deployment**: American Cloud with Coolify
**Environment**: Production (heydev.io)

## Executive Summary

HeyDev is currently **functional in production** but requires operational hardening before scale. The application has solid fundamentals (health checks, data persistence, multi-stage builds) but lacks critical production infrastructure like monitoring, automated backups, and security hardening.

**Risk Level**: Medium
**Priority Actions**: Database backups, monitoring, security headers

---

## 1. Deployment Configuration Review

### Dockerfile Analysis
**Status**: Good with minor improvements needed

**Strengths**:
- Multi-stage build reduces image size
- Health check configured (30s interval, /health endpoint)
- Production dependencies only in final stage
- WAL mode enabled for SQLite concurrent access
- Proper volume mounts for data persistence

**Improvements Needed**:
- [ ] Database migrations not automated on startup
- [ ] No non-root user specified (security risk)
- [ ] Source maps included in production build (50KB widget.js.map)
- [ ] No explicit resource limits (memory/CPU)

**Recommendations**:
```dockerfile
# Add before CMD
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app /app/server/data /app/uploads
USER nodejs

# Add migration step to CMD
CMD ["sh", "-c", "npm run db:migrate --workspace=server && node dist/index.js"]
```

### docker-compose.yml Analysis
**Status**: Good for development, needs production hardening

**Strengths**:
- Named volumes for data persistence
- Health check configuration
- Environment variable management
- Restart policy (unless-stopped)

**Improvements Needed**:
- [ ] No resource limits specified
- [ ] No logging driver configuration
- [ ] Missing network isolation
- [ ] No secrets management (API keys in .env)

**Recommendations**:
```yaml
services:
  server:
    # Add resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

    # Configure logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    # Use secrets instead of .env for sensitive data
    secrets:
      - openai_api_key
      - resend_api_key
```

### Environment Variables
**Status**: Well-documented but needs secrets management

**Required Variables**:
- PORT (default: 3000)
- OPENAI_API_KEY (for Whisper transcription fallback)
- RESEND_API_KEY (for email notifications & auth)
- EMAIL_FROM (sender address)
- DASHBOARD_URL (for CORS)

**Issues**:
- [ ] API keys stored in plaintext .env file
- [ ] No validation of required env vars on startup
- [ ] DASHBOARD_URL default is localhost (breaks production CORS)

**Recommendations**:
- Use Docker secrets or vault for API keys
- Add startup validation to check required env vars
- Document production DASHBOARD_URL requirements

---

## 2. Database Setup & Migrations

### SQLite Configuration
**Status**: Functional but needs backup strategy

**Strengths**:
- WAL mode enabled for better concurrency
- Stored in Docker volume for persistence
- Drizzle ORM with type-safe schema
- Migration files present (5 migrations)

**Critical Gaps**:
- [ ] No automated backup strategy
- [ ] Migrations not run automatically on container start
- [ ] No backup verification/restore testing
- [ ] Single point of failure (no replication)
- [ ] No monitoring of database size/growth

**Database Location**:
```
Host: /var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/heydev.db
Container: /app/server/data/heydev.db
```

### Backup Strategy Recommendations

**Immediate (Manual)**:
```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/backups/heydev"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="server-swockw8oo88ow0w0ocgc4ggw-172822239790"

mkdir -p $BACKUP_DIR
sudo docker exec $CONTAINER_NAME sqlite3 /app/server/data/heydev.db ".backup /tmp/backup.db"
sudo docker cp $CONTAINER_NAME:/tmp/backup.db $BACKUP_DIR/heydev_$TIMESTAMP.db
gzip $BACKUP_DIR/heydev_$TIMESTAMP.db

# Keep only last 30 days
find $BACKUP_DIR -name "heydev_*.db.gz" -mtime +30 -delete
```

**Automated (Cron)**:
```bash
# Add to crontab on American Cloud server
0 2 * * * /usr/local/bin/backup-heydev.sh >> /var/log/heydev-backup.log 2>&1
```

**Cloud Backup (Recommended)**:
- [ ] Set up automated daily backups to S3/Backblaze B2
- [ ] Implement 3-2-1 backup strategy (3 copies, 2 media, 1 offsite)
- [ ] Test restore process monthly
- [ ] Monitor backup success/failures

### Migration Management

**Current Process**:
- Migrations stored in `server/drizzle/`
- Must be run manually with `npm run db:migrate`
- No automation on deployment

**Recommended Process**:
1. Add migration check to startup script
2. Log migration status
3. Fail startup if migrations fail
4. Keep migration logs for audit trail

---

## 3. Widget CDN Setup

### Current Configuration
**Status**: Functional but non-standard

**Widget Location**: `https://heydev.io/widget.js`
**Served from**: Same origin as dashboard (Docker container)
**Size**: 50KB (widget.js) + 182KB source map

**How it works**:
1. Widget built in Dockerfile stage 2
2. Copied to `dashboard/dist/widget.js` in production stage
3. Served via Hono's static file middleware
4. Same-origin serving means no CORS issues for widget itself

**Issues**:
- [ ] No CDN caching (every request hits origin)
- [ ] No cache headers configured
- [ ] Source maps exposed in production (182KB)
- [ ] No versioning/cache busting strategy
- [ ] No compression configured (gzip/brotli)
- [ ] No geographic distribution

### CORS Configuration
**Status**: Permissive (by design)

```typescript
// server/src/index.ts
cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (origin.startsWith('http://localhost:')) return origin;
    if (process.env.DASHBOARD_URL && origin === process.env.DASHBOARD_URL) return origin;
    return '*'; // Allow widget on any domain
  },
  credentials: true,
})
```

**Analysis**:
- Intentionally permissive to allow widget on customer sites
- Dashboard-specific endpoints should have stricter CORS
- Current setup is appropriate for a feedback widget

**Recommendations**:
- [ ] Keep permissive CORS for widget endpoints
- [ ] Add stricter CORS for dashboard API endpoints
- [ ] Document CORS strategy in security docs

### Caching Headers
**Status**: Not configured

**Recommendations**:
```typescript
// Add to widget serving middleware
app.get('/widget.js', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  c.header('Content-Type', 'application/javascript');
  // Serve widget.js
});

// For versioned assets
app.get('/widget-:version.js', (c) => {
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  c.header('Content-Type', 'application/javascript');
  // Serve widget.js
});
```

**CDN Options** (if scaling):
1. **Cloudflare** (Free tier available)
   - Add Cloudflare in front of heydev.io
   - Enable caching for static assets
   - Enable Brotli compression
   - DDoS protection included

2. **BunnyCDN** (Low cost)
   - $1/TB for bandwidth
   - Pull zone from heydev.io/widget.js
   - Purge cache on deployment

3. **Fastly** (Enterprise)
   - Real-time purging
   - Advanced edge logic
   - Higher cost

---

## 4. Production Readiness Gaps

### Health Checks
**Status**: Basic implementation

**Current**:
```typescript
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});
```

**Improvements Needed**:
- [ ] Check database connectivity
- [ ] Check disk space
- [ ] Check external API dependencies (OpenAI, Resend)
- [ ] Return detailed status for debugging
- [ ] Add /ready endpoint (ready to serve traffic)
- [ ] Add /live endpoint (basic liveness check)

**Recommended Implementation**:
```typescript
app.get('/health', async (c) => {
  const checks = {
    database: await checkDatabase(),
    disk: await checkDiskSpace(),
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not-configured',
    resend: process.env.RESEND_API_KEY ? 'configured' : 'not-configured',
  };

  const healthy = checks.database === 'ok' && checks.disk === 'ok';

  return c.json({
    status: healthy ? 'ok' : 'degraded',
    version: VERSION,
    checks,
  }, healthy ? 200 : 503);
});
```

### Error Handling
**Status**: Minimal

**Current State**:
- Basic try/catch in some routes (feedback, auth)
- Console.log for errors (26 occurrences)
- No structured error logging
- No error aggregation/tracking
- No alerting on errors

**Critical Gaps**:
- [ ] No centralized error handling middleware
- [ ] No error rate monitoring
- [ ] No stack trace sanitization
- [ ] No error aggregation (Sentry, etc.)
- [ ] Errors logged but not tracked

**Recommendations**:

1. **Add Global Error Handler**:
```typescript
app.onError((err, c) => {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  return c.json({
    error: 'Internal server error',
    request_id: c.get('requestId'),
  }, 500);
});
```

2. **Add Request ID Middleware**:
```typescript
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
});
```

3. **Integrate Error Tracking**:
   - [ ] Add Sentry or similar error tracking
   - [ ] Use HeyDev's own error tracking (dogfooding!)
   - [ ] Set up error rate alerts

### Logging
**Status**: Console-only, unstructured

**Current Approach**:
- `console.log()` for info
- `console.error()` for errors
- No log levels
- No structured logging
- No log aggregation

**Issues**:
- [ ] Logs not searchable
- [ ] No correlation IDs
- [ ] No log retention policy
- [ ] Docker default logging (json-file) with no rotation limits
- [ ] Cannot filter by severity

**Recommendations**:

1. **Add Structured Logging**:
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
    }),
    err: pino.stdSerializers.err,
  },
});

// Usage
logger.info({ userId: 123, action: 'login' }, 'User logged in');
logger.error({ err, requestId }, 'Request failed');
```

2. **Configure Docker Logging**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
    labels: "app=heydev,env=production"
```

3. **Log Aggregation** (future):
   - [ ] Loki + Grafana (self-hosted)
   - [ ] Better Stack (cloud, $10/mo)
   - [ ] Papertrail (cloud, free tier available)

### Security Headers
**Status**: Not configured

**Missing Headers**:
- [ ] X-Content-Type-Options
- [ ] X-Frame-Options
- [ ] X-XSS-Protection
- [ ] Strict-Transport-Security
- [ ] Content-Security-Policy
- [ ] Referrer-Policy
- [ ] Permissions-Policy

**Recommendations**:
```typescript
import { secureHeaders } from 'hono/secure-headers';

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // For React
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
}));
```

**Note**: Widget endpoints may need different CSP to work on customer sites.

### Rate Limiting
**Status**: Not implemented

**Vulnerable Endpoints**:
- `POST /api/feedback` - Can be spammed
- `POST /api/upload` - Can exhaust storage
- `POST /api/transcribe` - OpenAI API costs
- `POST /api/auth/login` - Email sending abuse

**Recommendations**:

1. **Add Rate Limiting Middleware**:
```typescript
import { rateLimiter } from 'hono-rate-limiter';

// Global rate limit
app.use('*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
}));

// Strict limit for uploads
api.use('/upload', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
}));

// Strict limit for transcription (costs money!)
api.use('/transcribe', rateLimiter({
  windowMs: 60 * 1000,
  max: 3,
}));
```

2. **Per-API-Key Rate Limiting**:
```typescript
// Track usage per API key
const apiKeyLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  keyGenerator: (c) => c.get('apiKey')?.key || 'unknown',
});
```

### SSL/TLS Configuration
**Status**: Managed by Coolify

**Analysis**:
- Coolify handles SSL via Let's Encrypt
- Automatic certificate renewal
- No application-level SSL configuration needed

**Verification Needed**:
- [ ] Confirm SSL certificate is valid
- [ ] Check certificate auto-renewal
- [ ] Verify HTTPS redirects work
- [ ] Test SSL Labs rating (aim for A+)

**Recommendations**:
```bash
# Check SSL certificate
echo | openssl s_client -servername heydev.io -connect heydev.io:443 2>/dev/null | openssl x509 -noout -dates

# Check SSL Labs rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=heydev.io
```

---

## 5. Monitoring & Alerting Strategy

### Current State
**Status**: Minimal (health check only)

**What's Monitored**:
- Docker health check (30s interval)
- Coolify uptime monitoring (if enabled)

**What's NOT Monitored**:
- [ ] Application errors
- [ ] Response times
- [ ] Request rates
- [ ] Database size
- [ ] Disk usage
- [ ] Memory usage
- [ ] CPU usage
- [ ] API key usage
- [ ] External API failures (OpenAI, Resend)

### Recommended Monitoring Setup

**Tier 1: Basic (Free/Low Cost)**

1. **Uptime Monitoring**:
   - [ ] UptimeRobot (free, 50 monitors)
   - [ ] Better Uptime (free tier)
   - Monitor: https://heydev.io/health

2. **Application Metrics** (Self-hosted):
   - [ ] Add Prometheus metrics endpoint
   - [ ] Export basic metrics (requests, errors, duration)
   - [ ] Set up Grafana dashboard

```typescript
import { prometheus } from 'hono-prometheus';

// Add metrics middleware
app.use('*', prometheus());

// Metrics available at /metrics
```

3. **Log-based Alerts**:
   - [ ] Monitor Docker logs for ERROR patterns
   - [ ] Alert on health check failures
   - [ ] Alert on container restarts

**Tier 2: Production-Grade**

1. **APM (Application Performance Monitoring)**:
   - [ ] Sentry (error tracking + performance)
   - [ ] New Relic (full APM)
   - [ ] Datadog (infrastructure + APM)

2. **Custom Metrics**:
```typescript
// Track key business metrics
const metrics = {
  feedbackReceived: new Counter('feedback_received_total'),
  transcriptionRequests: new Counter('transcription_requests_total'),
  apiKeyUsage: new Counter('api_key_usage_total', ['key_id']),
  responseTime: new Histogram('http_request_duration_seconds'),
};

// Use in routes
feedbackRoutes.post('/', async (c) => {
  const timer = metrics.responseTime.startTimer();
  try {
    // Handle feedback
    metrics.feedbackReceived.inc();
    return c.json({ success: true });
  } finally {
    timer();
  }
});
```

### Alerting Rules

**Critical (Page immediately)**:
- Application down (health check fails)
- Database connection lost
- Disk usage >90%
- Error rate >5% of requests

**Warning (Email/Slack)**:
- Error rate >1% of requests
- Response time p95 >1s
- Disk usage >75%
- SSL certificate expiring <30 days

**Info (Dashboard only)**:
- API key usage patterns
- Daily feedback volume
- Transcription usage (costs)

### Recommended Tools

| Tool | Use Case | Cost | Priority |
|------|----------|------|----------|
| UptimeRobot | Uptime monitoring | Free | High |
| Prometheus + Grafana | Metrics & dashboards | Self-hosted | Medium |
| Sentry | Error tracking | $26/mo | High |
| Better Stack | Log aggregation | $10/mo | Medium |
| Datadog | Full observability | $15/host/mo | Low |

---

## 6. Incident Response Procedures

### Current Capabilities
**Status**: Ad-hoc, undocumented

**Access**:
- SSH to production server (key-based)
- Docker command access (requires sudo)
- SQLite CLI access from host

### Runbook: Common Operations

#### Check Application Status
```bash
# SSH to server
ssh -i ~/.ssh/eapen-coolify.txt cloud@172.252.211.242

# Find HeyDev container
sudo docker ps --format '{{.Names}}\t{{.Status}}' | grep server-swockw8

# Check health
curl http://localhost:3000/health

# View recent logs
sudo docker logs server-swockw8oo88ow0w0ocgc4ggw-172822239790 --tail 100 -f
```

#### Restart Application
```bash
# Via Coolify dashboard (preferred)
# Or manual restart:
sudo docker restart server-swockw8oo88ow0w0ocgc4ggw-172822239790

# Verify startup
sudo docker logs server-swockw8oo88ow0w0ocgc4ggw-172822239790 --tail 50
curl http://localhost:3000/health
```

#### Database Access
```bash
# From host (SQLite CLI)
sudo sqlite3 /var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/heydev.db

# Read-only queries
.mode column
.headers on
SELECT COUNT(*) as total_conversations FROM conversations;
SELECT COUNT(*) as total_messages FROM messages;
SELECT COUNT(*) as total_users FROM users;

# Check database size
.dbinfo

# Exit
.quit
```

#### View Application Logs
```bash
# Live tail
sudo docker logs -f server-swockw8oo88ow0w0ocgc4ggw-172822239790

# Last 500 lines
sudo docker logs --tail 500 server-swockw8oo88ow0w0ocgc4ggw-172822239790

# Logs since 1 hour ago
sudo docker logs --since 1h server-swockw8oo88ow0w0ocgc4ggw-172822239790

# Search for errors
sudo docker logs server-swockw8oo88ow0w0ocgc4ggw-172822239790 2>&1 | grep -i error
```

#### Check Disk Space
```bash
# Overall disk usage
df -h

# Docker volumes
sudo docker system df -v

# Database size
sudo ls -lh /var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/

# Uploads size
sudo du -sh /var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-uploads/_data/
```

#### Emergency Database Backup
```bash
# Immediate backup
sudo docker exec server-swockw8oo88ow0w0ocgc4ggw-172822239790 \
  sqlite3 /app/server/data/heydev.db ".backup /tmp/emergency.db"

sudo docker cp server-swockw8oo88ow0w0ocgc4ggw-172822239790:/tmp/emergency.db \
  ~/backups/heydev-emergency-$(date +%Y%m%d_%H%M%S).db
```

#### Restore Database
```bash
# DANGER: This replaces the production database!
# 1. Stop the application
sudo docker stop server-swockw8oo88ow0w0ocgc4ggw-172822239790

# 2. Copy backup to container
sudo docker cp ~/backups/heydev-backup.db \
  server-swockw8oo88ow0w0ocgc4ggw-172822239790:/tmp/restore.db

# 3. Replace database
sudo docker exec server-swockw8oo88ow0w0ocgc4ggw-172822239790 \
  cp /tmp/restore.db /app/server/data/heydev.db

# 4. Start application
sudo docker start server-swockw8oo88ow0w0ocgc4ggw-172822239790

# 5. Verify
curl http://localhost:3000/health
```

### Incident Response Checklist

#### When Users Report Issues

1. **Triage** (2 minutes)
   - [ ] Check health endpoint: `curl https://heydev.io/health`
   - [ ] Check server status: `ssh + docker ps`
   - [ ] Check recent logs for errors
   - [ ] Determine severity (P1/P2/P3)

2. **Communicate** (5 minutes)
   - [ ] Acknowledge the issue
   - [ ] Post status update (Twitter, status page, etc.)
   - [ ] Set up incident channel (Slack/Discord)

3. **Investigate** (15-30 minutes)
   - [ ] Review error logs
   - [ ] Check database connectivity
   - [ ] Check disk space
   - [ ] Check external API status (OpenAI, Resend)
   - [ ] Review recent deployments

4. **Mitigate** (varies)
   - [ ] Implement fix or workaround
   - [ ] Deploy fix if needed
   - [ ] Monitor recovery

5. **Resolve** (5 minutes)
   - [ ] Verify issue is fixed
   - [ ] Post resolution update
   - [ ] Close incident

6. **Post-Mortem** (within 48 hours)
   - [ ] Write incident report (see template below)
   - [ ] Identify root cause
   - [ ] Create action items
   - [ ] Schedule blameless review

### Post-Mortem Template

```markdown
## Incident: [Brief title]
**Date**: YYYY-MM-DD HH:MM UTC
**Duration**: X hours Y minutes
**Severity**: P1 (critical) / P2 (major) / P3 (minor)
**Status**: Resolved

### Summary
One-paragraph description of what happened.

### Impact
- **Users affected**: X (or "All users" / "Subset of users")
- **Functionality impacted**: [Feature that was down/degraded]
- **Duration**: X hours from HH:MM to HH:MM UTC

### Timeline (UTC)
- **HH:MM** - First user report / Alert fired
- **HH:MM** - Incident acknowledged, investigation started
- **HH:MM** - Root cause identified
- **HH:MM** - Fix deployed
- **HH:MM** - Service restored, monitoring
- **HH:MM** - Incident closed

### Root Cause
Technical explanation of what caused the incident.

### Resolution
What we did to fix it.

### What Went Well
- Quick detection
- Fast response time
- Clear communication

### What Could Be Improved
- Earlier detection (better monitoring)
- Faster mitigation (automation)
- Prevention (guardrails)

### Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add monitoring for X | DevOps | YYYY-MM-DD | Open |
| Implement guardrail Y | Engineering | YYYY-MM-DD | Open |
| Update runbook Z | DevOps | YYYY-MM-DD | Open |
```

---

## 7. Scaling Considerations

### Current Architecture Constraints

**Vertical Scaling Limits**:
- SQLite performs well up to ~100K requests/day
- Single server (no horizontal scaling)
- File-based uploads (no CDN)
- In-memory SSE connections (lost on restart)

**When to Scale**:
- Database size >10GB
- Request volume >1M/day
- Concurrent users >1000
- Geographic distribution needed

### Scaling Path

**Phase 1: Optimize Current Setup** (0-100K requests/day)
- [ ] Add Redis for SSE connection management
- [ ] Implement connection pooling
- [ ] Add CDN for widget.js
- [ ] Optimize database queries
- [ ] Add caching layer

**Phase 2: Vertical Scaling** (100K-1M requests/day)
- [ ] Upgrade server resources (4 CPU, 8GB RAM)
- [ ] Consider PostgreSQL migration
- [ ] Add read replicas
- [ ] Separate upload storage (S3/R2)
- [ ] Add load balancer

**Phase 3: Horizontal Scaling** (1M+ requests/day)
- [ ] Multiple application servers
- [ ] PostgreSQL with replicas
- [ ] Redis cluster
- [ ] CDN for all static assets
- [ ] Queue for background jobs (webhook delivery)
- [ ] Separate widget API from dashboard API

### Database Migration Path (SQLite → PostgreSQL)

**When to migrate**:
- Database size >5GB
- Concurrent writes >100/sec
- Need for complex queries/joins
- Geographic replication needed

**Migration steps**:
1. Set up PostgreSQL instance
2. Update Drizzle config for PostgreSQL
3. Export SQLite data
4. Import to PostgreSQL
5. Test thoroughly
6. Cutover during maintenance window
7. Monitor performance

---

## 8. Security Hardening Checklist

### Application Security
- [ ] Run as non-root user in Docker
- [ ] Add security headers middleware
- [ ] Implement rate limiting
- [ ] Sanitize error messages (no stack traces to users)
- [ ] Validate all input (zod schemas)
- [ ] Add CSRF protection for dashboard
- [ ] Implement API key rotation
- [ ] Add webhook signature verification
- [ ] Audit dependencies for vulnerabilities (`npm audit`)

### Infrastructure Security
- [ ] SSH key-only access (no password auth)
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] Regular security updates (unattended-upgrades)
- [ ] Docker socket not exposed
- [ ] Secrets not in environment variables
- [ ] Database not publicly accessible
- [ ] Backup encryption at rest
- [ ] TLS 1.3 minimum
- [ ] Strong SSL cipher suites

### Data Security
- [ ] Database encrypted at rest
- [ ] Backups encrypted
- [ ] User data retention policy
- [ ] PII handling documented
- [ ] GDPR compliance (if EU users)
- [ ] Data export capability
- [ ] Data deletion capability

### Access Control
- [ ] API keys rotatable
- [ ] Admin dashboard requires authentication
- [ ] Session timeout configured
- [ ] Password requirements (if adding passwords)
- [ ] 2FA for admin accounts (future)
- [ ] Audit log for sensitive operations

---

## 9. Compliance & Documentation

### Documentation Gaps
- [ ] Disaster recovery plan
- [ ] Backup and restore procedures
- [ ] Security incident response plan
- [ ] Data retention policy
- [ ] Privacy policy
- [ ] Terms of service
- [ ] API rate limits documentation
- [ ] SLA/uptime commitments

### Compliance Considerations

**GDPR** (if EU users):
- [ ] Privacy policy
- [ ] Cookie consent
- [ ] Data processing agreement
- [ ] Right to access (data export)
- [ ] Right to erasure (data deletion)
- [ ] Data breach notification process

**SOC 2** (if enterprise customers):
- [ ] Access controls documented
- [ ] Encryption documented
- [ ] Change management process
- [ ] Incident response process
- [ ] Vendor risk management

---

## 10. Priority Action Plan

### Immediate (This Week)
1. **Set up database backups**
   - [ ] Create backup script
   - [ ] Schedule daily cron job
   - [ ] Test restore procedure
   - [ ] Document in runbook

2. **Add basic monitoring**
   - [ ] Set up UptimeRobot for health checks
   - [ ] Configure email alerts
   - [ ] Add /health improvements (DB check)

3. **Security quick wins**
   - [ ] Add security headers middleware
   - [ ] Run as non-root in Docker
   - [ ] Configure Docker logging limits
   - [ ] Run `npm audit` and fix critical issues

### Short-term (This Month)
1. **Logging improvements**
   - [ ] Add structured logging (pino)
   - [ ] Add request ID middleware
   - [ ] Configure log retention
   - [ ] Set up log aggregation (Better Stack)

2. **Rate limiting**
   - [ ] Add global rate limiter
   - [ ] Add strict limits for costly endpoints
   - [ ] Monitor rate limit hits

3. **Error tracking**
   - [ ] Set up Sentry (or use HeyDev itself!)
   - [ ] Configure error alerts
   - [ ] Add error rate monitoring

### Medium-term (Next Quarter)
1. **Monitoring & observability**
   - [ ] Set up Prometheus + Grafana
   - [ ] Create operational dashboards
   - [ ] Configure comprehensive alerts
   - [ ] Add business metrics tracking

2. **Automation**
   - [ ] Automate database migrations on startup
   - [ ] Automate backup verification
   - [ ] Set up staging environment
   - [ ] Implement CI/CD pipeline

3. **Performance optimization**
   - [ ] Add CDN for widget.js
   - [ ] Implement caching strategy
   - [ ] Optimize database queries
   - [ ] Add Redis for sessions/SSE

---

## Appendix: Quick Reference

### Key Files
```
/Users/justuseapen/Dropbox/code/heydev/
├── Dockerfile                    # Multi-stage build config
├── docker-compose.yml            # Local/dev compose file
├── .env.example                  # Environment variable template
├── server/
│   ├── src/index.ts             # Server entry point
│   ├── src/db/index.ts          # Database connection
│   ├── src/db/schema.ts         # Database schema
│   ├── drizzle.config.js        # ORM config
│   └── drizzle/                 # Migration files
└── widget/
    └── dist/widget.js           # Built widget (50KB)
```

### Key Endpoints
- `GET /health` - Health check (basic)
- `GET /widget.js` - Widget script
- `POST /api/feedback` - Submit feedback (API key required)
- `POST /api/upload` - Upload screenshot (API key required)
- `POST /api/transcribe` - Transcribe audio (API key required)
- `POST /api/auth/login` - Email magic link
- `GET /api/events` - SSE connection for real-time updates

### Container Info
- **Name**: `server-swockw8oo88ow0w0ocgc4ggw-172822239790`
- **Image**: Built from Dockerfile
- **Port**: 3000
- **Volumes**:
  - `heydev-data:/app/server/data` (database)
  - `heydev-uploads:/app/uploads` (screenshots)

### Database
- **Type**: SQLite with WAL mode
- **Location**: `/var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/heydev.db`
- **Tables**: users, projects, apiKeys, channels, conversations, messages, authTokens, sessions
- **Migrations**: 5 files in `server/drizzle/`

### Access
```bash
# SSH to server
ssh -i ~/.ssh/eapen-coolify.txt cloud@172.252.211.242

# View logs
sudo docker logs server-swockw8oo88ow0w0ocgc4ggw-172822239790 -f

# Database CLI
sudo sqlite3 /var/lib/docker/volumes/swockw8oo88ow0w0ocgc4ggw_heydev-data/_data/heydev.db

# Health check
curl http://localhost:3000/health
```

---

## Summary

HeyDev has a **solid foundation** with good containerization practices, data persistence, and basic health monitoring. However, it needs **operational hardening** before handling production scale.

**Critical Priorities**:
1. Implement automated database backups (HIGH - data loss risk)
2. Add monitoring and alerting (HIGH - blind to issues)
3. Configure security headers (MEDIUM - easy wins)
4. Add rate limiting (MEDIUM - abuse prevention)
5. Set up structured logging (MEDIUM - debugging)

**Timeline**:
- Week 1: Backups + basic monitoring
- Week 2-4: Logging, rate limiting, error tracking
- Month 2-3: Full observability, automation, staging env

**Estimated Effort**: 2-3 weeks for critical items, 2-3 months for full production hardening.

**Risk Assessment**: Currently acceptable for MVP/beta, but needs hardening before public launch or enterprise customers.
