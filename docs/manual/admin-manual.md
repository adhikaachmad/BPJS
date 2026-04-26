---
title: "Buku Panduan Administrator (Admin Manual)"
subtitle: "Sistem Pembelajaran BPJS Kesehatan — PENTAS"
author: "BPJS Kesehatan"
date: "2026"
lang: id
---

\

\

\

![](../../Asset/HomePage/Asset2.png){width=70%}

\

\

# BUKU PANDUAN ADMINISTRATOR

## Sistem Pembelajaran BPJS Kesehatan

### PENTAS

\

\

\

\

\

**Versi Dokumen: 1.0**

**Tanggal: April 2026**

\

\

\

\

\

*Dokumen ini merupakan dokumentasi resmi*
*Sistem Pembelajaran BPJS Kesehatan*

*RAHASIA — Hanya untuk penggunaan internal*

\newpage

---

# Daftar Isi

1. Pendahuluan
2. Peran (Role) Admin
3. Mengakses Panel Admin
4. Login Admin
5. Dashboard Admin
6. Menu: Kelola Admin
7. Menu: Manajemen Kategori
8. Menu: Konfigurasi Step Pembelajaran
9. Menu: Soal & Jadwal
10. Menu: Penjadwalan (Scheduling)
11. Menu: Kelola Users
12. Menu: Laporan (Reports)
13. Menu: Reset Test
14. Alur Kerja Periode Test
15. Keamanan dan Praktik Terbaik
16. Troubleshooting

---

# 1. Pendahuluan

## 1.1 Tujuan Dokumen

Dokumen ini merupakan panduan lengkap bagi Administrator dalam mengelola aplikasi **Sistem Pembelajaran BPJS Kesehatan (PENTAS)**. Panduan ini mencakup seluruh fitur administratif — mulai dari login, pengelolaan user, kategori, soal, jadwal, hingga laporan.

## 1.2 Audiens

Dokumen ini ditujukan kepada:

- **Admin KP** — administrator kantor pusat.
- **Admin Kepwil** — administrator di tingkat kedeputian wilayah.

## 1.3 Struktur Aplikasi

Aplikasi PENTAS terbagi menjadi dua bagian:

- **Bagian User** — diakses oleh pegawai outsourcing via `/` (halaman publik).
- **Bagian Admin** — diakses via `/admin/login` (terpisah dari user).

---

# 2. Peran (Role) Admin

Terdapat **2 tingkatan role** administrator dengan hak akses berbeda:

## 2.1 ADMIN_KP (Admin Kantor Pusat)

Administrator tingkat kantor pusat untuk pengelolaan konten dan user secara nasional.

**Hak akses:**
- Mengelola seluruh konten (Kategori, Step, Soal, Materi, Jadwal).
- Mengelola Users dari seluruh wilayah.
- Membuat dan mengelola Admin KP serta Admin Kepwil.
- Mengakses Laporan seluruh wilayah.

## 2.2 ADMIN_KEPWIL (Admin Kedeputian Wilayah)

Administrator tingkat wilayah, dengan ruang lingkup terbatas pada Kepwil-nya.

**Hak akses:**
- Mengelola Users **hanya untuk wilayah** (Kepwil) yang ditugaskan.
- Melihat Laporan **hanya untuk wilayah** tersebut.
- **Tidak bisa** mengelola konten (Kategori, Soal, Materi, Jadwal, Step).
- **Tidak bisa** mengelola Admin.

## 2.3 Matriks Akses Menu

| Menu | ADMIN_KP | ADMIN_KEPWIL |
|---|:---:|:---:|
| Dashboard | ✔ | ✔ |
| Kelola Admin | ✔ | – |
| Kategori | ✔ | – |
| Step Pembelajaran | ✔ | – |
| Soal & Jadwal | ✔ | – |
| Penjadwalan | ✔ | – |
| Kelola Users | ✔ (semua) | ✔ (Kepwil-nya) |
| Laporan | ✔ (semua) | ✔ (Kepwil-nya) |
| Reset Test | ✔ | – |

Legenda: ✔ = memiliki akses · – = tidak memiliki akses

---

# 3. Mengakses Panel Admin

