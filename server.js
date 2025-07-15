// server.js (Final dengan semua perbaikan fungsionalitas)

// --- IMPORTS ---
const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config(); // Anda sudah memanggil ini, bagus!
// --- IMPORTS LOKAL ---
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Document = require('./models/Document');
const { checkAuth, checkRole } = require('./middleware/auth');

// --- INISIALISASI APP ---
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'ASUNAWANGY';

// --- KONEKSI DATABASE ---
const dbURI = "mongodb+srv://hendrikpurwanto281:asdffjkl@cluster0.g2h81.mongodb.net/AnimenesiaDB?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbURI)
  .then(() => console.log('Berhasil terhubung ke MongoDB Atlas'))
  .catch(err => console.error('Gagal terhubung ke MongoDB:', err));

// --- MIDDLEWARE ---
// **PERBAIKAN 1: Membuat folder 'public' dapat diakses secara statis**
app.use(express.static(path.join(__dirname, 'public')));
// Membuat URL '/uploads' langsung mengarah ke folder 'public/uploads'
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- PENYIMPANAN FILE UPLOAD (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/';
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });


// --- KONFIGURASI PASSPORT & SESI (BARU) ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Ganti ke true jika menggunakan HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    });
});

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        // Callback setelah login Google berhasil
        try {
            // Cek apakah user sudah ada di database kita
            const existingUser = await User.findOne({ googleId: profile.id });
            if (existingUser) {
                // Jika sudah ada, langsung lanjutkan
                return done(null, existingUser);
            }

            // Jika user baru, ambil data tanggal lahir
            let dob = null;
            if (profile._json.birthdays && profile._json.birthdays.length > 0) {
                const bday = profile._json.birthdays[0].date;
                if (bday.year && bday.month && bday.day) {
                   dob = new Date(Date.UTC(bday.year, bday.month - 1, bday.day));
                }
            }

            // Buat user baru di database
            const newUser = new User({
                googleId: profile.id,
                nama: profile.displayName,
                email: profile.emails[0].value,
                avatarUrl: profile.photos[0].value, // Ambil foto profil
                tanggalLahir: dob, // Simpan tanggal lahir
                role: 'member' // Secara default, semua pendaftar via Google adalah 'member'
            });

            await newUser.save();
            return done(null, newUser);
            
        } catch (error) {
            return done(error, null);
        }
    })
);


// === RUTE HALAMAN (VIEWS) ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));


// === RUTE API (BACKEND LOGIC) ===

// --- API OTENTIKASI & USER ---
app.post('/api/register', async (req, res) => {
  const { nama, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ nama, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User berhasil dibuat. Silakan login.' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});


// server.js (TAMBAHKAN BLOK API INI)

// --- API UNTUK PROFIL PENGGUNA ---

// Konfigurasi Multer khusus untuk avatar
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/avatars/';
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    // Contoh: userID-timestamp.ext atau userID-randomString.ext
    cb(null, `${req.user.userId}-${Date.now()}${fileExt}`);
}
});
const uploadAvatar = multer({ storage: avatarStorage });

// PUT: Update data profil (nama, no hp, tentang)
app.put('/api/profile', checkAuth, async (req, res) => {
    try {
        const { nama, nomorHp, tentang } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

        user.nama = nama || user.nama;
        user.nomorHp = nomorHp || user.nomorHp;
        user.tentang = tentang || user.tentang;

        await user.save();
        res.json({ message: 'Profil berhasil diperbarui.', user });
    } catch (error) {
        res.status(500).json({ message: 'Gagal memperbarui profil.' });
    }
});

// POST: Ganti password
app.post('/api/profile/change-password', checkAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
        if (!user.password) return res.status(403).json({ message: 'Tidak dapat mengubah password untuk akun Google.' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Password saat ini salah.' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'Password berhasil diubah.' });

    } catch (error) {
        res.status(500).json({ message: 'Gagal mengubah password.' });
    }
});

