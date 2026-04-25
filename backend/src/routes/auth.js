import bcrypt from 'bcryptjs'
import { validatePasswordStrength } from '../utils/password.js'
import { logAudit } from '../utils/audit.js'

// Multi-device login window (ms). If lastLoginAt is within this window AND not invalidated,
// a new login attempt is rejected. Replaces the old in-memory activeSessions Map.
const ACTIVE_SESSION_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// Brute-force lockout config
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// Precomputed dummy hash; bcrypt.compare against this when a username/NPP is not found,
// so response time matches the "wrong password" branch and attackers can't enumerate accounts.
const DUMMY_BCRYPT_HASH = '$2a$10$QRzkx4lF73ly9CI1MwB.DOAF3Ost2NEEQBc8YkgYMvfy4.bE6j9Ba'

function isAccountLocked(account) {
  return account.lockedUntil && new Date(account.lockedUntil).getTime() > Date.now()
}

function lockoutMessage(account) {
  const minutesLeft = Math.ceil((new Date(account.lockedUntil).getTime() - Date.now()) / 60000)
  return `Akun terkunci karena terlalu banyak percobaan login gagal. Coba lagi dalam ${minutesLeft} menit.`
}

async function recordFailedAttempt(prisma, model, id, currentAttempts) {
  const attempts = (currentAttempts || 0) + 1
  const data = { failedLoginAttempts: attempts }
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    data.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
  }
  await prisma[model].update({ where: { id }, data })
}

