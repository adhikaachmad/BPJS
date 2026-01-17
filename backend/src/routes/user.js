import bcrypt from 'bcryptjs'

// Role constants
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_KP: 'ADMIN_KP',
  ADMIN_KEPWIL: 'ADMIN_KEPWIL'
}

// Helper function to get kepwil filter for ADMIN_KEPWIL
function getKepwilFilter(request) {
  if (request.user.adminRole === ROLES.ADMIN_KEPWIL) {
    return request.user.kepwil
  }
  return null // No filter for SUPER_ADMIN and ADMIN_KP
}

export default async function userRoutes(fastify, options) {
  const { prisma } = fastify

  // Download CSV template for bulk import
  fastify.get('/template/csv', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    // Get all sub kategoris for reference
    const subKategoris = await prisma.subKategori.findMany({
      include: { kategori: true },
      orderBy: { nama: 'asc' }
    })

    // Create CSV header
    const headers = ['npp', 'nama', 'email', 'posisi', 'vendor', 'kepwil', 'kcKabupaten', 'kakabKabupaten', 'subKategoriId', 'password']

    // Create example rows
    const exampleRows = [
      ['199001010001', 'Budi Santoso', 'budi@email.com', 'Satpam', 'PT Vendor ABC', 'DKI Jakarta', 'Kota Jakarta Pusat', 'Kota Jakarta Pusat', '1', ''],
      ['199001010002', 'Siti Rahayu', 'siti@email.com', 'Office Boy', 'PT Vendor XYZ', 'Jawa Barat', 'Kota Bandung', '', '2', ''],
      ['199001010003', 'Ahmad Fauzi', '', 'Driver', '', 'Jawa Timur', 'Kota Surabaya', 'Kabupaten Sidoarjo', '3', 'custompass123']
    ]

    // Build CSV content
    let csv = headers.join(',') + '\n'
    exampleRows.forEach(row => {
      csv += row.map(cell => {
        // Escape cells containing commas or quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return '"' + cell.replace(/"/g, '""') + '"'
        }
        return cell
      }).join(',') + '\n'
    })

    // Add reference section
    csv += '\n'
    csv += '# PANDUAN PENGISIAN\n'
    csv += '# npp: Nomor Pokok Pegawai (wajib unik)\n'
    csv += '# nama: Nama lengkap (wajib)\n'
    csv += '# email: Email (opsional)\n'
    csv += '# posisi: Jabatan/posisi (wajib)\n'
    csv += '# vendor: Nama perusahaan vendor (opsional)\n'
    csv += '# kepwil: Kantor Wilayah/Provinsi (opsional)\n'
    csv += '# kcKabupaten: Kantor Cabang/Kabupaten (opsional)\n'
    csv += '# kakabKabupaten: Kantor Kabupaten (opsional)\n'
    csv += '# subKategoriId: ID Sub Kategori (wajib - lihat daftar di bawah)\n'
    csv += '# password: Password custom (opsional - default: password123)\n'
    csv += '\n'
    csv += '# DAFTAR SUB KATEGORI (subKategoriId)\n'
    subKategoris.forEach(sub => {
      csv += `# ${sub.id} = ${sub.nama} (${sub.kategori.nama})\n`
    })

    reply.header('Content-Type', 'text/csv')
    reply.header('Content-Disposition', 'attachment; filename=template-import-user.csv')
    return reply.send(csv)
  })

  // Bulk import from CSV (parse CSV and import)
  fastify.post('/bulk-import-csv', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { csvData, defaultPassword = 'password123' } = request.body

    if (!csvData || typeof csvData !== 'string') {
      return reply.status(400).send({ error: 'CSV data is required' })
    }

    // Parse CSV
    const lines = csvData.split('\n').filter(line => line.trim() && !line.startsWith('#'))

    if (lines.length < 2) {
      return reply.status(400).send({ error: 'CSV must have header and at least one data row' })
    }

    // Parse header
    const headers = parseCSVLine(lines[0])
    const requiredHeaders = ['npp', 'nama', 'posisi', 'subKategoriId']

    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        return reply.status(400).send({ error: `Missing required column: ${required}` })
      }
    }

    // Parse data rows
    const users = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length === 0 || values.every(v => !v)) continue // Skip empty rows

      const user = {}
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || ''
        if (value) {
          user[header] = value
        }
      })

      // Convert subKategoriId to number
      if (user.subKategoriId) {
        user.subKategoriId = parseInt(user.subKategoriId)
      }

      users.push(user)
    }

    if (users.length === 0) {
      return reply.status(400).send({ error: 'No valid data rows found in CSV' })
    }

    // Process users
    const results = {
      success: [],
      failed: []
    }

    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10)

    for (const userData of users) {
      try {
        if (!userData.npp || !userData.nama || !userData.posisi || !userData.subKategoriId) {
          results.failed.push({
            data: userData,
            error: 'Missing required fields (npp, nama, posisi, subKategoriId)'
          })
          continue
        }

        const existing = await prisma.user.findUnique({
          where: { npp: userData.npp }
        })

        if (existing) {
          results.failed.push({
            data: userData,
            error: 'NPP already exists'
          })
          continue
        }

        // Check if subKategoriId exists
        const subKategori = await prisma.subKategori.findUnique({
          where: { id: userData.subKategoriId }
        })

        if (!subKategori) {
          results.failed.push({
            data: userData,
            error: `SubKategori with ID ${userData.subKategoriId} not found`
          })
          continue
        }

        const password = userData.password
          ? await bcrypt.hash(userData.password, 10)
          : hashedDefaultPassword

        const user = await prisma.user.create({
          data: {
            npp: userData.npp,
            nama: userData.nama,
            email: userData.email || null,
            posisi: userData.posisi,
            vendor: userData.vendor || null,
            kepwil: userData.kepwil || null,
            kcKabupaten: userData.kcKabupaten || null,
            kakabKabupaten: userData.kakabKabupaten || null,
            password,
            subKategoriId: userData.subKategoriId
          }
        })

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

  // Helper function to parse CSV line (handles quoted values)
  function parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)

    return result
  }

  // Get all users (admin only) - filtered by kepwil for ADMIN_KEPWIL
  fastify.get('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { subKategoriId, search, kepwil: filterKepwil, page = 1, limit = 20 } = request.query

    const where = {}

    // Auto-filter by kepwil for ADMIN_KEPWIL
    const adminKepwil = getKepwilFilter(request)
    if (adminKepwil) {
      where.kepwil = adminKepwil
    } else if (filterKepwil) {
      // For SUPER_ADMIN and ADMIN_KP, allow manual filter
      where.kepwil = filterKepwil
    }

    if (subKategoriId) {
      where.subKategoriId = parseInt(subKategoriId)
    }

    if (search) {
      where.OR = [
        { npp: { contains: search } },
        { nama: { contains: search } },
        { email: { contains: search } }
      ]
      // If there's also a kepwil filter, we need to combine them properly
      if (where.kepwil) {
        where.AND = [
          { kepwil: where.kepwil },
          { OR: where.OR }
        ]
        delete where.kepwil
        delete where.OR
      }
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
      },
      // Include admin role info for frontend
      adminRole: request.user.adminRole,
      adminKepwil: adminKepwil
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

    // ADMIN_KEPWIL can only view users in their kepwil
    const adminKepwil = getKepwilFilter(request)
    if (adminKepwil && user.kepwil !== adminKepwil) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke user ini' })
    }

    return user
  })

  // Create user (admin only)
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { npp, nama, email, posisi, vendor, kepwil, kcKabupaten, kakabKabupaten, password, subKategoriId } = request.body

    if (!npp || !nama || !posisi || !password || !subKategoriId) {
      return reply.status(400).send({ error: 'NPP, nama, posisi, password, and subKategoriId are required' })
    }

    // ADMIN_KEPWIL can only create users for their own kepwil
    const adminKepwil = getKepwilFilter(request)
    if (adminKepwil) {
      if (!kepwil || kepwil !== adminKepwil) {
        return reply.status(403).send({ error: 'Anda hanya dapat membuat user untuk wilayah Anda' })
      }
    }

    const existing = await prisma.user.findUnique({ where: { npp } })
    if (existing) {
      return reply.status(409).send({ error: 'NPP already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        npp,
        nama,
        email: email || null,
        posisi,
        vendor: vendor || null,
        kepwil: kepwil || null,
        kcKabupaten: kcKabupaten || null,
        kakabKabupaten: kakabKabupaten || null,
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
    const { npp, nama, email, posisi, vendor, kepwil, kcKabupaten, kakabKabupaten, password, subKategoriId } = request.body

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingUser) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    // ADMIN_KEPWIL can only update users in their kepwil
    const adminKepwil = getKepwilFilter(request)
    if (adminKepwil && existingUser.kepwil !== adminKepwil) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses untuk mengubah user ini' })
    }

    // ADMIN_KEPWIL cannot change user's kepwil to another kepwil
    if (adminKepwil && kepwil !== undefined && kepwil !== adminKepwil) {
      return reply.status(403).send({ error: 'Anda tidak dapat memindahkan user ke wilayah lain' })
    }

    // Check if NPP already exists for other user
    if (npp) {
      const existing = await prisma.user.findFirst({
        where: {
          npp,
          NOT: { id: parseInt(id) }
        }
      })
      if (existing) {
        return reply.status(409).send({ error: 'NPP already exists' })
      }
    }

    // Build update data
    const updateData = {}
    if (nama) updateData.nama = nama
    if (email !== undefined) updateData.email = email || null
    if (posisi) updateData.posisi = posisi
    if (vendor !== undefined) updateData.vendor = vendor || null
    if (kepwil !== undefined) updateData.kepwil = kepwil || null
    if (kcKabupaten !== undefined) updateData.kcKabupaten = kcKabupaten || null
    if (kakabKabupaten !== undefined) updateData.kakabKabupaten = kakabKabupaten || null
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

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingUser) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    // ADMIN_KEPWIL can only delete users in their kepwil
    const adminKepwil = getKepwilFilter(request)
    if (adminKepwil && existingUser.kepwil !== adminKepwil) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses untuk menghapus user ini' })
    }

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
        if (!userData.npp || !userData.nama || !userData.posisi || !userData.subKategoriId) {
          results.failed.push({
            data: userData,
            error: 'Missing required fields (npp, nama, posisi, subKategoriId)'
          })
          continue
        }

        const existing = await prisma.user.findUnique({
          where: { npp: userData.npp }
        })

        if (existing) {
          results.failed.push({
            data: userData,
            error: 'NPP already exists'
          })
          continue
        }

        // Use custom password or default
        const password = userData.password
          ? await bcrypt.hash(userData.password, 10)
          : hashedDefaultPassword

        const user = await prisma.user.create({
          data: {
            npp: userData.npp,
            nama: userData.nama,
            email: userData.email || null,
            posisi: userData.posisi,
            vendor: userData.vendor || null,
            kepwil: userData.kepwil || null,
            kcKabupaten: userData.kcKabupaten || null,
            kakabKabupaten: userData.kakabKabupaten || null,
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

  // Get user test history by NPP (for self lookup)
  fastify.get('/by-npp/:npp', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { npp } = request.params

    // User can only look up their own data
    if (request.user.role !== 'admin' && request.user.npp !== npp) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const user = await prisma.user.findUnique({
      where: { npp },
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
