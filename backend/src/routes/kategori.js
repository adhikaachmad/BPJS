import { logAudit } from '../utils/audit.js'

export default async function kategoriRoutes(fastify, options) {
  const { prisma } = fastify

  // Get all kategori with sub kategoris
  fastify.get('/', async (request, reply) => {
    const kategoris = await prisma.kategori.findMany({
      include: {
        subKategoris: {
          orderBy: { nama: 'asc' }
        }
      },
      orderBy: { id: 'asc' }
    })
    return kategoris
  })

  // Get kategori by id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params
    const kategori = await prisma.kategori.findUnique({
      where: { id: parseInt(id) },
      include: {
        subKategoris: {
          include: {
            moduls: true,
            _count: { select: { users: true } }
          }
        }
      }
    })

    if (!kategori) {
      return reply.status(404).send({ error: 'Kategori not found' })
    }

    return kategori
  })

  // Create kategori (admin only)
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { nama, deskripsi, icon } = request.body

    if (!nama) {
      return reply.status(400).send({ error: 'Nama is required' })
    }

    const kategori = await prisma.kategori.create({
      data: { nama, deskripsi, icon }
    })

    return kategori
  })

  // Update kategori (admin only)
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { nama, deskripsi, icon } = request.body

    const existing = await prisma.kategori.findUnique({ where: { id: parseInt(id) } })
    if (!existing) {
      return reply.status(404).send({ error: 'Kategori tidak ditemukan' })
    }

    const kategori = await prisma.kategori.update({
      where: { id: parseInt(id) },
      data: { nama, deskripsi, icon }
    })

    return kategori
  })

  // Delete kategori — destructive cascade. SUPER_ADMIN only + explicit confirm when children exist.
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    if (request.user.adminRole !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Hanya Super Admin yang dapat menghapus kategori' })
    }
    const { id } = request.params
    const kategoriId = parseInt(id)

    const existing = await prisma.kategori.findUnique({
      where: { id: kategoriId },
      include: { subKategoris: { select: { id: true } } }
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Kategori tidak ditemukan' })
    }

    // Count cascade impact
    const subKategoriIds = existing.subKategoris.map(s => s.id)
    const [userCount, modulCount, periodeCount] = await Promise.all([
      prisma.user.count({ where: { subKategoriId: { in: subKategoriIds } } }),
      prisma.modul.count({ where: { subKategoriId: { in: subKategoriIds } } }),
      prisma.periodeTest.count({ where: { subKategoriId: { in: subKategoriIds } } })
    ])

    const totalImpact = subKategoriIds.length + userCount + modulCount + periodeCount
    if (totalImpact > 0 && request.body?.confirm !== true) {
      return reply.status(409).send({
        error: 'Penghapusan akan menghapus data terkait secara permanen',
        impact: { subKategori: subKategoriIds.length, user: userCount, modul: modulCount, periodeTest: periodeCount },
        hint: 'Kirim ulang request dengan body { "confirm": true } untuk konfirmasi'
      })
    }

    await prisma.kategori.delete({ where: { id: kategoriId } })
    logAudit(prisma, request, 'KATEGORI_DELETE', {
      target: 'kategori', targetId: kategoriId,
      details: { nama: existing.nama, impact: { subKategori: subKategoriIds.length, user: userCount, modul: modulCount, periodeTest: periodeCount } }
    })
    return { message: 'Kategori deleted successfully', impact: { subKategori: subKategoriIds.length, user: userCount, modul: modulCount, periodeTest: periodeCount } }
  })

  // Get sub kategoris by kategori id
  fastify.get('/:id/sub-kategori', async (request, reply) => {
    const { id } = request.params
    const subKategoris = await prisma.subKategori.findMany({
      where: { kategoriId: parseInt(id) },
      include: {
        moduls: true,
        _count: { select: { users: true } }
      },
      orderBy: { nama: 'asc' }
    })
    return subKategoris
  })

  // Create sub kategori (admin only)
  fastify.post('/:id/sub-kategori', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { nama, deskripsi } = request.body

    if (!nama) {
      return reply.status(400).send({ error: 'Nama is required' })
    }

    const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const subKategori = await prisma.subKategori.create({
      data: {
        nama,
        deskripsi,
        slug,
        kategoriId: parseInt(id)
      }
    })

    return subKategori
  })

  // Update sub kategori (admin only)
  fastify.put('/sub-kategori/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { nama, deskripsi } = request.body

    const existing = await prisma.subKategori.findUnique({ where: { id: parseInt(id) } })
    if (!existing) {
      return reply.status(404).send({ error: 'Sub kategori tidak ditemukan' })
    }

    const data = { nama, deskripsi }
    // Update slug if nama changed
    if (nama && nama !== existing.nama) {
      data.slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }

    const subKategori = await prisma.subKategori.update({
      where: { id: parseInt(id) },
      data
    })

    return subKategori
  })

  // Delete sub kategori — destructive cascade. SUPER_ADMIN only + explicit confirm when children exist.
  fastify.delete('/sub-kategori/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    if (request.user.adminRole !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Hanya Super Admin yang dapat menghapus sub kategori' })
    }
    const { id } = request.params
    const subKategoriId = parseInt(id)

    const existing = await prisma.subKategori.findUnique({ where: { id: subKategoriId } })
    if (!existing) {
      return reply.status(404).send({ error: 'Sub kategori tidak ditemukan' })
    }

    const [userCount, modulCount, periodeCount] = await Promise.all([
      prisma.user.count({ where: { subKategoriId } }),
      prisma.modul.count({ where: { subKategoriId } }),
      prisma.periodeTest.count({ where: { subKategoriId } })
    ])

    const totalImpact = userCount + modulCount + periodeCount
    if (totalImpact > 0 && request.body?.confirm !== true) {
      return reply.status(409).send({
        error: 'Penghapusan akan menghapus data terkait secara permanen',
        impact: { user: userCount, modul: modulCount, periodeTest: periodeCount },
        hint: 'Kirim ulang request dengan body { "confirm": true } untuk konfirmasi'
      })
    }

    await prisma.subKategori.delete({ where: { id: subKategoriId } })
    logAudit(prisma, request, 'SUBKATEGORI_DELETE', {
      target: 'subKategori', targetId: subKategoriId,
      details: { nama: existing.nama, impact: { user: userCount, modul: modulCount, periodeTest: periodeCount } }
    })
    return { message: 'Sub kategori deleted successfully', impact: { user: userCount, modul: modulCount, periodeTest: periodeCount } }
  })

  // Get sub kategori detail with moduls
  fastify.get('/sub-kategori/:id', async (request, reply) => {
    const { id } = request.params
    const subKategori = await prisma.subKategori.findUnique({
      where: { id: parseInt(id) },
      include: {
        kategori: true,
        moduls: {
          include: {
            _count: { select: { soals: true, materis: true } }
          },
          orderBy: { urutan: 'asc' }
        }
      }
    })

    if (!subKategori) {
      return reply.status(404).send({ error: 'Sub kategori not found' })
    }

    return subKategori
  })
}
