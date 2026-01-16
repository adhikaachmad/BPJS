import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const lokasiData = require('../data/lokasi.json')

export default async function lokasiRoutes(fastify, options) {
  // Get all provinces (for Kepwil dropdown)
  fastify.get('/provinsi', async (request, reply) => {
    const provinsiList = lokasiData.provinsi.map(p => ({
      id: p.id,
      nama: p.nama
    }))
    return { data: provinsiList }
  })

  // Get kabupaten by province ID (for KC and Kakab dropdown)
  fastify.get('/kabupaten/:provinsiId', async (request, reply) => {
    const { provinsiId } = request.params
    const provinsi = lokasiData.provinsi.find(p => p.id === parseInt(provinsiId))

    if (!provinsi) {
      return reply.status(404).send({ error: 'Provinsi tidak ditemukan' })
    }

    return {
      provinsi: provinsi.nama,
      data: provinsi.kabupaten
    }
  })

  // Get all data (for admin to manage)
  fastify.get('/all', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    return { data: lokasiData.provinsi }
  })

  // Search kabupaten across all provinces
  fastify.get('/search', async (request, reply) => {
    const { q } = request.query

    if (!q || q.length < 2) {
      return { data: [] }
    }

    const searchLower = q.toLowerCase()
    const results = []

    lokasiData.provinsi.forEach(provinsi => {
      provinsi.kabupaten.forEach(kab => {
        if (kab.toLowerCase().includes(searchLower)) {
          results.push({
            kabupaten: kab,
            provinsi: provinsi.nama,
            provinsiId: provinsi.id
          })
        }
      })
    })

    return { data: results.slice(0, 20) } // Limit results
  })
}
