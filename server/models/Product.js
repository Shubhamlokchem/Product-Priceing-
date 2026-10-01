const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  group:       { type: String, required: true, trim: true },
  name:        { type: String, required: true, trim: true },
  make:        { type: String, trim: true, default: '' },
  coo:         { type: String, trim: true, default: '' },
  grade:       { type: String, trim: true, default: '' },
  purity:      { type: String, trim: true, default: '' },
  itemPackage: { type: String, trim: true, default: '' },
  unit:        { type: String, trim: true, default: 'kg' },
  isActive:    { type: Boolean, default: true },
  starred:     { type: Boolean, default: false },   // priority: shown on the TV live ribbon
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
