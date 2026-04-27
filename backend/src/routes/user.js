import bcrypt from 'bcryptjs'
import { validatePasswordStrength } from '../utils/password.js'
import { logAudit } from '../utils/audit.js'
import { validateKepwilKcKakab } from '../utils/lokasi-validator.js'
import { stripHtml, validateEmail, validateNpp, validateLength } from '../utils/input-sanitizer.js'

// Role constants
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_KP: 'ADMIN_KP',
  ADMIN_KEPWIL: 'ADMIN_KEPWIL'
}

// Helper function to get kepwilId filter for ADMIN_KEPWIL
function getKepwilFilter(request) {
  if (request.user.adminRole === ROLES.ADMIN_KEPWIL) {
    return request.user.kepwilId
  }
  return null // No filter for SUPER_ADMIN and ADMIN_KP
}

// Common include for user queries
const userInclude = {
  subKategori: { include: { kategori: true } },
  kepwil: { select: { id: true, nama: true } },
  kc: { select: { id: true, nama: true } },
  kakab: { select: { id: true, nama: true } }
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

    // Get all kepwil for reference
    const kepwilList = await prisma.kepwil.findMany({ orderBy: { nama: 'asc' } })

    // Create CSV header
    const headers = ['npp', 'nama', 'email', 'posisi', 'vendor', 'kepwilId', 'kcId', 'kakabId', 'subKategoriId', 'password']

    // Create example rows
    const exampleRows = [
      ['199001010001', 'Budi Santoso', 'budi@email.com', 'Satpam', 'PT Vendor ABC', '11', '145', '145', '1', ''],
      ['199001010002', 'Siti Rahayu', 'siti@email.com', 'Office Boy', 'PT Vendor XYZ', '12', '160', '', '2', ''],
      ['199001010003', 'Ahmad Fauzi', '', 'Driver', '', '15', '200', '205', '3', 'custompass123']
    ]

    // Build CSV content
    let csv = headers.join(',') + '\n'
    exampleRows.forEach(row => {
      csv += row.map(cell => {
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
    csv += '# kepwilId: ID Kepwil/Kantor Wilayah (opsional - lihat daftar di bawah)\n'
    csv += '# kcId: ID Kantor Cabang (opsional)\n'
    csv += '# kakabId: ID Kantor Kabupaten (opsional)\n'
    csv += '# subKategoriId: ID Sub Kategori (wajib - lihat daftar di bawah)\n'
    csv += '# password: Password custom per-user (opsional). Jika kosong, defaultPassword dari request body dipakai. Min 12 char, wajib upper+lower+angka+simbol.\n'
    csv += '\n'
    csv += '# DAFTAR SUB KATEGORI (subKategoriId)\n'
    subKategoris.forEach(sub => {
      csv += `# ${sub.id} = ${sub.nama} (${sub.kategori.nama})\n`
    })
    csv += '\n'
    csv += '# DAFTAR KEPWIL (kepwilId)\n'
    kepwilList.forEach(kw => {
      csv += `# ${kw.id} = ${kw.nama}\n`
    })

    reply.header('Content-Type', 'text/csv')
    reply.header('Content-Disposition', 'attachment; filename=template-import-user.csv')
    return reply.send(csv)
  })

  // Bulk import from CSV (parse CSV and import)
  fastify.post('/bulk-import-csv', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { csvData, defaultPassword } = request.body

    if (!csvData || typeof csvData !== 'string') {
      return reply.status(400).send({ error: 'CSV data is required' })
    }

    // SECURITY: defaultPassword must be explicitly provided and meet password policy.
    // Removed previous fallback to 'password123'.
    const defPwError = validatePasswordStrength(defaultPassword)
    if (defPwError) {
      return reply.status(400).send({ error: `Default password tidak valid: ${defPwError}` })
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
      if (values.length === 0 || values.every(v => !v)) continue

      const user = {}
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || ''
        if (value) {
          user[header] = value
        }
      })

      // Convert IDs to numbers
      if (user.subKategoriId) user.subKategoriId = parseInt(user.subKategoriId)
      if (user.kepwilId) user.kepwilId = parseInt(user.kepwilId)
      if (user.kcId) user.kcId = parseInt(user.kcId)
      if (user.kakabId) user.kakabId = parseInt(user.kakabId)

      users.push(user)
    }

    // ADMIN_KEPWIL guard: force every imported row into the admin's own kepwil.
    // Without this, an ADMIN_KEPWIL could craft a CSV that creates users in
    // other Kepwils — a cross-tenant write IDOR.
    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId) {
      for (const u of users) {
        if (u.kepwilId && u.kepwilId !== adminKepwilId) {
          return reply.status(403).send({
            error: `Anda tidak boleh meng-import user ke Kepwil lain. Baris dengan NPP ${u.npp || '?'} memiliki kepwilId yang tidak sesuai dengan Kepwil Anda.`
          })
        }
        u.kepwilId = adminKepwilId
        // KC/Kakab dropped: ADMIN_KEPWIL must re-pick those after import
        // since we cannot validate cross-Kepwil KC/Kakab integrity here.
        u.kcId = null
        u.kakabId = null
      }
    }

    if (users.length === 0) {
      return reply.status(400).send({ error: 'No valid data rows found in CSV' })
    }

    // Process users
    const results = { success: [], failed: [] }
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10)

    for (const userData of users) {
      try {
        if (!userData.npp || !userData.nama || !userData.posisi || !userData.subKategoriId) {
          results.failed.push({ data: userData, error: 'Missing required fields (npp, nama, posisi, subKategoriId)' })
          continue
        }

        const existing = await prisma.user.findUnique({ where: { npp: userData.npp } })
        if (existing) {
          results.failed.push({ data: userData, error: 'NPP already exists' })
          continue
        }

        const subKategori = await prisma.subKategori.findUnique({ where: { id: userData.subKategoriId } })
        if (!subKategori) {
          results.failed.push({ data: userData, error: `SubKategori with ID ${userData.subKategoriId} not found` })
          continue
        }

        // Per-row password override must also meet the policy (default
        // password was already validated above; per-row was a gap).
        if (userData.password) {
          const rowPwError = validatePasswordStrength(userData.password)
          if (rowPwError) {
            results.failed.push({ data: userData, error: `Password row tidak valid: ${rowPwError}` })
            continue
          }
        }

        const lokasiErr = await validateKepwilKcKakab(prisma, {
          kepwilId: userData.kepwilId,
          kcId: userData.kcId,
          kakabId: userData.kakabId
        })
        if (lokasiErr) {
          results.failed.push({ data: userData, error: lokasiErr.error })
          continue
        }

        const password = userData.password ? await bcrypt.hash(userData.password, 10) : hashedDefaultPassword

        const user = await prisma.user.create({
          data: {
            npp: userData.npp,
            nama: userData.nama,
            email: userData.email || null,
            posisi: userData.posisi,
            vendor: userData.vendor || null,
            kepwilId: userData.kepwilId || null,
            kcId: userData.kcId || null,
            kakabId: userData.kakabId || null,
            password,
            subKategoriId: userData.subKategoriId
          }
        })

        const { password: _, ...userWithoutPassword } = user
        results.success.push(userWithoutPassword)
      } catch (err) {
        results.failed.push({ data: userData, error: err.message })
      }
    }

    logAudit(prisma, request, 'USER_BULK_IMPORT_CSV', { details: { total: users.length, successCount: results.success.length, failedCount: results.failed.length } })
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
    const { subKategoriId, search, kepwilId: filterKepwilId, page = 1, limit = 20 } = request.query

    const where = {}

    // Auto-filter by kepwil for ADMIN_KEPWIL
    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId) {
      where.kepwilId = adminKepwilId
    } else if (filterKepwilId) {
      where.kepwilId = parseInt(filterKepwilId)
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
      if (where.kepwilId) {
        where.AND = [
          { kepwilId: where.kepwilId },
          { OR: where.OR }
        ]
        delete where.kepwilId
        delete where.OR
      }
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          ...userInclude,
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
      adminRole: request.user.adminRole,
      adminKepwilId: adminKepwilId
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
        ...userInclude,
        testSessions: {
          include: { modul: true, hasilTest: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId && user.kepwilId !== adminKepwilId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke user ini' })
    }

    return user
  })

  // Create user (admin only)
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    let { npp, nama, email, posisi, vendor, kepwilId, kcId, kakabId, password, subKategoriId } = request.body

    if (!npp || !nama || !posisi || !password || !subKategoriId) {
      return reply.status(400).send({ error: 'NPP, nama, posisi, password, and subKategoriId are required' })
    }

    // Sanitize text inputs (pentest finding #5 — strip HTML, enforce length).
    npp = stripHtml(npp); nama = stripHtml(nama); posisi = stripHtml(posisi)
    email = email ? stripHtml(email).trim() : email
    vendor = vendor ? stripHtml(vendor) : vendor
    const fieldErr = validateNpp(npp) || validateLength(nama, { field: 'Nama', min: 1, max: 200 })
      || validateLength(posisi, { field: 'Posisi', min: 1, max: 100 })
      || (vendor != null && validateLength(vendor, { field: 'Vendor', max: 200 }))
      || validateEmail(email)
    if (fieldErr) return reply.status(fieldErr.status).send({ error: fieldErr.error })

    // ADMIN_KEPWIL can only create users for their own kepwil
    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId) {
      if (!kepwilId || parseInt(kepwilId) !== adminKepwilId) {
        return reply.status(403).send({ error: 'Anda hanya dapat membuat user untuk wilayah Anda' })
      }
    }

    const existing = await prisma.user.findUnique({ where: { npp } })
    if (existing) {
      return reply.status(409).send({ error: 'NPP already exists' })
    }

    // Enforce password policy on admin-side user creation (was previously
    // only enforced on user self-change endpoints — pentest finding 2026-04-27).
    const pwError = validatePasswordStrength(password)
    if (pwError) {
      return reply.status(400).send({ error: pwError })
    }

    const lokasiErr = await validateKepwilKcKakab(prisma, { kepwilId, kcId, kakabId })
    if (lokasiErr) {
      return reply.status(lokasiErr.status).send({ error: lokasiErr.error })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        npp,
        nama,
        email: email || null,
        posisi,
        vendor: vendor || null,
        kepwilId: kepwilId ? parseInt(kepwilId) : null,
        kcId: kcId ? parseInt(kcId) : null,
        kakabId: kakabId ? parseInt(kakabId) : null,
        password: hashedPassword,
        subKategoriId: parseInt(subKategoriId)
      },
      include: userInclude
    })

    logAudit(prisma, request, 'USER_CREATE', { target: 'user', targetId: user.id, details: { npp: user.npp, posisi: user.posisi } })
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  })

  // Update user (admin only)
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    let { npp, nama, email, posisi, vendor, kepwilId, kcId, kakabId, password, subKategoriId } = request.body

    // Sanitize text inputs (pentest finding #5).
    if (npp != null) npp = stripHtml(npp)
    if (nama != null) nama = stripHtml(nama)
    if (posisi != null) posisi = stripHtml(posisi)
    if (email != null) email = stripHtml(email).trim()
    if (vendor != null) vendor = stripHtml(vendor)
    const fieldErr = (npp != null && validateNpp(npp))
      || (nama != null && validateLength(nama, { field: 'Nama', min: 1, max: 200 }))
      || (posisi != null && validateLength(posisi, { field: 'Posisi', min: 1, max: 100 }))
      || (vendor != null && validateLength(vendor, { field: 'Vendor', max: 200 }))
      || (email != null && validateEmail(email))
    if (fieldErr) return reply.status(fieldErr.status).send({ error: fieldErr.error })

    const existingUser = await prisma.user.findUnique({ where: { id: parseInt(id) } })
    if (!existingUser) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId && existingUser.kepwilId !== adminKepwilId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses untuk mengubah user ini' })
    }

    if (adminKepwilId && kepwilId !== undefined && parseInt(kepwilId) !== adminKepwilId) {
      return reply.status(403).send({ error: 'Anda tidak dapat memindahkan user ke wilayah lain' })
    }

    if (npp) {
      const existing = await prisma.user.findFirst({
        where: { npp, NOT: { id: parseInt(id) } }
      })
      if (existing) {
        return reply.status(409).send({ error: 'NPP already exists' })
      }
    }

    const updateData = {}
    if (nama) updateData.nama = nama
    if (email !== undefined) updateData.email = email || null
    if (posisi) updateData.posisi = posisi
    if (vendor !== undefined) updateData.vendor = vendor || null
    if (kepwilId !== undefined) updateData.kepwilId = kepwilId ? parseInt(kepwilId) : null
    if (kcId !== undefined) updateData.kcId = kcId ? parseInt(kcId) : null
    if (kakabId !== undefined) updateData.kakabId = kakabId ? parseInt(kakabId) : null
    if (subKategoriId) updateData.subKategoriId = parseInt(subKategoriId)

    // Validate Kepwil↔KC↔Kakab consistency on the merged final state
    // (existing values + overrides). Pentest finding #1 (CWE-639).
    const finalKepwilId = 'kepwilId' in updateData ? updateData.kepwilId : existingUser.kepwilId
    const finalKcId = 'kcId' in updateData ? updateData.kcId : existingUser.kcId
    const finalKakabId = 'kakabId' in updateData ? updateData.kakabId : existingUser.kakabId
    const lokasiErr = await validateKepwilKcKakab(prisma, {
      kepwilId: finalKepwilId,
      kcId: finalKcId,
      kakabId: finalKakabId
    })
    if (lokasiErr) {
      return reply.status(lokasiErr.status).send({ error: lokasiErr.error })
    }

    if (password) {
      const pwError = validatePasswordStrength(password)
      if (pwError) {
        return reply.status(400).send({ error: pwError })
      }
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: userInclude
    })

    if (password) {
      // force re-login on the user's existing sessions
      await prisma.user.update({ where: { id: parseInt(id) }, data: { tokensInvalidBefore: new Date() } })
    }

    logAudit(prisma, request, 'USER_UPDATE', {
      target: 'user', targetId: user.id,
      details: { npp: user.npp, fieldsChanged: Object.keys(updateData), passwordChanged: !!password }
    })
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  })

  // Admin reset user password
  fastify.put('/:id/reset-password', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { newPassword } = request.body

    const pwError = validatePasswordStrength(newPassword)
    if (pwError) {
      return reply.status(400).send({ error: pwError })
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } })
    if (!user) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId && user.kepwilId !== adminKepwilId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses untuk mereset password user ini' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashed, tokensInvalidBefore: new Date() }
    })

    logAudit(prisma, request, 'USER_PASSWORD_RESET', { target: 'user', targetId: parseInt(id), details: { npp: user.npp } })
    return { message: 'Password user berhasil direset' }
  })

  // Delete user (admin only)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    const existingUser = await prisma.user.findUnique({ where: { id: parseInt(id) } })
    if (!existingUser) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId && existingUser.kepwilId !== adminKepwilId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses untuk menghapus user ini' })
    }

    const sessions = await prisma.testSession.count({ where: { userId: parseInt(id) } })
    if (sessions > 0) {
      return reply.status(400).send({ error: 'Cannot delete user with test history. Please archive instead.' })
    }

    await prisma.user.delete({ where: { id: parseInt(id) } })
    logAudit(prisma, request, 'USER_DELETE', { target: 'user', targetId: parseInt(id), details: { npp: existingUser.npp } })
    return { message: 'User deleted successfully' }
  })

  // Bulk import users (admin only)
  fastify.post('/bulk-import', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { users, defaultPassword } = request.body

    if (!users || !Array.isArray(users) || users.length === 0) {
      return reply.status(400).send({ error: 'Users array is required' })
    }

    // SECURITY: defaultPassword must be explicitly provided and meet password policy.
    // Removed previous fallback to 'password123'.
    const defPwError = validatePasswordStrength(defaultPassword)
    if (defPwError) {
      return reply.status(400).send({ error: `Default password tidak valid: ${defPwError}` })
    }

    // ADMIN_KEPWIL guard: see /bulk-import-csv for rationale.
    const adminKepwilId = getKepwilFilter(request)
    if (adminKepwilId) {
      for (const u of users) {
        if (u.kepwilId && parseInt(u.kepwilId) !== adminKepwilId) {
          return reply.status(403).send({
            error: `Anda tidak boleh meng-import user ke Kepwil lain. NPP ${u.npp || '?'} memiliki kepwilId yang tidak sesuai dengan Kepwil Anda.`
          })
        }
      }
    }

    const results = { success: [], failed: [] }
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10)

    for (const userData of users) {
      try {
        if (!userData.npp || !userData.nama || !userData.posisi || !userData.subKategoriId) {
          results.failed.push({ data: userData, error: 'Missing required fields (npp, nama, posisi, subKategoriId)' })
          continue
        }

        const existing = await prisma.user.findUnique({ where: { npp: userData.npp } })
        if (existing) {
          results.failed.push({ data: userData, error: 'NPP already exists' })
          continue
        }

        // Per-row password override must also meet the policy (default
        // password was already validated above; per-row was a gap).
        if (userData.password) {
          const rowPwError = validatePasswordStrength(userData.password)
          if (rowPwError) {
            results.failed.push({ data: userData, error: `Password row tidak valid: ${rowPwError}` })
            continue
          }
        }

        const finalKepwil = adminKepwilId ?? (userData.kepwilId ? parseInt(userData.kepwilId) : null)
        const finalKc = adminKepwilId ? null : (userData.kcId ? parseInt(userData.kcId) : null)
        const finalKakab = adminKepwilId ? null : (userData.kakabId ? parseInt(userData.kakabId) : null)
        const lokasiErr = await validateKepwilKcKakab(prisma, {
          kepwilId: finalKepwil, kcId: finalKc, kakabId: finalKakab
        })
        if (lokasiErr) {
          results.failed.push({ data: userData, error: lokasiErr.error })
          continue
        }

        const password = userData.password ? await bcrypt.hash(userData.password, 10) : hashedDefaultPassword

        const user = await prisma.user.create({
          data: {
            npp: userData.npp,
            nama: userData.nama,
            email: userData.email || null,
            posisi: userData.posisi,
            vendor: userData.vendor || null,
            kepwilId: finalKepwil,
            kcId: finalKc,
            kakabId: finalKakab,
            password,
            subKategoriId: parseInt(userData.subKategoriId)
          }
        })

        const { password: _, ...userWithoutPassword } = user
        results.success.push(userWithoutPassword)
      } catch (err) {
        results.failed.push({ data: userData, error: err.message })
      }
    }

    logAudit(prisma, request, 'USER_BULK_IMPORT', { details: { total: users.length, successCount: results.success.length, failedCount: results.failed.length } })
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

    if (request.user.role !== 'admin' && request.user.npp !== npp) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const user = await prisma.user.findUnique({
      where: { npp },
      include: {
        ...userInclude,
        testSessions: {
          where: { isCompleted: true },
          include: { modul: true, hasilTest: true },
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
