import bcrypt from 'bcryptjs'

// Role constants
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_KP: 'ADMIN_KP',
  ADMIN_KEPWIL: 'ADMIN_KEPWIL'
}

// Helper function to check if admin has required role
function checkRole(...allowedRoles) {
  return async (request, reply) => {
    const adminRole = request.user.adminRole
    if (!allowedRoles.includes(adminRole)) {
      return reply.status(403).send({
        error: 'Akses ditolak. Anda tidak memiliki izin untuk fitur ini.',
        requiredRoles: allowedRoles,
        yourRole: adminRole
      })
    }
  }
}

// Helper function to get kepwil filter for ADMIN_KEPWIL
function getKepwilFilter(request) {
  if (request.user.adminRole === ROLES.ADMIN_KEPWIL) {
    return request.user.kepwil
  }
  return null // No filter for SUPER_ADMIN and ADMIN_KP
}

export default async function adminRoutes(fastify, options) {
  const { prisma } = fastify

  // Get dashboard stats with comprehensive analytics
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const [
      totalUsers,
      totalKategori,
      totalModul,
      totalSoal,
      totalTestCompleted,
      totalMateriCompleted,
      recentTests
    ] = await Promise.all([
      prisma.user.count(),
      prisma.kategori.count(),
      prisma.modul.count(),
      prisma.soal.count(),
      prisma.testSession.count({ where: { isCompleted: true } }),
      prisma.materiProgress.count({ where: { isCompleted: true } }),
      prisma.testSession.findMany({
        where: { isCompleted: true },
        include: {
          user: true,
          modul: true,
          hasilTest: true
        },
        orderBy: { endTime: 'desc' },
        take: 10
      })
    ])

    // Get average score
    const avgScore = await prisma.hasilTest.aggregate({
      _avg: { skor: true }
    })

    // Get users per sub-kategori with progress
    const subKategoris = await prisma.subKategori.findMany({
      include: {
        kategori: true,
        users: true,
        moduls: {
          where: { tipe: 'KUPAS_TUNTAS' }
        }
      }
    })

    // Build user progress data per sub-kategori
    const userProgressBySubKategori = await Promise.all(
      subKategoris.map(async (sk) => {
        const kupasModul = sk.moduls[0]
        let completedMateri = 0
        let completedTest = 0

        if (kupasModul) {
          completedMateri = await prisma.materiProgress.count({
            where: {
              modulId: kupasModul.id,
              isCompleted: true
            }
          })
        }

        // Get JITU modul for this sub-kategori
        const jituModul = await prisma.modul.findFirst({
          where: {
            subKategoriId: sk.id,
            tipe: 'JITU'
          }
        })

        if (jituModul) {
          completedTest = await prisma.testSession.count({
            where: {
              modulId: jituModul.id,
              isCompleted: true
            }
          })
        }

        return {
          id: sk.id,
          nama: sk.nama,
          kategori: sk.kategori.nama,
          totalUsers: sk.users.length,
          completedMateri,
          completedTest
        }
      })
    )

    // Score distribution (0-40, 41-60, 61-80, 81-100)
    const allScores = await prisma.hasilTest.findMany({
      select: { skor: true }
    })

    const scoreDistribution = {
      'Kurang (0-40)': allScores.filter(s => s.skor <= 40).length,
      'Cukup (41-60)': allScores.filter(s => s.skor > 40 && s.skor <= 60).length,
      'Baik (61-80)': allScores.filter(s => s.skor > 60 && s.skor <= 80).length,
      'Sangat Baik (81-100)': allScores.filter(s => s.skor > 80).length
    }

    // Test completion trend (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const testsByDay = await prisma.testSession.findMany({
      where: {
        isCompleted: true,
        endTime: { gte: sevenDaysAgo }
      },
      select: { endTime: true }
    })

    // Group by day
    const dailyTests = {}
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const key = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      dailyTests[key] = 0
    }

    testsByDay.forEach(test => {
      const key = new Date(test.endTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      if (dailyTests[key] !== undefined) {
        dailyTests[key]++
      }
    })

    // Users per kategori
    const usersPerKategori = await prisma.kategori.findMany({
      include: {
        subKategoris: {
          include: {
            _count: { select: { users: true } }
          }
        }
      }
    })

    const usersByKategori = usersPerKategori.map(k => ({
      nama: k.nama,
      total: k.subKategoris.reduce((sum, sk) => sum + sk._count.users, 0)
    }))

    // All users with their progress status
    const allUsers = await prisma.user.findMany({
      include: {
        subKategori: {
          include: { kategori: true }
        }
      },
      orderBy: { nama: 'asc' }
    })

    // Get progress for each user
    const usersWithProgress = await Promise.all(
      allUsers.map(async (user) => {
        // Get KUPAS_TUNTAS modul for user's sub-kategori
        const kupasModul = await prisma.modul.findFirst({
          where: {
            subKategoriId: user.subKategoriId,
            tipe: 'KUPAS_TUNTAS'
          }
        })

        // Get JITU modul
        const jituModul = await prisma.modul.findFirst({
          where: {
            subKategoriId: user.subKategoriId,
            tipe: 'JITU'
          }
        })

        let materiCompleted = false
        let testCompleted = false
        let testScore = null

        if (kupasModul) {
          const progress = await prisma.materiProgress.findUnique({
            where: {
              userId_modulId: {
                userId: user.id,
                modulId: kupasModul.id
              }
            }
          })
          materiCompleted = progress?.isCompleted || false
        }

        if (jituModul) {
          const testSession = await prisma.testSession.findFirst({
            where: {
              userId: user.id,
              modulId: jituModul.id,
              isCompleted: true
            },
            include: { hasilTest: true },
            orderBy: { endTime: 'desc' }
          })
          testCompleted = !!testSession
          testScore = testSession?.hasilTest?.skor || null
        }

        return {
          id: user.id,
          npp: user.npp,
          nama: user.nama,
          posisi: user.posisi,
          vendor: user.vendor,
          kepwil: user.kepwil,
          subKategori: user.subKategori.nama,
          kategori: user.subKategori.kategori.nama,
          materiCompleted,
          testCompleted,
          testScore
        }
      })
    )

    // Regional Analytics
    const regionals = await prisma.user.groupBy({
      by: ['kepwil'],
      _count: { id: true }
    })

    // Users per regional
    const usersByRegional = regionals
      .filter(r => r.kepwil)
      .map(r => ({
        nama: r.kepwil,
        total: r._count.id
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama))

    // Progress per regional
    const regionalProgress = await Promise.all(
      usersByRegional.map(async (reg) => {
        const usersInRegional = await prisma.user.findMany({
          where: { kepwil: reg.nama },
          select: { id: true, subKategoriId: true }
        })

        let completedMateri = 0
        let completedTest = 0

        for (const user of usersInRegional) {
          // Check KUPAS_TUNTAS progress
          const kupasModul = await prisma.modul.findFirst({
            where: { subKategoriId: user.subKategoriId, tipe: 'KUPAS_TUNTAS' }
          })
          if (kupasModul) {
            const progress = await prisma.materiProgress.findUnique({
              where: { userId_modulId: { userId: user.id, modulId: kupasModul.id } }
            })
            if (progress?.isCompleted) completedMateri++
          }

          // Check JITU test
          const jituModul = await prisma.modul.findFirst({
            where: { subKategoriId: user.subKategoriId, tipe: 'JITU' }
          })
          if (jituModul) {
            const testSession = await prisma.testSession.findFirst({
              where: { userId: user.id, modulId: jituModul.id, isCompleted: true }
            })
            if (testSession) completedTest++
          }
        }

        return {
          nama: reg.nama,
          totalUsers: reg.total,
          completedMateri,
          completedTest,
          materiPercentage: reg.total > 0 ? Math.round((completedMateri / reg.total) * 100) : 0,
          testPercentage: reg.total > 0 ? Math.round((completedTest / reg.total) * 100) : 0
        }
      })
    )

    // Average score per regional
    const regionalScores = await Promise.all(
      usersByRegional.map(async (reg) => {
        const usersInRegional = await prisma.user.findMany({
          where: { kepwil: reg.nama },
          select: { id: true }
        })
        const userIds = usersInRegional.map(u => u.id)

        const scores = await prisma.hasilTest.findMany({
          where: {
            testSession: {
              userId: { in: userIds }
            }
          },
          select: { skor: true }
        })

        const avgScore = scores.length > 0
          ? scores.reduce((sum, s) => sum + s.skor, 0) / scores.length
          : 0

        return {
          nama: reg.nama,
          avgScore: parseFloat(avgScore.toFixed(1)),
          totalUsers: reg.total,
          totalTests: scores.length
        }
      })
    )

    return {
      stats: {
        totalUsers,
        totalKategori,
        totalModul,
        totalSoal,
        totalTestCompleted,
        totalMateriCompleted,
        averageScore: avgScore._avg.skor || 0
      },
      recentTests,
      charts: {
        userProgressBySubKategori,
        scoreDistribution,
        dailyTests,
        usersByKategori,
        usersByRegional,
        regionalProgress,
        regionalScores
      },
      usersWithProgress
    }
  })

  // Get all admins - SUPER_ADMIN & ADMIN_KP only
  fastify.get('/list', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const adminRole = request.user.adminRole

    // Build where clause based on role
    let whereClause = {}
    if (adminRole === ROLES.ADMIN_KP) {
      // Admin KP can only see ADMIN_KP and ADMIN_KEPWIL
      whereClause = {
        role: { in: [ROLES.ADMIN_KP, ROLES.ADMIN_KEPWIL] }
      }
    }
    // SUPER_ADMIN can see all

    const admins = await prisma.admin.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
        kepwil: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return admins
  })

  // Create new admin - SUPER_ADMIN & ADMIN_KP only
  fastify.post('/create', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { username, password, nama, role, kepwil } = request.body
    const adminRole = request.user.adminRole

    if (!username || !password || !nama) {
      return reply.status(400).send({ error: 'Username, password, dan nama wajib diisi' })
    }

    // Validate role
    const validRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN_KP, ROLES.ADMIN_KEPWIL]
    if (role && !validRoles.includes(role)) {
      return reply.status(400).send({ error: 'Role tidak valid' })
    }

    // ADMIN_KP cannot create SUPER_ADMIN
    if (adminRole === ROLES.ADMIN_KP && role === ROLES.SUPER_ADMIN) {
      return reply.status(403).send({ error: 'Anda tidak dapat membuat Super Admin' })
    }

    // ADMIN_KEPWIL must have kepwil
    if (role === ROLES.ADMIN_KEPWIL && !kepwil) {
      return reply.status(400).send({ error: 'Kepwil wajib diisi untuk Admin Kepwil' })
    }

    const existing = await prisma.admin.findUnique({ where: { username } })
    if (existing) {
      return reply.status(409).send({ error: 'Username sudah digunakan' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        nama,
        role: role || ROLES.ADMIN_KP,
        kepwil: role === ROLES.ADMIN_KEPWIL ? kepwil : null
      },
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
        kepwil: true,
        createdAt: true
      }
    })

    return admin
  })

  // Update admin - SUPER_ADMIN & ADMIN_KP only
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { id } = request.params
    const { nama, password, role, kepwil } = request.body
    const adminRole = request.user.adminRole
    const adminId = parseInt(id)

    // Get target admin
    const targetAdmin = await prisma.admin.findUnique({
      where: { id: adminId }
    })

    if (!targetAdmin) {
      return reply.status(404).send({ error: 'Admin tidak ditemukan' })
    }

    // ADMIN_KP cannot edit SUPER_ADMIN
    if (adminRole === ROLES.ADMIN_KP && targetAdmin.role === ROLES.SUPER_ADMIN) {
      return reply.status(403).send({ error: 'Anda tidak dapat mengubah Super Admin' })
    }

    // ADMIN_KP cannot promote to SUPER_ADMIN
    if (adminRole === ROLES.ADMIN_KP && role === ROLES.SUPER_ADMIN) {
      return reply.status(403).send({ error: 'Anda tidak dapat mengubah role menjadi Super Admin' })
    }

    // ADMIN_KEPWIL must have kepwil
    if (role === ROLES.ADMIN_KEPWIL && !kepwil) {
      return reply.status(400).send({ error: 'Kepwil wajib diisi untuk Admin Kepwil' })
    }

    const data = {
      nama,
      role,
      kepwil: role === ROLES.ADMIN_KEPWIL ? kepwil : null
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    const admin = await prisma.admin.update({
      where: { id: adminId },
      data,
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
        kepwil: true,
        createdAt: true
      }
    })

    return admin
  })

  // Delete admin - SUPER_ADMIN & ADMIN_KP only
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { id } = request.params
    const adminId = parseInt(id)
    const adminRole = request.user.adminRole

    // Prevent deleting self
    if (request.user.id === adminId) {
      return reply.status(400).send({ error: 'Tidak dapat menghapus diri sendiri' })
    }

    // Get target admin
    const targetAdmin = await prisma.admin.findUnique({
      where: { id: adminId }
    })

    if (!targetAdmin) {
      return reply.status(404).send({ error: 'Admin tidak ditemukan' })
    }

    // ADMIN_KP cannot delete SUPER_ADMIN
    if (adminRole === ROLES.ADMIN_KP && targetAdmin.role === ROLES.SUPER_ADMIN) {
      return reply.status(403).send({ error: 'Anda tidak dapat menghapus Super Admin' })
    }

    await prisma.admin.delete({
      where: { id: adminId }
    })

    return { message: 'Admin berhasil dihapus' }
  })

  // Get all test results with filters
  fastify.get('/results', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { kategoriId, subKategoriId, modulId, startDate, endDate, page = 1, limit = 20 } = request.query

    const where = {
      isCompleted: true
    }

    if (modulId) {
      where.modulId = parseInt(modulId)
    } else if (subKategoriId) {
      where.modul = { subKategoriId: parseInt(subKategoriId) }
    } else if (kategoriId) {
      where.modul = { subKategori: { kategoriId: parseInt(kategoriId) } }
    }

    if (startDate || endDate) {
      where.endTime = {}
      if (startDate) where.endTime.gte = new Date(startDate)
      if (endDate) where.endTime.lte = new Date(endDate)
    }

    const [total, results] = await Promise.all([
      prisma.testSession.count({ where }),
      prisma.testSession.findMany({
        where,
        include: {
          user: true,
          modul: {
            include: {
              subKategori: {
                include: { kategori: true }
              }
            }
          },
          hasilTest: true
        },
        orderBy: { endTime: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])

    // Get materi progress for each user
    const resultsWithProgress = await Promise.all(
      results.map(async (result) => {
        // Find KUPAS_TUNTAS modul for this sub-kategori
        const kupasModul = await prisma.modul.findFirst({
          where: {
            subKategoriId: result.modul.subKategoriId,
            tipe: 'KUPAS_TUNTAS'
          }
        })

        let materiProgress = null
        if (kupasModul) {
          materiProgress = await prisma.materiProgress.findUnique({
            where: {
              userId_modulId: {
                userId: result.userId,
                modulId: kupasModul.id
              }
            }
          })
        }

        return {
          ...result,
          materiProgress: materiProgress ? {
            isCompleted: materiProgress.isCompleted,
            completedAt: materiProgress.completedAt
          } : null,
          kupasModulName: kupasModul?.nama || null
        }
      })
    )

    return {
      data: resultsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    }
  })

  // Reset user test (allow retake)
  fastify.post('/reset-test', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { userId, modulId } = request.body

    if (!userId || !modulId) {
      return reply.status(400).send({ error: 'UserId and modulId are required' })
    }

    // Deactivate all sessions for this user and modul
    await prisma.testSession.updateMany({
      where: {
        userId: parseInt(userId),
        modulId: parseInt(modulId)
      },
      data: {
        isActive: false
      }
    })

    return { message: 'Test reset successfully' }
  })

  // ===============================
  // SCHEDULING MANAGEMENT - SUPER_ADMIN & ADMIN_KP only
  // ===============================

  // Get all moduls with scheduling info for a sub-kategori
  fastify.get('/scheduling/:subKategoriId', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { subKategoriId } = request.params

    const moduls = await prisma.modul.findMany({
      where: { subKategoriId: parseInt(subKategoriId) },
      orderBy: { urutan: 'asc' }
    })

    return moduls
  })

  // Update JITU scheduling
  fastify.put('/scheduling/jitu/:modulId', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { modulId } = request.params
    const { isScheduled, jadwalMulai, jadwalSelesai } = request.body

    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul tidak ditemukan' })
    }

    if (modul.tipe !== 'JITU') {
      return reply.status(400).send({ error: 'Modul bukan tipe JITU' })
    }

    const updated = await prisma.modul.update({
      where: { id: parseInt(modulId) },
      data: {
        isScheduled: isScheduled || false,
        jadwalMulai: jadwalMulai ? new Date(jadwalMulai) : null,
        jadwalSelesai: jadwalSelesai ? new Date(jadwalSelesai) : null
      }
    })

    return {
      message: 'Jadwal JITU berhasil diperbarui',
      modul: updated
    }
  })

  // Update DO-CHECK publish time
  fastify.put('/scheduling/docheck/:modulId', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { modulId } = request.params
    const { publishDoCheck } = request.body

    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul tidak ditemukan' })
    }

    if (modul.tipe !== 'DO_CHECK') {
      return reply.status(400).send({ error: 'Modul bukan tipe DO-CHECK' })
    }

    const updated = await prisma.modul.update({
      where: { id: parseInt(modulId) },
      data: {
        publishDoCheck: publishDoCheck ? new Date(publishDoCheck) : null
      }
    })

    return {
      message: 'Jadwal publish DO-CHECK berhasil diperbarui',
      modul: updated
    }
  })

  // Get scheduling overview for all sub-kategoris
  fastify.get('/scheduling-overview', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const subKategoris = await prisma.subKategori.findMany({
      include: {
        kategori: true,
        moduls: {
          where: {
            tipe: { in: ['JITU', 'DO_CHECK'] }
          },
          orderBy: { tipe: 'asc' }
        }
      },
      orderBy: [
        { kategori: { nama: 'asc' } },
        { nama: 'asc' }
      ]
    })

    return subKategoris.map(sk => ({
      id: sk.id,
      nama: sk.nama,
      kategori: sk.kategori.nama,
      jituModul: sk.moduls.find(m => m.tipe === 'JITU'),
      docheckModul: sk.moduls.find(m => m.tipe === 'DO_CHECK')
    }))
  })

  // ===============================
  // MATERI MANAGEMENT - SUPER_ADMIN & ADMIN_KP only
  // ===============================

  // Get all materi for a modul
  fastify.get('/materi/modul/:modulId', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { modulId } = request.params

    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) },
      include: {
        materis: {
          orderBy: { urutan: 'asc' }
        },
        subKategori: {
          include: { kategori: true }
        }
      }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul tidak ditemukan' })
    }

    return modul
  })

  // Create materi
  fastify.post('/materi', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { modulId, judul, konten, videoUrl, pdfUrl, urutan } = request.body

    if (!modulId || !judul) {
      return reply.status(400).send({ error: 'ModulId dan judul wajib diisi' })
    }

    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul tidak ditemukan' })
    }

    if (modul.tipe !== 'KUPAS_TUNTAS') {
      return reply.status(400).send({ error: 'Materi hanya bisa ditambahkan ke modul KUPAS TUNTAS' })
    }

    // Get max urutan
    const maxUrutan = await prisma.materi.aggregate({
      where: { modulId: parseInt(modulId) },
      _max: { urutan: true }
    })

    const materi = await prisma.materi.create({
      data: {
        modulId: parseInt(modulId),
        judul,
        konten: konten || '',
        videoUrl,
        pdfUrl,
        urutan: urutan || (maxUrutan._max.urutan || 0) + 1
      }
    })

    return materi
  })

  // Update materi
  fastify.put('/materi/:id', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { id } = request.params
    const { judul, konten, videoUrl, pdfUrl, urutan } = request.body

    const materi = await prisma.materi.update({
      where: { id: parseInt(id) },
      data: { judul, konten, videoUrl, pdfUrl, urutan }
    })

    return materi
  })

  // Delete materi
  fastify.delete('/materi/:id', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { id } = request.params

    await prisma.materi.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'Materi berhasil dihapus' }
  })

  // Reorder materi
  fastify.put('/materi/reorder/:modulId', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { modulId } = request.params
    const { order } = request.body // Array of { id, urutan }

    if (!order || !Array.isArray(order)) {
      return reply.status(400).send({ error: 'Order harus berupa array' })
    }

    for (const item of order) {
      await prisma.materi.update({
        where: { id: item.id },
        data: { urutan: item.urutan }
      })
    }

    return { message: 'Urutan materi berhasil diperbarui' }
  })

  // ===============================
  // SUB-KATEGORI ACCESS MANAGEMENT - SUPER_ADMIN only
  // ===============================

  // Get all sub-kategoris with access status (grouped by kategori)
  fastify.get('/sub-kategori-access', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN)]
  }, async (request, reply) => {
    const kategoris = await prisma.kategori.findMany({
      include: {
        subKategoris: {
          orderBy: { nama: 'asc' },
          include: {
            _count: {
              select: { users: true }
            }
          }
        }
      },
      orderBy: { nama: 'asc' }
    })

    return kategoris
  })

  // Toggle sub-kategori access (on/off) - SUPER_ADMIN only
  fastify.put('/sub-kategori/:id/toggle-access', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN)]
  }, async (request, reply) => {
    const { id } = request.params
    const { isActive } = request.body

    const subKategori = await prisma.subKategori.findUnique({
      where: { id: parseInt(id) }
    })

    if (!subKategori) {
      return reply.status(404).send({ error: 'Sub kategori tidak ditemukan' })
    }

    const updated = await prisma.subKategori.update({
      where: { id: parseInt(id) },
      data: { isActive: isActive }
    })

    return {
      message: `Akses ${updated.nama} berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
      subKategori: updated
    }
  })

  // Bulk update sub-kategori access - SUPER_ADMIN only
  fastify.put('/sub-kategori/bulk-access', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN)]
  }, async (request, reply) => {
    const { updates } = request.body // Array of { id, isActive }

    if (!updates || !Array.isArray(updates)) {
      return reply.status(400).send({ error: 'Updates harus berupa array' })
    }

    for (const item of updates) {
      await prisma.subKategori.update({
        where: { id: item.id },
        data: { isActive: item.isActive }
      })
    }

    return { message: 'Akses sub kategori berhasil diperbarui' }
  })
}
