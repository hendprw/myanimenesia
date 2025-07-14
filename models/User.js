// models/User.js (Diperbarui untuk Google Login)
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  googleId: { // Untuk menyimpan ID unik dari Google
    type: String,
    unique: true,
    sparse: true 
  },
  nama: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  password: { // Dibuat tidak wajib untuk user Google
    type: String, 
    required: false
  },
  avatarUrl: { // Field baru untuk foto profil
    type: String
  },
  tanggalLahir: { // Field baru untuk tanggal lahir
    type: Date
  },
   nomorHp: { type: String, default: '' }, // Field baru
  tentang: { type: String, default: '' },  // Field baru
  role: {
    type: String,
    enum: ['member', 'pengurus', 'bendahara', 'super_admin'],
    default: 'member'
  }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);