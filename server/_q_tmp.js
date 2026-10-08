require('dotenv').config({ path: process.cwd() + '/.env' });
const mongoose = require('mongoose'), express = require('express'), jwt = require('jsonwebtoken'), http = require('http');
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const app = express(); app.use(express.json()); app.use('/api/prices', require('./routes/prices'));
  const srv = app.listen(0); const port = srv.address().port;
  const token = jwt.sign({ id: 'readonly-check', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const get = path => new Promise((ok, no) => http.get({ port, path, headers: { Authorization: 'Bearer ' + token } }, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => ok(JSON.parse(b))); }).on('error', no));
  for (const path of ['/api/prices/latest', '/api/prices/date/2026-10-08']) {
    const data = await get(path);
    const priced = data.filter(x => x.price != null);
    console.log(`\n${path}: ${priced.length} priced, ${priced.filter(x => x.prevPrice != null).length} with a previous price`);
    priced.filter(x => x.prevPrice != null).forEach(x => console.log(`  ${x.product.group} | ${x.product.make || '-'} : ${x.prevPrice} (${x.prevDate}) -> ${x.price} ${x.price > x.prevPrice ? 'UP' : x.price < x.prevPrice ? 'DOWN' : 'same'}`));
  }
  srv.close(); await mongoose.disconnect();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