1. Buka browser pada perangkat Anda.
2. Buka alamat: **https://bpjs3.314playground.com/admin/login** (atau alamat yang diberikan).
3. Halaman login admin akan muncul.

> *[Placeholder Gambar 3.1: URL bar dengan /admin/login]*

---

# 4. Login Admin

## 4.1 Halaman Login Admin

Halaman login admin memiliki tampilan berbeda dari login user:

- **Background gelap** dengan ikon gerigi (pengaturan).
- **Judul:** *"Admin Panel"*
- **Subjudul:** *"Sistem Pembelajaran BPJS Kesehatan"*
- **Form Login:**
  - Username
  - Password
- **Tombol Login** (berwarna utama).
- Tautan **← Kembali ke Website** untuk kembali ke halaman publik.

> *[Placeholder Gambar 4.1: Halaman Login Admin]*

## 4.2 Langkah Login

1. Masukkan **Username** admin Anda.
2. Masukkan **Password** admin.
3. Klik tombol **Login**.
4. Jika berhasil, Anda akan diarahkan ke **Dashboard Admin** (`/admin/dashboard`).
5. Jika gagal, pesan kesalahan akan muncul di atas tombol.

**Catatan keamanan:**
- Jangan bagikan kredensial admin kepada siapa pun.
- Gunakan password yang kuat dan ganti secara berkala.
- Selalu logout setelah selesai, terutama pada perangkat bersama.

---

# 5. Dashboard Admin

Dashboard Admin adalah halaman utama setelah login yang menampilkan **ringkasan data, peta sebaran, grafik statistik,** dan **tabel user** dengan filter.

## 5.1 Elemen Halaman

### Header
- Salam kepada admin (dengan nama admin yang login).
- Logo dan menu navigasi sisi.

### Panel Filter
Terdapat beberapa filter yang saling berkaitan:

- **Tanggal Ujian Dari** dan **Tanggal Ujian Sampai**
- **Kantor Wilayah (Kepwil)**
- **Kantor Cabang (KC)** — muncul setelah Kepwil dipilih
- **Posisi** (Sub-Kategori)
- Tombol **Reset Filter** — muncul jika ada filter aktif

> *[Placeholder Gambar 5.1: Panel Filter Dashboard]*

### Peta Sebaran Indonesia
- Peta interaktif dengan warna provinsi sesuai rata-rata nilai:
  - **Merah** = 0 – 25
  - **Kuning / Amber** = 26 – 50
  - **Biru** = 51 – 75
  - **Hijau** = 76 – 100
- **Legenda** di bawah peta (skala 0 – 100).
- **Tooltip** saat hover: nama provinsi, total user, materi selesai, test selesai, rata-rata nilai.
- **Panel Detail Provinsi** (muncul ketika salah satu provinsi di-klik) dengan tombol **Filter Data Provinsi Ini**.

> *[Placeholder Gambar 5.2: Peta dengan panel detail]*

### Kartu Statistik (4 buah)
- **Total User** (ikon biru)
- **Materi Selesai** (ikon ungu, dengan persentase)
- **Test Selesai** (ikon emerald, dengan persentase)
- **Rata-rata Skor** (ikon amber, angka dengan warna)

### Grafik
1. **Distribusi Nilai (Doughnut Chart):** Kurang / Cukup / Baik / Sangat Baik.
2. **User per Posisi (Bar Chart).**
3. **Progress per Wilayah Top 10 (Bar Chart):** perbandingan Materi vs Test.

### Kartu Learning Progress
Persentase penyelesaian materi dan test dengan progress bar.

### Kartu Score Summary
Ringkasan jumlah user pada masing-masing rentang nilai (Sangat Baik / Baik / Cukup / Kurang / Belum Test).

### Tabel Users
- **Kolom:** User (avatar + nama + NPP), Wilayah, Posisi, Materi (✓/✗), Test (✓/✗), Skor.
- **Kolom Pencarian:** *"Cari nama, NPP..."*
- **Pagination** di bawah tabel.

> *[Placeholder Gambar 5.3: Tabel Users di Dashboard]*

## 5.2 Cara Menggunakan Filter