// POST: Ganti foto profil
app.post('/api/profile/avatar', checkAuth, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        // console.log('Menerima permintaan upload avatar.');
        // console.log('req.file:', req.file); // Cek apakah file benar-benar sampai ke Multer
        if (!req.file) {
            console.error('Tidak ada file yang diupload.');
            return res.status(400).json({ message: 'Tidak ada file yang diupload.' });
        }

        console.log('User ID dari token:', req.user.userId);
        const user = await User.findById(req.user.userId);
        if (!user) {
            console.error('User tidak ditemukan.');
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        // Hapus avatar lama jika bukan default
        if (user.avatarUrl && user.avatarUrl !== '/img/default-avatar.png') {
            const oldPath = path.join(__dirname, 'public', user.avatarUrl);
            // console.log('Mencoba menghapus avatar lama:', oldPath);
            if (fs.existsSync(oldPath)) {
                try {
                    fs.unlinkSync(oldPath);
                    console.log('Avatar lama berhasil dihapus.');
                } catch (unlinkError) {
                    console.error('ERROR saat menghapus avatar lama:', unlinkError);
                    // Pertimbangkan apakah ini error fatal atau bisa diabaikan
                }
            } else {
                console.log('Avatar lama tidak ditemukan di jalur fisik:', oldPath);
            }
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        // console.log('Mengatur avatarUrl baru:', avatarUrl);
        user.avatarUrl = avatarUrl;
        await user.save();
        console.log('User berhasil disimpan dengan avatar baru.');

        res.json({ message: 'Foto profil berhasil diupdate.', avatarUrl });

    } catch (error) {
        console.error('ERROR pada rute /api/profile/avatar:', error);
        res.status(500).json({ message: 'Gagal mengupload foto profil.' });
    }
});

// server.js - Cari rute ini
app.get('/api/auth/google',
    // Ganti baris passport.authenticate yang lama dengan yang ini:
    passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.birthday.read'] })
);

app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Jika berhasil, buat JWT untuk user yang login
        const token = jwt.sign(
            { userId: req.user._id, role: req.user.role, nama: req.user.nama },
            JWT_SECRET,
            { expiresIn: '1d' }
        );
        // Redirect ke halaman khusus yang akan menyimpan token
        res.redirect(`/auth-success.html#token=${token}`);
    }
);

app.get('/auth-success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'auth-success.html'));
});


app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role, nama: user.nama },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/profile', checkAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

app.get('/api/users', checkAuth, checkRole(['super_admin']), async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data user.' });
    }
});

// PUT: Mengupdate user
app.put('/api/users/:id', checkAuth, checkRole(['super_admin']), async (req, res) => {
    try {
        const { nama, role } = req.body;
        const { id } = req.params;

        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        
        userToUpdate.nama = nama;
        userToUpdate.role = role;

        await userToUpdate.save();
        res.json({ message: 'User berhasil diupdate.', user: userToUpdate });

    } catch (error) {
        res.status(500).json({ message: 'Gagal mengupdate user.' });
    }
});

// DELETE: Menghapus user
app.delete('/api/users/:id', checkAuth, checkRole(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Mencegah super_admin menghapus dirinya sendiri
        if (req.user.userId === id) {
            return res.status(403).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
        }

        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        res.json({ message: 'User berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus user.' });
    }
});

