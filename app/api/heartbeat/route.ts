import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Heartbeat endpoint — keeps the Supabase free-tier project alive.
 *
 * Supabase free-tier projects are paused after 1 week of inactivity.
 * This endpoint makes a lightweight query to register activity.
 *
 * Expected to be called by an external cron service (GitHub Actions,
 * cron-job.org, UptimeRobot, etc.) at least once every 24 hours.
 *
 * GET /api/heartbeat
 * Response: { status: 'ok', timestamp: '...', db: 'ok'|'error' }
 */
export async function GET() {
  const start = Date.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Missing Supabase environment variables',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Lightweight query — just enough to register database activity.
  const { error } = await supabase.from('roles').select('id', { count: 'exact', head: true });

  const duration = Date.now() - start;

  if (error) {
    console.error('[Heartbeat] DB query failed:', error.message);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: 'ok',
    db: 'ok',
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    project: supabaseUrl.replace('https://', '').split('.')[0],
  });
}