1. Pilih rentang tanggal pada **Tanggal Ujian Dari / Sampai**.
2. Pilih **Kepwil** pada dropdown — otomatis akan memperbarui opsi **KC**.
3. Pilih **KC** jika ingin menyempitkan filter.
4. Pilih **Posisi** jika diperlukan.
5. Data (peta, kartu statistik, grafik, tabel) akan diperbarui otomatis.
6. Klik **Reset Filter** untuk menghapus semua filter.

---

# 6. Menu: Kelola Admin

**Hak akses: ADMIN_KP**

Menu ini digunakan untuk mengelola akun administrator.

## 6.1 Membuka Halaman

Sidebar → **Kelola Admin**. URL: `/admin/admins`.

## 6.2 Elemen Halaman

- Tombol **+ Tambah Admin** di kanan atas.
- Kotak pencarian (*"Cari nama, username, atau wilayah..."*).
- Filter Role (dropdown: Semua Role / Admin KP / Admin Kepwil).
- Tabel daftar admin dengan kolom:
  - **Admin** (avatar + nama + ID)
  - **Username**
  - **Role** (badge warna: ungu / biru / emerald)
  - **Wilayah** (Kepwil + KC, jika ada)
  - **Aksi** (ikon edit dan hapus)

> *[Placeholder Gambar 6.1: Halaman Kelola Admin]*

## 6.3 Menambah Admin Baru

1. Klik tombol **+ Tambah Admin**.
2. Modal **Tambah Admin** akan terbuka.
3. Isi field:
   - **Username** (unik, wajib)
   - **Password** (wajib)
   - **Nama Lengkap** (wajib)
   - **Role** (wajib) — pilihan: **ADMIN_KP** atau **ADMIN_KEPWIL**
   - Jika role **ADMIN_KEPWIL**:
     - **Kedeputian Wilayah** (wajib)
     - **Kantor Cabang** (opsional, muncul setelah Kepwil dipilih)
4. Klik **Tambah Admin**.

> *[Placeholder Gambar 6.2: Modal Tambah Admin]*

## 6.4 Mengedit Admin

1. Klik ikon **Edit** pada baris admin yang ingin diubah.
2. Modal akan terbuka dengan data yang sudah terisi.
3. **Username** tidak dapat diubah (ter-disable).
4. **Password** opsional — kosongkan untuk tidak mengubah.
5. Ubah data lain sesuai kebutuhan.
6. Klik **Simpan Perubahan**.

**Catatan:** Jika password diubah, sesi admin tersebut pada semua perangkat akan dipaksa untuk login ulang.

## 6.5 Menghapus Admin

1. Klik ikon **Hapus** pada baris admin.
2. Konfirmasi dialog akan muncul.
3. Klik **OK** untuk menghapus.

**Pembatasan:**
- Anda **tidak dapat menghapus akun Anda sendiri**.

---

# 7. Menu: Manajemen Kategori

**Hak akses: ADMIN_KP**

Menu ini digunakan untuk mengelola **Kategori** (pengelompokan besar) dan **Sub-Kategori** (posisi).

## 7.1 Membuka Halaman

Sidebar → **Kategori**. URL: `/admin/kategori`.

## 7.2 Elemen Halaman

- Tombol **+ Tambah Kategori** di kanan atas.
- Daftar Kategori berupa kartu, setiap kartu berisi:
  - Nama Kategori + Deskripsi.
  - Tombol **+ Sub Kategori**, **Edit**, **Hapus**.
  - Bagian *"Sub Kategori:"* berisi pill untuk setiap Sub-Kategori (dengan ikon edit dan hapus di dalamnya).

> *[Placeholder Gambar 7.1: Halaman Kategori]*

## 7.3 Menambah / Mengedit Kategori

1. Klik **+ Tambah Kategori** (atau ikon edit untuk mengubah).
2. Modal akan terbuka.
3. Isi:
   - **Nama Kategori** (wajib)
   - **Deskripsi** (wajib)
4. Klik **Simpan**.

## 7.4 Menambah / Mengedit Sub-Kategori

1. Klik tombol **+ Sub Kategori** pada kartu Kategori induk.
2. Modal Sub-Kategori akan terbuka.
3. Isi:
   - **Nama Sub Kategori** (wajib)
   - **Deskripsi** (wajib)
4. Klik **Simpan**.

## 7.5 Menghapus

