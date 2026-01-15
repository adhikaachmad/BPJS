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

    const kategori = await prisma.kategori.update({
      where: { id: parseInt(id) },
      data: { nama, deskripsi, icon }
    })

    return kategori
  })

  // Delete kategori (admin only)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    await prisma.kategori.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'Kategori deleted successfully' }
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

    const subKategori = await prisma.subKategori.create({
      data: {
        nama,
        deskripsi,
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

    const subKategori = await prisma.subKategori.update({
      where: { id: parseInt(id) },
      data: { nama, deskripsi }
    })

    return subKategori
  })

  // Delete sub kategori (admin only)
  fastify.delete('/sub-kategori/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    await prisma.subKategori.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'Sub kategori deleted successfully' }
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
