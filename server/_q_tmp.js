require('dotenv').config({ path: process.cwd() + '/.env' });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection;
  const PE = db.collection('priceentries'), PR = db.collection('products');
  const norm = v => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const key = p => norm(p.group);
  const prods = await PR.find({}, { projection: { group: 1, make: 1, coo: 1, grade: 1, purity: 1, itemPackage: 1, isActive: 1 } }).toArray();
  const keyOf = {}; prods.forEach(p => { keyOf[String(p._id)] = key(p); });
  const entries = await PE.find({ price: { $ne: null } }, { projection: { product: 1, date: 1, price: 1 } }).toArray();
  const hist = {}; entries.forEach(e => { const k = keyOf[String(e.product)]; if (!k) return; (hist[k] = hist[k] || []).push(e); });
  let withCur = 0, withPrev = 0, up = 0, down = 0, same = 0; const samples = [];
  for (const p of prods.filter(p => p.isActive)) {
    const own = entries.filter(e => String(e.product) === String(p._id)).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!own) continue; withCur++;
    const prev = (hist[key(p)] || []).filter(e => e.date < own.date).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (prev) { withPrev++; if (own.price > prev.price) up++; else if (own.price < prev.price) down++; else same++; if (samples.length < 5) samples.push(`${p.group}|${p.make||''}: ${prev.date} ${prev.price} -> ${own.date} ${own.price}`); }
  }
  console.log(JSON.stringify({ activeWithPrice: withCur, wouldHavePrevByName: withPrev, up, down, same, samples }, null, 1));
  await mongoose.disconnect();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
