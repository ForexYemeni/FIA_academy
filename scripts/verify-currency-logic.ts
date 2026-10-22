// Verify per-currency totals logic against REAL production data (read-only)
const { Client } = require('pg')
const CONN = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'

async function main() {
  const c = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const q = (sql, p) => c.query(sql, p).then((r) => r.rows)

  // Which trainers hold earnings?
  const earners = await q(`SELECT DISTINCT trainer_id FROM trainer_earnings`)
  console.log('trainers with earnings:', earners.map((r) => r.trainer_id))

  for (const { trainer_id } of earners) {
    const byCur = await q(`
      SELECT currency,
             SUM(amount) FILTER (WHERE true) AS total_earned,
             SUM(amount) FILTER (WHERE status = 'متاح') AS available,
             SUM(amount) FILTER (WHERE status = 'مسحوب') AS withdrawn
      FROM trainer_earnings WHERE trainer_id = $1 GROUP BY currency`, [trainer_id])
    const pend = await q(`
      SELECT currency, SUM(amount) AS pending FROM withdrawal_requests
      WHERE trainer_id = $1 AND status = 'قيد الانتظار' GROUP BY currency`, [trainer_id])
    console.log(`trainer ${trainer_id}:`, { byCur, pending: pend })
  }

  // FIFO simulation per currency (read-only): rows that WOULD be consumed
  const wd = await q(`SELECT trainer_id, amount, currency FROM withdrawal_requests WHERE status = 'قيد الانتظار'`)
  for (const w of wd) {
    const avail = await q(`
      SELECT id, amount FROM trainer_earnings
      WHERE trainer_id = $1 AND status = 'متاح' AND currency = $2
      ORDER BY created_at ASC`, [w.trainer_id, w.currency])
    let remaining = w.amount
    const consumed = []
    for (const row of avail) {
      if (remaining <= 0) break
      consumed.push(row.id)
      remaining -= row.amount
    }
    console.log(`pending withdrawal ${w.amount} ${w.currency} → would consume ${consumed.length} rows of SAME currency, leftover=${remaining}`)
  }
  await c.end()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
