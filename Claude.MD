# BPJS Kuesioner - Project Notes

## Project Overview
Aplikasi kuesioner untuk BPJS Kesehatan dengan sistem kategorisasi berdasarkan jenis pegawai, fitur periode test, dan materi pembelajaran.

## Tech Stack

### Frontend
- **Framework**: Vue.js 3 dengan Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Router**: Vue Router
- **State Management**: Pinia
- **PDF Viewer**: Browser built-in (iframe + blob URL)

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: SQLite dengan Prisma ORM
- **Authentication**: JWT (@fastify/jwt)
- **File Upload**: @fastify/multipart
- **WebSocket**: @fastify/websocket
- **Static Files**: @fastify/static

## Local Development

### Menjalankan Aplikasi
```bash
# Frontend (port 5173)
cd frontend && npm run dev

# Backend (port 3000)
cd backend && npm run dev
```

### URLs Lokal
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## Deployment (Domainesia Hosting)

### URL Production
- **Website**: https://bpjs2.314playground.com/
- **API**: https://bpjs2.314playground.com/api/

### Konfigurasi cPanel Node.js
- **Application Root**: bpjs2.314playground.com
- **Application URL**: bpjs2.314playground.com
- **Startup File**: app.cjs (CommonJS wrapper untuk ES Modules)
- **Node.js Version**: 19.9.0

### File Penting di Server
- `app.cjs` - CommonJS wrapper karena Passenger tidak support ES Modules langsung
- `.htaccess` - File kosong yang WAJIB ada agar Passenger berfungsi

### Proses Deploy Frontend
```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Upload via FTP (port 21, bukan SSH port 22)
lftp -u username,password -e "mirror -R --delete --exclude .htaccess --exclude app.cjs --exclude src --exclude node_modules --exclude prisma --exclude .env --exclude package.json --exclude package-lock.json dist/ /bpjs2.314playground.com/; quit" ftp://bpjs2.314playground.com
```

### Proses Deploy Backend
```bash
# Upload backend files (tanpa --delete agar tidak menghapus frontend)
lftp -u username,password -e "mirror -R --exclude node_modules --exclude .env src/ /bpjs2.314playground.com/src/; put -O /bpjs2.314playground.com/ package.json; put -O /bpjs2.314playground.com/ app.cjs; quit" ftp://bpjs2.314playground.com

# SSH ke server untuk install dependencies
ssh username@bpjs2.314playground.com -p 21  # Gunakan FTP, SSH port 22 diblokir

# Di server, aktifkan Node environment
source /home/playgro2/nodevenv/bpjs2.314playground.com/19/bin/activate
cd ~/bpjs2.314playground.com
npm install
npx prisma generate

# Restart app dari cPanel
```

## Struktur Folder

```
BPJS/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.vue              # Halaman utama
│   │   │   ├── KategoriPage.vue          # Pilih kategori
│   │   │   ├── SubKategoriPage.vue       # Pilih sub-kategori
│   │   │   ├── SubKategoriLoginPage.vue  # Login per sub-kategori
│   │   │   ├── MateriPeriodePage.vue     # Baca materi periode
│   │   │   ├── QuizPeriodePage.vue       # Quiz periode
│   │   │   ├── ResultPeriodePage.vue     # Hasil test periode
│   │   │   └── admin/
│   │   │       ├── DashboardPage.vue     # Dashboard admin
│   │   │       ├── UserManagePage.vue    # Kelola user
│   │   │       ├── SoalManagePage.vue    # Kelola soal & jadwal
│   │   │       └── ReportsPage.vue       # Laporan
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── AppHeader.vue         # Header global
│   │   │       └── PdfViewerModal.vue    # PDF viewer modal
│   │   ├── router/
│   │   │   └── index.js                  # Route definitions
│   │   ├── stores/
│   │   │   └── auth.js                   # Auth store (Pinia)
│   │   └── utils/
│   │       └── api.js                    # API client
│   ├── public/
│   │   └── images/                       # Asset gambar
│   └── dist/                             # Build output
├── backend/
│   ├── src/
│   │   ├── index.js                      # Entry point
│   │   ├── routes/
│   │   │   ├── auth.js                   # Auth routes
│   │   │   ├── admin.js                  # Admin routes
│   │   │   ├── kategori.js               # Kategori routes
│   │   │   ├── periode.js                # Periode & materi routes
│   │   │   ├── lokasi.js                 # Lokasi routes (provinsi/kota/kecamatan/kelurahan)
│   │   │   ├── upload.js                 # Upload routes (video/PDF)
│   │   │   ├── user.js                   # User management routes
│   │   │   └── report.js                 # Report routes
│   │   ├── websocket/
│   │   │   └── handlers.js               # WebSocket handlers
│   │   ├── utils/
│   │   │   └── helpers.js                # Helper functions
│   │   └── data/
│   │       └── lokasi.json               # Data lokasi Indonesia
│   ├── prisma/
│   │   ├── schema.prisma                 # Database schema
│   │   ├── seed.js                       # Seed data
│   │   └── migrations/                   # Database migrations
│   └── uploads/
│       ├── videos/                       # Uploaded videos
│       └── pdfs/                         # Uploaded PDFs
└── Asset/
    └── HomePage/                         # Asset untuk HomePage
```

