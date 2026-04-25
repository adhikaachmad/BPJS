import bcrypt from 'bcryptjs'
import { logAudit } from '../utils/audit.js'

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

// Helper function to get kepwilId filter for ADMIN_KEPWIL
function getKepwilFilter(request) {
  if (request.user.adminRole === ROLES.ADMIN_KEPWIL) {
    return request.user.kepwilId
  }
  return null // No filter for SUPER_ADMIN and ADMIN_KP
}

export default async function adminRoutes(fastify, options) {
  const { prisma } = fastify

  // Get dashboard stats with comprehensive analytics
  // Sourced from PeriodeTest-based tables (TestSessionPeriode, HasilTestPeriode,
  // MateriProgressPeriode, SoalPeriode, MateriPeriode). The legacy Modul/TestSession/
  // HasilTest/MateriProgress tables are no longer the source of truth.
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const [
      totalUsers,
      totalKategori,
      totalPeriode,
      totalSoal,
      totalTestCompleted,
      totalMateriCompleted,
      recentTests
    ] = await Promise.all([
      prisma.user.count(),
      prisma.kategori.count(),
      prisma.periodeTest.count(),
      prisma.soalPeriode.count(),
      prisma.testSessionPeriode.count({ where: { isCompleted: true } }),
      prisma.materiProgressPeriode.count({ where: { isCompleted: true } }),
      prisma.testSessionPeriode.findMany({
        where: { isCompleted: true },
        include: {
          user: true,
          periodeTest: true,
          hasilTest: true
        },
        orderBy: { endTime: 'desc' },
        take: 10
      })
    ])

    // Get average score
    const avgScore = await prisma.hasilTestPeriode.aggregate({
      _avg: { skor: true }
    })

    // Per-subKategori progress: count UNIQUE users who completed at least
    // one MateriPeriode / TestSessionPeriode across any periode in that subKategori.
    const subKategoris = await prisma.subKategori.findMany({
      include: {
        kategori: true,
        users: true
      }
    })

    const userProgressBySubKategori = await Promise.all(
      subKategoris.map(async (sk) => {
        const [completedMateriUsers, completedTestUsers] = await Promise.all([
          prisma.materiProgressPeriode.groupBy({
            by: ['userId'],
            where: {
              isCompleted: true,
              periodeTest: { subKategoriId: sk.id }
            }
          }),
          prisma.testSessionPeriode.groupBy({
            by: ['userId'],
            where: {
              isCompleted: true,
              periodeTest: { subKategoriId: sk.id }
            }
          })
        ])

        return {
          id: sk.id,
          nama: sk.nama,
          kategori: sk.kategori.nama,
          totalUsers: sk.users.length,
          completedMateri: completedMateriUsers.length,
          completedTest: completedTestUsers.length
        }
      })
    )

    // Score distribution (0-40, 41-60, 61-80, 81-100)
    const allScores = await prisma.hasilTestPeriode.findMany({
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

    const testsByDay = await prisma.testSessionPeriode.findMany({
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
        subKategori: { include: { kategori: true } },
        kepwil: { select: { id: true, nama: true } },
        kc: { select: { id: true, nama: true } },
        kakab: { select: { id: true, nama: true } }
      },
      orderBy: { nama: 'asc' }
    })

    // Per-user progress: completed at least one materi / test in any periode
    // belonging to the user's subKategori. Latest score taken from most recent test.
    const usersWithProgress = await Promise.all(
      allUsers.map(async (user) => {
        const [completedMateriCount, latestTestSession] = await Promise.all([
          prisma.materiProgressPeriode.count({
            where: {
              userId: user.id,
              isCompleted: true,
              periodeTest: { subKategoriId: user.subKategoriId }
            }
          }),
          prisma.testSessionPeriode.findFirst({
            where: {
              userId: user.id,
              isCompleted: true,
              periodeTest: { subKategoriId: user.subKategoriId }
            },
            include: { hasilTest: true },
            orderBy: { endTime: 'desc' }
          })
        ])

        return {
          id: user.id,
          npp: user.npp,
          nama: user.nama,
          posisi: user.posisi,
          vendor: user.vendor,
          kepwil: user.kepwil?.nama || null,
          kc: user.kc?.nama || null,
          kakab: user.kakab?.nama || null,
          subKategori: user.subKategori.nama,
          kategori: user.subKategori.kategori.nama,
          materiCompleted: completedMateriCount > 0,
          testCompleted: !!latestTestSession,
          testScore: latestTestSession?.hasilTest?.skor || null
        }
      })
    )

    // Regional Analytics
    const regionals = await prisma.user.groupBy({
      by: ['kepwilId'],
      _count: { id: true }
    })

    // Get kepwil names for the IDs
    const kepwilIds = regionals.filter(r => r.kepwilId).map(r => r.kepwilId)
    const kepwilMap = new Map()
    if (kepwilIds.length > 0) {
      const kepwils = await prisma.kepwil.findMany({ where: { id: { in: kepwilIds } } })
      kepwils.forEach(k => kepwilMap.set(k.id, k.nama))
    }

    // Users per regional
    const usersByRegional = regionals
      .filter(r => r.kepwilId)
      .map(r => ({
        kepwilId: r.kepwilId,
        nama: kepwilMap.get(r.kepwilId) || 'Unknown',
        total: r._count.id
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama))

    // Progress per regional: count UNIQUE users in this kepwil who have any
    // completed materi / test session across the Periode tables.
    const regionalProgress = await Promise.all(
      usersByRegional.map(async (reg) => {
        const [completedMateriUsers, completedTestUsers] = await Promise.all([
          prisma.materiProgressPeriode.groupBy({
            by: ['userId'],
            where: {
              isCompleted: true,
              user: { kepwilId: reg.kepwilId }
            }
          }),
          prisma.testSessionPeriode.groupBy({
            by: ['userId'],
            where: {
              isCompleted: true,
              user: { kepwilId: reg.kepwilId }
            }
          })
        ])

        const completedMateri = completedMateriUsers.length
        const completedTest = completedTestUsers.length

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
        const scores = await prisma.hasilTestPeriode.findMany({
          where: {
            testSessionPeriode: {
              user: { kepwilId: reg.kepwilId }
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
        totalModul: totalPeriode,
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
        kepwilId: true,
        kepwil: { select: { id: true, nama: true } },
        kcId: true,
        kc: { select: { id: true, nama: true } },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    // Flatten kepwil and kc for frontend compatibility
    return admins.map(a => ({
      ...a,
      kepwil: a.kepwil?.nama || null,
      kc: a.kc?.nama || null
    }))
  })

  // Create new admin - SUPER_ADMIN & ADMIN_KP only
  fastify.post('/create', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { username, password, nama, role, kepwilId, kcId } = request.body
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

    // ADMIN_KEPWIL must have kepwilId
    if (role === ROLES.ADMIN_KEPWIL && !kepwilId) {
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
        kepwilId: role === ROLES.ADMIN_KEPWIL ? parseInt(kepwilId) : null,
        kcId: kepwilId ? (kcId ? parseInt(kcId) : null) : null
      },
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
        kepwilId: true,
        kepwil: { select: { id: true, nama: true } },
        kcId: true,
        kc: { select: { id: true, nama: true } },
        createdAt: true
      }
    })

    logAudit(prisma, request, 'ADMIN_CREATE', { target: 'admin', targetId: admin.id, details: { username: admin.username, role: admin.role } })
    return { ...admin, kepwil: admin.kepwil?.nama || null, kc: admin.kc?.nama || null }
  })

  // Update admin - SUPER_ADMIN & ADMIN_KP only
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN, ROLES.ADMIN_KP)]
  }, async (request, reply) => {
    const { id } = request.params
    const { nama, password, role, kepwilId, kcId } = request.body
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

    // ADMIN_KEPWIL must have kepwilId
    if (role === ROLES.ADMIN_KEPWIL && !kepwilId) {
      return reply.status(400).send({ error: 'Kepwil wajib diisi untuk Admin Kepwil' })
    }

    const data = {
      nama,
      role,
      kepwilId: role === ROLES.ADMIN_KEPWIL ? parseInt(kepwilId) : null,
      kcId: kepwilId ? (kcId ? parseInt(kcId) : null) : null
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
        kepwilId: true,
        kepwil: { select: { id: true, nama: true } },
        kcId: true,
        kc: { select: { id: true, nama: true } },
        createdAt: true
      }
    })

    // If password changed, force re-login on all the target admin's existing sessions.
    if (password) {
      await prisma.admin.update({ where: { id: adminId }, data: { tokensInvalidBefore: new Date() } })
    }

    logAudit(prisma, request, 'ADMIN_UPDATE', {
      target: 'admin', targetId: adminId,
      details: { username: admin.username, newRole: admin.role, passwordChanged: !!password }
    })
    return { ...admin, kepwil: admin.kepwil?.nama || null, kc: admin.kc?.nama || null }
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

    logAudit(prisma, request, 'ADMIN_DELETE', { target: 'admin', targetId: adminId, details: { username: targetAdmin.username, role: targetAdmin.role } })
    return { message: 'Admin berhasil dihapus' }
  })

  // View audit log — SUPER_ADMIN only.
  // Filters: ?action=LOGIN_FAIL&actorType=admin&actorId=5&target=user&since=2026-04-01&limit=100
  fastify.get('/audit-log', {
    preHandler: [fastify.authenticateAdmin, checkRole(ROLES.SUPER_ADMIN)]
  }, async (request, reply) => {
    const { action, actorType, actorId, target, targetId, since, until } = request.query
    const limit = Math.min(parseInt(request.query.limit) || 100, 500)
    const offset = parseInt(request.query.offset) || 0

    const where = {}
    if (action) where.action = action
    if (actorType) where.actorType = actorType
    if (actorId) where.actorId = parseInt(actorId)
    if (target) where.target = target
    if (targetId) where.targetId = parseInt(targetId)
    if (since || until) {
      where.createdAt = {}
      if (since) where.createdAt.gte = new Date(since)
      if (until) where.createdAt.lte = new Date(until)
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.auditLog.count({ where })
    ])
    return { total, limit, offset, items }
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

    // ADMIN_KEPWIL only sees results from users in their own Kepwil.
    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId) {
      where.user = { ...(where.user || {}), kepwilId: adminKepwilId }
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

  // Get all test results (combined: old TestSession + new TestSessionPeriode)
  fastify.get('/results-all', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { kategoriId, subKategoriId, periodeBulan, periodeTahun, page = 1, limit = 20 } = request.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    // Build where clause for periode results
    const periodeWhere = { isCompleted: true }
    if (subKategoriId) {
      periodeWhere.periodeTest = { subKategoriId: parseInt(subKategoriId) }
    } else if (kategoriId) {
      periodeWhere.periodeTest = { subKategori: { kategoriId: parseInt(kategoriId) } }
    }
    if (periodeBulan || periodeTahun) {
      periodeWhere.periodeTest = periodeWhere.periodeTest || {}
      if (periodeBulan) periodeWhere.periodeTest.bulan = parseInt(periodeBulan)
      if (periodeTahun) periodeWhere.periodeTest.tahun = parseInt(periodeTahun)
    }

    // Filter for ADMIN_KEPWIL
    if (request.user.adminRole === 'ADMIN_KEPWIL' && request.user.kepwilId) {
      periodeWhere.user = { kepwilId: request.user.kepwilId }
    }

    const [total, periodeResults] = await Promise.all([
      prisma.testSessionPeriode.count({ where: periodeWhere }),
      prisma.testSessionPeriode.findMany({
        where: periodeWhere,
        include: {
          user: {
            include: {
              kepwil: { select: { id: true, nama: true } },
              kc: { select: { id: true, nama: true } },
              kakab: { select: { id: true, nama: true } },
              subKategori: { include: { kategori: true } }
            }
          },
          periodeTest: {
            include: {
              subKategori: { include: { kategori: true } }
            }
          },
          hasilTest: true
        },
        orderBy: { endTime: 'desc' },
        skip,
        take
      })
    ])

    // Normalize data format
    const data = periodeResults.map(r => ({
      id: r.id,
      type: 'periode',
      user: {
        id: r.user.id,
        npp: r.user.npp,
        nama: r.user.nama,
        vendor: r.user.vendor,
        posisi: r.user.posisi,
        kepwil: r.user.kepwil?.nama || null,
        kc: r.user.kc?.nama || null,
        kakab: r.user.kakab?.nama || null
      },
      subKategori: r.periodeTest.subKategori?.nama || null,
      kategori: r.periodeTest.subKategori?.kategori?.nama || null,
      periode: r.periodeTest.nama,
      hasilTest: r.hasilTest ? {
        totalSoal: r.hasilTest.totalSoal,
        benar: r.hasilTest.benar,
        salah: r.hasilTest.salah,
        skor: r.hasilTest.skor
      } : null,
      materiCompleted: null,
      startTime: r.startTime,
      endTime: r.endTime
    }))

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
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

    // ADMIN_KEPWIL may only reset tests for users inside their own Kepwil.
    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { kepwilId: true }
      })
      if (!targetUser || targetUser.kepwilId !== adminKepwilId) {
        return reply.status(403).send({ error: 'User berada di luar Kepwil Anda.' })
      }
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

    const existing = await prisma.materi.findUnique({ where: { id: parseInt(id) } })
    if (!existing) {
      return reply.status(404).send({ error: 'Materi tidak ditemukan' })
    }

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

    const existing = await prisma.materi.findUnique({ where: { id: parseInt(id) } })
    if (!existing) {
      return reply.status(404).send({ error: 'Materi tidak ditemukan' })
    }

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
