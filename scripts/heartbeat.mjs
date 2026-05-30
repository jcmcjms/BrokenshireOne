#!/usr/bin/env node

/**
 * Heartbeat script — keeps the Supabase free-tier project alive.
 *
 * Supabase free-tier projects are paused after 1 week of inactivity.
 * This script makes a lightweight query to register database activity.
 *
 * Usage:
 *   node scripts/heartbeat.mjs
 *
 * Expects these environment variables (loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Exit codes:
 *   0 — heartbeat succeeded
 *   1 — heartbeat failed
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (avoids dotenv dependency)
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Heartbeat] ❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const start = Date.now();

  // Lightweight query — just enough to register database activity.
  // We use head:true so no rows are returned, just a count.
  const { error, count } = await supabase
    .from('roles')
    .select('id', { count: 'exact', head: true });

  const duration = Date.now() - start;

  if (error) {
    console.error(`[Heartbeat] ❌ DB query failed: ${error.message}`);
    process.exit(1);
  }

  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  console.log(`[Heartbeat] ✅ Project "${projectRef}" is alive`);
  console.log(`[Heartbeat]   Response time: ${duration}ms`);
  console.log(`[Heartbeat]   Timestamp:     ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('[Heartbeat] ❌ Unexpected error:', err);
  process.exit(1);
});
