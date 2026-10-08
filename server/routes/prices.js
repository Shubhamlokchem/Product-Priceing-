const router = require('express').Router();
const PriceEntry = require('../models/PriceEntry');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
// Users (non-admins) have the same rights as admins on Dashboard, Manage Products and Queries.
// Only account management (Create / Manage IDs) stays admin-only.
const numOrNull = v => (v !== null && v !== undefined && v !== '' && !isNaN(v)) ? Number(v) : null;
// Cost is internal — only admins receive it. Users get market + target (view only).
const hideInternal = (req, obj) => { if (req.user?.role !== 'admin') { delete obj.cost; } return obj; };

// ── Previous market price (for the green ▲ / red ▼ arrow) ─────────────────────────
// Looks through the whole price history, including products that were deleted and imported again:
// the same product name + make (ignoring capital letters) counts as the same product.
// If the price was changed again on the same day, that earlier value (sameDayPrev) is used first.
const normTxt = v => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
const buildPrevFinder = async () => {
  const allProducts = await Product.find({}, { group: 1, make: 1 }).lean();
  const keyOfId = {};
  allProducts.forEach(p => { keyOfId[String(p._id)] = normTxt(p.group) + '|' + normTxt(p.make); });
  const priced = await PriceEntry.find({ price: { $ne: null } }, { product: 1, date: 1, price: 1, updatedAt: 1 }).lean();
  const byKey = {};
  priced.forEach(e => { const k = keyOfId[String(e.product)]; if (k) (byKey[k] = byKey[k] || []).push(e); });
  const stamp = e => `${e.date}|${new Date(e.updatedAt || 0).toISOString()}`;
  return (productId, entry) => {
    if (!entry || entry.price == null) return null;
    if (entry.sameDayPrev != null) return { price: entry.sameDayPrev, date: entry.date };
    const list = byKey[keyOfId[String(productId)]] || [];
    const mine = stamp(entry);
    let best = null;
    for (const e of list) {
      if (String(e._id) === String(entry._id)) continue;
      const s2 = stamp(e);
      if (s2 < mine && (!best || s2 > stamp(best))) best = e;
    }
    return best ? { price: best.price, date: best.date } : null;
  };
};

