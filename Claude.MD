# BPJS Kuesioner - Catatan Pengembangan

## Overview
Aplikasi Kuesioner BPJS Kesehatan untuk evaluasi pegawai outsourcing (Satpam, Office Boy, Driver, dll).

## Tech Stack
- **Frontend**: Vue 3, Vite, Tailwind CSS, Pinia
- **Backend**: Fastify, Prisma, SQLite
- **Auth**: JWT

## Struktur Admin Role
Ada 3 level admin:
1. **SUPER_ADMIN** - Akses penuh termasuk toggle akses login dan kelola semua admin
2. **ADMIN_KP** - Kelola konten, users semua wilayah, buat Admin KP/Kepwil
3. **ADMIN_KEPWIL** - Hanya kelola users dan lihat laporan untuk wilayahnya

## Fitur Utama

### Sistem Periode Test
- Test dikelola per periode (bulanan)
- Alur: Materi → Test (JITU) → Do-Check → Rekapin
- Penjadwalan otomatis berdasarkan status periode

### Step Pembelajaran (Dinamis)
- Nama step bisa diubah dari admin panel
- Default: Kupas Tuntas, JITU, Do-Check, Rekapin
- Disimpan di tabel `StepConfig`
- API: `GET /api/step-config`, `PUT /api/step-config/:id`

### Menu Admin
| Menu | Path | Roles |
|------|------|-------|
| Dashboard | /admin/dashboard | Semua |
| Akses Login | /admin/akses | SUPER_ADMIN |
| Kelola Admin | /admin/admins | SUPER_ADMIN, ADMIN_KP |
| Kategori | /admin/kategori | SUPER_ADMIN, ADMIN_KP |
| Step Pembelajaran | /admin/step-config | SUPER_ADMIN, ADMIN_KP |
| Soal & Jadwal | /admin/soal | SUPER_ADMIN, ADMIN_KP |
| Users | /admin/users | Semua |
| Laporan | /admin/reports | Semua |

## Perubahan Terbaru

### 2026-01-18: UI Improvement & Homepage Redesign

#### 1. HomePage.vue - Redesign
- **Hero Section**: Menggunakan Asset3.png sebagai background dengan Asset1.png sebagai welcome badge
- **Categories Section**: Simplified design - gambar, judul, dan tombol MASUK
- **Cara Kerja Section**: 4 langkah mudah (Baca Materi → Kerjakan Test → Lihat Pembahasan → Dapatkan Hasil)
- **CTA Section**: Hanya satu tombol "Mulai Sekarang" (button Login Admin dihapus)
- **Footer**: Simplified - logo dan copyright saja

#### 2. Period Pages - Corporate Theme
- **MateriPeriodePage.vue**: Violet/purple theme dengan progress bar dan navigasi
- **QuizPeriodePage.vue**: Blue/indigo theme dengan soal navigator
- **ResultPeriodePage.vue**: Teal/cyan theme dengan score visualization dan review mode

#### 3. Cleanup
- Removed unused CSS animations dan scroll effects dari HomePage
- Simplified kategoriConfig (hanya displayName dan image)
- Removed grid pattern, replaced with background image

### 2026-01-17: Step Config & History Update

#### 1. StepConfig (Menggantikan Modul Lama)
- **Hapus**: Menu "Modul" lama yang tidak terpakai
- **Baru**: Tabel `StepConfig` untuk konfigurasi step pembelajaran
- **File baru**:
  - `backend/src/routes/step-config.js` - API routes
  - `frontend/src/pages/admin/StepConfigPage.vue` - Halaman admin
- **Migrasi**: `20260117044347_add_step_config`

#### 2. SubKategoriPage.vue (Dinamis)
- Sebelumnya: Nama step di-hardcode
- Sekarang: Fetch dari `/api/step-config`
- Bisa diubah nama, deskripsi, warna dari admin

#### 3. HistoryPage.vue (Sistem Periode)
- Sebelumnya: Menggunakan `/test/history` (sistem Modul lama)
- Sekarang: Menggunakan `/periode/user/history` (sistem Periode baru)
- Menampilkan:
  - Daftar periode test
  - Status: Selesai, Siap Test, Baca Materi, Waktu Habis
  - Skor dan hasil jika sudah selesai
  - Progress bar untuk periode aktif

## Database Schema (Key Tables)

### StepConfig
```prisma
model StepConfig {
  id           String   @id // materi, test, docheck, rekap
  nama         String
  deskripsi    String
  icon         String   // SVG
  gradientFrom String
  gradientTo   String
  urutan       Int
}
```

### Admin
```prisma
model Admin {
  id        Int      @id
  username  String   @unique
  password  String
  nama      String
  role      String   // SUPER_ADMIN, ADMIN_KP, ADMIN_KEPWIL
  kepwil    String?  // Untuk ADMIN_KEPWIL
}
```

### PeriodeTest
```prisma
model PeriodeTest {
  id              Int
  subKategoriId   Int
  nama            String      // "Januari 2025"
  bulan           Int
  tahun           Int
  status          String      // draft, terjadwal, aktif, docheck, selesai
  jamMulai        DateTime?
  jamBerakhir     DateTime?
}
```

## API Endpoints Penting

### Auth
- `POST /api/auth/login` - Login user
- `POST /api/auth/admin/login` - Login admin
- `GET /api/auth/me` - Get current user/admin info
- `GET /api/auth/verify` - Verify token

### Step Config
- `GET /api/step-config` - Get all (public)
- `PUT /api/step-config/:id` - Update (admin only)

### Periode
- `GET /api/periode/user/active` - Get active periode for user
- `GET /api/periode/user/history` - Get all periodes history

## Notes
- Frontend dev: `npm run dev` di folder frontend
- Backend dev: `node src/index.js` di folder backend
- Default port: Backend 3000, Frontend 5173
