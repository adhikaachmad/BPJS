export default async function modulRoutes(fastify, options) {
  const { prisma } = fastify

  // Get all moduls
  fastify.get('/', async (request, reply) => {
    const { subKategoriId, tipe } = request.query

    const where = {}
    if (subKategoriId) where.subKategoriId = parseInt(subKategoriId)
    if (tipe) where.tipe = tipe

    const moduls = await prisma.modul.findMany({
      where,
      include: {
        subKategori: {
          include: { kategori: true }
        },
        _count: { select: { soals: true, materis: true } }
      },
      orderBy: { urutan: 'asc' }
    })
    return moduls
  })

  // Get modul by id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params
    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(id) },
      include: {
        subKategori: {
          include: { kategori: true }
        },
        soals: {
          include: { opsis: true },
          orderBy: { id: 'asc' }
        },
        materis: {
          orderBy: { urutan: 'asc' }
        },
        _count: { select: { soals: true, materis: true, testSessions: true } }
      }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul not found' })
    }

    return modul
  })

  // Create modul (admin only)
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { nama, deskripsi, gradientFrom, gradientTo, icon, durasi, subKategoriId } = request.body

    if (!nama || !subKategoriId) {
      return reply.status(400).send({ error: 'Nama and subKategoriId are required' })
    }

    const modul = await prisma.modul.create({
      data: {
        nama,
        deskripsi,
        gradientFrom: gradientFrom || 'blue-500',
        gradientTo: gradientTo || 'indigo-600',
        icon,
        durasi: durasi || 30,
        subKategoriId: parseInt(subKategoriId)
      }
    })

    return modul
  })

  // Update modul (admin only)
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { nama, deskripsi, gradientFrom, gradientTo, icon, durasi } = request.body

    const modul = await prisma.modul.update({
      where: { id: parseInt(id) },
      data: { nama, deskripsi, gradientFrom, gradientTo, icon, durasi }
    })

    return modul
  })

  // Delete modul (admin only)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    await prisma.modul.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'Modul deleted successfully' }
  })

  // Get moduls by sub kategori
  fastify.get('/sub-kategori/:subKategoriId', async (request, reply) => {
    const { subKategoriId } = request.params

    const moduls = await prisma.modul.findMany({
      where: { subKategoriId: parseInt(subKategoriId) },
      include: {
        _count: { select: { soals: true, materis: true } }
      },
      orderBy: { urutan: 'asc' }
    })

    return moduls
  })

  // Get modul statistics (admin only)
  fastify.get('/:id/stats', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const modulId = parseInt(id)

    const [modul, testSessions, avgScore] = await Promise.all([
      prisma.modul.findUnique({
        where: { id: modulId },
        include: { _count: { select: { soals: true } } }
      }),
      prisma.testSession.count({
        where: { modulId, isCompleted: true }
      }),
      prisma.hasilTest.aggregate({
        where: { testSession: { modulId } },
        _avg: { skor: true }
      })
    ])

    if (!modul) {
      return reply.status(404).send({ error: 'Modul not found' })
    }

    return {
      modul,
      totalTestCompleted: testSessions,
      averageScore: avgScore._avg.skor || 0
    }
  })
}
