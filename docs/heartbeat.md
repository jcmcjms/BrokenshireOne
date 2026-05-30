# Heartbeat System — Supabase Keep-Alive

Prevents the free-tier Supabase project from being auto-paused after 7 days of inactivity by running a lightweight database query on a recurring schedule.

Supabase free-tier projects are **automatically paused after 7 days with no API requests**. A paused project takes 15-30 seconds to resume on the next request, which breaks user-facing features and background jobs. This heartbeat system solves that by sending a minimal, authenticated query every 6 hours.

---

## Architecture

The system is composed of three components that work together:

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Actions                         │
│              .github/workflows/heartbeat.yml             │
│                                                          │
│   ┌─────────────────────┐   ┌─────────────────────────┐  │
│   │  Method: api         │   │  Method: script          │  │
│   │                      │   │                          │  │
│   │  curl $PRODUCTION_   │   │  npm install @supabase/  │  │
│   │  URL/api/heartbeat   │   │  supabase-js && node     │  │
│   │                      │   │  scripts/heartbeat.mjs   │  │
│   └────────┬─────────────┘   └───────────┬─────────────┘  │
│            │                             │                │
└────────────┼─────────────────────────────┼────────────────┘
             │                             │
             ▼                             ▼
   ┌──────────────────┐        ┌─────────────────────┐
   │  API Route        │        │  Standalone Script   │
   │  /api/heartbeat   │        │  scripts/heartbeat   │
   │  (Next.js Route   │        │  .mjs                │
   │   Handler)        │        │                      │
   └────────┬──────────┘        └──────────┬──────────┘
            │                              │
            └──────────┬───────────────────┘
                       ▼
          ┌─────────────────────────┐
          │  Supabase Database       │
          │  SELECT id FROM roles    │
          │  LIMIT 1 (lightweight)   │
          └─────────────────────────┘
```

- The **GitHub Actions workflow** runs every 6 hours and executes both methods in parallel.
- The **API method** hits the deployed Vercel app's `/api/heartbeat` endpoint.
- The **Script method** runs the Node.js ES module directly against Supabase.
- Both methods execute the same lightweight query: `supabase.from('roles').select('id', { count: 'exact', head: true })`.

---

## Components

### API Route

**File:** `app/api/heartbeat/route.ts`

A Next.js Route Handler deployed as part of the application. It creates a Supabase admin client using the service role key and runs a minimal query.

#### Endpoint

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Path | `/api/heartbeat` |
| Auth | Internal (no user auth required, but uses service role) |
| Deployed URL | `https://<your-domain>/api/heartbeat` |

#### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |

#### Response Format

**Success (200):**

```json
{
  "status": "ok",
  "db": "ok",
  "timestamp": "2026-05-30T12:00:00.000Z",
  "duration_ms": 45,
  "project": "cqoebgtrludstqsmsgtd"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Overall health: `"ok"` or `"error"` |
| `db` | `string` | Database reachability: `"ok"` or `"error"` |
| `timestamp` | `string` | ISO 8601 timestamp of the request |
| `duration_ms` | `number` | Query execution time in milliseconds |
| `project` | `string` | Supabase project reference |

**Error (500):**

```json
{
  "status": "error",
  "message": "Missing Supabase environment variables",
  "timestamp": "2026-05-30T12:00:00.000Z"
}
```

A 500 response is returned when required environment variables are missing or the database query fails.

---

### Standalone Script

**File:** `scripts/heartbeat.mjs`

A Node.js ES Module that can be run locally or in CI without requiring a running Next.js server.

#### How It Works

1. Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` directly from `.env.local` using Node.js's built-in `fs.readFileSync` (no `dotenv` dependency).
2. Creates a Supabase client with the service role key.
3. Executes `supabase.from('roles').select('id', { count: 'exact', head: true })`.
4. Prints a status line with the project reference, response time, and timestamp.
5. Exits with code `0` on success or `1` on failure.

#### Usage

```bash
# Via package.json script
npm run heartbeat

# Directly
node scripts/heartbeat.mjs
```

#### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Query succeeded -- database is alive |
| `1` | Query failed -- missing env vars or database unreachable |

#### Example Output