app.post('/api/users/add-admin', checkAuth, checkRole(['super_admin']), async (req, res) => {
    const { nama, email, password, role } = req.body;
    try {
        if (!['pengurus', 'bendahara', 'super_admin'].includes(role)) {
            return res.status(400).json({ message: 'Role tidak valid.' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(409).json({ message: 'Email sudah terdaftar.' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ nama, email, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: `User dengan role ${role} berhasil dibuat.` });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// --- API DASHBOARD ---
app.get('/api/dashboard/stats', checkAuth, async (req, res) => {
    try {
        const [userCount, staffCount, documentCount, transactions] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: { $in: ['pengurus', 'super_admin', 'bendahara'] } }),
            Document.countDocuments({ type: 'file' }),
            Transaction.find({})
        ]);
        const totalBalance = transactions.reduce((acc, trans) => {
            return trans.type === 'Pemasukan' ? acc + trans.amount : acc - trans.amount;
        }, 0);
        res.json({ userCount, staffCount, documentCount, totalBalance });
    } catch (error) {
        res.status(500).json({ message: 'Gagal memuat statistik.' });
    }
});


// --- API MUTASI KEUANGAN ---
const financeRoles = ['bendahara', 'super_admin', 'pengurus'];

app.get('/api/transactions', checkAuth, checkRole(financeRoles), async (req, res) => {
    try {
        const transactions = await Transaction.find({}).sort({ date: 'desc' }).populate('createdBy', 'nama');
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data transaksi.' });
    }
});

app.post('/api/transactions', checkAuth, checkRole(financeRoles), async (req, res) => {
    try {
        const { date, description, type, amount } = req.body;
        if (!date || !description || !type || !amount) {
            return res.status(400).json({ message: 'Semua field wajib diisi.' });
        }
        const newTransaction = new Transaction({ date, description, type, amount, createdBy: req.user.userId });
        await newTransaction.save();
        res.status(201).json(newTransaction);
    } catch (error) {
        res.status(500).json({ message: 'Gagal menambah transaksi.' });
    }
});

app.delete('/api/transactions/:id', checkAuth, checkRole(financeRoles), async (req, res) => {
    try {
        const deleted = await Transaction.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
        res.json({ message: 'Transaksi berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus transaksi.' });
    }
});


// --- API FILE MANAGER ---
const documentRoles = ['pengurus', 'super_admin', 'bendahara'];

// Helper function untuk hapus folder dan isinya
async function deleteFolderAndContents(folderId) {
    const children = await Document.find({ parent: folderId });
    for (const child of children) {
        if (child.type === 'folder') {
            await deleteFolderAndContents(child._id);
        } else if (child.type === 'file' && child.path) {
            if (fs.existsSync(child.path)) {
                try { fs.unlinkSync(child.path); } catch (e) { console.error(`Gagal menghapus file fisik: ${child.path}`, e); }
            }
        }
    }
    await Document.deleteMany({ parent: folderId });
    await Document.findByIdAndDelete(folderId);
}

app.get('/api/documents', checkAuth, checkRole(documentRoles), async (req, res) => {
    try {
        const parentId = req.query.parentId === 'null' ? null : req.query.parentId;
        const documents = await Document.find({ parent: parentId }).sort({ type: 'asc', name: 'asc' }).populate('createdBy', 'nama');
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Gagal memuat dokumen.' });
    }
});

app.post('/api/documents/folder', checkAuth, checkRole(documentRoles), async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const newFolder = new Document({ name, type: 'folder', parent: parentId === 'null' ? null : parentId, createdBy: req.user.userId });
        await newFolder.save();
        res.status(201).json(newFolder);
    } catch (error) {
        res.status(500).json({ message: 'Gagal membuat folder.' });
    }
});

app.post('/api/documents/upload', checkAuth, checkRole(documentRoles), upload.single('dokumen'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Tidak ada file yang diupload.' });
        const { parentId } = req.body;
        const newFile = new Document({
            name: req.file.originalname,
            type: 'file',
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            parent: parentId === 'null' ? null : parentId,
            createdBy: req.user.userId
        });
        await newFile.save();
        res.status(201).json(newFile);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengupload file.' });
    }
});

// **PERBAIKAN 2: Logika Rename File Fisik Ditambahkan**
app.put('/api/documents/:id/rename', checkAuth, checkRole(documentRoles), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Nama baru tidak boleh kosong.' });

        const docToRename = await Document.findById(req.params.id);
        if (!docToRename) return res.status(404).json({ message: 'Dokumen tidak ditemukan.' });

        const oldPath = docToRename.path;
        let newPath = oldPath;

        if (docToRename.type === 'file' && oldPath && fs.existsSync(oldPath)) {
            const dirname = path.dirname(oldPath);
            // Ambil bagian timestamp dari nama file lama
            const oldPhysicalName = path.basename(oldPath);
            const timestampPart = oldPhysicalName.split('-')[0];
            
            // Gabungkan timestamp dengan nama original baru yang bersih
            const newPhysicalName = `${timestampPart}-${name.replace(/\s+/g, '_')}`;
            newPath = path.join(dirname, newPhysicalName);
            fs.renameSync(oldPath, newPath);
        }

        docToRename.name = name;
        docToRename.path = newPath;
        await docToRename.save();
        
        res.json(docToRename);
    } catch (error) {
        console.error("Rename error:", error);
        res.status(500).json({ message: 'Gagal mengubah nama.' });
    }
});

app.delete('/api/documents/:id', checkAuth, checkRole(documentRoles), async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Dokumen tidak ditemukan.'});

        if (doc.type === 'folder') {
            await deleteFolderAndContents(doc._id);
        } else {
            if (doc.path && fs.existsSync(doc.path)) {
                fs.unlinkSync(doc.path);
            }
            await Document.findByIdAndDelete(req.params.id);
        }
        
        res.json({ message: 'Item berhasil dihapus.'});
    } catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus item.'});
    }
});

// --- JALANKAN SERVER ---
app.listen(PORT, () => {
  console.log(`Server Animenesia berjalan di http://localhost:${PORT}`);
});