// Get latest prices for all products
router.get('/latest', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    const prevOf = await buildPrevFinder();
    const result = await Promise.all(products.map(async (product) => {
      const latest = await PriceEntry.findOne({ product: product._id }).sort({ date: -1 }).lean();
      const prev = prevOf(product._id, latest);
      return hideInternal(req, {
        prevPrice: prev?.price ?? null,
        prevDate:  prev?.date  ?? null,
        product,
        price:     latest?.price     ?? null,
        cost:      latest?.cost      ?? null,
        target:    latest?.target    ?? null,
        targetMax: latest?.targetMax ?? null,
        currency:  latest?.currency  ?? 'INR',
        date:      latest?.date      ?? null,
        notes:     latest?.notes     ?? '',
        ex:        latest?.ex        ?? '',
        updatedAt: latest?.updatedAt ?? null,
      });
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get prices for a specific date (all users can access for date filter)
router.get('/date/:date', protect, async (req, res) => {
  try {
    const entries = await PriceEntry.find({ date: req.params.date }).populate('product');

    // For dates where some products have no entry, fill with nulls
    const products = await Product.find({ isActive: true });
    const entryMap = {};
    entries.forEach(e => { if (e.product) entryMap[e.product._id.toString()] = e; });

    const prevOf = await buildPrevFinder();

    const result = products.map(product => {
      const entry = entryMap[product._id.toString()];
      const prev = prevOf(product._id, entry);
      return hideInternal(req, {
        prevPrice: prev?.price ?? null,
        prevDate:  prev?.date  ?? null,
        product,
        price:     entry?.price     ?? null,
        cost:      entry?.cost      ?? null,
        target:    entry?.target    ?? null,
        targetMax: entry?.targetMax ?? null,
        currency:  entry?.currency  ?? 'INR',
        date:      entry ? req.params.date : null,
        notes:     entry?.notes     ?? '',
        ex:        entry?.ex        ?? '',
        updatedAt: entry?.updatedAt ?? null,
      });
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get price history for a specific product (last 60 days)
router.get('/history/:productId', protect, async (req, res) => {
  try {
    const entries = await PriceEntry.find({ product: req.params.productId })
      .sort({ date: -1 })
      .limit(60)
      .lean();
    res.json(entries.map(e => hideInternal(req, e)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get price comparison for a whole chemical group across a date range
// GET /prices/compare?group=ACETONITRILE&from=2024-01-01&to=2024-12-31
router.get('/compare', protect, async (req, res) => {
  try {
    const { group, from, to } = req.query;
    if (!group) return res.status(400).json({ message: 'group is required' });

    const products = await Product.find({ group: group.toUpperCase(), isActive: true });
    if (!products.length) return res.json([]);

    const productIds = products.map(p => p._id);

    const query = { product: { $in: productIds } };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to)   query.date.$lte = to;
    }

    const entries = await PriceEntry.find(query)
      .sort({ date: 1 })
      .populate('product', 'group make coo grade purity unit')
      .lean();

    // Build result: array of { date, products: [{label, price}] }
    const dateMap = {};
    entries.forEach(e => {
      if (!e.product) return;
      const label = [e.product.make, e.product.coo].filter(Boolean).join(' / ') || e.product.group;
      if (!dateMap[e.date]) dateMap[e.date] = { date: e.date };
      dateMap[e.date][label] = e.price;
    });

    // Also return product labels for the chart lines
    const labels = [...new Set(entries.map(e => {
      if (!e.product) return null;
      return [e.product.make, e.product.coo].filter(Boolean).join(' / ') || e.product.group;
    }).filter(Boolean))];

    res.json({ rows: Object.values(dateMap), labels, products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get price comparison for specific product IDs across a date range
// GET /prices/compare-products?ids=id1,id2&from=DATE&to=DATE
router.get('/compare-products', protect, async (req, res) => {
  try {
    const { ids, from, to } = req.query;
    if (!ids) return res.status(400).json({ message: 'ids is required' });

    const productIds = ids.split(',').filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });

    const query = { product: { $in: productIds } };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to)   query.date.$lte = to;
    }

    const entries = await PriceEntry.find(query)
      .sort({ date: 1 })
      .populate('product', 'group make coo grade purity unit')
      .lean();

    const makeLabel = (p) =>
      [p.group, p.make, p.coo].filter(Boolean).join(' · ') || 'Unknown';

    const dateMap = {};
    entries.forEach(e => {
      if (!e.product) return;
      const label = makeLabel(e.product);
      if (!dateMap[e.date]) dateMap[e.date] = { date: e.date };
      dateMap[e.date][label] = e.price;
    });

    const labels = [...new Set(
      entries.map(e => e.product ? makeLabel(e.product) : null).filter(Boolean)
    )];

    res.json({ rows: Object.values(dateMap), labels, products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get available dates (dates that have at least one price entry)
router.get('/available-dates', protect, async (req, res) => {
  try {
    const dates = await PriceEntry.distinct('date');
    res.json(dates.sort().reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Set/update single price

// Admin: Set/update single price
// Save one product's price for a date. If the market price is changed again on the same day,
// the earlier value is kept as sameDayPrev so the up / down arrow reacts straight away.
const savePrice = async (productId, date, fields) => {
  const existing = await PriceEntry.findOne({ product: productId, date }).lean();
  let sameDayPrev = existing?.sameDayPrev ?? null;
  if (existing && existing.price != null && fields.price != null && Number(existing.price) !== Number(fields.price)) sameDayPrev = existing.price;
  return PriceEntry.findOneAndUpdate({ product: productId, date }, { ...fields, sameDayPrev }, { upsert: true, new: true });
};

router.post('/', protect, async (req, res) => {
  try {
    const { productId, price, date, currency, notes, ex, cost, target, targetMax } = req.body;
    if (!productId || price === undefined || !date)
      return res.status(400).json({ message: 'productId, price and date are required' });

    const saved = await savePrice(productId, date,
      { price: numOrNull(price), cost: numOrNull(cost), target: numOrNull(target), targetMax: numOrNull(targetMax), currency: currency || 'INR', notes: notes || '', ex: ex || '', updatedBy: req.user.id });
    const entry = await PriceEntry.findById(saved._id).populate('product');
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Bulk update prices for a date
router.post('/bulk', protect, async (req, res) => {
  try {
    const { date, prices } = req.body;
    if (!date || !Array.isArray(prices))
      return res.status(400).json({ message: 'date and prices array required' });

    const results = await Promise.all(
      prices.map(({ productId, price, notes, currency, ex, cost, target, targetMax }) => {
        const priceValue = (price !== null && price !== undefined && !isNaN(price)) ? price : null;
        return savePrice(productId, date,
          { price: priceValue, cost: numOrNull(cost), target: numOrNull(target), targetMax: numOrNull(targetMax), currency: currency || 'INR', notes: notes || '', ex: ex || '', updatedBy: req.user.id });
      })
    );
    res.json({ message: `${results.length} prices updated for ${date}`, count: results.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
