const router = require('express').Router();
const Setting = require('../models/Setting');
const { protect } = require('../middleware/auth');
// Users (non-admins) have the same rights as admins on Dashboard, Manage Products and Queries.
// Only account management (Create / Manage IDs) stays admin-only.

// TV ribbon announcement (one message per line)
router.get('/ribbon', protect, async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'ribbon' }).lean();
    res.json({ text: s?.value || '', updatedAt: s?.updatedAt || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/ribbon', protect, async (req, res) => {
  try {
    const text = String(req.body.text ?? '').slice(0, 2000);
    const s = await Setting.findOneAndUpdate(
      { key: 'ribbon' },
      { value: text, updatedBy: req.user.id },
      { upsert: true, new: true }
    );
    res.json({ text: s.value, updatedAt: s.updatedAt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
