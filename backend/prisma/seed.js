import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Admin
  const hashedAdminPassword = await bcrypt.hash('admin123', 10)
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedAdminPassword,
      nama: 'Administrator',
      role: 'admin'
    }
  })
  console.log('Admin created')

  // Create Kategori with SubKategoris
  const kategorisData = [
    {
      nama: 'TAD',
      deskripsi: 'Tenaga Alih Daya',
      icon: 'users',
      subKategoris: [
        { nama: 'Satpam', slug: 'satpam', deskripsi: 'Security / Satuan Pengamanan' },
        { nama: 'Office Boy', slug: 'office-boy', deskripsi: 'Petugas Kebersihan dan Layanan Kantor' },
        { nama: 'Driver', slug: 'driver', deskripsi: 'Pengemudi Kendaraan Dinas' }
      ]
    },
    {
      nama: 'Pegawai',
      deskripsi: 'Manajemen Pegawai',
      icon: 'briefcase',
      subKategoris: [
        { nama: 'PATT', slug: 'patt', deskripsi: 'Pegawai Administrasi Tidak Tetap' },
        { nama: 'Pegawai Tetap', slug: 'pegawai-tetap', deskripsi: 'Pegawai Status Tetap' }
      ]
    },
    {
      nama: 'Petugas Sentralisasi',
      deskripsi: 'Layanan Terpusat',
      icon: 'headphones',
      subKategoris: [
        { nama: 'Pandawa', slug: 'pandawa', deskripsi: 'Pelayanan Administrasi' },
        { nama: 'Senada', slug: 'senada', deskripsi: 'Sentralisasi Administrasi Data' },
        { nama: 'CC165', slug: 'cc165', deskripsi: 'Contact Center 165' }
      ]
    }
  ]

  // Modul templates with tipe
  const modulTemplates = [
    {
      nama: 'KUPAS TUNTAS',
      tipe: 'KUPAS_TUNTAS',
      deskripsi: 'Materi pembelajaran untuk mempersiapkan kuesioner JITU',
      gradientFrom: 'violet-500',
      gradientTo: 'purple-600',
      icon: 'book-open',
      durasi: 0, // Tidak ada batasan waktu untuk baca materi
      urutan: 1
    },
    {
      nama: 'JITU',
      tipe: 'JITU',
      deskripsi: 'Kuesioner evaluasi pemahaman materi',
      gradientFrom: 'blue-500',
      gradientTo: 'indigo-600',
      icon: 'clipboard-list',
      durasi: 30,
      urutan: 2
    },
    {
      nama: 'DO-CHECK',
      tipe: 'DO_CHECK',
      deskripsi: 'Review dan koreksi jawaban kuesioner JITU',
      gradientFrom: 'teal-500',
      gradientTo: 'cyan-600',
      icon: 'check-circle',
      durasi: 0,
      urutan: 3
    },
    {
      nama: 'REKAPIN',
      tipe: 'REKAPIN',
      deskripsi: 'Rekap progress pembelajaran dan hasil kuesioner',
      gradientFrom: 'amber-500',
      gradientTo: 'orange-600',
      icon: 'chart-bar',
      durasi: 0,
      urutan: 4
    }
  ]

  // Sample materi untuk KUPAS TUNTAS
  const sampleMateris = [
    {
      judul: 'Pengenalan Standar Operasional Prosedur (SOP)',
      konten: `<h2>Apa itu SOP?</h2>
<p>Standar Operasional Prosedur (SOP) adalah dokumen yang berisi serangkaian instruksi tertulis yang dibakukan mengenai berbagai proses penyelenggaraan aktivitas organisasi, bagaimana dan kapan harus dilakukan, dimana dan oleh siapa dilakukan.</p>

<h3>Manfaat SOP:</h3>
<ul>
  <li>Menjamin konsistensi dalam pelaksanaan tugas</li>
  <li>Meminimalisir kesalahan dan kelalaian</li>
  <li>Mempermudah proses pelatihan karyawan baru</li>
  <li>Meningkatkan efisiensi dan produktivitas</li>
</ul>

<h3>Komponen SOP:</h3>
<ol>
  <li><strong>Tujuan:</strong> Menjelaskan maksud dari prosedur</li>
  <li><strong>Ruang Lingkup:</strong> Batasan penerapan prosedur</li>
  <li><strong>Prosedur:</strong> Langkah-langkah yang harus diikuti</li>
  <li><strong>Penanggung Jawab:</strong> Pihak yang bertanggung jawab</li>
</ol>`,
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      urutan: 1
    },
    {
      judul: 'Pelayanan Prima kepada Peserta',
      konten: `<h2>Prinsip Pelayanan Prima</h2>
<p>Pelayanan prima adalah pelayanan yang sangat baik dan melampaui harapan pelanggan. Di BPJS Kesehatan, pelayanan prima menjadi kunci kepuasan peserta.</p>

<h3>5 Dimensi Pelayanan Prima:</h3>
<ul>
  <li><strong>Tangible:</strong> Fasilitas fisik, perlengkapan, dan penampilan personil</li>
  <li><strong>Reliability:</strong> Kemampuan memberikan layanan sesuai janji</li>
  <li><strong>Responsiveness:</strong> Kemauan membantu dengan cepat</li>
  <li><strong>Assurance:</strong> Pengetahuan dan kesopanan karyawan</li>
  <li><strong>Empathy:</strong> Perhatian personal kepada pelanggan</li>
</ul>

<h3>Tips Menghadapi Keluhan:</h3>
<ol>
  <li>Dengarkan dengan penuh perhatian</li>
  <li>Tunjukkan empati dan pengertian</li>
  <li>Minta maaf atas ketidaknyamanan</li>
  <li>Cari solusi yang tepat</li>
  <li>Follow up untuk memastikan kepuasan</li>
</ol>`,
      urutan: 2
    },
    {
      judul: 'Keselamatan dan Kesehatan Kerja (K3)',
      konten: `<h2>Pentingnya K3 di Tempat Kerja</h2>
<p>Keselamatan dan Kesehatan Kerja adalah upaya untuk menjamin keutuhan dan kesempurnaan jasmani maupun rohani tenaga kerja.</p>

<h3>Prinsip Dasar K3:</h3>
<ul>
  <li>Mencegah kecelakaan kerja</li>
  <li>Mencegah penyakit akibat kerja</li>
  <li>Menciptakan lingkungan kerja yang aman</li>
</ul>

<h3>Prosedur Evakuasi Darurat:</h3>
<ol>
  <li>Tetap tenang dan jangan panik</li>
  <li>Ikuti jalur evakuasi yang ditentukan</li>
  <li>Jangan menggunakan lift</li>
  <li>Bantu rekan yang membutuhkan</li>
  <li>Berkumpul di titik kumpul yang ditentukan</li>
  <li>Laporkan kepada petugas K3</li>
</ol>`,
      urutan: 3
    }
  ]

  // Sample soal untuk JITU dengan pembahasan
  const sampleSoals = [
    {
      pertanyaan: 'Apa yang dimaksud dengan SOP dalam konteks pekerjaan?',
      pembahasan: 'SOP (Standar Operasional Prosedur) adalah dokumen yang berisi instruksi tertulis yang dibakukan untuk pelaksanaan aktivitas organisasi. SOP membantu menjaga konsistensi dan kualitas pekerjaan.',
      opsis: [
        { teks: 'Standar Operasional Prosedur - panduan kerja yang harus diikuti', isCorrect: true },
        { teks: 'Surat Operasional Perusahaan', isCorrect: false },
        { teks: 'Sistem Organisasi Perusahaan', isCorrect: false },
        { teks: 'Standar Optimal Pekerjaan', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Bagaimana sikap yang tepat saat menghadapi keluhan pelanggan?',
      pembahasan: 'Menghadapi keluhan dengan empati adalah kunci pelayanan prima. Dengarkan keluhan, pahami masalahnya, dan carikan solusi terbaik. Jangan pernah menyalahkan atau mengabaikan pelanggan.',
      opsis: [
        { teks: 'Mendengarkan dengan empati dan mencari solusi', isCorrect: true },
        { teks: 'Mengabaikan keluhan jika tidak penting', isCorrect: false },
        { teks: 'Menyalahkan pelanggan', isCorrect: false },
        { teks: 'Langsung menolak permintaan', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Apa yang harus dilakukan saat menemukan situasi darurat di tempat kerja?',
      pembahasan: 'Dalam situasi darurat, tetap tenang adalah kunci. Laporkan kepada atasan atau petugas K3, lalu ikuti prosedur evakuasi yang telah ditetapkan. Jangan panik dan bantu rekan yang membutuhkan.',
      opsis: [
        { teks: 'Melaporkan kepada atasan dan mengikuti prosedur evakuasi', isCorrect: true },
        { teks: 'Mengabaikan dan melanjutkan pekerjaan', isCorrect: false },
        { teks: 'Menunggu orang lain bertindak', isCorrect: false },
        { teks: 'Panik dan berlari tanpa arah', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Apa tujuan utama dari evaluasi kinerja berkala?',
      pembahasan: 'Evaluasi kinerja bertujuan untuk memberikan feedback konstruktif kepada karyawan, mengidentifikasi area perbaikan, dan merencanakan pengembangan karir. Ini bukan untuk mencari kesalahan.',
      opsis: [
        { teks: 'Meningkatkan kualitas kerja dan memberikan feedback', isCorrect: true },
        { teks: 'Mencari kesalahan karyawan', isCorrect: false },
        { teks: 'Mengurangi gaji karyawan', isCorrect: false },
        { teks: 'Formalitas administrasi saja', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Bagaimana cara menjaga kerahasiaan data perusahaan?',
      pembahasan: 'Data perusahaan harus dijaga kerahasiaannya. Jangan membagikan informasi sensitif kepada pihak yang tidak berwenang, jangan menyimpan data di perangkat pribadi, dan hindari membicarakan informasi rahasia di tempat umum.',
      opsis: [
        { teks: 'Tidak membagikan informasi sensitif kepada pihak tidak berwenang', isCorrect: true },
        { teks: 'Membagikan ke semua rekan kerja', isCorrect: false },
        { teks: 'Menyimpan di perangkat pribadi', isCorrect: false },
        { teks: 'Membicarakan di tempat umum', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Apa yang termasuk dalam dimensi Responsiveness pada pelayanan prima?',
      pembahasan: 'Responsiveness adalah kemauan untuk membantu pelanggan dengan cepat dan memberikan layanan yang tepat waktu. Ini menunjukkan kepedulian dan profesionalisme dalam melayani.',
      opsis: [
        { teks: 'Kemauan membantu pelanggan dengan cepat dan tepat', isCorrect: true },
        { teks: 'Penampilan fisik yang rapi', isCorrect: false },
        { teks: 'Kemampuan teknis karyawan', isCorrect: false },
        { teks: 'Fasilitas gedung yang baik', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Saat terjadi kebakaran di gedung kantor, hal pertama yang harus dilakukan adalah?',
      pembahasan: 'Saat kebakaran, prioritas utama adalah keselamatan. Tetap tenang, aktifkan alarm kebakaran jika ada, dan segera menuju ke jalur evakuasi. Jangan menggunakan lift dan bantu yang membutuhkan.',
      opsis: [
        { teks: 'Tetap tenang dan segera menuju jalur evakuasi', isCorrect: true },
        { teks: 'Mengambil barang berharga terlebih dahulu', isCorrect: false },
        { teks: 'Menggunakan lift untuk turun lebih cepat', isCorrect: false },
        { teks: 'Menunggu instruksi dari atasan', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Apa manfaat utama dari penerapan SOP yang konsisten?',
      pembahasan: 'SOP yang konsisten memastikan setiap pekerjaan dilakukan dengan cara yang sama, menghasilkan output yang konsisten, dan memudahkan proses pelatihan karyawan baru.',
      opsis: [
        { teks: 'Menjamin konsistensi kualitas dan memudahkan pelatihan', isCorrect: true },
        { teks: 'Mengurangi jumlah karyawan', isCorrect: false },
        { teks: 'Memperlambat proses kerja', isCorrect: false },
        { teks: 'Membuat pekerjaan lebih rumit', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'Yang termasuk prinsip Empathy dalam pelayanan prima adalah?',
      pembahasan: 'Empathy berarti memberikan perhatian personal kepada pelanggan, memahami kebutuhan spesifik mereka, dan memperlakukan mereka sebagai individu yang unik.',
      opsis: [
        { teks: 'Memberikan perhatian personal dan memahami kebutuhan pelanggan', isCorrect: true },
        { teks: 'Memberikan layanan secepat mungkin', isCorrect: false },
        { teks: 'Menyediakan fasilitas yang lengkap', isCorrect: false },
        { teks: 'Memiliki pengetahuan teknis yang baik', isCorrect: false }
      ]
    },
    {
      pertanyaan: 'APD (Alat Pelindung Diri) wajib digunakan ketika?',
      pembahasan: 'APD harus digunakan sesuai dengan jenis pekerjaan dan risiko yang ada. Penggunaan APD adalah kewajiban untuk menjaga keselamatan diri saat bekerja di area atau kondisi yang berpotensi bahaya.',
      opsis: [
        { teks: 'Bekerja di area atau kondisi yang berpotensi bahaya', isCorrect: true },
        { teks: 'Hanya saat ada inspeksi dari atasan', isCorrect: false },
        { teks: 'Hanya untuk karyawan tertentu', isCorrect: false },
        { teks: 'Ketika cuaca buruk saja', isCorrect: false }
      ]
    }
  ]

  for (const katData of kategorisData) {
    const kategori = await prisma.kategori.create({
      data: {
        nama: katData.nama,
        deskripsi: katData.deskripsi,
        icon: katData.icon
      }
    })
    console.log(`Kategori "${katData.nama}" created`)

    for (const subData of katData.subKategoris) {
      const subKategori = await prisma.subKategori.create({
        data: {
          nama: subData.nama,
          slug: subData.slug,
          deskripsi: subData.deskripsi,
          kategoriId: kategori.id
        }
      })
      console.log(`  SubKategori "${subData.nama}" created (slug: ${subData.slug})`)

      // Create moduls for each sub kategori
      for (const modTpl of modulTemplates) {
        const modul = await prisma.modul.create({
          data: {
            nama: modTpl.nama,
            tipe: modTpl.tipe,
            deskripsi: modTpl.deskripsi,
            gradientFrom: modTpl.gradientFrom,
            gradientTo: modTpl.gradientTo,
            icon: modTpl.icon,
            durasi: modTpl.durasi,
            urutan: modTpl.urutan,
            subKategoriId: subKategori.id
          }
        })

        // Create materi for KUPAS_TUNTAS modules
        if (modTpl.tipe === 'KUPAS_TUNTAS') {
          for (const materiData of sampleMateris) {
            await prisma.materi.create({
              data: {
                judul: materiData.judul,
                konten: materiData.konten,
                videoUrl: materiData.videoUrl,
                urutan: materiData.urutan,
                modulId: modul.id
              }
            })
          }
          console.log(`    Modul "${modTpl.nama}" with ${sampleMateris.length} materi created`)
        }

        // Create soal for JITU modules only
        if (modTpl.tipe === 'JITU') {
          for (const soalData of sampleSoals) {
            await prisma.soal.create({
              data: {
                pertanyaan: soalData.pertanyaan,
                pembahasan: soalData.pembahasan,
                bobot: 1,
                modulId: modul.id,
                opsis: {
                  create: soalData.opsis
                }
              }
            })
          }
          console.log(`    Modul "${modTpl.nama}" with ${sampleSoals.length} soal created`)
        }

        if (modTpl.tipe === 'DO_CHECK' || modTpl.tipe === 'REKAPIN') {
          console.log(`    Modul "${modTpl.nama}" created (${modTpl.tipe})`)
        }
      }
    }
  }

  // Create sample users with password
  const defaultPassword = await bcrypt.hash('password123', 10)

  const sampleUsers = [
    // TAD - Satpam
    { nip: '199001010001', nama: 'Budi Santoso', posisi: 'Satpam', email: 'budi.santoso@bpjs.go.id', kantorCabang: 'KC Jakarta Pusat', kantorWilayah: 'Kanwil DKI Jakarta', subKategoriSlug: 'satpam' },
    { nip: '199001010002', nama: 'Agus Setiawan', posisi: 'Satpam', email: 'agus.setiawan@bpjs.go.id', kantorCabang: 'KC Jakarta Selatan', kantorWilayah: 'Kanwil DKI Jakarta', subKategoriSlug: 'satpam' },
    { nip: '199001010003', nama: 'Rudi Hartono', posisi: 'Satpam', email: 'rudi.hartono@bpjs.go.id', kantorCabang: 'KC Bandung', kantorWilayah: 'Kanwil Jawa Barat', subKategoriSlug: 'satpam' },

    // TAD - Office Boy
    { nip: '199002020001', nama: 'Dedi Prasetyo', posisi: 'Office Boy', email: 'dedi.prasetyo@bpjs.go.id', kantorCabang: 'KC Jakarta Pusat', kantorWilayah: 'Kanwil DKI Jakarta', subKategoriSlug: 'office-boy' },
    { nip: '199002020002', nama: 'Eko Wijaya', posisi: 'Office Boy', email: 'eko.wijaya@bpjs.go.id', kantorCabang: 'KC Surabaya', kantorWilayah: 'Kanwil Jawa Timur', subKategoriSlug: 'office-boy' },

    // TAD - Driver
    { nip: '199003030001', nama: 'Siti Rahayu', posisi: 'Driver', email: 'siti.rahayu@bpjs.go.id', kantorCabang: 'KC Jakarta Barat', kantorWilayah: 'Kanwil DKI Jakarta', subKategoriSlug: 'driver' },
    { nip: '199003030002', nama: 'Joko Susilo', posisi: 'Driver', email: 'joko.susilo@bpjs.go.id', kantorCabang: 'KC Semarang', kantorWilayah: 'Kanwil Jawa Tengah', subKategoriSlug: 'driver' },

    // Pegawai - PATT
    { nip: '199004040001', nama: 'Ahmad Fauzi', posisi: 'PATT', email: 'ahmad.fauzi@bpjs.go.id', kantorCabang: 'KC Jakarta Timur', kantorWilayah: 'Kanwil DKI Jakarta', subKategoriSlug: 'patt' },
    { nip: '199004040002', nama: 'Fitri Handayani', posisi: 'PATT', email: 'fitri.handayani@bpjs.go.id', kantorCabang: 'KC Medan', kantorWilayah: 'Kanwil Sumatera Utara', subKategoriSlug: 'patt' },

    // Pegawai - Pegawai Tetap
    { nip: '199005050001', nama: 'Dewi Lestari', posisi: 'Pegawai Tetap', email: 'dewi.lestari@bpjs.go.id', kantorCabang: 'Kantor Pusat', kantorWilayah: 'Kantor Pusat', subKategoriSlug: 'pegawai-tetap' },
    { nip: '199005050002', nama: 'Hendra Kusuma', posisi: 'Pegawai Tetap', email: 'hendra.kusuma@bpjs.go.id', kantorCabang: 'KC Yogyakarta', kantorWilayah: 'Kanwil DIY', subKategoriSlug: 'pegawai-tetap' },

    // Petugas Sentralisasi - Pandawa
    { nip: '199006060001', nama: 'Rina Wulandari', posisi: 'Pandawa', email: 'rina.wulandari@bpjs.go.id', kantorCabang: 'KC Jakarta Utara', kantorWilayah: 'Kanwil DKI Jakarta', subKategoriSlug: 'pandawa' },

    // Petugas Sentralisasi - Senada
    { nip: '199007070001', nama: 'Hendra Wijaya', posisi: 'Senada', email: 'hendra.wijaya@bpjs.go.id', kantorCabang: 'KC Makassar', kantorWilayah: 'Kanwil Sulawesi Selatan', subKategoriSlug: 'senada' },

    // Petugas Sentralisasi - CC165
    { nip: '199008080001', nama: 'Maya Sari', posisi: 'CC165', email: 'maya.sari@bpjs.go.id', kantorCabang: 'Contact Center', kantorWilayah: 'Kantor Pusat', subKategoriSlug: 'cc165' },
    { nip: '199008080002', nama: 'Novi Anggraini', posisi: 'CC165', email: 'novi.anggraini@bpjs.go.id', kantorCabang: 'Contact Center', kantorWilayah: 'Kantor Pusat', subKategoriSlug: 'cc165' }
  ]

  for (const userData of sampleUsers) {
    const subKategori = await prisma.subKategori.findUnique({
      where: { slug: userData.subKategoriSlug }
    })

    if (subKategori) {
      await prisma.user.upsert({
        where: { nip: userData.nip },
        update: {},
        create: {
          nip: userData.nip,
          password: defaultPassword,
          nama: userData.nama,
          email: userData.email,
          posisi: userData.posisi,
          kantorCabang: userData.kantorCabang,
          kantorWilayah: userData.kantorWilayah,
          subKategoriId: subKategori.id
        }
      })
      console.log(`User "${userData.nama}" (${userData.posisi}) created`)
    }
  }

  console.log('\n========================================')
  console.log('Seeding completed!')
  console.log('========================================')
  console.log('\nStruktur Modul:')
  console.log('1. KUPAS TUNTAS - Materi pembelajaran (teks, video, PDF)')
  console.log('2. JITU - Kuesioner dengan 10 soal pilihan ganda')
  console.log('3. DO-CHECK - Review jawaban dengan pembahasan')
  console.log('4. REKAPIN - Rekap progress dan hasil')
  console.log('\nLogin Credentials:')
  console.log('Admin: username=admin, password=admin123')
  console.log('Users: NIP=199001010001 (atau lainnya), password=password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
