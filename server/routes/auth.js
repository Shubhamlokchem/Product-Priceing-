const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const safeUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, category: u.category || '' });

// Login with email + password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Create a new user or admin account
router.post('/create-user', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, category } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    const existing = await User.findOne({ email: email.toLowerCase() });

    // Block if already an active account
    if (existing && existing.isActive)
      return res.status(400).json({ message: 'An account with this email already exists' });

    let user;
    if (existing && !existing.isActive) {
      // Reactivate the previously removed account with fresh details
      existing.name      = name;
      existing.password  = password;
      existing.role      = role === 'admin' ? 'admin' : 'user';
      existing.category  = category || '';
      existing.isActive  = true;
      existing.createdBy = req.user.id;
      user = await existing.save();
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: role === 'admin' ? 'admin' : 'user',
        category: category || '',
        createdBy: req.user.id,
      });
    }

    res.status(201).json({ message: 'Account created successfully', user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: List all active users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Deactivate a user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: 'You cannot delete your own account' });
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Account deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Change an account's role (admin <-> user)
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role))
      return res.status(400).json({ message: 'Role must be admin or user' });
    if (String(req.params.id) === String(req.user.id))
      return res.status(400).json({ message: 'You cannot change your own role' });

    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) return res.status(404).json({ message: 'User not found' });
    if (user.role === role) return res.json({ message: 'Role unchanged', user: safeUser(user) });

    // never leave the system without an admin
    if (user.role === 'admin' && role === 'user') {
      const admins = await User.countDocuments({ role: 'admin', isActive: true });
      if (admins <= 1) return res.status(400).json({ message: 'At least one admin account is required' });
    }
    await User.updateOne({ _id: user._id }, { role });
    res.json({ message: `Role changed to ${role}`, user: { ...safeUser(user), role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Reset a user password
router.put('/users/:id/reset-password', protect, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4)
      return res.status(400).json({ message: 'Password must be at least 4 characters' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.password = password;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