## Database Schema (Prisma)

### Model Utama
- **User** - Data user dengan NPP, nama, role, lokasi
- **Kategori** - Kategori utama (Tenaga Ahli Daya, Manajemen Pegawai, dll)
- **SubKategori** - Sub kategori per kategori
- **PeriodeTest** - Periode test bulanan per sub-kategori
- **SoalPeriode** - Soal untuk periode test
- **MateriPeriode** - Materi pembelajaran per periode (video/PDF/teks)
- **TestSessionPeriode** - Session test user
- **JawabanPeriode** - Jawaban user per soal
- **HasilTestPeriode** - Hasil test per periode
- **MateriProgress** - Progress baca materi user

### Field User
- `npp` - Nomor Pokok Pegawai (unique)
- `nama` - Nama lengkap
- `role` - admin/user
- `isVendor` - Flag untuk vendor
- `provinsi`, `kota`, `kecamatan`, `kelurahan` - Lokasi

## API Endpoints

### Auth
- POST `/api/auth/login` - Login user
- POST `/api/auth/register` - Register user
- GET `/api/auth/me` - Get current user
- GET `/api/auth/verify` - Verify token

### Kategori
- GET `/api/kategori` - Get semua kategori dengan sub-kategori

### Periode & Materi
- GET `/api/periode/sub-kategori/:id` - List periode per sub-kategori
- GET `/api/periode/:id` - Detail periode dengan soal
- GET `/api/periode/user/:id` - Get periode untuk user
- GET `/api/periode/user/:id/materi` - Get materi untuk user
- GET `/api/periode/user/:id/materi-progress` - Get progress materi user
- POST `/api/periode` - Buat periode baru
- PUT `/api/periode/:id` - Update jadwal periode
- DELETE `/api/periode/:id` - Hapus periode
- POST `/api/periode/:id/publish` - Publish periode
- POST `/api/periode/:id/soal` - Tambah soal
- POST `/api/periode/:id/materi` - Tambah materi
- PUT `/api/periode/materi/:id` - Update materi
- DELETE `/api/periode/materi/:id` - Hapus materi
- POST `/api/periode/materi/:id/progress` - Update progress baca materi
- GET `/api/periode/template/csv` - Download template CSV
- POST `/api/periode/:id/upload-csv` - Upload soal via CSV
- POST `/api/periode/:id/copy-from/:sourceId` - Salin soal dari periode lain

### Upload
- POST `/api/upload/video` - Upload video (max 500MB)
- POST `/api/upload/pdf` - Upload PDF (no limit)
- POST `/api/upload/pdf/fetch` - Fetch PDF as base64 (untuk viewer)
- DELETE `/api/upload/file` - Hapus file