- Kategori: klik **Hapus** pada kartu Kategori. **Perhatian:** menghapus Kategori juga akan menghapus seluruh Sub-Kategori dan data turunannya.
- Sub-Kategori: klik ikon hapus pada pill Sub-Kategori.

Konfirmasi dialog akan muncul sebelum penghapusan.

---

# 8. Menu: Konfigurasi Step Pembelajaran

**Hak akses: ADMIN_KP**

Menu ini digunakan untuk menyesuaikan **nama, deskripsi, warna, dan ikon** dari 4 tahap pembelajaran (Materi, Test, Do-Check, Rekap) yang ditampilkan kepada user.

## 8.1 Membuka Halaman

Sidebar → **Step Pembelajaran**. URL: `/admin/step-config`.

## 8.2 Elemen Halaman

- Grid berisi 4 kartu step, masing-masing menampilkan:
  - Preview header dengan gradien warna dan ikon.
  - Nama dan deskripsi step.
  - Nomor urutan.
  - Tombol **Edit**.

> *[Placeholder Gambar 8.1: Halaman Step Config]*

## 8.3 Mengubah Step

1. Klik **Edit** pada salah satu kartu step.
2. Modal akan terbuka berisi:
   - Preview step.
   - Area upload gambar ikon (PNG / JPG / WebP).
   - **Nama Step** (wajib)
   - **Deskripsi** (wajib)
   - Grid pilihan **gradien warna** (6 opsi): Violet-Purple, Blue-Indigo, Teal-Cyan, Amber-Orange, Rose-Pink, Emerald-Green.
3. Ubah nama / deskripsi sesuai kebutuhan.
4. (Opsional) Upload gambar baru atau klik **X** pada gambar untuk menghapus.
5. Pilih warna gradien.
6. Klik **Simpan**.

> *[Placeholder Gambar 8.2: Modal Edit Step]*

**Default Nama Step:**

| ID | Default Nama | Fungsi |
|---|---|---|
| materi | Kupas Tuntas | Tahap baca materi |
| test | JITU | Tahap kuis |
| docheck | Do-Check | Tahap review |
| rekap | Rekapin | Tahap rekap hasil |

---

# 9. Menu: Soal & Jadwal

**Hak akses: ADMIN_KP**

Menu ini merupakan pusat pengelolaan **Soal** dan **Materi** untuk setiap periode evaluasi.

## 9.1 Membuka Halaman

Sidebar → **Soal & Jadwal**. URL: `/admin/soal`.

## 9.2 Elemen Halaman

- **Tab:** **SOAL** | **MATERI**
- **Filter Atas:**
  - Dropdown **Kategori**
  - Dropdown **Sub Kategori** (tergantung kategori)
  - Daftar **Periode** (muncul otomatis)
- Tombol aksi: **+ Tambah Soal**, **+ Duplikat Soal**, **Jadwal**, **Publish**

> *[Placeholder Gambar 9.1: Halaman Soal & Jadwal]*

## 9.3 Alur Umum

1. Pilih **Kategori**.
2. Pilih **Sub-Kategori** → sistem menampilkan daftar Periode.
3. Pilih **Periode** yang ingin dikelola.
4. Pilih tab **SOAL** atau **MATERI** sesuai kebutuhan.

## 9.4 Mengelola Soal

### Menambah Soal Baru

1. Pastikan tab **SOAL** aktif dan periode sudah dipilih.
2. Klik **+ Tambah Soal**.
3. Modal akan terbuka berisi:
   - **Pertanyaan** (editor rich text)
   - **Opsi A, B, C, D** (teks)
   - **Jawaban Benar** (dropdown A / B / C / D)
   - **Pembahasan** (editor rich text)
4. Klik **Simpan**.

### Mengedit Soal

- Klik ikon **Edit** pada kartu soal. Modal akan terbuka dengan data terisi.

### Menghapus Soal

- Klik ikon **Hapus**. Konfirmasi akan muncul.

### Menyalin Soal dari Periode Lain

1. Klik **+ Duplikat Soal**.
2. Modal akan muncul dengan dropdown **Periode Sumber**.
3. Pilih periode yang akan dijadikan sumber.
4. Klik **Copy**. Seluruh soal dari periode sumber akan disalin ke periode tujuan.

