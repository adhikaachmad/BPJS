import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Upload directories
const UPLOAD_DIR = path.join(__dirname, '../../uploads')
const VIDEO_DIR = path.join(UPLOAD_DIR, 'videos')
const PDF_DIR = path.join(UPLOAD_DIR, 'pdfs')

// Allowed file types
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const ALLOWED_PDF_TYPES = ['application/pdf']

// Max file sizes (in bytes)
const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB (no practical limit for videos)
// No limit for PDF - removed as per request

export default async function uploadRoutes(fastify, options) {
  const { prisma } = fastify

  // Upload video file
  fastify.post('/video', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    try {
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      // Check file type
      if (!ALLOWED_VIDEO_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Invalid file type. Allowed: MP4, WebM, OGG'
        })
      }

      // Read file buffer
      const buffer = await data.toBuffer()

      // Check file size
      if (buffer.length > MAX_VIDEO_SIZE) {
        return reply.status(400).send({
          error: 'File too large. Maximum size: 100MB'
        })
      }

      // Generate unique filename
      const ext = path.extname(data.filename) || '.mp4'
      const filename = `${randomUUID()}${ext}`
      const filepath = path.join(VIDEO_DIR, filename)

      // Ensure directory exists
      if (!fs.existsSync(VIDEO_DIR)) {
        fs.mkdirSync(VIDEO_DIR, { recursive: true })
      }

      // Save file
      fs.writeFileSync(filepath, buffer)

      return {
        success: true,
        filename,
        path: `/uploads/videos/${filename}`,
        size: buffer.length,
        mimetype: data.mimetype
      }
    } catch (err) {
      console.error('Video upload error:', err)
      return reply.status(500).send({ error: 'Failed to upload video' })
    }
  })

  // Upload PDF file
  fastify.post('/pdf', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    try {
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      // Check file type
      if (!ALLOWED_PDF_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Invalid file type. Only PDF allowed'
        })
      }

      // Read file buffer
      const buffer = await data.toBuffer()

      // No size limit for PDF

      // Generate unique filename
      const ext = '.pdf'
      const filename = `${randomUUID()}${ext}`
      const filepath = path.join(PDF_DIR, filename)

      // Ensure directory exists
      if (!fs.existsSync(PDF_DIR)) {
        fs.mkdirSync(PDF_DIR, { recursive: true })
      }

      // Save file
      fs.writeFileSync(filepath, buffer)

      return {
        success: true,
        filename,
        path: `/uploads/pdfs/${filename}`,
        size: buffer.length,
        mimetype: data.mimetype
      }
    } catch (err) {
      console.error('PDF upload error:', err)
      return reply.status(500).send({ error: 'Failed to upload PDF' })
    }
  })

  // Delete uploaded file
  fastify.delete('/file', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { filepath } = request.body

    if (!filepath) {
      return reply.status(400).send({ error: 'Filepath is required' })
    }

    // Security check - only allow deletion from uploads directory
    const normalizedPath = path.normalize(filepath)
    if (!normalizedPath.startsWith('/uploads/')) {
      return reply.status(400).send({ error: 'Invalid file path' })
    }

    const fullPath = path.join(__dirname, '../..', normalizedPath)

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        return { success: true, message: 'File deleted' }
      } else {
        return reply.status(404).send({ error: 'File not found' })
      }
    } catch (err) {
      console.error('Delete file error:', err)
      return reply.status(500).send({ error: 'Failed to delete file' })
    }
  })

  // Serve PDF with protection (no direct download headers)
  fastify.get('/pdf/view/:filename', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { filename } = request.params

    // Security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return reply.status(400).send({ error: 'Invalid filename' })
    }

    const filepath = path.join(PDF_DIR, filename)

    if (!fs.existsSync(filepath)) {
      return reply.status(404).send({ error: 'File not found' })
    }

    const fileBuffer = fs.readFileSync(filepath)

    // Set headers to discourage download
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', 'inline') // Display in browser, not download
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    reply.header('X-Content-Type-Options', 'nosniff')

    return reply.send(fileBuffer)
  })

  // Serve PDF as binary data for canvas rendering (prevents browser auto-download)
  // Using POST to bypass browser's automatic PDF download detection
  fastify.post('/pdf/fetch', async (request, reply) => {
    const { filename } = request.body

    if (!filename) {
      return reply.status(400).send({ error: 'Filename required' })
    }

    // Extract just the filename if full path provided
    const cleanFilename = filename.includes('/') ? filename.split('/').pop() : filename

    // Security check - prevent directory traversal
    if (cleanFilename.includes('..')) {
      return reply.status(400).send({ error: 'Invalid filename' })
    }

    const filepath = path.join(PDF_DIR, cleanFilename)

    if (!fs.existsSync(filepath)) {
      return reply.status(404).send({ error: 'File not found' })
    }

    const fileBuffer = fs.readFileSync(filepath)

    // Return as base64 to completely avoid any download behavior
    return {
      success: true,
      data: fileBuffer.toString('base64'),
      size: fileBuffer.length
    }
  })

  // Serve PDF with token in query parameter (for iframe/embed use)
  fastify.get('/pdf/embed/:filename', async (request, reply) => {
    const { filename } = request.params
    const { token } = request.query

    // Validate token
    if (!token) {
      return reply.status(401).send({ error: 'Token required' })
    }

    try {
      // Verify JWT token
      const decoded = fastify.jwt.verify(token)
      if (!decoded || !decoded.id) {
        return reply.status(401).send({ error: 'Invalid token' })
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }

    // Security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return reply.status(400).send({ error: 'Invalid filename' })
    }

    const filepath = path.join(PDF_DIR, filename)

    if (!fs.existsSync(filepath)) {
      return reply.status(404).send({ error: 'File not found' })
    }

    // Stream file instead of reading entire buffer
    const stream = fs.createReadStream(filepath)

    // Set headers to discourage download
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', 'inline')
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    reply.header('X-Content-Type-Options', 'nosniff')
    // Disable download in some browsers
    reply.header('X-Download-Options', 'noopen')

    return reply.send(stream)
  })
}
