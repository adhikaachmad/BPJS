import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import routes
import authRoutes from './routes/auth.js'
import kategoriRoutes from './routes/kategori.js'
import modulRoutes from './routes/modul.js'
import soalRoutes from './routes/soal.js'
import testRoutes from './routes/test.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/user.js'
import reportRoutes from './routes/report.js'
import materiRoutes from './routes/materi.js'
import periodeRoutes from './routes/periode.js'
import lokasiRoutes from './routes/lokasi.js'
import uploadRoutes from './routes/upload.js'

// Import WebSocket handlers
import { setupWebSocket } from './websocket/handlers.js'

const prisma = new PrismaClient()

const fastify = Fastify({
  logger: true,
  trustProxy: true
})

// Decorate fastify with prisma
fastify.decorate('prisma', prisma)

// Register plugins
await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'https://bpjs2.314playground.com', 'http://bpjs2.314playground.com'],
  credentials: true
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'bpjs-kuesioner-secret-key-2024'
})

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
})

await fastify.register(multipart, {
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB - no practical limit for uploads
  }
})

await fastify.register(websocket, {
  options: {
    maxPayload: 1048576,
    clientTracking: true
  }
})

// Serve static files (frontend) in production
// In production: serves from /frontend/dist (via git pull)
// __dirname = /backend/src, so ../../frontend/dist
const staticPath = path.join(__dirname, '../../frontend/dist')
await fastify.register(fastifyStatic, {
  root: staticPath,
  prefix: '/',
  decorateReply: false
})

// Serve uploaded files with custom headers for PDFs
const uploadsPath = path.join(__dirname, '../uploads')
await fastify.register(fastifyStatic, {
  root: uploadsPath,
  prefix: '/uploads/',
  decorateReply: false,
  setHeaders: (res, pathName) => {
    // For PDF files, set inline disposition to prevent auto-download
    if (pathName.endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'inline')
      res.setHeader('X-Content-Type-Options', 'nosniff')
    }
  }
})

// Serve index.html for SPA routes (must be after API routes)
fastify.setNotFoundHandler(async (request, reply) => {
  // If it's an API route, return 404
  if (request.url.startsWith('/api')) {
    return reply.status(404).send({ error: 'Not Found' })
  }
  // Otherwise serve index.html for SPA routing
  return reply.sendFile('index.html')
})

// Auth decorator
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' })
  }
})

fastify.decorate('authenticateAdmin', async function (request, reply) {
  try {
    await request.jwtVerify()
    if (request.user.role !== 'admin') {
      reply.status(403).send({ error: 'Forbidden - Admin only' })
    }
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' })
  }
})

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' })
fastify.register(kategoriRoutes, { prefix: '/api/kategori' })
fastify.register(modulRoutes, { prefix: '/api/modul' })
fastify.register(soalRoutes, { prefix: '/api/soal' })
fastify.register(testRoutes, { prefix: '/api/test' })
fastify.register(adminRoutes, { prefix: '/api/admin' })
fastify.register(userRoutes, { prefix: '/api/user' })
fastify.register(reportRoutes, { prefix: '/api/report' })
fastify.register(materiRoutes, { prefix: '/api/materi' })
fastify.register(periodeRoutes, { prefix: '/api/periode' })
fastify.register(lokasiRoutes, { prefix: '/api/lokasi' })
fastify.register(uploadRoutes, { prefix: '/api/upload' })

// Setup WebSocket
setupWebSocket(fastify)

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Graceful shutdown
const closeGracefully = async (signal) => {
  console.log(`Received signal to terminate: ${signal}`)
  await fastify.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`Server running on port ${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