### Lokasi
- GET `/api/lokasi/provinsi` - Get semua provinsi
- GET `/api/lokasi/kota/:provinsiId` - Get kota by provinsi
- GET `/api/lokasi/kecamatan/:kotaId` - Get kecamatan by kota
- GET `/api/lokasi/kelurahan/:kecamatanId` - Get kelurahan by kecamatan

### User Management
- GET `/api/user` - List semua user
- POST `/api/user` - Tambah user baru
- PUT `/api/user/:id` - Update user
- DELETE `/api/user/:id` - Hapus user
- POST `/api/user/import` - Import user via CSV
- GET `/api/user/template` - Download template import

### Reports
- GET `/api/report/periode/:id` - Laporan per periode
- GET `/api/report/export/:id` - Export laporan ke Excel/PDF

### Health Check
- GET `/api/health` - Status server

## Fitur Utama

### 1. Sistem Periode Test
- Periode test bulanan per sub-kategori
- Status: Draft → Terjadwal → Aktif → Do-Check → Selesai
- Jadwal otomatis berdasarkan tanggal dan jam
- Upload soal via CSV atau input manual

### 2. Materi Pembelajaran (MateriPeriode)
- Materi per periode dengan urutan
- Support video (upload/YouTube) dan PDF
- PDF viewer modal tanpa auto-download
- Progress tracking per user

### 3. PDF Viewer
- Menggunakan iframe + blob URL
- PDF di-fetch via POST endpoint (base64 response)
- Mencegah auto-download browser
- Tidak ada limit ukuran PDF

### 4. User Management
- NPP (Nomor Pokok Pegawai) sebagai identifier
- Support vendor (isVendor flag)
- Lokasi: provinsi, kota, kecamatan, kelurahan
- Import user via CSV

### 5. Automatic Period Switching
- Sistem otomatis pindah periode berdasarkan tanggal
- Materi → Quiz → Result flow

## Perubahan Terakhir

### Update 16 Jan 2026 - MateriPeriode & PDF Viewer
1. **Sistem MateriPeriode:**
   - Materi pembelajaran per periode
   - Support video (upload/YouTube) dan PDF
   - Progress tracking per user
   - Urutan materi configurable

2. **PDF Viewer Modal:**
   - Menggunakan iframe + blob URL
   - POST endpoint `/api/upload/pdf/fetch` return base64
   - Mencegah browser auto-download
   - Tidak ada limit ukuran upload PDF

3. **Upload System:**
   - Video upload max 500MB
   - PDF upload tanpa limit
   - Static file serving via @fastify/static
   - Vite proxy untuk /uploads path

4. **User Management Update:**
   - Field NIP diganti menjadi NPP
   - Tambah field vendor (isVendor)
   - Tambah field lokasi lengkap

5. **Lokasi Management:**
   - Data lokasi Indonesia (provinsi/kota/kecamatan/kelurahan)
   - API endpoint untuk dropdown cascading

### Fitur Periode Test (15 Jan 2026)
- Database schema baru untuk periode test
- Fitur upload soal via CSV
- Copy soal dari periode sebelumnya
- Status otomatis berdasarkan jadwal

### HomePage Redesign
- Custom navbar dengan logo BPJS
- Hero section dengan background hijau curved
- Kartu kategori dengan gambar
- Footer dengan logo

## Catatan Penting

1. **SSH Port 22 Diblokir**: Domainesia shared hosting memblokir port 22. Gunakan FTP port 21.

2. **Passenger & ES Modules**: Passenger tidak bisa langsung menjalankan ES Modules. Solusi: buat `app.cjs` sebagai wrapper.

3. **File .htaccess Wajib Ada**: cPanel Passenger memerlukan file `.htaccess` (boleh kosong) agar berfungsi.

4. **CORS Origins**: Backend sudah dikonfigurasi untuk menerima request dari localhost dan production domain.

5. **Static Files**: Backend serve static files dari folder uploads untuk video dan PDF.

6. **PDF Auto-Download Fix**: Gunakan POST endpoint dengan response base64, bukan GET langsung ke file PDF.

7. **Vite Proxy**: Frontend proxy `/api` dan `/uploads` ke backend untuk development.
