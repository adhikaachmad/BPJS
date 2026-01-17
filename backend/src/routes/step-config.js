import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function stepConfigRoutes(fastify, options) {
  // GET all step configs (public - untuk frontend user)
  fastify.get('/step-config', async (request, reply) => {
    try {
      const steps = await prisma.stepConfig.findMany({
        orderBy: { urutan: 'asc' }
      })
      return steps
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Gagal mengambil konfigurasi step' })
    }
  })

  // PUT update step config (admin only)
  fastify.put('/step-config/:id', {
    preHandler: [fastify.authenticate, fastify.checkAdminRole(['SUPER_ADMIN', 'ADMIN_KP'])]
  }, async (request, reply) => {
    const { id } = request.params
    const { nama, deskripsi, gradientFrom, gradientTo } = request.body

    try {
      // Check if step exists
      const existing = await prisma.stepConfig.findUnique({
        where: { id }
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Step tidak ditemukan' })
      }

      const updated = await prisma.stepConfig.update({
        where: { id },
        data: {
          nama: nama || existing.nama,
          deskripsi: deskripsi || existing.deskripsi,
          gradientFrom: gradientFrom || existing.gradientFrom,
          gradientTo: gradientTo || existing.gradientTo
        }
      })

      return updated
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Gagal mengupdate step' })
    }
  })
}
