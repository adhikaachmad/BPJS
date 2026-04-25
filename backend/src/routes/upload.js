import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { fileTypeFromBuffer } from 'file-type'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Upload directories
const UPLOAD_DIR = path.join(__dirname, '../../uploads')
const VIDEO_DIR = path.join(UPLOAD_DIR, 'videos')
const PDF_DIR = path.join(UPLOAD_DIR, 'pdfs')

const IMAGE_DIR = path.join(UPLOAD_DIR, 'images')

// Allowed file types — keep MIME whitelist AND validate magic bytes (file-type lib).
// Client-provided Content-Type alone is spoofable.
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const ALLOWED_PDF_TYPES = ['application/pdf']
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

// Max file sizes (bytes). Hard limits to prevent disk-exhaustion DoS.
const MAX_VIDEO_SIZE = 500 * 1024 * 1024  // 500 MB
const MAX_PDF_SIZE   = 50  * 1024 * 1024  // 50 MB
const MAX_IMAGE_SIZE = 10  * 1024 * 1024  // 10 MB

// Magic-byte verification: ensure the actual file content matches one of the allowed MIME types.
// Returns null on success, or an error message string.
async function verifyMagicBytes(buffer, allowedMimes) {
  const detected = await fileTypeFromBuffer(buffer)
  if (!detected) {
    return 'File content unrecognized — cannot verify type'
  }
  // jpeg vs jpg normalization
  const normalized = detected.mime === 'image/jpeg' && allowedMimes.includes('image/jpg')
    ? 'image/jpg' : detected.mime
  if (!allowedMimes.includes(normalized) && !allowedMimes.includes(detected.mime)) {
    return `File content (${detected.mime}) does not match allowed types`
  }
  return null
}

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
          error: 'File too large. Maximum size: 500MB'
        })
      }

      // Verify actual file content matches claimed type (magic bytes)
      const magicError = await verifyMagicBytes(buffer, ALLOWED_VIDEO_TYPES)
      if (magicError) {
        return reply.status(400).send({ error: magicError })
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

      // Hard size cap to prevent disk-exhaustion DoS
      if (buffer.length > MAX_PDF_SIZE) {
        return reply.status(400).send({
          error: 'File too large. Maximum size: 50MB'
        })
      }

      // Verify actual file content matches claimed type (magic bytes)
      const magicError = await verifyMagicBytes(buffer, ALLOWED_PDF_TYPES)
      if (magicError) {
        return reply.status(400).send({ error: magicError })
      }

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

  // Upload image file
  fastify.post('/image', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    try {
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Invalid file type. Allowed: PNG, JPG, WebP'
        })
      }

      const buffer = await data.toBuffer()

      if (buffer.length > MAX_IMAGE_SIZE) {
        return reply.status(400).send({
          error: 'File too large. Maximum size: 10MB'
        })
      }

      // Verify actual file content matches claimed type (magic bytes)
      const magicError = await verifyMagicBytes(buffer, ALLOWED_IMAGE_TYPES)
      if (magicError) {
        return reply.status(400).send({ error: magicError })
      }

      const ext = path.extname(data.filename) || '.png'
      const filename = `${randomUUID()}${ext}`
      const filepath = path.join(IMAGE_DIR, filename)

      if (!fs.existsSync(IMAGE_DIR)) {
        fs.mkdirSync(IMAGE_DIR, { recursive: true })
      }

      fs.writeFileSync(filepath, buffer)

      return {
        success: true,
        filename,
        path: `/uploads/images/${filename}`,
        size: buffer.length,
        mimetype: data.mimetype
      }
    } catch (err) {
      console.error('Image upload error:', err)
      return reply.status(500).send({ error: 'Failed to upload image' })
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
  fastify.post('/pdf/fetch', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
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
