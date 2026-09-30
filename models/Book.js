const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  isbn: { type: String, trim: true },
  copies: { type: Number, required: true, min: 1 },
  available: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
