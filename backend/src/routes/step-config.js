import { stripHtml, validateLength } from '../utils/input-sanitizer.js'

export default async function stepConfigRoutes(fastify, options) {
  const { prisma } = fastify

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
    let { nama, deskripsi, gradientFrom, gradientTo, image } = request.body

    try {
      // Check if step exists
      const existing = await prisma.stepConfig.findUnique({
        where: { id }
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Step tidak ditemukan' })
      }

      // Sanitize plain-text fields (pentest finding #5)
      if (nama != null) nama = stripHtml(nama)
      if (deskripsi != null) deskripsi = stripHtml(deskripsi)
      const fieldErr = (nama != null && validateLength(nama, { field: 'Nama step', min: 1, max: 100 }))
        || (deskripsi != null && validateLength(deskripsi, { field: 'Deskripsi step', max: 500 }))
      if (fieldErr) return reply.status(fieldErr.status).send({ error: fieldErr.error })

      const updateData = {
        nama: nama || existing.nama,
        deskripsi: deskripsi || existing.deskripsi,
        gradientFrom: gradientFrom || existing.gradientFrom,
        gradientTo: gradientTo || existing.gradientTo
      }

      if (image !== undefined) {
        updateData.image = image
      }

      const updated = await prisma.stepConfig.update({
        where: { id },
        data: updateData
      })

      return updated
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Gagal mengupdate step' })
    }
  })
}