```
[Heartbeat] Project "cqoebgtrludstqsmsgtd" is alive
[Heartbeat]   Response time: 3695ms
[Heartbeat]   Timestamp:     2026-05-30T11:04:44.687Z
```

#### Requirements

- Node.js 18+
- `.env.local` file in the project root with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `@supabase/supabase-js` installed in `node_modules` (already a project dependency)

---

### GitHub Actions Workflow

**File:** `.github/workflows/heartbeat.yml`

#### Schedule

| Trigger | Frequency |
|---------|-----------|
| `cron` | Every 6 hours (`0 */6 * * *`) |
| `workflow_dispatch` | Manual trigger via GitHub UI |
| `push` | Changes to `app/api/heartbeat/**`, `scripts/heartbeat.mjs`, or `.github/workflows/heartbeat.yml` |

#### Matrix Strategy

The workflow runs two methods in parallel using a matrix. Each method is independent -- if one fails, the other still completes.

**Method 1: `api`** -- Calls the deployed application's heartbeat endpoint via `curl`:

```yaml
- name: Heartbeat via deployed API
  run: |
    curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
      "$PRODUCTION_URL/api/heartbeat"
  env:
    PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
```

- Requires `PRODUCTION_URL` secret.
- **Graceful skip**: If `PRODUCTION_URL` is not set, the step exits `0` with a warning message.

**Method 2: `script`** -- Installs `@supabase/supabase-js` and runs the standalone script:

```yaml
- name: Heartbeat via local script
  run: |
    npm install --silent @supabase/supabase-js
    node scripts/heartbeat.mjs
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

- Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets.
- Injects them as environment variables (overrides `.env.local`).
- **Graceful skip**: If either secret is missing, the step exits `0` with a warning message.

#### Workflow Behavior

- Both methods run in parallel via the matrix strategy.
- A method that is skipped (missing secrets) is considered a pass, not a failure.
- The overall workflow fails only if an **active** method (one with secrets configured) returns a non-zero exit code.
- On failure, GitHub sends a notification to committers and watchers (default behavior).

---

## Setup Guide

### Prerequisites

- [ ] Supabase project is created (ref: `cqoebgtrludstqsmsgtd`)
- [ ] Supabase service role key is obtained from **Project Settings > API > service_role key**
- [ ] App is deployed to Vercel (or another hosting platform)
- [ ] GitHub repository has Actions enabled

### Step 1: Configure GitHub Secrets

Navigate to **GitHub repository > Settings > Secrets and variables > Actions** and add the following repository secrets:

| Secret | Value | Required By |
|--------|-------|-------------|
| `PRODUCTION_URL` | `https://canteen-management.vercel.app` | API method |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cqoebgtrludstqsmsgtd.supabase.co` | Script method |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Script method |

> **Security note:** The service role key bypasses Row-Level Security. Store it as a GitHub secret, never commit it to the repository, and do not expose it client-side.

At minimum, configure **one** of the two methods. Both are recommended for redundancy.

### Step 2: Verify the API Route (for API method)

1. Deploy the application containing `app/api/heartbeat/route.ts`.
2. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel Environment Variables.
3. Test the endpoint:
   ```bash
   curl https://canteen-management.vercel.app/api/heartbeat
   ```
4. Confirm the response contains `"status": "ok"` and `"db": "ok"`.

### Step 3: Test the Script Locally (for Script method)

1. Ensure `.env.local` exists in the project root with the required variables.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the heartbeat:
   ```bash
   npm run heartbeat
   ```
4. Confirm output:
   ```
   [Heartbeat] Project "cqoebgtrludstqsmsgtd" is alive
   ```

### Step 4: Enable the Workflow

1. Ensure `.github/workflows/heartbeat.yml` exists in the repository.
2. Push to the default branch -- the workflow activates automatically.
3. Verify it runs by navigating to **GitHub > Actions > Heartbeat**.

---

## Usage

### Running Locally

```bash
# Quick check
npm run heartbeat

# Direct execution
node scripts/heartbeat.mjs
```

### Manual Trigger from GitHub UI

