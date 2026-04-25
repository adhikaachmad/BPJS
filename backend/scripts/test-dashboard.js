// Smoke test for the new /admin/dashboard route logic.
// Runs the same Prisma queries against the restored production DB
// (bpjs_kuesioner_restore) and prints summarised output.
import { PrismaClient } from '../generated/prisma-client/index.js'

const prisma = new PrismaClient()

async function run() {
  const [
    totalUsers, totalKategori, totalPeriode, totalSoal,
    totalTestCompleted, totalMateriCompleted, recentTests
  ] = await Promise.all([
    prisma.user.count(),
    prisma.kategori.count(),
    prisma.periodeTest.count(),
    prisma.soalPeriode.count(),
    prisma.testSessionPeriode.count({ where: { isCompleted: true } }),
    prisma.materiProgressPeriode.count({ where: { isCompleted: true } }),
    prisma.testSessionPeriode.findMany({
      where: { isCompleted: true },
      include: { user: true, periodeTest: true, hasilTest: true },
      orderBy: { endTime: 'desc' },
      take: 10
    })
  ])

  const avgScore = await prisma.hasilTestPeriode.aggregate({ _avg: { skor: true } })

  const subKategoris = await prisma.subKategori.findMany({
    include: { kategori: true, users: true }
  })
  const userProgressBySubKategori = await Promise.all(
    subKategoris.map(async (sk) => {
      const [m, t] = await Promise.all([
        prisma.materiProgressPeriode.groupBy({ by: ['userId'], where: { isCompleted: true, periodeTest: { subKategoriId: sk.id } } }),
        prisma.testSessionPeriode.groupBy({ by: ['userId'], where: { isCompleted: true, periodeTest: { subKategoriId: sk.id } } })
      ])
      return { nama: sk.nama, totalUsers: sk.users.length, completedMateri: m.length, completedTest: t.length }
    })
  )

  const allUsers = await prisma.user.findMany({
    include: { subKategori: { include: { kategori: true } }, kepwil: { select: { id: true, nama: true } } },
    orderBy: { nama: 'asc' },
    take: 5  // limit for test
  })
  const sampleUsersWithProgress = await Promise.all(
    allUsers.map(async (user) => {
      const [c, sess] = await Promise.all([
        prisma.materiProgressPeriode.count({ where: { userId: user.id, isCompleted: true, periodeTest: { subKategoriId: user.subKategoriId } } }),
        prisma.testSessionPeriode.findFirst({
          where: { userId: user.id, isCompleted: true, periodeTest: { subKategoriId: user.subKategoriId } },
          include: { hasilTest: true },
          orderBy: { endTime: 'desc' }
        })
      ])
      return { npp: user.npp, nama: user.nama, materiCompleted: c > 0, testCompleted: !!sess, testScore: sess?.hasilTest?.skor || null }
    })
  )

  const allScores = await prisma.hasilTestPeriode.findMany({ select: { skor: true } })
  const scoreDistribution = {
    'Kurang (0-40)': allScores.filter(s => s.skor <= 40).length,
    'Cukup (41-60)': allScores.filter(s => s.skor > 40 && s.skor <= 60).length,
    'Baik (61-80)': allScores.filter(s => s.skor > 60 && s.skor <= 80).length,
    'Sangat Baik (81-100)': allScores.filter(s => s.skor > 80).length
  }

  console.log('\n=== STATS ===')
  console.log({ totalUsers, totalKategori, totalPeriode, totalSoal, totalTestCompleted, totalMateriCompleted, averageScore: avgScore._avg.skor || 0 })

  console.log('\n=== SUBKATEGORI PROGRESS ===')
  console.table(userProgressBySubKategori)

  console.log('\n=== SAMPLE USER PROGRESS (first 5) ===')
  console.table(sampleUsersWithProgress)

  console.log('\n=== SCORE DISTRIBUTION ===')
  console.log(scoreDistribution)

  console.log('\n=== RECENT TESTS (count) ===')
  console.log(`Total: ${recentTests.length}`)
  if (recentTests.length > 0) {
    console.log('First entry:', {
      user: recentTests[0].user?.nama,
      periode: recentTests[0].periodeTest?.nama,
      skor: recentTests[0].hasilTest?.skor,
      endTime: recentTests[0].endTime
    })
  }

  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
