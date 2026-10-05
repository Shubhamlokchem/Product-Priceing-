const mongoose = require('mongoose');

const priceEntrySchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  price:     { type: Number, required: true },   // market price
  cost:      { type: Number, default: null },    // our cost
  target:    { type: Number, default: null },    // target price (low end of the range)
  targetMax: { type: Number, default: null },    // target price (high end of the range)
  currency:  { type: String, default: 'INR' },
  date:      { type: String, required: true }, // YYYY-MM-DD
  notes:     { type: String, default: '' },
  ex:        { type: String, default: '' }, // delivery location
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One price entry per product per date
priceEntrySchema.index({ product: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PriceEntry', priceEntrySchema);
