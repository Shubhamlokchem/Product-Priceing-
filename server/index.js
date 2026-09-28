const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const priceRoutes   = require('./routes/prices');
const queryRoutes   = require('./routes/queries');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/prices',   priceRoutes);
app.use('/api/queries',  queryRoutes);

app.get('/', (req, res) => res.json({ message: 'PricingHub API running' }));

// ── Drop stale indexes from old schema ───────────────────────────────────────
async function dropStaleIndexes() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    const indexes = await collection.indexes();
    const stale = indexes.find(i => i.name === 'username_1');
    if (stale) {
      await collection.dropIndex('username_1');
      console.log('Dropped stale username_1 index');
    }
  } catch (e) {
    // index may not exist — safe to ignore
  }
}

// ── Create default admin if none exists ──────────────────────────────────────
async function seedAdmin() {
  const User = require('./models/User');
  const count = await User.countDocuments({ role: 'admin' });
  if (count > 0) return;
  await User.create({
    name: 'Admin',
    email: 'admin@lokchem.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log('Default admin created → email: admin@lokchem.com  password: admin123');
}

// ── MongoDB connect ───────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await dropStaleIndexes();
    await seedAdmin();
    const { seedProducts } = require('./seedData');
    await seedProducts(false);
    app.listen(process.env.PORT || 5000, () => {
      console.log('Server running on port ' + (process.env.PORT || 5000));
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
