// ROYAL v4.2 MIGRATION — applied directly via the pooler connection
import pg from 'pg';
const CONN = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const client = new pg.Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('✅ CONNECTED — applying v4.2 migration');

// 1) max_retakes per course (allowed retakes budget; 0 = exam once ever)
await client.query(`
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_retakes INT DEFAULT 2;
`);
console.log('✅ courses.max_retakes ready (default 2)');

// 2) Trainer follow system (student follows a trainer profile)
await client.query(`
  CREATE TABLE IF NOT EXISTS trainer_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL,
    trainer_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (follower_id, trainer_id)
  );
  CREATE INDEX IF NOT EXISTS idx_trainer_follows_follower ON trainer_follows (follower_id);
  CREATE INDEX IF NOT EXISTS idx_trainer_follows_trainer ON trainer_follows (trainer_id);
`);
console.log('✅ trainer_follows table ready');

// 3) Refresh PostgREST schema cache so Supabase JS sees the new columns/tables
await client.query(`NOTIFY pgrst, 'reload schema';`);
console.log('✅ PostgREST schema cache reloaded');

// Verify
const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='courses' AND column_name IN ('max_retakes','retake_fee','exam_duration_minutes')`);
console.log('courses exam columns:', cols.rows.map(r => r.column_name).join(', '));
const tbl = await client.query(`SELECT to_regclass('public.trainer_follows') AS t`);
console.log('trainer_follows exists:', tbl.rows[0].t);

// Set a sensible default for existing courses that never configured retakes
const upd = await client.query(`UPDATE courses SET max_retakes = 2 WHERE max_retakes IS NULL`);
console.log(`✅ defaulted max_retakes=2 on ${upd.rowCount} courses`);

await client.end();
console.log('🎉 MIGRATION COMPLETE');
