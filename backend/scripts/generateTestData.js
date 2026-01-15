import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Tanggal test: 8 Januari 2025
  const testDate = new Date('2025-01-08T09:00:00.000Z');
  const endDate = new Date('2025-01-08T10:00:00.000Z');

  // Get all users
  const users = await prisma.user.findMany({
    include: {
      subKategori: true
    }
  });

  console.log(`Processing ${users.length} users...`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Get JITU modul for user's sub kategori
    const jituModul = await prisma.modul.findFirst({
      where: {
        subKategoriId: user.subKategoriId,
        tipe: 'JITU'
      },
      include: {
        soals: {
          include: {
            opsis: true
          }
        }
      }
    });

    if (!jituModul) {
      console.log(`No JITU modul for ${user.nama}, skipping...`);
      skipped++;
      continue;
    }

    // Check if user already has completed test
    const existingTest = await prisma.testSession.findFirst({
      where: {
        userId: user.id,
        modulId: jituModul.id,
        isCompleted: true
      }
    });

    if (existingTest) {
      console.log(`${user.nama} already has test, skipping...`);
      skipped++;
      continue;
    }

    // Delete any active/incomplete sessions first
    await prisma.testSession.deleteMany({
      where: {
        userId: user.id,
        modulId: jituModul.id,
        isCompleted: false
      }
    });

    // Create soal order (shuffled)
    const soalIds = jituModul.soals.map(s => s.id);
    const shuffledIds = soalIds.sort(() => Math.random() - 0.5);

    // Create test session
    const testSession = await prisma.testSession.create({
      data: {
        userId: user.id,
        modulId: jituModul.id,
        startTime: testDate,
        endTime: endDate,
        isActive: false,
        isCompleted: true,
        soalOrder: JSON.stringify(shuffledIds),
        currentSoal: shuffledIds.length
      }
    });

    // Create jawaban for each soal with random answers
    let benar = 0;
    let salah = 0;

    for (const soal of jituModul.soals) {
      // Random: 70% chance correct answer, 30% wrong
      const isCorrect = Math.random() < 0.7;

      let selectedOpsi;
      if (isCorrect) {
        selectedOpsi = soal.opsis.find(o => o.isCorrect);
      } else {
        const wrongOpsis = soal.opsis.filter(o => !o.isCorrect);
        selectedOpsi = wrongOpsis[Math.floor(Math.random() * wrongOpsis.length)];
      }

      if (!selectedOpsi) {
        selectedOpsi = soal.opsis[0]; // fallback
      }

      await prisma.jawaban.create({
        data: {
          testSessionId: testSession.id,
          soalId: soal.id,
          opsiId: selectedOpsi.id
        }
      });

      if (selectedOpsi.isCorrect) {
        benar++;
      } else {
        salah++;
      }
    }

    // Calculate score
    const totalSoal = jituModul.soals.length;
    const skor = totalSoal > 0 ? (benar / totalSoal) * 100 : 0;

    // Create hasil test
    await prisma.hasilTest.create({
      data: {
        testSessionId: testSession.id,
        totalSoal,
        benar,
        salah,
        skor
      }
    });

    // Also mark materi as completed
    const kupasModul = await prisma.modul.findFirst({
      where: {
        subKategoriId: user.subKategoriId,
        tipe: 'KUPAS_TUNTAS'
      }
    });

    if (kupasModul) {
      await prisma.materiProgress.upsert({
        where: {
          userId_modulId: {
            userId: user.id,
            modulId: kupasModul.id
          }
        },
        update: {
          isCompleted: true,
          completedAt: testDate
        },
        create: {
          userId: user.id,
          modulId: kupasModul.id,
          isCompleted: true,
          completedAt: testDate
        }
      });
    }

    created++;
    console.log(`Created test for ${user.nama}: ${skor.toFixed(1)}% (${benar}/${totalSoal})`);
  }

  console.log('\n=== Summary ===');
  console.log(`Created: ${created} tests`);
  console.log(`Skipped: ${skipped} users`);

  // Show score distribution
  const hasilTests = await prisma.hasilTest.findMany();
  const distribution = {
    'Sangat Baik (81-100)': hasilTests.filter(h => h.skor > 80).length,
    'Baik (61-80)': hasilTests.filter(h => h.skor > 60 && h.skor <= 80).length,
    'Cukup (41-60)': hasilTests.filter(h => h.skor > 40 && h.skor <= 60).length,
    'Kurang (0-40)': hasilTests.filter(h => h.skor <= 40).length
  };

  console.log('\nScore Distribution:');
  Object.entries(distribution).forEach(([label, count]) => {
    console.log(`  ${label}: ${count}`);
  });

  const avgScore = hasilTests.reduce((sum, h) => sum + h.skor, 0) / hasilTests.length;
  console.log(`\nAverage Score: ${avgScore.toFixed(1)}%`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
