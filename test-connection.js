const { Client } = require('pg');
const dns = require('dns');
const origLookup = dns.lookup;

dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'db.tzquudmfazysjogorrxz.supabase.co') {
    callback(null, '34.241.16.247', 4);
  } else {
    origLookup(hostname, options, callback);
  }
};

const client = new Client({
  host: 'db.tzquudmfazysjogorrxz.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'm773057153M@#$778288150omy',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

client.connect()
  .then(() => { console.log('SUCCESS: Connected to Supabase!');
    return client.query('SELECT version()');
  })
  .then(res => { console.log('Version:', res.rows[0].version.substring(0, 60)); client.end(); })
  .catch(err => console.log('ERROR:', err.code, err.message.substring(0, 100)));
