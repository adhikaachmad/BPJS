# BPJS Kuesioner - Project Notes

## Project Overview
Aplikasi kuesioner untuk BPJS Kesehatan dengan sistem kategorisasi berdasarkan jenis pegawai.

## Tech Stack

### Frontend
- **Framework**: Vue.js 3 dengan Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Router**: Vue Router

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: SQLite dengan Prisma ORM
- **Authentication**: JWT (@fastify/jwt)
- **File Upload**: @fastify/multipart
- **WebSocket**: @fastify/websocket

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
│   │   │   └── HomePage.vue      # Halaman utama (redesigned)
│   │   ├── components/
│   │   ├── router/
│   │   │   └── index.js          # Route definitions
│   │   └── utils/
│   │       └── api.js            # API client
│   ├── public/
│   │   └── images/               # Asset gambar (Asset1-7.png)
│   └── dist/                     # Build output
├── backend/
│   ├── src/
│   │   ├── index.js              # Entry point
│   │   ├── routes/               # API routes
│   │   └── websocket/            # WebSocket handlers
│   └── prisma/
│       └── schema.prisma         # Database schema
└── Asset/
    └── HomePage/                 # Asset untuk redesign HomePage
        ├── Asset1.png            # WELCOME TO SECURE badge
        ├── Asset2.png            # BPJS Kesehatan logo
        ├── Asset3.png            # Green curved background
        ├── Asset4.png            # Tenaga Ahli Daya image
        ├── Asset5.png            # Manajemen Pegawai image
        ├── Asset6.png            # Layanan Terpusat image
        └── Asset7.png            # Favicon
```

## API Endpoints

### Auth
- POST `/api/auth/login` - Login user
- POST `/api/auth/register` - Register user

### Kategori
- GET `/api/kategori` - Get semua kategori dengan sub-kategori

### Health Check
- GET `/api/health` - Status server

## Perubahan Terakhir

### Fitur Periode Test & Pembuatan Soal Baru (15 Jan 2026)
**Perubahan besar pada menu pembuatan soal:**

1. **Database Schema Baru:**
   - `PeriodeTest` - Periode test bulanan per sub-kategori
   - `SoalPeriode` - Soal untuk periode test (format A/B/C/D sederhana)
   - `TestSessionPeriode` - Session test user per periode
   - `JawabanPeriode` - Jawaban user per soal
   - `HasilTestPeriode` - Hasil test per periode

2. **Fitur Baru di Menu Soal & Jadwal:**
   - Pilih Kategori → Sub-Kategori → Periode
   - Buat periode baru per bulan/tahun
   - Atur jadwal: tanggal, jam mulai, jam berakhir
   - Do-Check otomatis aktif setelah jam berakhir
   - Upload soal via CSV
   - Download template CSV
   - Salin soal dari periode sebelumnya
   - Status periode: Draft, Terjadwal, Aktif, Do-Check, Selesai

3. **Menu Penjadwalan Dihapus:**
   - Penjadwalan sudah terintegrasi di menu Soal & Jadwal
   - Route `/admin/scheduling` dihapus

4. **API Endpoint Baru:**
   - `GET /api/periode/sub-kategori/:id` - List periode per sub-kategori
   - `GET /api/periode/:id` - Detail periode dengan soal
   - `POST /api/periode` - Buat periode baru
   - `PUT /api/periode/:id` - Update jadwal periode
   - `DELETE /api/periode/:id` - Hapus periode
   - `POST /api/periode/:id/publish` - Publish periode
   - `POST /api/periode/:id/soal` - Tambah soal
   - `PUT /api/periode/soal/:id` - Edit soal
   - `DELETE /api/periode/soal/:id` - Hapus soal
   - `GET /api/periode/template/csv` - Download template CSV
   - `POST /api/periode/:id/upload-csv` - Upload soal via CSV
   - `POST /api/periode/:id/copy-from/:sourceId` - Salin soal dari periode lain

5. **Alur Admin:**
   ```
   1. Pilih Kategori & Sub-Kategori
   2. Buat/Pilih Periode (misal: Januari 2026)
   3. Atur Jadwal (tanggal, jam mulai, jam berakhir)
   4. Tambah Soal (manual atau CSV upload)
   5. Publish (status berubah ke "Terjadwal")
   6. Test otomatis aktif saat jam mulai
   7. Do-Check otomatis aktif setelah jam berakhir
   ```

### HomePage Redesign
- Custom navbar dengan logo BPJS dan menu navigasi
- Hero section dengan background hijau curved dan badge SECURE
- Kartu kategori: Tenaga Ahli Daya, Manajemen Pegawai, Layanan Terpusat
- Footer dengan logo di kiri dan copyright di tengah
- Route home menggunakan `meta: { hideHeader: true, hideFooter: true }` untuk menyembunyikan header/footer global
- Favicon: Asset7.png
- Title: "BPJS Kesehatan"

## Catatan Penting

1. **SSH Port 22 Diblokir**: Domainesia shared hosting memblokir port 22. Gunakan FTP port 21.

2. **Passenger & ES Modules**: Passenger tidak bisa langsung menjalankan ES Modules. Solusi: buat `app.cjs` sebagai wrapper.

3. **File .htaccess Wajib Ada**: cPanel Passenger memerlukan file `.htaccess` (boleh kosong) agar berfungsi.

4. **CORS Origins**: Backend sudah dikonfigurasi untuk menerima request dari:
   - http://localhost:5173
   - http://localhost:5174
   - http://localhost:3000
   - https://bpjs2.314playground.com
   - http://bpjs2.314playground.com

5. **Static Files**: Backend serve static files dari folder root untuk production (frontend build).
