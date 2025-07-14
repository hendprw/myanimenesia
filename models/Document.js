// models/Document.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['file', 'folder'],
    required: true
  },
  path: { // Hanya untuk file
    type: String 
  },
  mimetype: { // Hanya untuk file
    type: String
  },
  size: { // Hanya untuk file
    type: Number 
  },
  parent: { // null jika berada di root
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);