async function resetFailedAttempts(prisma, model, id, currentAttempts) {
  if (currentAttempts === 0) return // skip noop write
  await prisma[model].update({
    where: { id },
    data: { failedLoginAttempts: 0, lockedUntil: null }
  })
}

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
  // Per-route rate limit: 5 attempts per 15 min per IP. Anti brute-force layer 1.
  fastify.post('/login/:slug', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
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
        subKategori: { include: { kategori: true } },
        kepwil: { select: { id: true, nama: true } },
        kc: { select: { id: true, nama: true } },
        kakab: { select: { id: true, nama: true } }
      }
    })

    // Timing-safe + non-enumerating: always run bcrypt, generic error message.
    if (!user) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH)
      logAudit(prisma, request, 'LOGIN_FAIL', { actorType: 'user', actorLabel: npp, details: { reason: 'unknown_npp', slug } })
      return reply.status(401).send({ error: 'NPP atau password salah' })
    }

    // Account lockout check (DB-level, layer 2 beyond rate limit).
    if (isAccountLocked(user)) {
      logAudit(prisma, request, 'LOGIN_LOCKED', { actorType: 'user', actorId: user.id, actorLabel: user.npp })
      return reply.status(423).send({ error: lockoutMessage(user) })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      await recordFailedAttempt(prisma, 'user', user.id, user.failedLoginAttempts)
      logAudit(prisma, request, 'LOGIN_FAIL', { actorType: 'user', actorId: user.id, actorLabel: user.npp, details: { reason: 'wrong_password' } })
      return reply.status(401).send({ error: 'NPP atau password salah' })
    }

    await resetFailedAttempts(prisma, 'user', user.id, user.failedLoginAttempts)

    // Verify user belongs to this sub kategori
    if (user.subKategoriId !== subKategori.id) {
      return reply.status(403).send({
        error: `Anda tidak terdaftar sebagai ${subKategori.nama}. Silakan login di halaman yang sesuai dengan posisi Anda.`
      })
    }

    // Check if sub kategori is active
    if (!subKategori.isActive) {
      return reply.status(403).send({
        error: `Akses untuk ${subKategori.nama} sedang tidak tersedia. Silakan hubungi administrator.`,
        code: 'SUB_KATEGORI_INACTIVE'
      })
    }

    // Multi-device prevention (DB-backed, survives restart):
    // Block if there was a recent successful login that hasn't been explicitly invalidated.
    if (user.lastLoginAt) {
      const sinceLast = Date.now() - new Date(user.lastLoginAt).getTime()
      const invalidated = user.tokensInvalidBefore && new Date(user.tokensInvalidBefore).getTime() >= new Date(user.lastLoginAt).getTime()
      if (sinceLast < ACTIVE_SESSION_WINDOW_MS && !invalidated) {
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

    // Persist last-login timestamp; clear any prior tokensInvalidBefore so the new token is valid.
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), tokensInvalidBefore: null }
    })

    logAudit(prisma, request, 'LOGIN_SUCCESS', { actorType: 'user', actorId: user.id, actorLabel: user.npp })

    return {
      token,
      user: {
        id: user.id,
        npp: user.npp,
        nama: user.nama,
        email: user.email,
        posisi: user.posisi,
        kepwil: user.kepwil?.nama || null,
        kc: user.kc?.nama || null,
        kakab: user.kakab?.nama || null,
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

  // User logout — revoke current token by setting tokensInvalidBefore to "now".
  fastify.post('/logout', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id, role } = request.user
    if (role === 'admin') {
      await prisma.admin.update({ where: { id }, data: { tokensInvalidBefore: new Date() } })
    } else {
      await prisma.user.update({ where: { id }, data: { tokensInvalidBefore: new Date() } })
    }
    logAudit(prisma, request, 'LOGOUT')
    return { message: 'Logout berhasil' }
  })

  // Admin login
  // Per-route rate limit: 5 attempts per 15 min per IP. Anti brute-force layer 1.
  fastify.post('/admin/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' })
    }

    const admin = await prisma.admin.findUnique({
      where: { username }
    })

    // Timing-safe + non-enumerating: always run bcrypt, generic error message.
    if (!admin) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH)
      logAudit(prisma, request, 'LOGIN_FAIL', { actorType: 'admin', actorLabel: username, details: { reason: 'unknown_username' } })
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    // Account lockout check (DB-level, layer 2 beyond rate limit).
    if (isAccountLocked(admin)) {
      logAudit(prisma, request, 'LOGIN_LOCKED', { actorType: 'admin', actorId: admin.id, actorLabel: admin.username })
      return reply.status(423).send({ error: lockoutMessage(admin) })
    }

    const isValid = await bcrypt.compare(password, admin.password)
    if (!isValid) {
      await recordFailedAttempt(prisma, 'admin', admin.id, admin.failedLoginAttempts)
      logAudit(prisma, request, 'LOGIN_FAIL', { actorType: 'admin', actorId: admin.id, actorLabel: admin.username, details: { reason: 'wrong_password' } })
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    await resetFailedAttempts(prisma, 'admin', admin.id, admin.failedLoginAttempts)
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), tokensInvalidBefore: null }
    })
    logAudit(prisma, request, 'LOGIN_SUCCESS', { actorType: 'admin', actorId: admin.id, actorLabel: admin.username })

    // Get admin with kepwil and kc relations
    const adminWithRelations = (admin.kepwilId || admin.kcId)
      ? await prisma.admin.findUnique({
          where: { id: admin.id },
          include: {
            kepwil: { select: { id: true, nama: true } },
            kc: { select: { id: true, nama: true } }
          }
        })
      : admin

    const token = fastify.jwt.sign({
      id: admin.id,
      username: admin.username,
      nama: admin.nama,
      adminRole: admin.role, // SUPER_ADMIN, ADMIN_KP, ADMIN_KEPWIL
      kepwilId: admin.kepwilId,
      kepwil: adminWithRelations.kepwil?.nama || null,
      kcId: admin.kcId,
      kc: adminWithRelations.kc?.nama || null,
      role: 'admin' // untuk membedakan dengan user biasa
    }, { expiresIn: '8h' })

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        nama: admin.nama,
        role: admin.role,
        kepwilId: admin.kepwilId,
        kepwil: adminWithRelations.kepwil?.nama || null,
        kcId: admin.kcId,
        kc: adminWithRelations.kc?.nama || null
      }
    }
  })

  // User change own password
  fastify.post('/change-password', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id, role } = request.user

    if (role !== 'user') {
      return reply.status(403).send({ error: 'Endpoint ini hanya untuk user' })
    }

    const { currentPassword, newPassword } = request.body

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ error: 'Password lama dan baru harus diisi' })
    }

    const pwError = validatePasswordStrength(newPassword)
    if (pwError) {
      return reply.status(400).send({ error: pwError })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return reply.status(401).send({ error: 'Password lama salah' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    // Set tokensInvalidBefore so any other sessions using the old password are forced to re-login.
    await prisma.user.update({ where: { id }, data: { password: hashed, tokensInvalidBefore: new Date() } })

    logAudit(prisma, request, 'PASSWORD_CHANGE', { target: 'user', targetId: id })
    return { message: 'Password berhasil diubah' }
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
        select: { id: true, username: true, nama: true, role: true, kepwilId: true, kepwil: { select: { id: true, nama: true } }, kcId: true, kc: { select: { id: true, nama: true } } }
      })
      return {
        user: {
          ...admin,
          kepwil: admin.kepwil?.nama || null,
          kc: admin.kc?.nama || null
        },
        role: 'admin'
      }
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
