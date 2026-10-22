// Check distinct currency values across payments / courses / trainer_earnings / withdrawal_requests
const { Client } = require('pg')

const CONN = 'postgresql://postgres.tzquudmfazysjogorrxz:m773057153M@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'

async function main() {
  const c = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const q = async (sql: string) => (await c.query(sql)).rows
  console.log('courses.currency:', await q(`SELECT currency, COUNT(*) FROM courses GROUP BY currency ORDER BY 2 DESC`))
  console.log('payments.currency:', await q(`SELECT currency, COUNT(*) FROM payments GROUP BY currency ORDER BY 2 DESC`))
  try { console.log('trainer_earnings:', await q(`SELECT currency, status, COUNT(*), SUM(amount) FROM trainer_earnings GROUP BY currency, status`)) } catch (e: any) { console.log('trainer_earnings err', e.message) }
  try { console.log('withdrawal_requests:', await q(`SELECT currency, status, COUNT(*) FROM withdrawal_requests GROUP BY currency, status`)) } catch (e: any) { console.log('withdrawals err', e.message) }
  try { console.log('follow counts:', await q(`SELECT trainer_id, COUNT(*) FROM trainer_follows GROUP BY trainer_id ORDER BY 2 DESC LIMIT 10`)) } catch (e: any) { console.log('follows err', e.message) }
  await c.end()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