## 9.5 Mengelola Materi

Pada tab **MATERI**, alur pengelolaan serupa dengan Soal, namun dengan field tambahan:

- **Judul Materi**
- **Konten** (rich text editor)
- **Video** — dapat berupa URL YouTube atau upload file MP4
- **File PDF** (opsional) — untuk materi berbentuk dokumen
- **Urutan**

## 9.6 Mengatur Jadwal Periode

1. Klik tombol **Jadwal** (tampil setelah periode dipilih).
2. Modal akan terbuka berisi:
   - **Tanggal**
   - **Jam Mulai**
   - **Jam Berakhir**
   - **Do-Check Berakhir**
3. Klik **Simpan**.

> *[Placeholder Gambar 9.2: Modal Jadwal]*

## 9.7 Publish Periode

Setelah seluruh soal, materi, dan jadwal siap, klik tombol **Publish** untuk mengaktifkan periode. Periode yang sudah published tampil kepada user dan tidak dapat lagi diubah tanpa reopening.

---

# 10. Menu: Penjadwalan (Scheduling)

**Hak akses: ADMIN_KP**

Menu khusus untuk mengatur jadwal **JITU (Quiz)** dan **Do-Check (Pembahasan)** di seluruh Sub-Kategori dalam satu tampilan.

## 10.1 Membuka Halaman

Sidebar → **Penjadwalan**. URL: `/admin/scheduling`.

## 10.2 Elemen Halaman

- Dua kartu info di atas:
  - **Jadwal JITU** — atur waktu quiz dapat diakses.
  - **Publish DO-CHECK** — atur waktu pembahasan dapat dilihat.
- Tabel dengan kolom:
  - **Sub Kategori**, **Kategori**
  - **Status JITU** (Belum Mulai / Sedang Berlangsung / Sudah Berakhir / Terjadwal / Tidak Terjadwal)
  - **Jadwal JITU**
  - **Status DO-CHECK** (Menunggu Publish / Sudah Publish / Langsung Publish / Tidak Ada)
  - **Publish DO-CHECK**
  - **Aksi** (ikon jam untuk JITU, ikon kalender untuk Do-Check)

> *[Placeholder Gambar 10.1: Halaman Penjadwalan]*

## 10.3 Mengatur Jadwal JITU

1. Klik ikon **jam** pada baris Sub-Kategori yang ingin diatur.
2. Modal **Jadwal JITU** akan muncul.
3. Toggle **Aktifkan Penjadwalan**.
4. Isi:
   - **Jadwal Mulai** (tanggal + waktu)
   - **Jadwal Selesai** (tanggal + waktu)
5. Klik **Simpan**.

## 10.4 Mengatur Publish Do-Check

1. Klik ikon **kalender** pada baris Sub-Kategori.
2. Modal **Publish DO-CHECK** akan muncul.
3. Isi **Publish DO-CHECK** (tanggal + waktu).
   - Kosongkan untuk mode **Langsung Publish** (pembahasan langsung terlihat setelah test berakhir).
4. Klik **Simpan**.

**Interpretasi Status:**

| Status | Arti |
|---|---|
| Belum Mulai | Jadwal telah diset namun waktu mulai belum tiba |
| Sedang Berlangsung | Test sedang aktif (user dapat mengerjakan) |
| Sudah Berakhir | Waktu test telah lewat |
| Terjadwal | Sudah diatur tetapi belum berjalan |
| Tidak Terjadwal | Belum diset jadwalnya |
| Menunggu Publish | Do-Check sudah diset tanggalnya, menunggu waktu publish |
| Sudah Publish | Pembahasan sudah dapat diakses user |
| Langsung Publish | Pembahasan langsung terlihat setelah test selesai |

---

# 11. Menu: Kelola Users

**Hak akses: ADMIN_KP, ADMIN_KEPWIL** (dengan ruang lingkup masing-masing)

Menu ini digunakan untuk mengelola akun user (pegawai outsourcing).

## 11.1 Membuka Halaman

Sidebar → **Users**. URL: `/admin/users`.

## 11.2 Elemen Halaman

