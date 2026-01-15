import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Daftar nama depan Indonesia
const namaDepan = [
  // Nama laki-laki
  'Ahmad', 'Budi', 'Cahyo', 'Dedi', 'Eko', 'Fajar', 'Gunawan', 'Hendra', 'Irwan', 'Joko',
  'Kurniawan', 'Lukman', 'Muhammad', 'Nur', 'Oki', 'Prasetyo', 'Qomar', 'Rudi', 'Sugeng', 'Taufik',
  'Umar', 'Viktor', 'Wahyu', 'Yanto', 'Zainal', 'Agus', 'Bambang', 'Candra', 'Dwi', 'Efendi',
  'Firman', 'Gatot', 'Hasan', 'Imam', 'Jumadi', 'Krisna', 'Lutfi', 'Maman', 'Nanang', 'Oscar',
  'Purnomo', 'Ridwan', 'Slamet', 'Teguh', 'Ujang', 'Vino', 'Wawan', 'Yusuf', 'Zaki', 'Andi',
  'Bayu', 'Dimas', 'Faisal', 'Galih', 'Hendri', 'Ivan', 'Jefri', 'Kevin', 'Leo', 'Mario',
  'Nanda', 'Oka', 'Putra', 'Rizki', 'Satrio', 'Tommy', 'Udin', 'Vian', 'Wira', 'Yoga',
  'Arif', 'Bagus', 'Deni', 'Fikri', 'Gilang', 'Hafiz', 'Ilham', 'Jaya', 'Kiki', 'Lingga',
  // Nama perempuan
  'Ani', 'Bunga', 'Citra', 'Dewi', 'Eka', 'Fitri', 'Gita', 'Hesti', 'Indah', 'Juli',
  'Kartini', 'Lina', 'Maya', 'Nina', 'Okta', 'Putri', 'Ratna', 'Sari', 'Tuti', 'Umi',
  'Vina', 'Wati', 'Yuni', 'Zahra', 'Ayu', 'Bella', 'Cantika', 'Dian', 'Elvira', 'Farida',
  'Gina', 'Hana', 'Intan', 'Jelita', 'Kirana', 'Laras', 'Mega', 'Nabila', 'Olga', 'Pipit',
  'Qori', 'Rina', 'Siska', 'Tari', 'Ulfa', 'Vera', 'Widya', 'Yeni', 'Zara', 'Amelia',
  'Bulan', 'Clara', 'Diana', 'Erna', 'Fani', 'Gracia', 'Helena', 'Ira', 'Jasmine', 'Kartika',
  'Lestari', 'Mira', 'Nadia', 'Olivia', 'Paramita', 'Rosita', 'Silvia', 'Tiara', 'Utami', 'Valencia'
];

// Daftar nama belakang Indonesia
const namaBelakang = [
  'Pratama', 'Saputra', 'Wijaya', 'Santoso', 'Kusuma', 'Putra', 'Hidayat', 'Rahman', 'Susanto', 'Setiawan',
  'Hartono', 'Wibowo', 'Nugroho', 'Surya', 'Permana', 'Gunawan', 'Budiman', 'Handoko', 'Suryadi', 'Firmansyah',
  'Hakim', 'Supriyadi', 'Syahputra', 'Prabowo', 'Suryanto', 'Maharani', 'Lestari', 'Anggraini', 'Sari', 'Rahayu',
  'Utami', 'Wardani', 'Kusumaningrum', 'Wulandari', 'Fitriani', 'Andriani', 'Haryanto', 'Cahyono', 'Sutrisno', 'Mulyadi',
  'Suprianto', 'Sudirman', 'Pranata', 'Mahendra', 'Aditya', 'Ramadhan', 'Fadillah', 'Kurniawan', 'Sulistyo', 'Pradipta',
  'Hutapea', 'Siahaan', 'Simanjuntak', 'Nasution', 'Lubis', 'Siregar', 'Harahap', 'Sitorus', 'Panjaitan', 'Simbolon',
  'Manurung', 'Sirait', 'Tambunan', 'Sagala', 'Sinaga', 'Rajagukguk', 'Nadeak', 'Sihombing', 'Silaban', 'Gultom',
  'Abdullah', 'Ibrahim', 'Ismail', 'Malik', 'Fauzi', 'Hamid', 'Hasan', 'Karim', 'Salim', 'Yusuf'
];

// Fungsi untuk mendapatkan nama random
function getRandomName() {
  const depan = namaDepan[Math.floor(Math.random() * namaDepan.length)];
  const belakang = namaBelakang[Math.floor(Math.random() * namaBelakang.length)];
  return `${depan} ${belakang}`;
}

// Fungsi untuk generate nama unik (tidak duplikat)
function generateUniqueNames(count) {
  const usedNames = new Set();
  const names = [];

  while (names.length < count) {
    const name = getRandomName();
    if (!usedNames.has(name)) {
      usedNames.add(name);
      names.push(name);
    }
  }

  return names;
}

async function main() {
  // Get all users (exclude admin)
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' }
  });

  console.log(`Found ${users.length} users to update...`);

  // Generate unique names for all users
  const uniqueNames = generateUniqueNames(users.length);

  // Update each user with a new name
  let updated = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const newName = uniqueNames[i];

    await prisma.user.update({
      where: { id: user.id },
      data: { nama: newName }
    });

    updated++;
    console.log(`Updated: ${user.nama} -> ${newName}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total updated: ${updated} users`);

  // Show sample of updated users
  const sampleUsers = await prisma.user.findMany({
    take: 10,
    include: {
      subKategori: true
    }
  });

  console.log('\nSample updated users:');
  sampleUsers.forEach(u => {
    console.log(`  - ${u.nama} (${u.subKategori?.nama || 'N/A'}) - ${u.kantorWilayah}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
