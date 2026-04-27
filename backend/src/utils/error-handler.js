import { Prisma } from '../../generated/prisma-client/index.js'

const PRISMA_KNOWN_ERROR_MAP = {
  P2000: { status: 400, message: 'Nilai input terlalu panjang' },
  P2001: { status: 404, message: 'Data tidak ditemukan' },
  P2002: { status: 409, message: 'Data dengan nilai tersebut sudah ada' },
  P2003: { status: 400, message: 'Referensi data tidak valid' },
  P2014: { status: 400, message: 'Operasi melanggar relasi data' },
  P2025: { status: 404, message: 'Data tidak ditemukan' }
}

export function setupErrorHandler(fastify) {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(
      { err: error, url: request.url, method: request.method },
      'request failed'
    )

    if (error.validation) {
      return reply.status(error.statusCode || 400).send({
        error: 'Permintaan tidak valid',
        details: error.validation.map(v => ({
          field: v.instancePath || v.params?.missingProperty,
          message: v.message
        }))
      })
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'Terlalu banyak permintaan, silakan coba lagi nanti'
      })
    }

    if (error.code && typeof error.code === 'string' && error.code.startsWith('FST_JWT_')) {
      return reply.status(401).send({
        error: 'Sesi tidak valid, silakan login ulang'
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_KNOWN_ERROR_MAP[error.code]
      if (mapped) {
        return reply.status(mapped.status).send({ error: mapped.message })
      }
      return reply.status(400).send({ error: 'Permintaan tidak dapat diproses' })
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return reply.status(400).send({ error: 'Permintaan tidak valid' })
    }

    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return reply.status(503).send({
        error: 'Layanan sedang mengalami gangguan, silakan coba lagi'
      })
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: error.message || 'Permintaan tidak valid'
      })
    }

    return reply.status(500).send({
      error: 'Terjadi kesalahan, silakan coba lagi'
    })
  })
}