- Tombol **+ Tambah User** di kanan atas.
- Kotak pencarian (*"Cari nama, NPP..."*).
- Filter **Sub Kategori**.
- Tabel daftar user dengan kolom:
  - **User** (avatar + nama + NPP)
  - **Email**
  - **Posisi**
  - **Kepwil**, **KC**, **Kakab**
  - **Aksi** (edit, hapus, reset password)
- Pagination.

> *[Placeholder Gambar 11.1: Halaman Kelola Users]*

## 11.3 Menambah User

1. Klik **+ Tambah User**.
2. Modal akan muncul dengan field:
   - **NPP** (wajib, unik)
   - **Nama** (wajib)
   - **Email**
   - **Posisi** — otomatis terisi berdasarkan Sub-Kategori yang dipilih
   - **Vendor**
   - **Sub Kategori** (wajib; dropdown dengan fitur pencarian)
   - **Kepwil** (wajib jika memilih KC / Kakab)
   - **KC** (muncul setelah Kepwil dipilih)
   - **Kakab** (muncul setelah KC dipilih)
   - **Password** (wajib, minimal 6 karakter)
3. Klik **Simpan**.

> *[Placeholder Gambar 11.2: Modal Tambah User]*

## 11.4 Mengedit User

1. Klik ikon **Edit** pada baris user.
2. Modal terbuka dengan data user terisi.
3. **NPP** ter-disable (tidak dapat diubah).
4. **Password** opsional — kosongkan jika tidak ingin mengubah.
5. Klik **Simpan**.

## 11.5 Reset Password User

1. Klik ikon **Reset Password** pada baris user.
2. Modal **Reset Password** muncul.
3. Masukkan **Password Baru** (minimal 6 karakter).
4. Klik **Reset Password**.
5. Informasikan password baru ke user bersangkutan.

## 11.6 Menghapus User

- Klik ikon **Hapus**. Konfirmasi akan muncul.

**Perhatian:** Menghapus user juga akan menghapus riwayat test dan data terkaitnya.

## 11.7 Bulk Import CSV

Untuk menambahkan banyak user sekaligus (jika tombol tersedia):

1. Klik **Bulk Import** (jika ada).
2. Unggah file CSV sesuai format yang ditentukan.
3. Klik **Import**.
4. Hasil import ditampilkan (berapa berhasil, berapa gagal, beserta alasan).

**Format CSV yang disarankan:**
```
npp,nama,email,posisi,vendor,subKategoriSlug,kepwil,kc,kakab,password
```

---

# 12. Menu: Laporan (Reports)

**Hak akses: ADMIN_KP, ADMIN_KEPWIL** (dengan ruang lingkup masing-masing)

Menu laporan memungkinkan admin melihat dan mengunduh hasil test user dalam format Excel atau PDF.

## 12.1 Membuka Halaman

Sidebar → **Laporan**. URL: `/admin/reports`.

## 12.2 Elemen Halaman

- Tombol **+ Export Excel** dan **+ Export PDF** di kanan atas.
- Panel Filter:
  - **Kategori**
  - **Sub Kategori**
  - **Periode Bulan** (1 – 12)
  - **Periode Tahun**
  - Tombol **Terapkan Filter** dan **Reset Filter**.
- Tabel Hasil:
  - **User** (avatar + nama + NPP)
  - **Kepwil**, **KC**, **Kakab**
  - **Periode** (bulan tahun)
  - **Skor** (badge warna)
  - **Benar** (X/Y)
  - **Waktu Selesai**
- Pagination.

> *[Placeholder Gambar 12.1: Halaman Laporan]*

## 12.3 Cara Memfilter

1. Pilih **Kategori** → daftar Sub-Kategori terisi otomatis.
2. Pilih **Sub-Kategori**, **Bulan**, **Tahun** sesuai kebutuhan.
3. Klik **Terapkan Filter**.
4. Untuk menghapus filter, klik **Reset Filter**.

## 12.4 Export Data

- **Export Excel:** klik tombol **+ Export Excel** → file `.xlsx` akan otomatis terunduh.
- **Export PDF:** klik tombol **+ Export PDF** → file `.pdf` akan otomatis terunduh.

Data yang diexport sesuai dengan filter aktif saat itu.

**Catatan:** Untuk ADMIN_KEPWIL, laporan hanya berisi data user dari Kepwil yang bersangkutan.

