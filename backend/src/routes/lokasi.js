export default async function lokasiRoutes(fastify, options) {
  const { prisma } = fastify

  // Get all kepwil
  fastify.get('/kepwil', async (request, reply) => {
    const data = await prisma.kepwil.findMany({
      select: { id: true, nama: true },
      orderBy: { id: 'asc' }
    })
    return { data }
  })

  // Get KC (Kantor Cabang) by kepwil ID
  fastify.get('/kc/:kepwilId', async (request, reply) => {
    const { kepwilId } = request.params
    const data = await prisma.kantorCabang.findMany({
      where: { kepwilId: parseInt(kepwilId) },
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' }
    })
    return { data }
  })

  // Get Kantor Kabupaten by KC ID
  fastify.get('/kakab/:kcId', async (request, reply) => {
    const { kcId } = request.params
    const data = await prisma.kantorKabupaten.findMany({
      where: { kantorCabangId: parseInt(kcId) },
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' }
    })
    return { data }
  })

  // Get all data (for admin)
  fastify.get('/all', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const data = await prisma.kepwil.findMany({
      include: {
        kantorCabangs: {
          select: { id: true, nama: true, kantorKabupatens: { select: { id: true, nama: true }, orderBy: { nama: 'asc' } } },
          orderBy: { nama: 'asc' }
        }
      },
      orderBy: { id: 'asc' }
    })
    return { data }
  })
}
