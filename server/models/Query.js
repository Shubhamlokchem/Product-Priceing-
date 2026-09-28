const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true, trim: true },
  make:        { type: String, trim: true, default: '' },
  coo:         { type: String, trim: true, default: '' },
  origin:      { type: String, trim: true, default: '' },
  grade:       { type: String, trim: true, default: '' },
  purity:      { type: String, trim: true, default: '' },
  message:     { type: String, trim: true, default: '' },
  status:      { type: String, enum: ['open', 'replied'], default: 'open' },
  reply:       { type: String, default: '' },
  repliedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  repliedAt:   { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Query', querySchema);
