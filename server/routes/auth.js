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

// --- IP allow-list helpers ---------------------------------------------------
// Real client IP (Render and most hosts put it first in X-Forwarded-For)
const clientIp = (req) => {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
};
// Accepts IPv4 ("203.0.113.7"), IPv4 range ("203.0.113.*") and IPv6
const cleanIps = (list) => {
  const raw = Array.isArray(list) ? list : String(list || '').split(/[\s,;]+/);
  const out = [];
  for (const x of raw) {
    const ip = String(x || '').trim().toLowerCase();
    if (!ip) continue;
    const v4 = /^(\d{1,3}|\*)(\.(\d{1,3}|\*)){3}$/.test(ip) && ip.split('.').every(p => p === '*' || Number(p) <= 255);
    const v6 = /^[0-9a-f:]+$/.test(ip) && ip.includes(':');
    if (!v4 && !v6) return { error: `"${x}" is not a valid IP address` };
    if (!out.includes(ip)) out.push(ip);
  }
  return { ips: out.slice(0, 50) };
};
const ipAllowed = (ip, allowed) => {
  if (!allowed || !allowed.length) return true;          // no list = no restriction
  const a = String(ip).toLowerCase().split('.');
  return allowed.some(rule => {
    if (rule === String(ip).toLowerCase()) return true;
    const r = rule.split('.');
    return r.length === 4 && a.length === 4 && r.every((p, i) => p === '*' || p === a[i]);
  });
};

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

    // IP allow-list: if this account has IPs set, login only works from those
    const ip = clientIp(req);
    if (!ipAllowed(ip, user.allowedIps))
      return res.status(403).json({ message: `Login is not allowed from this network (your IP: ${ip}). Contact the admin.` });

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

// Admin: the IP this request comes from (shown on the Manage IDs page)
router.get('/my-ip', protect, adminOnly, (req, res) => res.json({ ip: clientIp(req) }));

// Admin: set allowed login IPs for one or many accounts
// body: { ids: [...], ips: [...] | "a, b", mode: 'replace' | 'add' | 'remove' }
router.put('/users/ips', protect, adminOnly, async (req, res) => {
  try {
    const { ids, ips, mode } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'Select at least one account' });
    const { ips: list, error } = cleanIps(ips);
    if (error) return res.status(400).json({ message: error });

    const users = await User.find({ _id: { $in: ids }, isActive: true });
    const me = clientIp(req);
    for (const u of users) {
      const cur = u.allowedIps || [];
      const next = mode === 'add' ? [...new Set([...cur, ...list])].slice(0, 50)
        : mode === 'remove' ? cur.filter(ip => !list.includes(ip))
        : list;
      // never let the admin lock themselves out
      if (String(u._id) === String(req.user.id) && !ipAllowed(me, next))
        return res.status(400).json({ message: `This would block your own login (your IP is ${me}). Add ${me} to the list for your account.` });
      u.allowedIps = next;
    }
    await Promise.all(users.map(u => User.updateOne({ _id: u._id }, { allowedIps: u.allowedIps })));
    res.json({ message: `IP addresses updated for ${users.length} account(s)`, count: users.length });
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
