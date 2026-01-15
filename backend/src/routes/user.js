import bcrypt from 'bcryptjs'

export default async function userRoutes(fastify, options) {
  const { prisma } = fastify

  // Get all users (admin only)
  fastify.get('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { subKategoriId, search, page = 1, limit = 20 } = request.query

    const where = {}

    if (subKategoriId) {
      where.subKategoriId = parseInt(subKategoriId)
    }

    if (search) {
      where.OR = [
        { nip: { contains: search } },
        { nama: { contains: search } },
        { email: { contains: search } }
      ]
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          subKategori: {
            include: { kategori: true }
          },
          _count: { select: { testSessions: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])

    return {
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    }
  })

  // Get user by id
  fastify.get('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        subKategori: {
          include: { kategori: true }
        },
        testSessions: {
          include: {
            modul: true,
            hasilTest: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return user
  })

  // Create user (admin only)
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { nip, nama, email, posisi, kantorCabang, kantorWilayah, password, subKategoriId } = request.body

    if (!nip || !nama || !posisi || !password || !subKategoriId) {
      return reply.status(400).send({ error: 'NIP, nama, posisi, password, and subKategoriId are required' })
    }

    const existing = await prisma.user.findUnique({ where: { nip } })
    if (existing) {
      return reply.status(409).send({ error: 'NIP already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        nip,
        nama,
        email: email || null,
        posisi,
        kantorCabang: kantorCabang || null,
        kantorWilayah: kantorWilayah || null,
        password: hashedPassword,
        subKategoriId: parseInt(subKategoriId)
      },
      include: {
        subKategori: {
          include: { kategori: true }
        }
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  })

  // Update user (admin only)
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { nip, nama, email, posisi, kantorCabang, kantorWilayah, password, subKategoriId } = request.body

    // Check if NIP already exists for other user
    if (nip) {
      const existing = await prisma.user.findFirst({
        where: {
          nip,
          NOT: { id: parseInt(id) }
        }
      })
      if (existing) {
        return reply.status(409).send({ error: 'NIP already exists' })
      }
    }

    // Build update data
    const updateData = {}
    if (nama) updateData.nama = nama
    if (email !== undefined) updateData.email = email || null
    if (posisi) updateData.posisi = posisi
    if (kantorCabang !== undefined) updateData.kantorCabang = kantorCabang || null
    if (kantorWilayah !== undefined) updateData.kantorWilayah = kantorWilayah || null
    if (subKategoriId) updateData.subKategoriId = parseInt(subKategoriId)

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        subKategori: {
          include: { kategori: true }
        }
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  })

  // Delete user (admin only)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    // Check if user has test sessions
    const sessions = await prisma.testSession.count({
      where: { userId: parseInt(id) }
    })

    if (sessions > 0) {
      return reply.status(400).send({
        error: 'Cannot delete user with test history. Please archive instead.'
      })
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'User deleted successfully' }
  })

  // Bulk import users (admin only)
  fastify.post('/bulk-import', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { users, defaultPassword = 'password123' } = request.body

    if (!users || !Array.isArray(users) || users.length === 0) {
      return reply.status(400).send({ error: 'Users array is required' })
    }

    const results = {
      success: [],
      failed: []
    }

    // Hash default password once
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10)

    for (const userData of users) {
      try {
        if (!userData.nip || !userData.nama || !userData.posisi || !userData.subKategoriId) {
          results.failed.push({
            data: userData,
            error: 'Missing required fields (nip, nama, posisi, subKategoriId)'
          })
          continue
        }

        const existing = await prisma.user.findUnique({
          where: { nip: userData.nip }
        })

        if (existing) {
          results.failed.push({
            data: userData,
            error: 'NIP already exists'
          })
          continue
        }

        // Use custom password or default
        const password = userData.password
          ? await bcrypt.hash(userData.password, 10)
          : hashedDefaultPassword

        const user = await prisma.user.create({
          data: {
            nip: userData.nip,
            nama: userData.nama,
            email: userData.email || null,
            posisi: userData.posisi,
            kantorCabang: userData.kantorCabang || null,
            kantorWilayah: userData.kantorWilayah || null,
            password,
            subKategoriId: parseInt(userData.subKategoriId)
          }
        })

        // Remove password from result
        const { password: _, ...userWithoutPassword } = user
        results.success.push(userWithoutPassword)
      } catch (err) {
        results.failed.push({
          data: userData,
          error: err.message
        })
      }
    }

    return {
      total: users.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    }
  })

  // Get user test history by NIP (for self lookup)
  fastify.get('/by-nip/:nip', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { nip } = request.params

    // User can only look up their own data
    if (request.user.role !== 'admin' && request.user.nip !== nip) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const user = await prisma.user.findUnique({
      where: { nip },
      include: {
        subKategori: {
          include: { kategori: true }
        },
        testSessions: {
          where: { isCompleted: true },
          include: {
            modul: true,
            hasilTest: true
          },
          orderBy: { endTime: 'desc' }
        }
      }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return user
  })
}
