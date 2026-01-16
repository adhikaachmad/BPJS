import bcrypt from 'bcryptjs'

// Store active sessions to prevent multiple login
const activeSessions = new Map()

export default async function authRoutes(fastify, options) {
  const { prisma } = fastify

  // Get sub kategori info by slug (public endpoint for login page)
  fastify.get('/sub-kategori/:slug', async (request, reply) => {
    const { slug } = request.params

    const subKategori = await prisma.subKategori.findUnique({
      where: { slug },
      include: {
        kategori: true
      }
    })

    if (!subKategori) {
      return reply.status(404).send({ error: 'Sub kategori tidak ditemukan' })
    }

    return { subKategori }
  })

  // Get all sub kategoris (for listing login options)
  fastify.get('/sub-kategoris', async (request, reply) => {
    const subKategoris = await prisma.subKategori.findMany({
      include: {
        kategori: true
      },
      orderBy: [
        { kategori: { nama: 'asc' } },
        { nama: 'asc' }
      ]
    })

    return { subKategoris }
  })

  // User login with NPP, password, and sub kategori slug
  fastify.post('/login/:slug', async (request, reply) => {
    const { slug } = request.params
    const { npp, password } = request.body

    if (!npp || !password) {
      return reply.status(400).send({ error: 'NPP dan password harus diisi' })
    }

    // Find sub kategori by slug
    const subKategori = await prisma.subKategori.findUnique({
      where: { slug },
      include: {
        kategori: true
      }
    })

    if (!subKategori) {
      return reply.status(404).send({ error: 'Sub kategori tidak ditemukan' })
    }

    const user = await prisma.user.findUnique({
      where: { npp },
      include: {
        subKategori: {
          include: {
            kategori: true
          }
        }
      }
    })

    if (!user) {
      return reply.status(401).send({ error: 'NPP tidak ditemukan' })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return reply.status(401).send({ error: 'Password salah' })
    }

    // Verify user belongs to this sub kategori
    if (user.subKategoriId !== subKategori.id) {
      return reply.status(403).send({
        error: `Anda tidak terdaftar sebagai ${subKategori.nama}. Silakan login di halaman yang sesuai dengan posisi Anda.`
      })
    }

    // Check if user already has active session
    const existingSession = activeSessions.get(user.id)
    if (existingSession) {
      const now = Date.now()
      if (now - existingSession.timestamp < 3600000) { // 1 hour
        return reply.status(409).send({
          error: 'Anda sudah login di perangkat lain. Silakan logout terlebih dahulu atau tunggu sesi berakhir.'
        })
      }
    }

    const token = fastify.jwt.sign({
      id: user.id,
      npp: user.npp,
      nama: user.nama,
      subKategoriId: user.subKategoriId,
      subKategoriSlug: user.subKategori.slug,
      role: 'user'
    }, { expiresIn: '2h' })

    // Store session
    activeSessions.set(user.id, {
      token,
      timestamp: Date.now()
    })

    return {
      token,
      user: {
        id: user.id,
        npp: user.npp,
        nama: user.nama,
        email: user.email,
        posisi: user.posisi,
        kepwil: user.kepwil,
        kcKabupaten: user.kcKabupaten,
        kakabKabupaten: user.kakabKabupaten,
        subKategori: user.subKategori
      }
    }
  })

  // Legacy login endpoint (redirect to proper login)
  fastify.post('/login', async (request, reply) => {
    return reply.status(400).send({
      error: 'Silakan login melalui halaman login sesuai posisi Anda (contoh: /login/satpam)'
    })
  })

  // User logout
  fastify.post('/logout', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.user
    activeSessions.delete(id)
    return { message: 'Logout berhasil' }
  })

  // Admin login
  fastify.post('/admin/login', async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' })
    }

    const admin = await prisma.admin.findUnique({
      where: { username }
    })

    if (!admin) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const isValid = await bcrypt.compare(password, admin.password)
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = fastify.jwt.sign({
      id: admin.id,
      username: admin.username,
      nama: admin.nama,
      role: 'admin'
    }, { expiresIn: '8h' })

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        nama: admin.nama,
        role: admin.role
      }
    }
  })

  // Verify token
  fastify.get('/verify', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return { valid: true, user: request.user }
  })

  // Get current user profile
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id, role } = request.user

    if (role === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id },
        select: { id: true, username: true, nama: true, role: true }
      })
      return { user: admin, role: 'admin' }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subKategori: {
          include: {
            kategori: true
          }
        }
      }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user

    return { user: userWithoutPassword, role: 'user' }
  })
}
