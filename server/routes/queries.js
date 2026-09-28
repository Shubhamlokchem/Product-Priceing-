const router = require('express').Router();
const Query  = require('../models/Query');
const { protect, adminOnly } = require('../middleware/auth');

// User: submit a query
router.post('/', protect, async (req, res) => {
  try {
    const { productName, make, coo, origin, grade, purity, message } = req.body;
    if (!productName) return res.status(400).json({ message: 'Product name is required' });
    const query = await Query.create({ user: req.user.id, productName, make, coo, origin, grade, purity, message });
    res.status(201).json(query);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// User: get own queries
router.get('/mine', protect, async (req, res) => {
  try {
    const queries = await Query.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('repliedBy', 'name');
    res.json(queries);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: get all queries
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const queries = await Query.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('repliedBy', 'name');
    res.json(queries);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: reply to a query
router.put('/:id/reply', protect, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply text is required' });
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { reply, status: 'replied', repliedBy: req.user.id, repliedAt: new Date() },
      { new: true }
    ).populate('user', 'name email').populate('repliedBy', 'name');
    res.json(query);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
