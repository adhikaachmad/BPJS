export default async function soalRoutes(fastify, options) {
  const { prisma } = fastify

  // Get all soals (admin only)
  fastify.get('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { modulId } = request.query

    const where = modulId ? { modulId: parseInt(modulId) } : {}

    const soals = await prisma.soal.findMany({
      where,
      include: {
        opsis: true,
        modul: {
          include: {
            subKategori: true
          }
        }
      },
      orderBy: { id: 'asc' }
    })
    return soals
  })

  // Get soal by id
  fastify.get('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const soal = await prisma.soal.findUnique({
      where: { id: parseInt(id) },
      include: {
        opsis: true,
        modul: true
      }
    })

    if (!soal) {
      return reply.status(404).send({ error: 'Soal not found' })
    }

    return soal
  })

  // Create soal with options (admin only)
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { pertanyaan, bobot, modulId, opsis } = request.body

    if (!pertanyaan || !modulId || !opsis || opsis.length < 2) {
      return reply.status(400).send({
        error: 'Pertanyaan, modulId, and at least 2 opsis are required'
      })
    }

    // Validate that exactly one option is correct
    const correctCount = opsis.filter(o => o.isCorrect).length
    if (correctCount !== 1) {
      return reply.status(400).send({
        error: 'Exactly one option must be marked as correct'
      })
    }

    const soal = await prisma.soal.create({
      data: {
        pertanyaan,
        bobot: bobot || 1,
        modulId: parseInt(modulId),
        opsis: {
          create: opsis.map(o => ({
            teks: o.teks,
            isCorrect: o.isCorrect || false
          }))
        }
      },
      include: { opsis: true }
    })

    return soal
  })

  // Update soal (admin only)
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { pertanyaan, bobot, opsis } = request.body

    const soalId = parseInt(id)

    // Update soal
    const soal = await prisma.soal.update({
      where: { id: soalId },
      data: { pertanyaan, bobot }
    })

    // Update opsis if provided
    if (opsis && opsis.length > 0) {
      // Delete existing opsis
      await prisma.opsi.deleteMany({
        where: { soalId }
      })

      // Create new opsis
      await prisma.opsi.createMany({
        data: opsis.map(o => ({
          teks: o.teks,
          isCorrect: o.isCorrect || false,
          soalId
        }))
      })
    }

    // Return updated soal with opsis
    return prisma.soal.findUnique({
      where: { id: soalId },
      include: { opsis: true }
    })
  })

  // Delete soal (admin only)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    await prisma.soal.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'Soal deleted successfully' }
  })

  // Get soals by modul
  fastify.get('/modul/:modulId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { modulId } = request.params

    const soals = await prisma.soal.findMany({
      where: { modulId: parseInt(modulId) },
      include: { opsis: true },
      orderBy: { id: 'asc' }
    })

    return soals
  })

  // Bulk create soals (admin only)
  fastify.post('/bulk', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { modulId, soals } = request.body

    if (!modulId || !soals || soals.length === 0) {
      return reply.status(400).send({ error: 'ModulId and soals array are required' })
    }

    const createdSoals = []

    for (const soalData of soals) {
      const soal = await prisma.soal.create({
        data: {
          pertanyaan: soalData.pertanyaan,
          bobot: soalData.bobot || 1,
          modulId: parseInt(modulId),
          opsis: {
            create: soalData.opsis.map(o => ({
              teks: o.teks,
              isCorrect: o.isCorrect || false
            }))
          }
        },
        include: { opsis: true }
      })
      createdSoals.push(soal)
    }

    return { created: createdSoals.length, soals: createdSoals }
  })
}
