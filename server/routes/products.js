const router = require('express').Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// Admin: Force re-seed
router.post('/reseed', protect, adminOnly, async (req, res) => {
  try {
    const { seedProducts } = require('../seedData');
    const inserted = await seedProducts(true);
    const total = await Product.countDocuments({ isActive: true });
    res.json({ message: `Re-seed complete. ${inserted} added/reactivated. ${total} total active products.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all active products
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ group: 1, make: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all unique chemical groups
router.get('/groups', protect, async (req, res) => {
  try {
    const groups = await Product.distinct('group', { isActive: true });
    res.json(groups.sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single product
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create product - admin only
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { group, name, make, coo, grade, purity, itemPackage, unit } = req.body;
    if (!group) return res.status(400).json({ message: 'Chemical group is required' });
    const product = await Product.create({
      group: group.trim().toUpperCase(),
      name: (name || group).trim().toUpperCase(),
      make: make || '', coo: coo || '', grade: grade || '',
      purity: purity || '', itemPackage: itemPackage || '',
      unit: unit || 'kg', createdBy: req.user.id,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update product - admin only
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const allowed = ['group', 'name', 'make', 'coo', 'grade', 'purity', 'itemPackage', 'unit'];
    const update = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    if (update.group) update.group = update.group.toUpperCase();
    if (update.name)  update.name  = update.name.toUpperCase();
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Soft delete - admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Product removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
