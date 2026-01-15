import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const regionalList = [
  { id: 'I', nama: 'Regional I' },
  { id: 'II', nama: 'Regional II' },
  { id: 'III', nama: 'Regional III' },
  { id: 'IV', nama: 'Regional IV' },
  { id: 'V', nama: 'Regional V' },
  { id: 'VI', nama: 'Regional VI' },
  { id: 'VII', nama: 'Regional VII' },
  { id: 'VIII', nama: 'Regional VIII' },
  { id: 'IX', nama: 'Regional IX' },
  { id: 'X', nama: 'Regional X' },
  { id: 'XI', nama: 'Regional XI' },
  { id: 'XII', nama: 'Regional XII' },
  { id: 'XIII', nama: 'Regional XIII' }
];

const romanToNum = {
  'I': '01', 'II': '02', 'III': '03', 'IV': '04', 'V': '05',
  'VI': '06', 'VII': '07', 'VIII': '08', 'IX': '09', 'X': '10',
  'XI': '11', 'XII': '12', 'XIII': '13'
};

async function main() {
  const subKategoris = await prisma.subKategori.findMany();
  const password = await bcrypt.hash('password123', 10);

  let count = 0;

  for (const regional of regionalList) {
    for (const sub of subKategoris) {
      // Check if user already exists for this regional + position combo
      const existing = await prisma.user.findFirst({
        where: {
          kantorWilayah: regional.nama,
          subKategoriId: sub.id
        }
      });

      if (!existing) {
        const regNum = romanToNum[regional.id];
        const uniqueNip = '2024' + regNum + String(sub.id).padStart(2, '0') + '001';

        // Check if NIP already exists
        const nipExists = await prisma.user.findUnique({ where: { nip: uniqueNip } });
        const finalNip = nipExists ? uniqueNip + String(Date.now()).slice(-3) : uniqueNip;

        await prisma.user.create({
          data: {
            nip: finalNip,
            nama: sub.nama + ' ' + regional.nama,
            password: password,
            posisi: sub.nama,
            kantorWilayah: regional.nama,
            kantorCabang: 'KC ' + regional.nama,
            subKategoriId: sub.id
          }
        });
        count++;
        console.log(`Created: ${sub.nama} - ${regional.nama}`);
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log('Added', count, 'new users');
  const total = await prisma.user.count();
  console.log('Total users now:', total);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