---

# 13. Menu: Reset Test

**Hak akses: ADMIN_KP**

Menu ini digunakan untuk mereset sesi test user agar dapat mengerjakan ulang, atau membuka ulang periode yang sudah berakhir.

## 13.1 Membuka Halaman

Sidebar → **Reset Test**. URL: `/admin/reset-test`.

## 13.2 Elemen Halaman

- Panel Filter atas (sticky):
  - **Sub Kategori**
  - **Periode** (muncul setelah Sub-Kategori dipilih)
- Setelah periode dipilih, muncul:
  - **4 Kartu Ringkasan:** Total Pegawai, Selesai, Sedang Mengerjakan, Belum Test.
  - **Kotak Pencarian** (untuk menyaring user berdasarkan nama / NPP).
  - **Tabel User** dengan checkbox untuk memilih, status test, status materi, dan tombol aksi.
- Panel tombol aksi di bawah (sticky):
  - **Reset Terpilih**
  - **Reset Semua**
  - **Buka Ulang Periode**
  - Checkbox **"Reset juga materi"**

> *[Placeholder Gambar 13.1: Halaman Reset Test]*

## 13.3 Mereset User Terpilih

1. Pilih **Sub-Kategori** dan **Periode**.
2. Beri centang pada user yang ingin direset (atau klik **Select All** di header tabel).
3. (Opsional) Centang **"Reset juga materi"** jika ingin materi juga di-reset.
4. Klik **Reset Terpilih**.
5. Modal konfirmasi akan muncul berisi ringkasan.
6. Klik **Confirm Action** untuk melanjutkan.

## 13.4 Mereset Seluruh User dalam Periode

1. Pilih **Sub-Kategori** dan **Periode**.
2. Klik **Reset Semua**.
3. Modal konfirmasi muncul — periksa total user yang akan direset.
4. Klik **Confirm Action**.

## 13.5 Membuka Ulang Periode (Reopen)

Jika sebuah periode sudah berakhir namun perlu dibuka kembali:

1. Klik **Buka Ulang Periode**.
2. Modal **Reopen Periode** muncul.
3. Pilih **Target Status**:
   - **Draft** — periode kembali ke status draft (tidak tampil ke user).
   - **Terjadwal** — periode kembali aktif pada jadwal baru. Isi **Jam Mulai** dan **Jam Berakhir**.
4. Klik **Reopen**.

**Perhatian:**
- Tindakan reset **tidak dapat dibatalkan**. Data test (jawaban dan skor) yang sudah ada akan dihapus.
- Selalu lakukan konfirmasi via email / notifikasi ke user sebelum mereset.

---

# 14. Alur Kerja Periode Test

Bagian ini menjelaskan alur lengkap pengelolaan satu periode evaluasi (dari sisi admin).

## 14.1 Tahap Persiapan

1. **Menu Kategori** — pastikan Kategori dan Sub-Kategori sudah ada.
2. **Menu Step Pembelajaran** — pastikan nama dan warna step sesuai preferensi.
3. **Menu Kelola Users** — pastikan seluruh user yang akan mengerjakan sudah terdaftar.

## 14.2 Tahap Pembuatan Periode

4. **Menu Soal & Jadwal:**
   - Pilih Kategori → Sub-Kategori.
   - Buat periode baru (misalnya "Maret 2026").
   - Tambahkan **Materi** pada tab MATERI (judul, konten, video, PDF).
   - Tambahkan **Soal** pada tab SOAL (4 pilihan, jawaban benar, pembahasan).
     - Alternatif: klik **+ Duplikat Soal** dari periode sebelumnya lalu modifikasi.

## 14.3 Tahap Penjadwalan

5. **Menu Soal & Jadwal** → klik **Jadwal**:
   - Tentukan tanggal dan jam test.
   - Tentukan waktu Do-Check berakhir.
6. Atau gunakan **Menu Penjadwalan** untuk melihat semua jadwal secara tabular dan mengaturnya dalam satu halaman.

## 14.4 Tahap Aktivasi

7. **Menu Soal & Jadwal** → klik **Publish** pada periode yang sudah siap.
   - Periode berubah status menjadi **Terjadwal / Aktif** sesuai waktu.
   - User dapat melihat periode dan mulai membaca materi.

