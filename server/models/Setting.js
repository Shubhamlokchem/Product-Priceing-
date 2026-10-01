const mongoose = require('mongoose');

// Simple key/value settings (e.g. key 'ribbon' → TV ribbon announcement text)
const settingSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  value:     { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
