import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const provinsiList = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Bengkulu',
  'Lampung',
  'Kepulauan Bangka Belitung',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'Daerah Istimewa Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Sulawesi Tengah',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Gorontalo',
  'Sulawesi Barat',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya'
];

async function main() {
  // Update existing users with old Regional format to new province names
  const oldUsers = await prisma.user.findMany({
    where: {
      kantorWilayah: {
        startsWith: 'Regional'
      }
    }
  });

  // Map old regional to random provinces
  const regionalMapping = {
    'Regional I': 'Aceh',
    'Regional II': 'Sumatera Utara',
    'Regional III': 'Sumatera Barat',
    'Regional IV': 'DKI Jakarta',
    'Regional V': 'Jawa Barat',
    'Regional VI': 'Jawa Tengah',
    'Regional VII': 'Jawa Timur',
    'Regional VIII': 'Kalimantan Timur',
    'Regional IX': 'Sulawesi Selatan',
    'Regional X': 'Bali',
    'Regional XI': 'Sulawesi Utara',
    'Regional XII': 'Papua',
    'Regional XIII': 'Lampung'
  };

  let updated = 0;
  for (const user of oldUsers) {
    const newProvinsi = regionalMapping[user.kantorWilayah] || 'DKI Jakarta';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        kantorWilayah: newProvinsi,
        kantorCabang: 'KC ' + newProvinsi,
        nama: user.posisi + ' ' + newProvinsi
      }
    });
    updated++;
  }
  console.log(`Updated ${updated} users from old Regional format to province names`);

  // Get all sub kategoris
  const subKategoris = await prisma.subKategori.findMany();
  const password = await bcrypt.hash('password123', 10);

  let count = 0;

  // Create users for each province and each position
  for (let i = 0; i < provinsiList.length; i++) {
    const provinsi = provinsiList[i];

    for (const sub of subKategoris) {
      // Check if user already exists
      const existing = await prisma.user.findFirst({
        where: {
          kantorWilayah: provinsi,
          subKategoriId: sub.id
        }
      });

      if (!existing) {
        const provIdx = String(i + 1).padStart(2, '0');
        const subIdx = String(sub.id).padStart(2, '0');
        const uniqueNip = '2024' + provIdx + subIdx + '001';

        // Check if NIP already exists
        const nipExists = await prisma.user.findUnique({ where: { nip: uniqueNip } });
        const finalNip = nipExists ? '2024' + provIdx + subIdx + String(Date.now()).slice(-3) : uniqueNip;

        await prisma.user.create({
          data: {
            nip: finalNip,
            nama: sub.nama + ' ' + provinsi,
            password: password,
            posisi: sub.nama,
            kantorWilayah: provinsi,
            kantorCabang: 'KC ' + provinsi,
            subKategoriId: sub.id
          }
        });
        count++;
      }
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${provinsiList.length} provinces processed...`);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Added', count, 'new users');
  const total = await prisma.user.count();
  console.log('Total users now:', total);

  // Show distribution
  const distribution = await prisma.user.groupBy({
    by: ['kantorWilayah'],
    _count: { id: true },
    orderBy: { kantorWilayah: 'asc' }
  });
  console.log('\nUsers per province:');
  distribution.forEach(d => {
    if (d.kantorWilayah) {
      console.log(`  ${d.kantorWilayah}: ${d._count.id}`);
    }
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
