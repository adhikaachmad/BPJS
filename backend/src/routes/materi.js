export default async function materiRoutes(fastify, options) {
  const { prisma } = fastify

  // Get all materi for a modul
  fastify.get('/modul/:modulId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { modulId } = request.params
    const userId = request.user.id

    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) },
      include: {
        materis: {
          orderBy: { urutan: 'asc' }
        },
        subKategori: true
      }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul tidak ditemukan' })
    }

    // Check if user has access to this sub-kategori
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user.subKategoriId !== modul.subKategoriId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke modul ini' })
    }

    // Get progress for this modul
    const progress = await prisma.materiProgress.findUnique({
      where: {
        userId_modulId: {
          userId: userId,
          modulId: parseInt(modulId)
        }
      }
    })

    return {
      modul,
      materis: modul.materis,
      progress: progress || { isCompleted: false, completedAt: null }
    }
  })

  // Get single materi
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params
    const userId = request.user.id

    const materi = await prisma.materi.findUnique({
      where: { id: parseInt(id) },
      include: {
        modul: {
          include: { subKategori: true }
        }
      }
    })

    if (!materi) {
      return reply.status(404).send({ error: 'Materi tidak ditemukan' })
    }

    // Check if user has access
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user.subKategoriId !== materi.modul.subKategoriId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke materi ini' })
    }

    return materi
  })

  // Mark materi as completed for user
  fastify.post('/complete/:modulId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { modulId } = request.params
    const userId = request.user.id

    // Verify modul exists and is KUPAS_TUNTAS type
    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) },
      include: { subKategori: true }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul tidak ditemukan' })
    }

    if (modul.tipe !== 'KUPAS_TUNTAS') {
      return reply.status(400).send({ error: 'Hanya modul KUPAS TUNTAS yang dapat ditandai selesai' })
    }

    // Check if user has access
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user.subKategoriId !== modul.subKategoriId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke modul ini' })
    }

    // Upsert progress
    const progress = await prisma.materiProgress.upsert({
      where: {
        userId_modulId: {
          userId: userId,
          modulId: parseInt(modulId)
        }
      },
      update: {
        isCompleted: true,
        completedAt: new Date()
      },
      create: {
        userId: userId,
        modulId: parseInt(modulId),
        isCompleted: true,
        completedAt: new Date()
      }
    })

    return {
      message: 'Materi berhasil ditandai selesai',
      progress
    }
  })

  // Get user's materi progress for all moduls in a sub-kategori
  fastify.get('/progress/sub-kategori/:subKategoriId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { subKategoriId } = request.params
    const userId = request.user.id

    // Get all KUPAS_TUNTAS moduls for this sub-kategori
    const moduls = await prisma.modul.findMany({
      where: {
        subKategoriId: parseInt(subKategoriId),
        tipe: 'KUPAS_TUNTAS'
      }
    })

    const modulIds = moduls.map(m => m.id)

    // Get progress for all moduls
    const progress = await prisma.materiProgress.findMany({
      where: {
        userId: userId,
        modulId: { in: modulIds }
      }
    })

    // Create progress map
    const progressMap = {}
    for (const p of progress) {
      progressMap[p.modulId] = p
    }

    // Add progress to each modul
    const result = moduls.map(m => ({
      ...m,
      progress: progressMap[m.id] || { isCompleted: false, completedAt: null }
    }))

    return result
  })

  // Check if user can access JITU (quiz)
  fastify.get('/can-access-jitu/:subKategoriId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { subKategoriId } = request.params
    const userId = request.user.id

    // Find JITU modul for this sub-kategori to check schedule
    const jituModul = await prisma.modul.findFirst({
      where: {
        subKategoriId: parseInt(subKategoriId),
        tipe: 'JITU'
      }
    })

    // Check if JITU is scheduled and within time window
    if (jituModul && jituModul.isScheduled) {
      const now = new Date()
      if (jituModul.jadwalMulai && now < new Date(jituModul.jadwalMulai)) {
        const jadwalStr = new Date(jituModul.jadwalMulai).toLocaleString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
        return {
          canAccess: false,
          reason: `Quiz JITU belum dibuka. Jadwal: ${jadwalStr}`,
          scheduleInfo: {
            isScheduled: true,
            jadwalMulai: jituModul.jadwalMulai,
            jadwalSelesai: jituModul.jadwalSelesai,
            status: 'belum_mulai'
          }
        }
      }
      if (jituModul.jadwalSelesai && now > new Date(jituModul.jadwalSelesai)) {
        return {
          canAccess: false,
          reason: 'Waktu pengerjaan quiz JITU sudah berakhir',
          scheduleInfo: {
            isScheduled: true,
            jadwalMulai: jituModul.jadwalMulai,
            jadwalSelesai: jituModul.jadwalSelesai,
            status: 'sudah_selesai'
          }
        }
      }
    }

    // Find KUPAS_TUNTAS modul for this sub-kategori
    const kupasModul = await prisma.modul.findFirst({
      where: {
        subKategoriId: parseInt(subKategoriId),
        tipe: 'KUPAS_TUNTAS'
      }
    })

    if (!kupasModul) {
      // No KUPAS_TUNTAS, allow access to JITU
      return {
        canAccess: true,
        reason: null,
        scheduleInfo: jituModul?.isScheduled ? {
          isScheduled: true,
          jadwalMulai: jituModul.jadwalMulai,
          jadwalSelesai: jituModul.jadwalSelesai,
          status: 'dalam_jadwal'
        } : null
      }
    }

    // Check if user has completed the materi
    const progress = await prisma.materiProgress.findUnique({
      where: {
        userId_modulId: {
          userId: userId,
          modulId: kupasModul.id
        }
      }
    })

    if (progress && progress.isCompleted) {
      return {
        canAccess: true,
        reason: null,
        scheduleInfo: jituModul?.isScheduled ? {
          isScheduled: true,
          jadwalMulai: jituModul.jadwalMulai,
          jadwalSelesai: jituModul.jadwalSelesai,
          status: 'dalam_jadwal'
        } : null
      }
    }

    return {
      canAccess: false,
      reason: 'Anda harus menyelesaikan materi KUPAS TUNTAS terlebih dahulu'
    }
  })

  // Check if user can access DO-CHECK
  fastify.get('/can-access-docheck/:subKategoriId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { subKategoriId } = request.params
    const userId = request.user.id

    // Find DO-CHECK modul for this sub-kategori to check publish time
    const docheckModul = await prisma.modul.findFirst({
      where: {
        subKategoriId: parseInt(subKategoriId),
        tipe: 'DO_CHECK'
      }
    })

    // Check if DO-CHECK has publish time set and it's not yet published
    if (docheckModul && docheckModul.publishDoCheck) {
      const now = new Date()
      if (now < new Date(docheckModul.publishDoCheck)) {
        const publishStr = new Date(docheckModul.publishDoCheck).toLocaleString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
        return {
          canAccess: false,
          reason: `Pembahasan akan tersedia pada: ${publishStr}`,
          publishInfo: {
            publishDoCheck: docheckModul.publishDoCheck,
            status: 'belum_publish'
          }
        }
      }
    }

    // Find JITU modul for this sub-kategori
    const jituModul = await prisma.modul.findFirst({
      where: {
        subKategoriId: parseInt(subKategoriId),
        tipe: 'JITU'
      }
    })

    if (!jituModul) {
      return { canAccess: false, reason: 'Modul JITU tidak ditemukan' }
    }

    // Check if user has completed the quiz
    const testSession = await prisma.testSession.findFirst({
      where: {
        userId: userId,
        modulId: jituModul.id,
        isCompleted: true
      },
      include: {
        hasilTest: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (testSession && testSession.hasilTest) {
      return {
        canAccess: true,
        reason: null,
        testSessionId: testSession.id,
        hasilTest: testSession.hasilTest,
        publishInfo: docheckModul?.publishDoCheck ? {
          publishDoCheck: docheckModul.publishDoCheck,
          status: 'sudah_publish'
        } : null
      }
    }

    return {
      canAccess: false,
      reason: 'Anda harus menyelesaikan quiz JITU terlebih dahulu'
    }
  })

  // Admin: Create materi
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { judul, konten, videoUrl, pdfUrl, urutan, modulId } = request.body

    if (!judul || !konten || !modulId) {
      return reply.status(400).send({ error: 'Judul, konten, dan modulId wajib diisi' })
    }

    // Verify modul exists and is KUPAS_TUNTAS
    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul tidak ditemukan' })
    }

    if (modul.tipe !== 'KUPAS_TUNTAS') {
      return reply.status(400).send({ error: 'Materi hanya dapat ditambahkan ke modul KUPAS TUNTAS' })
    }

    const materi = await prisma.materi.create({
      data: {
        judul,
        konten,
        videoUrl,
        pdfUrl,
        urutan: urutan || 1,
        modulId: parseInt(modulId)
      }
    })

    return materi
  })

  // Admin: Update materi
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { judul, konten, videoUrl, pdfUrl, urutan } = request.body

    const materi = await prisma.materi.update({
      where: { id: parseInt(id) },
      data: { judul, konten, videoUrl, pdfUrl, urutan }
    })

    return materi
  })

  // Admin: Delete materi
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    await prisma.materi.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'Materi berhasil dihapus' }
  })
}
