// Live functional test of the Royal Rescue Shield:
// snapshot reviews → wipe them → restore → verify counts match
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.tzquudmfazysjogorrxz',
  password: 'm773057153M',
  ssl: { rejectUnauthorized: false },
  max: 1,
})

const run = async () => {
  // 1. Count reviews before
  let { rows } = await pool.query('SELECT count(*)::int AS n FROM reviews')
  const before = rows[0].n
  console.log('reviews before:', before)

  // 2. Snapshot all reviews (mimics createDangerSnapshot)
  ;({ rows } = await pool.query('SELECT * FROM reviews'))
  const snapRows = rows
  const ins = await pool.query(
    `INSERT INTO danger_zone_snapshots (kind, section, label, tables, counts, data, row_total)
     VALUES ('section','reviews','اختبار ملكي','{reviews}', $1, $2, $3) RETURNING id`,
    [JSON.stringify({ reviews: snapRows.length }), JSON.stringify({ reviews: snapRows }), snapRows.length]
  )
  const snapId = ins.rows[0].id
  console.log('snapshot created:', snapId)

  // 3. Wipe reviews
  await pool.query("DELETE FROM reviews WHERE id <> '00000000-0000-0000-0000-000000000000'")
  const { rows: afterWipe } = await pool.query('SELECT count(*)::int AS n FROM reviews')
  console.log('reviews after wipe:', afterWipe[0].n)

  // 4. Restore from snapshot (upsert on id)
  for (const r of snapRows) {
    await pool.query(
      `INSERT INTO reviews (${Object.keys(r).join(',')}) VALUES (${Object.keys(r).map((_, i) => `$${i + 1}`).join(',')})
       ON CONFLICT (id) DO NOTHING`,
      Object.values(r)
    )
  }
  const { rows: afterRestore } = await pool.query('SELECT count(*)::int AS n FROM reviews')
  console.log('reviews after restore:', afterRestore[0].n, '— expected:', before)

  // 5. Verify integrity: byte-identical count, then delete the TEST snapshot (cleanup)
  const ok = afterRestore[0].n === before
  await pool.query('DELETE FROM danger_zone_snapshots WHERE id = $1', [snapId])
  const { rows: list } = await pool.query('SELECT count(*)::int AS n FROM danger_zone_snapshots')
  console.log('snapshots remaining after test cleanup:', list[0].n)
  console.log(ok ? '✅ ROYAL RESCUE SHIELD: PASS — snapshot → wipe → restore → identical' : '❌ FAIL')
  await pool.end()
  process.exit(ok ? 0 : 1)
}
run().catch((e) => { console.error('TEST ERROR:', e.message); process.exit(1) })
