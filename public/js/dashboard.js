// dashboard.js (Final dengan semua fungsi, termasuk Tombol Batal Pilihan)

document.addEventListener('DOMContentLoaded', () => {
    // === APLIKASI STATE ===
    const token = localStorage.getItem('authToken');
    let currentUser = null;
    let currentPath = [{ id: null, name: 'Root' }];
    let selectedItem = null;
     let financeChartInstance = null; // Menyimpan instance chart agar bisa di-update


    // === ELEMEN-ELEMEN DOM ===
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');
    const pageTitle = document.getElementById('page-title');
    const contentSections = document.querySelectorAll('.content-section');
    const userNameDisplay = document.getElementById('user-name');
    const userRoleDisplay = document.getElementById('user-role');
    const menuManajemenUser = document.getElementById('menu-manajemen-user');
    const logoutButton = document.getElementById('logoutButton');
    const statsUserCount = document.getElementById('stats-user-count');
    const statsStaffCount = document.getElementById('stats-staff-count');
    const statsBalance = document.getElementById('stats-balance');
    const statsDocumentCount = document.getElementById('stats-document-count');
    const transactionTableBody = document.getElementById('transaction-table-body');
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const fileListBody = document.getElementById('file-list-body');
    const breadcrumbContainer = document.getElementById('breadcrumb');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const mainModal = document.getElementById('main-modal');
    const modalContent = document.getElementById('modal-content');
    const userListBody = document.getElementById('user-list-body'), addUserBtn = document.getElementById('add-user-btn');
    // Elemen Profil Baru
    const profileSection = document.getElementById('profil-section');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    const nameDisplay = document.getElementById('profile-name-display');
    const emailDisplay = document.getElementById('profile-email-display');
    const avatarInput = document.getElementById('avatar-input');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const profileInfoForm = document.getElementById('profile-info-form');
    const changePasswordCard = document.getElementById('change-password-card');
    const changePasswordForm = document.getElementById('change-password-form');


    // Tombol Aksi File Manager
    const defaultActionButtons = [document.getElementById('create-folder-btn'), document.getElementById('upload-file-btn')];
    const contextualActionButtons = {
        rename: document.getElementById('rename-btn'),
        download: document.getElementById('download-btn-link'),
        delete: document.getElementById('delete-btn'),
        cancel: document.getElementById('cancel-selection-btn') // Tombol batal ditambahkan di sini
    };

    // === FUNGSI UTAMA & NAVIGASI ===
    const initialize = async () => {
        if (!token) {
            window.location.href = '/login';
            return;
        }
        await fetchProfile();
        setupEventListeners();
        navigateTo('dashboard-utama');
    };

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Sesi tidak valid atau telah berakhir.');
            currentUser = await response.json();
            updateUIWithUserData();
        } catch (error) {
            alert(error.message);
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
    };
    
    const updateUIWithUserData = () => {
        if (!currentUser) return;
        const userAvatar = document.getElementById('user-avatar');
    if(userAvatar) {
        // Gunakan avatar dari Google, atau gambar default jika tidak ada
        userAvatar.src = currentUser.avatarUrl || 'https://i.pravatar.cc/150?u=default';
    }
        userNameDisplay.textContent = currentUser.nama;
        userRoleDisplay.textContent = currentUser.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (currentUser.role === 'super_admin') menuManajemenUser.classList.remove('hidden');
        if (['bendahara', 'super_admin'].includes(currentUser.role)) addTransactionBtn.classList.remove('hidden');
    };

    const navigateTo = (targetId) => {
        contentSections.forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            const activeMenuItem = mainMenu.querySelector(`[data-target="${targetId}"]`);
            if (activeMenuItem) {
                mainMenu.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
                activeMenuItem.classList.add('active');
                pageTitle.textContent = activeMenuItem.querySelector('span').textContent;
            }
            if (targetId === 'dashboard-utama') loadDashboardStats();
            if (targetId === 'keuangan-section') loadTransactions();
            if (targetId === 'dokumen-section') loadDocuments(currentPath[currentPath.length - 1].id);
            if (targetId === 'admin-section') loadUsers();
            if (targetId === 'profil-section') populateProfileForm();
        }
        if (window.innerWidth < 1024) sidebar.classList.add('-translate-x-full');
    };

    // --- FUNGSI MODAL ---
    const openModal = (title, contentHTML) => {
        modalContent.innerHTML = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-semibold">${title}</h3><button class="modal-close-btn text-gray-400 hover:text-white text-3xl">&times;</button></div>${contentHTML}`;
        modalBackdrop.classList.remove('hidden');
        mainModal.classList.remove('hidden');
        mainModal.querySelector('.modal-close-btn')?.addEventListener('click', closeModal);
    };
    const closeModal = () => {
        modalBackdrop.classList.add('hidden');
        mainModal.classList.add('hidden');
        modalContent.innerHTML = '';
    };


    // --- PROFILEEEE //

    // --- FUNGSI PROFIL (BARU) ---
    const populateProfileForm = () => {
        if (!currentUser) return;

        // Tampilkan data di kolom kiri
        avatarPreview.src = currentUser.avatarUrl || '/img/default-avatar.png';
        nameDisplay.textContent = currentUser.nama;
        emailDisplay.textContent = currentUser.email;

        // Isi form informasi
        profileInfoForm.elements['profile-nama'].value = currentUser.nama;
        profileInfoForm.elements['profile-hp'].value = currentUser.nomorHp || '';
        profileInfoForm.elements['profile-tentang'].value = currentUser.tentang || '';

        // Tampilkan/sembunyikan form ganti password
        if (currentUser.googleId) {
            changePasswordCard.classList.add('hidden');
        } else {
            changePasswordCard.classList.remove('hidden');
        }
    };
    
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        const body = {
            nama: profileInfoForm.elements['profile-nama'].value,
            nomorHp: profileInfoForm.elements['profile-hp'].value,
            tentang: profileInfoForm.elements['profile-tentang'].value,
        };
        try {
            const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
            if (!response.ok) throw new Error((await response.json()).message);
            alert('Profil berhasil diperbarui!');
            await fetchProfile(); // Ambil data terbaru
            populateProfileForm(); // Perbarui form
        } catch (error) { alert(`Error: ${error.message}`); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        const body = {
            currentPassword: changePasswordForm.elements['current-password'].value,
            newPassword: changePasswordForm.elements['new-password'].value,
        };
        try {
            const response = await fetch('/api/profile/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
            if (!response.ok) throw new Error((await response.json()).message);
            alert('Password berhasil diubah!');
            changePasswordForm.reset();
        } catch (error) { alert(`Error: ${error.message}`); }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/api/profile/avatar', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (!response.ok) throw new Error((await response.json()).message);
            const data = await response.json();
            avatarPreview.src = data.avatarUrl; // Perbarui gambar di UI
            document.getElementById('user-avatar').src = data.avatarUrl; // Perbarui juga di sidebar
            alert('Foto profil berhasil diupdate!');
        } catch (error) { alert(`Error: ${error.message}`); }
    };



    // --- FUNGSI DASHBOARD STATS ---
   const loadDashboardStats = async () => {
        try {
            const [statsRes, transRes] = await Promise.all([
                fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (statsRes.ok) {
                const stats = await statsRes.json();
                if (statsUserCount) statsUserCount.textContent = stats.userCount;
                if (statsStaffCount) statsStaffCount.textContent = stats.staffCount;
                if (statsDocumentCount) statsDocumentCount.textContent = stats.documentCount;
                if (statsBalance) statsBalance.textContent = `Rp ${stats.totalBalance.toLocaleString('id-ID')}`;
            }
            if (transRes.ok) {
                const transactions = await transRes.json();
                renderFinanceChart(transactions);
            }
        } catch (error) { console.error('Gagal memuat data dashboard:', error); }
    };
    
    // ---- CHARTTTTT ---- //
    
     const renderFinanceChart = (transactions) => {
        const ctx = document.getElementById('finance-chart');
        if (!ctx) return;

        // Proses data untuk 6 bulan terakhir
        const labels = [];
        const incomeData = [];
        const expenseData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(d.toLocaleString('id-ID', { month: 'short', year: '2-digit' }));

            const monthlyIncome = transactions
                .filter(t => t.type === 'Pemasukan' && new Date(t.date).getMonth() === d.getMonth() && new Date(t.date).getFullYear() === d.getFullYear())
                .reduce((sum, t) => sum + t.amount, 0);
            
            const monthlyExpense = transactions
                .filter(t => t.type === 'Pengeluaran' && new Date(t.date).getMonth() === d.getMonth() && new Date(t.date).getFullYear() === d.getFullYear())
                .reduce((sum, t) => sum + t.amount, 0);

            incomeData.push(monthlyIncome);
            expenseData.push(monthlyExpense);
        }

        // Hancurkan chart lama jika ada untuk mencegah duplikasi
        if (financeChartInstance) {
            financeChartInstance.destroy();
        }

        financeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: incomeData,
                        backgroundColor: 'rgba(0, 229, 255, 0.6)',
                        borderColor: 'rgba(0, 229, 255, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Pengeluaran',
                        data: expenseData,
                        backgroundColor: 'rgba(255, 0, 193, 0.6)',
                        borderColor: 'rgba(255, 0, 193, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#9ca3af' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            color: '#9ca3af',
                            callback: function(value) {
                                return `Rp ${value / 1000}k`;
                            }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    };

    
    

    // FUNGSI MANAGEMEN USER //
     const loadUsers = async () => {
        userListBody.innerHTML = `<tr><td colspan="5" class="text-center p-4">Memuat pengguna...</td></tr>`;
        try {
            const response = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Gagal memuat daftar pengguna.');
            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            userListBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderUsers = (users) => {
        userListBody.innerHTML = '';
        if (users.length === 0) {
            userListBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Tidak ada data pengguna.</td></tr>`;
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-700/50';
            const userRoleFormatted = user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            row.innerHTML = `
                <td class="td-cell font-medium">${user.nama}</td>
                <td class="td-cell text-gray-400">${user.email}</td>
                <td class="td-cell"><span class="px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'super_admin' ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'}">${userRoleFormatted}</span></td>
                <td class="td-cell text-gray-400">${new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
                <td class="td-cell">
                    <div class="flex gap-2">
                        <button class="edit-user-btn text-yellow-400 hover:text-yellow-300" data-user='${JSON.stringify(user)}'><i data-lucide="edit"></i></button>
                        <button class="delete-user-btn text-red-500 hover:text-red-400" data-id="${user._id}"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            `;
            userListBody.appendChild(row);
        });
        lucide.createIcons();
    };

    const handleAddUser = () => {
        const formHTML = `
            <form id="user-form">
                <div class="input-group"><label for="user-nama">Nama Lengkap</label><input type="text" id="user-nama" required></div>
                <div class="input-group"><label for="user-email">Email</label><input type="email" id="user-email" required></div>
                <div class="input-group"><label for="user-password">Password</label><input type="password" id="user-password" required></div>
                <div class="input-group"><label for="user-role">Role</label><select id="user-role"><option value="pengurus">Pengurus</option><option value="bendahara">Bendahara</option><option value="super_admin">Super Admin</option></select></div>
                <div class="flex justify-end"><button type="submit" class="action-btn bg-indigo-600 hover:bg-indigo-700">Tambah</button></div>
            </form>`;
        openModal('Tambah Pengurus Baru', formHTML);
        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                nama: e.target.elements['user-nama'].value,
                email: e.target.elements['user-email'].value,
                password: e.target.elements['user-password'].value,
                role: e.target.elements['user-role'].value
            };
            try {
                const response = await fetch('/api/users/add-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
                if (!response.ok) throw new Error((await response.json()).message);
                closeModal();
                loadUsers();
            } catch(error) { alert(`Error: ${error.message}`); }
        });
    };
    
    const handleEditUser = (user) => {
        const formHTML = `
            <form id="edit-user-form">
                <div class="input-group"><label for="edit-user-nama">Nama Lengkap</label><input type="text" id="edit-user-nama" value="${user.nama}" required></div>
                <div class="input-group"><label for="edit-user-email">Email</label><input type="email" id="edit-user-email" value="${user.email}" disabled class="bg-gray-600 cursor-not-allowed"></div>
                <div class="input-group"><label for="edit-user-role">Role</label><select id="edit-user-role"></select></div>
                <div class="flex justify-end"><button type="submit" class="action-btn bg-green-600 hover:bg-green-700">Simpan Perubahan</button></div>
            </form>`;
        openModal(`Edit User: ${user.nama}`, formHTML);
        
        const roleSelect = document.getElementById('edit-user-role');
        ['member', 'pengurus', 'bendahara', 'super_admin'].forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (role === user.role) option.selected = true;
            roleSelect.appendChild(option);
        });
        
        document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                nama: e.target.elements['edit-user-nama'].value,
                role: e.target.elements['edit-user-role'].value
            };
            try {
                const response = await fetch(`/api/users/${user._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
                if (!response.ok) throw new Error((await response.json()).message);
                closeModal();
                loadUsers();
            } catch(error) { alert(`Error: ${error.message}`); }
        });
    };


    // --- FUNGSI KEUANGAN ---
    const loadTransactions = async () => {
        transactionTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4">Memuat...</td></tr>`;
        try {
            const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Gagal memuat transaksi');
            const transactions = await response.json();
            renderTransactions(transactions);
        } catch (error) { transactionTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">${error.message}</td></tr>`; }
    };
    

    const renderTransactions = (transactions) => {
    transactionTableBody.innerHTML = '';
    if (transactions.length === 0) {
        transactionTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center p-4 text-gray-500">Belum ada data transaksi.</td>
            </tr>`;
        return;
    }

    transactions.forEach(t => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-700/50';

        const isPemasukan = t.type === 'Pemasukan';
        const dibuatOleh = t.createdBy?.nama || 'Tidak diketahui';

        row.innerHTML = `
            <td class="td-cell">${new Date(t.date).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            })}</td>
            <td class="td-cell">${t.description}</td>
            <td class="td-cell">${dibuatOleh}</td>
            <td class="td-cell text-green-400">${isPemasukan ? `Rp ${t.amount.toLocaleString('id-ID')}` : '-'}</td>
            <td class="td-cell text-red-400">${!isPemasukan ? `Rp ${t.amount.toLocaleString('id-ID')}` : '-'}</td>
            <td class="td-cell">
                <button data-id="${t._id}" class="delete-transaction-btn text-red-500 hover:underline">Hapus</button>
            </td>
        `;
        transactionTableBody.appendChild(row);
    });
};

    const handleAddTransaction = () => {
        const formHTML = `<form id="transaction-form"><div class="input-group"><label for="trans-date">Tanggal</label><input type="date" id="trans-date" value="${new Date().toISOString().split('T')[0]}" required class="text-white"></div><div class="input-group"><label for="trans-desc">Deskripsi</label><input type="text" id="trans-desc" required></div><div class="input-group"><label for="trans-type">Tipe</label><select id="trans-type"><option value="Pemasukan">Pemasukan</option><option value="Pengeluaran">Pengeluaran</option></select></div><div class="input-group"><label for="trans-amount">Jumlah</label><input type="number" id="trans-amount" required></div><div class="flex justify-end"><button type="submit" class="action-btn bg-indigo-600 hover:bg-indigo-700">Simpan</button></div></form>`;
        openModal('Tambah Transaksi Baru', formHTML);
        document.getElementById('transaction-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = { date: e.target.elements['trans-date'].value, description: e.target.elements['trans-desc'].value, type: e.target.elements['trans-type'].value, amount: e.target.elements['trans-amount'].value };
            try {
                const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
                if (!response.ok) throw new Error((await response.json()).message);
                closeModal();
                loadTransactions();
            } catch(error) { alert(`Error: ${error.message}`); }
        });
    };

    

    // --- FUNGSI FILE MANAGER ---
    const isViewable = (mimetype) => mimetype && ['image/', 'application/pdf', 'video/', 'text/'].some(type => mimetype.startsWith(type));
    
    const getFileUrl = (filePath) => {
        const fileName = filePath.split(/[\\/]/).pop();
        return `/uploads/${fileName}`;
    };

    const deselectItem = () => {
        selectedItem = null;
        document.querySelectorAll('.file-row.selected').forEach(r => r.classList.remove('selected'));
        updateActionButtons();
    };
    
    const updateActionButtons = () => {
        if (selectedItem) {
            defaultActionButtons.forEach(btn => btn?.classList.add('hidden'));
            Object.values(contextualActionButtons).forEach(btn => btn?.classList.remove('hidden'));
            
            const isFile = selectedItem.type === 'file';
            if (contextualActionButtons.download) {
                contextualActionButtons.download.style.display = isFile ? 'inline-flex' : 'none';
                if (isFile) {
                    contextualActionButtons.download.href = getFileUrl(selectedItem.path);
                    contextualActionButtons.download.download = selectedItem.name;
                }
            }
        } else {
            defaultActionButtons.forEach(btn => btn?.classList.remove('hidden'));
            Object.values(contextualActionButtons).forEach(btn => btn?.classList.add('hidden'));
        }
    };
    
    const loadDocuments = async (parentId) => {
        fileListBody.innerHTML = `<tr><td colspan="5" class="text-center p-4">Memuat...</td></tr>`;
        deselectItem();
        try {
            const response = await fetch(`/api/documents?parentId=${parentId || 'null'}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message);
            const documents = await response.json();
            renderDocuments(documents);
            updateBreadcrumb();
        } catch (error) {
            fileListBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderDocuments = (documents) => {
        fileListBody.innerHTML = '';
        if (documents.length === 0) { fileListBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Folder ini kosong.</td></tr>`; return; }
        const sortedDocs = [...documents].sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
        sortedDocs.forEach(doc => fileListBody.appendChild(createDocumentRow(doc)));
        lucide.createIcons();
    };

    const createDocumentRow = (doc) => {
        const row = document.createElement('tr');
        row.className = 'file-row cursor-pointer';
        row.dataset.id = doc._id;
        row.dataset.type = doc.type;
        row.dataset.path = doc.path || '';
        row.dataset.mimetype = doc.mimetype || '';
        row.dataset.name = doc.name;
        const icon = doc.type === 'folder' ? `<i data-lucide="folder" class="text-blue-400"></i>` : `<i data-lucide="file-text" class="text-gray-400"></i>`;
        const size = doc.type === 'file' ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : '--';
        const uploader = doc.createdBy ? doc.createdBy.nama : 'N/A';
        row.innerHTML = `
            <td class="td-cell">${icon}</td>
            <td class="td-cell font-medium" id="name-cell-${doc._id}">${doc.name}</td>
            <td class="td-cell text-gray-400">${uploader}</td>
            <td class="td-cell">${new Date(doc.updatedAt).toLocaleString('id-ID')}</td>
            <td class="td-cell">${size}</td>`;
        return row;
    };
    
    const handleRename = () => {
        if (!selectedItem) return;
        const { id, name } = selectedItem;
        const nameCell = document.getElementById(`name-cell-${id}`);
        if(!nameCell) return;
        
        const row = nameCell.closest('tr');
        nameCell.innerHTML = `<input type="text" value="${name}" class="bg-gray-600 text-white rounded px-2 py-1 w-full" id="rename-input-${id}" />`;
        const input = document.getElementById(`rename-input-${id}`);
        input.focus();
        input.select();
        
        const saveRename = async () => {
            const newName = input.value.trim();
            if (newName && newName !== name) {
                try {
                    await fetch(`/api/documents/${id}/rename`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: newName }) });
                    nameCell.textContent = newName;
                    if(row) row.dataset.name = newName;
                    selectedItem.name = newName;
                } catch (error) { alert('Gagal mengubah nama.'); nameCell.textContent = name; }
            } else { nameCell.textContent = name; }
        };
        
        input.addEventListener('blur', saveRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') { input.removeEventListener('blur', saveRename); nameCell.textContent = name; }
        });
    };

    const updateBreadcrumb = () => {
        breadcrumbContainer.innerHTML = '';
        currentPath.forEach((part, index) => {
            const partEl = document.createElement('span');
            partEl.className = 'cursor-pointer hover:underline text-gray-400';
            partEl.textContent = `${index > 0 ? ' / ' : ''}${part.name}`;
            partEl.addEventListener('click', (e) => {
                e.stopPropagation();
                currentPath = currentPath.slice(0, index + 1);
                loadDocuments(part.id);
            });
            breadcrumbContainer.appendChild(partEl);
        });
    };
    
    const handleCreateFolder = () => {
        const formHTML = `<form id="folder-form"><div class="input-group"><label for="folder-name">Nama Folder</label><input type="text" id="folder-name" required></div><div class="flex justify-end"><button type="submit" class="action-btn bg-indigo-600 hover:bg-indigo-700">Buat</button></div></form>`;
        openModal('Buat Folder Baru', formHTML);
        document.getElementById('folder-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const parentId = currentPath[currentPath.length - 1].id;
            const name = e.target.elements['folder-name'].value;
            try {
                const response = await fetch('/api/documents/folder', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name, parentId }) });
                if (!response.ok) throw new Error('Gagal membuat folder.');
                closeModal();
                loadDocuments(parentId);
            } catch(error) { alert(`Error: ${error.message}`); }
        });
    };

    const handleUploadFile = () => {
        const formHTML = `<form id="upload-form" enctype="multipart/form-data"><div class="input-group"><label for="file-input">Pilih File</label><input type="file" id="file-input" required name="dokumen"></div><div class="flex justify-end"><button type="submit" class="action-btn bg-green-500 hover:bg-green-600">Upload</button></div></form>`;
        openModal('Upload File', formHTML);
        document.getElementById('upload-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const parentId = currentPath[currentPath.length - 1].id;
            const formData = new FormData();
            const fileInput = e.target.elements['file-input'];
            if (fileInput.files.length === 0) { alert('Silakan pilih file untuk diupload.'); return; }
            formData.append('dokumen', fileInput.files[0]);
            formData.append('parentId', parentId);
            try {
                const response = await fetch('/api/documents/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
                if (!response.ok) throw new Error('Gagal mengupload file.');
                closeModal();
                loadDocuments(parentId);
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    };
    



    
    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        document.getElementById('menu-toggle')?.addEventListener('click', () => sidebar.classList.toggle('-translate-x-full'));
        mainMenu?.addEventListener('click', (e) => { const menuItem = e.target.closest('.menu-item'); if (menuItem) { e.preventDefault(); navigateTo(menuItem.dataset.target); }});
        logoutButton?.addEventListener('click', () => { localStorage.removeItem('authToken'); window.location.href = '/login'; });
        addTransactionBtn?.addEventListener('click', handleAddTransaction);
        document.getElementById('create-folder-btn')?.addEventListener('click', handleCreateFolder);
        document.getElementById('upload-file-btn')?.addEventListener('click', handleUploadFile);
        modalBackdrop?.addEventListener('click', closeModal);
        breadcrumbContainer?.addEventListener('click', (e) => { if (e.target === breadcrumbContainer) { currentPath = [{ id: null, name: 'Root' }]; loadDocuments(null); } });
        document.getElementById('export-csv-btn')?.addEventListener('click', exportTransactionsToCSV);
    changeAvatarBtn?.addEventListener('click', () => avatarInput.click());
        avatarInput?.addEventListener('change', handleAvatarUpload);
        profileInfoForm?.addEventListener('submit', handleUpdateProfile);
        changePasswordForm?.addEventListener('submit', handleChangePassword);


        
        contextualActionButtons.rename?.addEventListener('click', handleRename);
        contextualActionButtons.delete?.addEventListener('click', () => {
            if (!selectedItem) return;
            if (confirm('Yakin ingin menghapus item ini? Jika ini folder, semua isinya akan ikut terhapus.')) {
                fetch(`/api/documents/${selectedItem.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }})
                    .then(() => loadDocuments(currentPath[currentPath.length - 1].id));
            }
        });
        contextualActionButtons.cancel?.addEventListener('click', deselectItem);


        addUserBtn?.addEventListener('click', handleAddUser);

        // Event delegation untuk tombol edit dan hapus user
        userListBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-user-btn');
            if (editBtn) {
                const userData = JSON.parse(editBtn.dataset.user);
                handleEditUser(userData);
                return;
            }

            const deleteBtn = e.target.closest('.delete-user-btn');
            if (deleteBtn) {
                const userId = deleteBtn.dataset.id;
                if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
                    fetch(`/api/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }})
                        .then(res => {
                            if (!res.ok) return res.json().then(err => { throw new Error(err.message) });
                            return res.json();
                        })
                        .then(() => loadUsers())
                        .catch(err => alert(`Error: ${err.message}`));
                }
            }
        });

        fileListBody.addEventListener('click', (e) => {
            const row = e.target.closest('.file-row');
            if (e.target.closest('input')) return;
            
            if (row) {
                if (selectedItem && selectedItem.id === row.dataset.id) {
                    deselectItem();
                } else {
                    document.querySelectorAll('.file-row').forEach(r => r.classList.remove('selected'));
                    row.classList.add('selected');
                    selectedItem = { ...row.dataset };
                }
            } else {
                deselectItem();
            }
            updateActionButtons();
        });
        
        fileListBody.addEventListener('dblclick', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            const { id, type, name, path, mimetype } = row.dataset;
            if (type === 'folder') {
                currentPath.push({ id, name });
                loadDocuments(id);
            } else if (isViewable(mimetype)) {
                window.open(getFileUrl(path), '_blank');
            }
        });

        document.body.addEventListener('click', async (e) => {
            if (e.target.matches('.delete-transaction-btn')) {
                const id = e.target.dataset.id;
                if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
                    await fetch(`/api/transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
                    loadTransactions();
                }
            }
        });
    };


    const exportTransactionsToCSV = async () => {
    try {
        const response = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Gagal memuat transaksi untuk ekspor');

        const transactions = await response.json();
        const rows = [
            ['Tanggal', 'Deskripsi', 'Dibuat Oleh', 'Tipe', 'Jumlah (Angka)', 'Jumlah Format']
        ];

        transactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString('id-ID');
            const desc = t.description;
            const creator = t.createdBy?.nama || 'Tidak diketahui';
            const tipe = t.type;
            const amount = Number(t.amount);
            const formattedAmount = `Rp ${amount.toLocaleString('id-ID')}`;
            rows.push([date, desc, creator, tipe, amount, formattedAmount]);
        });

        const csvContent = rows.map(row =>
            row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Data_Transaksi_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        alert(`Export gagal: ${error.message}`);
    }
};


    initialize();
});