// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'ASUNAWANGY'; // Pastikan secret key ini SAMA PERSIS dengan di server.js

// Middleware untuk memeriksa apakah token valid (otentikasi)
const checkAuth = (req, res, next) => {
  // Ambil token dari header 'Authorization'
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Akses ditolak. Token tidak disediakan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verifikasi token
    const decoded = jwt.verify(token, JWT_SECRET);
    // Simpan payload token (berisi userId, role, nama) ke object request
    req.user = decoded; 
    next(); // Lanjutkan ke handler rute berikutnya
  } catch (error) {
    res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
};

// Middleware untuk memeriksa apakah role user sesuai (otorisasi)
const checkRole = (roles) => { // roles adalah array, contoh: ['super_admin']
  return (req, res, next) => {
    // Middleware ini harus dijalankan SETELAH checkAuth
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki hak akses.' });
    }
    next(); // Lanjutkan jika role sesuai
  };
};

module.exports = { checkAuth, checkRole };