1. Navigate to **GitHub repository > Actions > Heartbeat**.
2. Click **Run workflow** (dropdown button).
3. Select the branch and click **Run workflow**.
4. The workflow executes immediately with both methods (based on configured secrets).

### Checking Workflow History

1. Go to **GitHub > Actions > Heartbeat**.
2. View the most recent run or filter by **Status** or **Branch**.
3. Click any run to expand the matrix and see individual method logs.

---

## Troubleshooting

### Workflow Step Is Skipped

| Symptom | Cause | Solution |
|---------|-------|----------|
| API step shows "Skipped" / "Skipping" | `PRODUCTION_URL` secret is missing | Set the secret in GitHub repository settings |
| Script step shows "Skipped" / "Skipping" | `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing | Set both secrets in GitHub repository settings |
| Both steps skipped | No secrets configured | Configure at least one method's secrets |

Steps gracefully skip when their required secrets are not set. This is intentional -- the workflow can be partially configured without failing.

### API Method Fails

| Symptom | Cause | Solution |
|---------|-------|----------|
| `curl: (22) HTTP 500` | API route missing env vars or query fails | Check Vercel environment variables |
| `curl: (6) Could not resolve host` | `PRODUCTION_URL` is incorrect | Verify the URL format (no trailing slash) |
| `curl: (7) Connection refused` | Application is not deployed or paused | Check Vercel deployment status |

### Script Method Fails

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Error: Cannot find module '@supabase/supabase-js'` | Dependencies not installed | Run `npm install` before the script |
| `Error: Missing Supabase environment variables` | Missing or malformed `.env.local` | Ensure file exists with correct key names |
| `[Heartbeat] DB query failed` | Invalid credentials or network error | Verify credentials against Supabase dashboard |

### Workflow Not Running

| Symptom | Cause | Solution |
|---------|-------|----------|
| Workflow never appears in Actions tab | File is not on the default branch | Merge the workflow file to the default branch |
| Cron schedule not triggering | GitHub Actions disabled on the repository | Check repository Settings > Actions > General |
| Push trigger not working | Path filter excludes the changed files | Ensure the push modifies files in the paths listed in the workflow |

---

## Alternatives

If GitHub Actions is not desirable, the following services can also provide scheduled pings to keep the Supabase project alive:

| Service | Free Tier | Method | Notes |
|---------|-----------|--------|-------|
| **cron-job.org** | 60 scheduled jobs | HTTP GET to `/api/heartbeat` | No account required for a single job. Pings from multiple regions. |
| **UptimeRobot** | 50 monitors, 5-min intervals | HTTP GET to `/api/heartbeat` | Primarily a monitoring tool, doubles as keep-alive. Sends alerts on failure. |
| **Better Uptime** | 10 monitors, 1-min intervals | HTTP GET to `/api/heartbeat` | Includes status pages and on-call notifications. |
| **Vercel Cron Jobs** | Powered by Vercel | Vercel cron in `vercel.json` | Requires Vercel Pro plan (Hobby tier has no cron support). |
| **Self-hosted cron** | Free | `curl` or `node script` | Requires a server (e.g. Raspberry Pi, VPS) with internet access. |

All HTTP-based alternatives require the application to be deployed and the `/api/heartbeat` endpoint to be publicly accessible.

---

## File Reference

| File | Purpose |
|------|---------|
| `app/api/heartbeat/route.ts` | Next.js Route Handler (HTTP endpoint) |
| `scripts/heartbeat.mjs` | Standalone Node.js ES Module |
| `scripts/check-db.mjs` | Additional diagnostic script (pre-existing) |
| `.github/workflows/heartbeat.yml` | GitHub Actions workflow definition |
| `docs/heartbeat.md` | This documentation file |

---

## Verified Test Run

The script was tested successfully against the production Supabase project on 2026-05-30:

```
[Heartbeat] Project "cqoebgtrludstqsmsgtd" is alive
[Heartbeat]   Response time: 3695ms
[Heartbeat]   Timestamp:     2026-05-30T11:04:44.687Z
```

The higher response time (3695ms) is typical for a cold-start query on Supabase free tier -- the database may need to wake from idle. Subsequent queries within the same 6-hour window will be faster (50-200ms).