## 14.5 Tahap Pelaksanaan

8. Pada jadwal test:
   - User dapat mengerjakan JITU.
   - **Menu Dashboard** dapat dimonitor untuk melihat progress.

## 14.6 Tahap Pasca-Test

9. Setelah waktu test berakhir:
   - Mode **Do-Check** terbuka (sesuai jadwal).
   - User dapat melihat pembahasan.
10. **Menu Laporan** — export data hasil test untuk keperluan arsip / pelaporan.

## 14.7 Tahap Koreksi (Opsional)

11. Jika terdapat user yang perlu mengulang: **Menu Reset Test**.

---

# 15. Keamanan dan Praktik Terbaik

## 15.1 Keamanan Akun Admin

- **Password kuat:** minimal 8 karakter, kombinasi huruf besar, huruf kecil, angka, dan simbol.
- **Ganti password** secara berkala (setiap 3 – 6 bulan).
- **Jangan bagikan** kredensial admin ke siapa pun.
- **Logout** setiap kali selesai bekerja, terutama di perangkat bersama.
- **Hindari login** dari jaringan publik (WiFi kafe, bandara) tanpa VPN.

## 15.2 Pengelolaan User

- Gunakan **password awal yang kuat** saat membuat user baru.
- **Edukasi user** untuk segera mengganti password pada login pertama.
- Lakukan **audit berkala** terhadap daftar user — hapus akun user yang sudah tidak aktif.

## 15.3 Pengelolaan Konten

- **Periksa ulang** soal dan pembahasan sebelum Publish.
- **Test di periode Draft** sebelum mem-publish — gunakan akun user uji jika perlu.
- **Backup data** soal/materi secara berkala (via export atau pencatatan internal).

## 15.4 Hak Akses

- Gunakan role **ADMIN_KEPWIL** untuk PIC wilayah agar ruang lingkup akses terbatas pada wilayahnya saja.
- Gunakan role **ADMIN_KP** hanya untuk personel yang benar-benar berwenang mengelola konten dan user secara nasional.
- Tinjau daftar admin secara berkala untuk memastikan tidak ada akun tidak aktif yang masih memiliki akses.

---

# 16. Troubleshooting

## 16.1 Tidak Bisa Login sebagai Admin

- Periksa caps lock dan penulisan username / password.
- Coba login dari browser lain atau mode incognito.
- Jika tetap gagal, hubungi admin lain yang berwenang untuk reset password.

## 16.2 Tombol Save Tidak Merespons

- Periksa apakah semua field wajib sudah terisi.
- Cek koneksi internet.
- Buka Developer Tools (F12) → tab **Console** untuk melihat pesan error (jika diperlukan untuk laporan ke tim IT).

## 16.3 Data Tidak Muncul di Dashboard / Laporan

- Pastikan filter tidak mempersempit data secara berlebihan. Klik **Reset Filter**.
- Pastikan periode yang dimaksud sudah **Published** dan sudah memiliki jawaban user.
- Untuk ADMIN_KEPWIL: data hanya akan muncul untuk Kepwil Anda.

## 16.4 Upload Gambar / PDF Gagal

- Periksa ukuran file (disarankan < 10 MB).
- Pastikan format file sesuai (PNG / JPG / WebP untuk gambar, PDF untuk dokumen).
- Cek kecepatan koneksi internet.

## 16.5 User Terjebak di Test / Tidak Bisa Submit

- Buka **Menu Reset Test** → pilih Sub-Kategori & Periode.
- Cari user bersangkutan dan klik **Reset**.
- User dapat login ulang dan mengerjakan dari awal.

## 16.6 Periode Sudah Berakhir tapi Perlu Dibuka Kembali

- Gunakan fitur **Buka Ulang Periode** pada **Menu Reset Test**.
- Tentukan status tujuan (Draft atau Terjadwal) dan jadwal baru.

---

# Akhir Dokumen

Untuk kendala teknis lain yang tidak tercantum dalam panduan ini, silakan hubungi tim IT atau developer aplikasi.

---

*Dokumen ini merupakan bagian dari dokumentasi resmi Sistem Pembelajaran BPJS Kesehatan.*
