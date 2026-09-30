const router = require('express').Router();
const PriceEntry = require('../models/PriceEntry');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const numOrNull = v => (v !== null && v !== undefined && v !== '' && !isNaN(v)) ? Number(v) : null;
// Cost / target are internal — only admins receive them
const hideInternal = (req, obj) => { if (req.user?.role !== 'admin') { delete obj.cost; delete obj.target; } return obj; };

// Get latest prices for all products
router.get('/latest', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    const result = await Promise.all(products.map(async (product) => {
      const latest = await PriceEntry.findOne({ product: product._id }).sort({ date: -1 }).lean();
      return hideInternal(req, {
        product,
        price:     latest?.price     ?? null,
        cost:      latest?.cost      ?? null,
        target:    latest?.target    ?? null,
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

    const result = products.map(product => {
      const entry = entryMap[product._id.toString()];
      return hideInternal(req, {
        product,
        price:     entry?.price     ?? null,
        cost:      entry?.cost      ?? null,
        target:    entry?.target    ?? null,
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
    res.json(entries);
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
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { productId, price, date, currency, notes, ex, cost, target } = req.body;
    if (!productId || price === undefined || !date)
      return res.status(400).json({ message: 'productId, price and date are required' });

    const entry = await PriceEntry.findOneAndUpdate(
      { product: productId, date },
      { price: numOrNull(price), cost: numOrNull(cost), target: numOrNull(target), currency: currency || 'INR', notes: notes || '', ex: ex || '', updatedBy: req.user.id },
      { upsert: true, new: true }
    ).populate('product');
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Bulk update prices for a date
router.post('/bulk', protect, adminOnly, async (req, res) => {
  try {
    const { date, prices } = req.body;
    if (!date || !Array.isArray(prices))
      return res.status(400).json({ message: 'date and prices array required' });

    const results = await Promise.all(
      prices.map(({ productId, price, notes, currency, ex, cost, target }) => {
        const priceValue = (price !== null && price !== undefined && !isNaN(price)) ? price : null;
        return PriceEntry.findOneAndUpdate(
          { product: productId, date },
          { price: priceValue, cost: numOrNull(cost), target: numOrNull(target), currency: currency || 'INR', notes: notes || '', ex: ex || '', updatedBy: req.user.id },
          { upsert: true, new: true }
        );
      })
    );
    res.json({ message: `${results.length} prices updated for ${date}`, count: results.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
