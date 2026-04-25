import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { PrismaClient } from '../generated/prisma-client/index.js'
import path from 'path'
import fs from 'fs'
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
import stepConfigRoutes from './routes/step-config.js'

// Import WebSocket handlers
import { setupWebSocket } from './websocket/handlers.js'

const prisma = new PrismaClient()

// Logger config:
// - In production: redact PII / secrets from request/response logs so audit
//   logs and access logs don't leak credentials, tokens, or NPP-level PII.
//   Pentest finding #21.
// - In dev: keep full logs for debugging.
const isProd = process.env.NODE_ENV === 'production'
const fastify = Fastify({
  logger: isProd
    ? {
        level: process.env.LOG_LEVEL || 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.headers["x-auth-token"]',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.defaultPassword',
            'req.body.token',
            'req.body.csvData',
            'req.body.users[*].password',
            'req.query.token',
            'res.headers["set-cookie"]'
          ],
          censor: '[REDACTED]'
        }
      }
    : true,
  trustProxy: true
})

// Decorate fastify with prisma
fastify.decorate('prisma', prisma)

// Register plugins

// CORS origins from env. Falls back to localhost dev origins only — production must set CORS_ORIGINS.
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean)
await fastify.register(cors, {
  origin: corsOrigins,
  credentials: true
})

// Security headers (helmet). CSP is permissive enough to keep Vite-built frontend + inline PDF viewer working.
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vue runtime + PDF.js
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      objectSrc: ["'self'", 'blob:'], // PDF embed
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false, // PDF/video embeds break with COEP
  crossOriginResourcePolicy: { policy: 'cross-origin' }
})

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters. Set it in .env')
}
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET
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
// SECURITY: only serve frontend/dist; never fall back to backend folder (would expose .env, source, schema)
const distPath = path.join(__dirname, '../../frontend/dist')
if (!fs.existsSync(distPath)) {
  throw new Error(`Frontend build not found at ${distPath}. Run "npm run build" in frontend/ first. Refusing to start to avoid exposing backend files.`)
}
await fastify.register(fastifyStatic, {
  root: distPath,
  prefix: '/',
  decorateReply: true
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

// Reject tokens issued before the account's tokensInvalidBefore timestamp
// (set on logout or password change). Returns true if token is revoked.
async function isTokenRevoked(request) {
  const { id, role, iat } = request.user
  if (!iat) return false
  const issuedAt = iat * 1000 // JWT iat is seconds, we compare to ms
  if (role === 'admin') {
    const admin = await prisma.admin.findUnique({ where: { id }, select: { tokensInvalidBefore: true } })
    return admin?.tokensInvalidBefore && issuedAt < admin.tokensInvalidBefore.getTime()
  }
  const user = await prisma.user.findUnique({ where: { id }, select: { tokensInvalidBefore: true } })
  return user?.tokensInvalidBefore && issuedAt < user.tokensInvalidBefore.getTime()
}

// Auth decorator
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify()
    if (await isTokenRevoked(request)) {
      return reply.status(401).send({ error: 'Session expired, please login again' })
    }
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
})

fastify.decorate('authenticateAdmin', async function (request, reply) {
  try {
    await request.jwtVerify()
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden - Admin only' })
    }
    if (await isTokenRevoked(request)) {
      return reply.status(401).send({ error: 'Session expired, please login again' })
    }
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
})

// Check admin role decorator
fastify.decorate('checkAdminRole', function (allowedRoles) {
  return async function (request, reply) {
    const adminRole = request.user.adminRole
    if (!allowedRoles.includes(adminRole)) {
      return reply.status(403).send({
        error: 'Akses ditolak. Anda tidak memiliki izin untuk fitur ini.',
        requiredRoles: allowedRoles,
        yourRole: adminRole
      })
    }
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
fastify.register(stepConfigRoutes, { prefix: '/api' })

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
