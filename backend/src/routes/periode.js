export default async function periodeRoutes(fastify, options) {
  const { prisma } = fastify

  // ===============================
  // PERIODE TEST MANAGEMENT
  // ===============================

  // Get all periode tests for a sub-kategori
  fastify.get('/sub-kategori/:subKategoriId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { subKategoriId } = request.params

    const periodes = await prisma.periodeTest.findMany({
      where: { subKategoriId: parseInt(subKategoriId) },
      include: {
        _count: { select: { soals: true, materis: true } },
        subKategori: {
          include: { kategori: true }
        }
      },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }]
    })

    return periodes.map(p => ({
      ...p,
      jumlahSoal: p._count.soals,
      jumlahMateri: p._count.materis
    }))
  })

  // Get single periode with soals and materis
  fastify.get('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(id) },
      include: {
        soals: { orderBy: { urutan: 'asc' } },
        materis: { orderBy: { urutan: 'asc' } },
        subKategori: {
          include: { kategori: true }
        },
        _count: { select: { soals: true, materis: true, testSessions: true } }
      }
    })

    if (!periode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    return periode
  })

  // Create new periode test
  fastify.post('/', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { subKategoriId, bulan, tahun, tanggal, jamMulai, jamBerakhir, doCheckBerakhir } = request.body

    if (!subKategoriId || !bulan || !tahun) {
      return reply.status(400).send({ error: 'SubKategoriId, bulan, dan tahun wajib diisi' })
    }

    // Check if periode already exists
    const existing = await prisma.periodeTest.findUnique({
      where: {
        subKategoriId_bulan_tahun: {
          subKategoriId: parseInt(subKategoriId),
          bulan: parseInt(bulan),
          tahun: parseInt(tahun)
        }
      }
    })

    if (existing) {
      return reply.status(409).send({ error: 'Periode untuk bulan dan tahun ini sudah ada' })
    }

    const namaBulan = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]

    const periode = await prisma.periodeTest.create({
      data: {
        subKategoriId: parseInt(subKategoriId),
        bulan: parseInt(bulan),
        tahun: parseInt(tahun),
        nama: `${namaBulan[parseInt(bulan)]} ${tahun}`,
        tanggal: tanggal ? new Date(tanggal) : null,
        jamMulai: jamMulai ? new Date(jamMulai) : null,
        jamBerakhir: jamBerakhir ? new Date(jamBerakhir) : null,
        doCheckBerakhir: doCheckBerakhir ? new Date(doCheckBerakhir) : null,
        status: 'draft'
      },
      include: {
        subKategori: { include: { kategori: true } }
      }
    })

    return periode
  })

  // Update periode test
  fastify.put('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params
    const { tanggal, jamMulai, jamBerakhir, doCheckBerakhir, status } = request.body

    const periode = await prisma.periodeTest.update({
      where: { id: parseInt(id) },
      data: {
        tanggal: tanggal ? new Date(tanggal) : null,
        jamMulai: jamMulai ? new Date(jamMulai) : null,
        jamBerakhir: jamBerakhir ? new Date(jamBerakhir) : null,
        doCheckBerakhir: doCheckBerakhir ? new Date(doCheckBerakhir) : null,
        status: status || undefined
      },
      include: {
        subKategori: { include: { kategori: true } },
        _count: { select: { soals: true } }
      }
    })

    return periode
  })

  // Delete periode test (only if draft)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { testSessions: true } } }
    })

    if (!periode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    if (periode._count.testSessions > 0) {
      return reply.status(400).send({ error: 'Tidak bisa menghapus periode yang sudah memiliki data test session' })
    }

    await prisma.periodeTest.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'Periode berhasil dihapus' }
  })

  // Publish periode (change status to terjadwal)
  fastify.post('/:id/publish', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { soals: true } } }
    })

    if (!periode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    if (periode._count.soals === 0) {
      return reply.status(400).send({ error: 'Tidak bisa publish periode tanpa soal' })
    }

    if (!periode.tanggal || !periode.jamMulai || !periode.jamBerakhir) {
      return reply.status(400).send({ error: 'Lengkapi jadwal terlebih dahulu (tanggal, jam mulai, jam berakhir)' })
    }

    const updated = await prisma.periodeTest.update({
      where: { id: parseInt(id) },
      data: { status: 'terjadwal' }
    })

    return { message: 'Periode berhasil dipublish', periode: updated }
  })

  // ===============================
  // SOAL PERIODE MANAGEMENT
  // ===============================

  // Add single soal to periode
  fastify.post('/:periodeId/soal', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const { pertanyaan, opsiA, opsiB, opsiC, opsiD, jawabanBenar, pembahasan } = request.body

    if (!pertanyaan || !opsiA || !opsiB || !opsiC || !opsiD || !jawabanBenar) {
      return reply.status(400).send({ error: 'Semua field wajib diisi' })
    }

    if (!['A', 'B', 'C', 'D'].includes(jawabanBenar.toUpperCase())) {
      return reply.status(400).send({ error: 'Jawaban benar harus A, B, C, atau D' })
    }

    // Get max urutan
    const maxUrutan = await prisma.soalPeriode.aggregate({
      where: { periodeTestId: parseInt(periodeId) },
      _max: { urutan: true }
    })

    const soal = await prisma.soalPeriode.create({
      data: {
        periodeTestId: parseInt(periodeId),
        pertanyaan,
        opsiA,
        opsiB,
        opsiC,
        opsiD,
        jawabanBenar: jawabanBenar.toUpperCase(),
        pembahasan,
        urutan: (maxUrutan._max.urutan || 0) + 1
      }
    })

    return soal
  })

  // Update soal
  fastify.put('/soal/:soalId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { soalId } = request.params
    const { pertanyaan, opsiA, opsiB, opsiC, opsiD, jawabanBenar, pembahasan } = request.body

    const soal = await prisma.soalPeriode.update({
      where: { id: parseInt(soalId) },
      data: {
        pertanyaan,
        opsiA,
        opsiB,
        opsiC,
        opsiD,
        jawabanBenar: jawabanBenar?.toUpperCase(),
        pembahasan
      }
    })

    return soal
  })

  // Delete soal
  fastify.delete('/soal/:soalId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { soalId } = request.params

    await prisma.soalPeriode.delete({
      where: { id: parseInt(soalId) }
    })

    return { message: 'Soal berhasil dihapus' }
  })

  // Bulk delete soal
  fastify.post('/:periodeId/soal/bulk-delete', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const { soalIds } = request.body

    if (!soalIds || !Array.isArray(soalIds)) {
      return reply.status(400).send({ error: 'soalIds harus berupa array' })
    }

    await prisma.soalPeriode.deleteMany({
      where: {
        id: { in: soalIds.map(id => parseInt(id)) },
        periodeTestId: parseInt(periodeId)
      }
    })

    return { message: `${soalIds.length} soal berhasil dihapus` }
  })

  // ===============================
  // CSV UPLOAD & TEMPLATE
  // ===============================

  // Download CSV template
  fastify.get('/template/csv', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const csvContent = `pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,jawaban_benar,pembahasan
"Apa fungsi utama CCTV?","Dekorasi","Pengawasan keamanan","Penerangan","Komunikasi","B","CCTV berfungsi untuk pengawasan dan monitoring keamanan"
"Prosedur saat kebakaran adalah?","Lari panik","Gunakan lift","Ikuti jalur evakuasi","Sembunyi","C","Saat kebakaran harus mengikuti jalur evakuasi yang sudah ditentukan"`

    reply.header('Content-Type', 'text/csv')
    reply.header('Content-Disposition', 'attachment; filename="template_soal.csv"')
    return csvContent
  })

  // Upload CSV soal
  fastify.post('/:periodeId/upload-csv', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params

    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ error: 'File CSV tidak ditemukan' })
    }

    // Read file content
    const chunks = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const csvContent = Buffer.concat(chunks).toString('utf8')

    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return reply.status(400).send({ error: 'File CSV harus memiliki header dan minimal 1 baris data' })
    }

    // Skip header
    const dataLines = lines.slice(1)
    const soals = []
    const errors = []

    // Get current max urutan
    const maxUrutan = await prisma.soalPeriode.aggregate({
      where: { periodeTestId: parseInt(periodeId) },
      _max: { urutan: true }
    })
    let currentUrutan = maxUrutan._max.urutan || 0

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      try {
        // Parse CSV line (handle quoted values)
        const values = parseCSVLine(line)

        if (values.length < 6) {
          errors.push({ line: i + 2, error: 'Kolom tidak lengkap (minimal 6 kolom)' })
          continue
        }

        const [pertanyaan, opsiA, opsiB, opsiC, opsiD, jawabanBenar, pembahasan = ''] = values

        if (!pertanyaan || !opsiA || !opsiB || !opsiC || !opsiD || !jawabanBenar) {
          errors.push({ line: i + 2, error: 'Kolom wajib tidak boleh kosong' })
          continue
        }

        const jawaban = jawabanBenar.trim().toUpperCase()
        if (!['A', 'B', 'C', 'D'].includes(jawaban)) {
          errors.push({ line: i + 2, error: 'Jawaban benar harus A, B, C, atau D' })
          continue
        }

        currentUrutan++
        soals.push({
          periodeTestId: parseInt(periodeId),
          pertanyaan: pertanyaan.trim(),
          opsiA: opsiA.trim(),
          opsiB: opsiB.trim(),
          opsiC: opsiC.trim(),
          opsiD: opsiD.trim(),
          jawabanBenar: jawaban,
          pembahasan: pembahasan.trim() || null,
          urutan: currentUrutan
        })
      } catch (err) {
        errors.push({ line: i + 2, error: `Error parsing: ${err.message}` })
      }
    }

    if (soals.length === 0) {
      return reply.status(400).send({
        error: 'Tidak ada soal valid yang bisa diimport',
        errors
      })
    }

    // Bulk create soals
    await prisma.soalPeriode.createMany({ data: soals })

    return {
      message: `${soals.length} soal berhasil diimport`,
      imported: soals.length,
      errors: errors.length > 0 ? errors : undefined
    }
  })

  // Copy soals from another periode
  fastify.post('/:periodeId/copy-from/:sourceId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId, sourceId } = request.params

    const sourceSoals = await prisma.soalPeriode.findMany({
      where: { periodeTestId: parseInt(sourceId) },
      orderBy: { urutan: 'asc' }
    })

    if (sourceSoals.length === 0) {
      return reply.status(400).send({ error: 'Periode sumber tidak memiliki soal' })
    }

    // Get current max urutan in target
    const maxUrutan = await prisma.soalPeriode.aggregate({
      where: { periodeTestId: parseInt(periodeId) },
      _max: { urutan: true }
    })
    let currentUrutan = maxUrutan._max.urutan || 0

    const newSoals = sourceSoals.map(soal => ({
      periodeTestId: parseInt(periodeId),
      pertanyaan: soal.pertanyaan,
      opsiA: soal.opsiA,
      opsiB: soal.opsiB,
      opsiC: soal.opsiC,
      opsiD: soal.opsiD,
      jawabanBenar: soal.jawabanBenar,
      pembahasan: soal.pembahasan,
      urutan: ++currentUrutan
    }))

    await prisma.soalPeriode.createMany({ data: newSoals })

    return {
      message: `${newSoals.length} soal berhasil disalin`,
      copied: newSoals.length
    }
  })

  // Get available periode sources for copying (same sub-kategori, different periode)
  fastify.get('/:periodeId/copy-sources', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params

    const currentPeriode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(periodeId) }
    })

    if (!currentPeriode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    const sources = await prisma.periodeTest.findMany({
      where: {
        subKategoriId: currentPeriode.subKategoriId,
        id: { not: parseInt(periodeId) }
      },
      include: {
        _count: { select: { soals: true } }
      },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }]
    })

    return sources.filter(s => s._count.soals > 0).map(s => ({
      id: s.id,
      nama: s.nama,
      jumlahSoal: s._count.soals
    }))
  })

  // ===============================
  // MATERI PERIODE MANAGEMENT
  // ===============================

  // Get all materi for a periode
  fastify.get('/:periodeId/materi', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params

    const materis = await prisma.materiPeriode.findMany({
      where: { periodeTestId: parseInt(periodeId) },
      orderBy: { urutan: 'asc' }
    })

    return materis
  })

  // Get single materi
  fastify.get('/materi/:materiId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { materiId } = request.params

    const materi = await prisma.materiPeriode.findUnique({
      where: { id: parseInt(materiId) }
    })

    if (!materi) {
      return reply.status(404).send({ error: 'Materi tidak ditemukan' })
    }

    return materi
  })

  // Add materi to periode
  fastify.post('/:periodeId/materi', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const { judul, konten, videoType, videoUrl, videoFile, pdfFile } = request.body

    if (!judul || !konten) {
      return reply.status(400).send({ error: 'Judul dan konten wajib diisi' })
    }

    // Validate videoType if provided
    if (videoType && !['url', 'upload'].includes(videoType)) {
      return reply.status(400).send({ error: 'videoType harus url atau upload' })
    }

    // Get max urutan
    const maxUrutan = await prisma.materiPeriode.aggregate({
      where: { periodeTestId: parseInt(periodeId) },
      _max: { urutan: true }
    })

    const materi = await prisma.materiPeriode.create({
      data: {
        periodeTestId: parseInt(periodeId),
        judul,
        konten,
        videoType: videoType || null,
        videoUrl: videoType === 'url' ? videoUrl : null,
        videoFile: videoType === 'upload' ? videoFile : null,
        pdfFile: pdfFile || null,
        urutan: (maxUrutan._max.urutan || 0) + 1
      }
    })

    return materi
  })

  // Update materi
  fastify.put('/materi/:materiId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { materiId } = request.params
    const { judul, konten, videoType, videoUrl, videoFile, pdfFile, urutan } = request.body

    // Build update data
    const updateData = {}
    if (judul !== undefined) updateData.judul = judul
    if (konten !== undefined) updateData.konten = konten
    if (urutan !== undefined) updateData.urutan = parseInt(urutan)

    // Handle video fields
    if (videoType !== undefined) {
      updateData.videoType = videoType || null
      if (videoType === 'url') {
        updateData.videoUrl = videoUrl || null
        updateData.videoFile = null
      } else if (videoType === 'upload') {
        updateData.videoUrl = null
        updateData.videoFile = videoFile || null
      } else {
        updateData.videoUrl = null
        updateData.videoFile = null
      }
    }

    if (pdfFile !== undefined) updateData.pdfFile = pdfFile || null

    const materi = await prisma.materiPeriode.update({
      where: { id: parseInt(materiId) },
      data: updateData
    })

    return materi
  })

  // Delete materi
  fastify.delete('/materi/:materiId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { materiId } = request.params

    // Get materi to check for files to delete
    const materi = await prisma.materiPeriode.findUnique({
      where: { id: parseInt(materiId) }
    })

    if (!materi) {
      return reply.status(404).send({ error: 'Materi tidak ditemukan' })
    }

    // Delete the materi record
    await prisma.materiPeriode.delete({
      where: { id: parseInt(materiId) }
    })

    // Return file paths that should be deleted (frontend will handle actual deletion)
    return {
      message: 'Materi berhasil dihapus',
      filesToDelete: {
        videoFile: materi.videoFile,
        pdfFile: materi.pdfFile
      }
    }
  })

  // Reorder materi
  fastify.put('/:periodeId/materi/reorder', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const { orders } = request.body // Array of { id, urutan }

    if (!orders || !Array.isArray(orders)) {
      return reply.status(400).send({ error: 'orders harus berupa array' })
    }

    // Update each materi's order
    for (const order of orders) {
      await prisma.materiPeriode.update({
        where: { id: parseInt(order.id) },
        data: { urutan: parseInt(order.urutan) }
      })
    }

    return { message: 'Urutan materi berhasil diperbarui' }
  })

  // Copy materi from another periode
  fastify.post('/:periodeId/materi/copy-from/:sourceId', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId, sourceId } = request.params

    const sourceMateris = await prisma.materiPeriode.findMany({
      where: { periodeTestId: parseInt(sourceId) },
      orderBy: { urutan: 'asc' }
    })

    if (sourceMateris.length === 0) {
      return reply.status(400).send({ error: 'Periode sumber tidak memiliki materi' })
    }

    // Get current max urutan in target
    const maxUrutan = await prisma.materiPeriode.aggregate({
      where: { periodeTestId: parseInt(periodeId) },
      _max: { urutan: true }
    })
    let currentUrutan = maxUrutan._max.urutan || 0

    const newMateris = sourceMateris.map(materi => ({
      periodeTestId: parseInt(periodeId),
      judul: materi.judul,
      konten: materi.konten,
      videoType: materi.videoType,
      videoUrl: materi.videoUrl,
      videoFile: materi.videoFile, // Note: This copies the file path, not the actual file
      pdfFile: materi.pdfFile,     // Same here
      urutan: ++currentUrutan
    }))

    await prisma.materiPeriode.createMany({ data: newMateris })

    return {
      message: `${newMateris.length} materi berhasil disalin`,
      copied: newMateris.length
    }
  })

  // Get available periode sources for copying materi (same sub-kategori, different periode)
  fastify.get('/:periodeId/materi-copy-sources', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { periodeId } = request.params

    const currentPeriode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(periodeId) }
    })

    if (!currentPeriode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    const sources = await prisma.periodeTest.findMany({
      where: {
        subKategoriId: currentPeriode.subKategoriId,
        id: { not: parseInt(periodeId) }
      },
      include: {
        _count: { select: { materis: true } }
      },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }]
    })

    return sources.filter(s => s._count.materis > 0).map(s => ({
      id: s.id,
      nama: s.nama,
      jumlahMateri: s._count.materis
    }))
  })

  // ===============================
  // USER ENDPOINTS (Materi & Progress)
  // ===============================

  // Get active periode for user's sub-kategori (auto-detect based on current time)
  fastify.get('/user/active', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id
    const now = new Date()

    // Get user's sub-kategori
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subKategori: true }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    // First, update statuses for this sub-kategori's periodes
    await updatePeriodeStatuses(prisma, user.subKategoriId)

    // Find active or most recent periode for this sub-kategori
    // Priority: aktif > docheck > terjadwal (upcoming)
    let periode = await prisma.periodeTest.findFirst({
      where: {
        subKategoriId: user.subKategoriId,
        status: 'aktif'
      },
      include: {
        subKategori: { include: { kategori: true } },
        _count: { select: { soals: true, materis: true } }
      }
    })

    // If no active, check for docheck
    if (!periode) {
      periode = await prisma.periodeTest.findFirst({
        where: {
          subKategoriId: user.subKategoriId,
          status: 'docheck'
        },
        include: {
          subKategori: { include: { kategori: true } },
          _count: { select: { soals: true, materis: true } }
        },
        orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }]
      })
    }

    // If no docheck, check for upcoming scheduled
    if (!periode) {
      periode = await prisma.periodeTest.findFirst({
        where: {
          subKategoriId: user.subKategoriId,
          status: 'terjadwal',
          jamMulai: { gte: now }
        },
        include: {
          subKategori: { include: { kategori: true } },
          _count: { select: { soals: true, materis: true } }
        },
        orderBy: { jamMulai: 'asc' }
      })
    }

    if (!periode) {
      return reply.status(404).send({
        error: 'Tidak ada periode aktif',
        message: 'Belum ada periode test yang dijadwalkan untuk kategori Anda'
      })
    }

    // Get user's progress for this periode
    const [materiProgress, testSession] = await Promise.all([
      prisma.materiProgressPeriode.findUnique({
        where: {
          userId_periodeTestId: {
            userId: user.id,
            periodeTestId: periode.id
          }
        }
      }),
      prisma.testSessionPeriode.findUnique({
        where: {
          userId_periodeTestId: {
            userId: user.id,
            periodeTestId: periode.id
          }
        },
        include: {
          hasilTest: true
        }
      })
    ])

    return {
      id: periode.id,
      nama: periode.nama,
      bulan: periode.bulan,
      tahun: periode.tahun,
      status: periode.status,
      tanggal: periode.tanggal,
      jamMulai: periode.jamMulai,
      jamBerakhir: periode.jamBerakhir,
      doCheckBerakhir: periode.doCheckBerakhir,
      subKategori: periode.subKategori,
      jumlahSoal: periode._count.soals,
      jumlahMateri: periode._count.materis,
      userProgress: {
        materiCompleted: materiProgress?.isCompleted || false,
        materiCompletedAt: materiProgress?.completedAt || null,
        testCompleted: testSession?.isCompleted || false,
        testSessionId: testSession?.id || null,
        hasilTest: testSession?.hasilTest || null
      }
    }
  })

  // Get all periodes for user's sub-kategori (history)
  fastify.get('/user/history', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User tidak ditemukan' })
    }

    const periodes = await prisma.periodeTest.findMany({
      where: {
        subKategoriId: user.subKategoriId,
        status: { in: ['aktif', 'docheck', 'selesai'] }
      },
      include: {
        _count: { select: { soals: true, materis: true } },
        testSessions: {
          where: { userId: user.id },
          include: { hasilTest: true }
        },
        materiProgress: {
          where: { userId: user.id }
        }
      },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }]
    })

    return periodes.map(p => ({
      id: p.id,
      nama: p.nama,
      bulan: p.bulan,
      tahun: p.tahun,
      status: p.status,
      jumlahSoal: p._count.soals,
      jumlahMateri: p._count.materis,
      userProgress: {
        materiCompleted: p.materiProgress[0]?.isCompleted || false,
        testCompleted: p.testSessions[0]?.isCompleted || false,
        hasilTest: p.testSessions[0]?.hasilTest || null
      }
    }))
  })

  // Get periode for user (public info only)
  fastify.get('/user/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params
    const userId = request.user.id

    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(id) },
      include: {
        subKategori: {
          include: { kategori: true }
        },
        _count: { select: { soals: true, materis: true } }
      }
    })

    if (!periode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    // Check if user belongs to this sub-kategori
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user.subKategoriId !== periode.subKategoriId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke periode ini' })
    }

    return {
      id: periode.id,
      nama: periode.nama,
      bulan: periode.bulan,
      tahun: periode.tahun,
      status: periode.status,
      subKategori: periode.subKategori,
      jumlahSoal: periode._count.soals,
      jumlahMateri: periode._count.materis
    }
  })

  // Get materi for user (no admin auth required)
  fastify.get('/user/:periodeId/materi', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const userId = request.user.id

    // Verify user access to this periode
    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(periodeId) }
    })

    if (!periode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user.subKategoriId !== periode.subKategoriId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke materi ini' })
    }

    const materis = await prisma.materiPeriode.findMany({
      where: { periodeTestId: parseInt(periodeId) },
      orderBy: { urutan: 'asc' }
    })

    return materis
  })

  // Get materi progress for user
  fastify.get('/user/:periodeId/materi-progress', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const userId = request.user.id

    const progress = await prisma.materiProgressPeriode.findUnique({
      where: {
        userId_periodeTestId: {
          userId: parseInt(userId),
          periodeTestId: parseInt(periodeId)
        }
      }
    })

    return progress || { isCompleted: false }
  })

  // Mark materi as completed for user
  fastify.post('/user/:periodeId/materi-progress/complete', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const userId = request.user.id

    // Verify user access to this periode
    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(periodeId) }
    })

    if (!periode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user.subKategoriId !== periode.subKategoriId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke materi ini' })
    }

    // Upsert progress
    const progress = await prisma.materiProgressPeriode.upsert({
      where: {
        userId_periodeTestId: {
          userId: parseInt(userId),
          periodeTestId: parseInt(periodeId)
        }
      },
      create: {
        userId: parseInt(userId),
        periodeTestId: parseInt(periodeId),
        isCompleted: true,
        completedAt: new Date()
      },
      update: {
        isCompleted: true,
        completedAt: new Date()
      }
    })

    return progress
  })

  // ===============================
  // USER TEST ENDPOINTS
  // ===============================

  // Start or get test session for a periode
  fastify.post('/user/:periodeId/test/start', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const userId = request.user.id

    // Verify periode exists and is accessible
    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(periodeId) },
      include: { _count: { select: { soals: true } } }
    })

    if (!periode) {
      return reply.status(404).send({ error: 'Periode tidak ditemukan' })
    }

    // Check if periode is active
    if (periode.status !== 'aktif') {
      return reply.status(400).send({
        error: 'Test belum dapat diakses',
        message: periode.status === 'terjadwal'
          ? 'Test belum dimulai, silakan tunggu jadwal'
          : periode.status === 'docheck'
            ? 'Waktu pengerjaan sudah berakhir'
            : 'Periode tidak aktif'
      })
    }

    // Check user access
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user.subKategoriId !== periode.subKategoriId) {
      return reply.status(403).send({ error: 'Anda tidak memiliki akses ke test ini' })
    }

    // Check if materi is completed
    const materiProgress = await prisma.materiProgressPeriode.findUnique({
      where: {
        userId_periodeTestId: {
          userId: user.id,
          periodeTestId: periode.id
        }
      }
    })

    if (!materiProgress?.isCompleted) {
      return reply.status(400).send({
        error: 'Selesaikan materi terlebih dahulu',
        message: 'Anda harus membaca dan menyelesaikan materi sebelum mengerjakan test'
      })
    }

    // Check if already has session
    let session = await prisma.testSessionPeriode.findUnique({
      where: {
        userId_periodeTestId: {
          userId: user.id,
          periodeTestId: periode.id
        }
      },
      include: {
        jawabans: true,
        hasilTest: true
      }
    })

    // If already completed, return the result
    if (session?.isCompleted) {
      return reply.status(400).send({
        error: 'Test sudah selesai',
        message: 'Anda sudah menyelesaikan test ini',
        hasilTest: session.hasilTest
      })
    }

    // Create new session if not exists
    if (!session) {
      session = await prisma.testSessionPeriode.create({
        data: {
          userId: user.id,
          periodeTestId: periode.id,
          startTime: new Date()
        },
        include: {
          jawabans: true
        }
      })
    }

    // Get soals
    const soals = await prisma.soalPeriode.findMany({
      where: { periodeTestId: periode.id },
      orderBy: { urutan: 'asc' },
      select: {
        id: true,
        pertanyaan: true,
        opsiA: true,
        opsiB: true,
        opsiC: true,
        opsiD: true,
        urutan: true
        // Note: jawabanBenar dan pembahasan tidak dikirim saat test
      }
    })

    return {
      sessionId: session.id,
      periodeId: periode.id,
      periodeName: periode.nama,
      startTime: session.startTime,
      soals,
      jawabans: session.jawabans.map(j => ({
        soalPeriodeId: j.soalPeriodeId,
        jawaban: j.jawaban
      }))
    }
  })

  // Submit answer for a soal
  fastify.post('/user/:periodeId/test/answer', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const { soalPeriodeId, jawaban } = request.body
    const userId = request.user.id

    // Get session
    const session = await prisma.testSessionPeriode.findUnique({
      where: {
        userId_periodeTestId: {
          userId,
          periodeTestId: parseInt(periodeId)
        }
      }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Session tidak ditemukan' })
    }

    if (session.isCompleted) {
      return reply.status(400).send({ error: 'Test sudah selesai' })
    }

    // Validate jawaban
    if (jawaban && !['A', 'B', 'C', 'D'].includes(jawaban.toUpperCase())) {
      return reply.status(400).send({ error: 'Jawaban harus A, B, C, atau D' })
    }

    // Upsert jawaban
    const jawabanRecord = await prisma.jawabanPeriode.upsert({
      where: {
        testSessionPeriodeId_soalPeriodeId: {
          testSessionPeriodeId: session.id,
          soalPeriodeId: parseInt(soalPeriodeId)
        }
      },
      create: {
        testSessionPeriodeId: session.id,
        soalPeriodeId: parseInt(soalPeriodeId),
        jawaban: jawaban ? jawaban.toUpperCase() : null
      },
      update: {
        jawaban: jawaban ? jawaban.toUpperCase() : null
      }
    })

    return { success: true, jawaban: jawabanRecord }
  })

  // Submit test (finish)
  fastify.post('/user/:periodeId/test/submit', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const userId = request.user.id

    // Get session with jawabans
    const session = await prisma.testSessionPeriode.findUnique({
      where: {
        userId_periodeTestId: {
          userId,
          periodeTestId: parseInt(periodeId)
        }
      },
      include: { jawabans: true }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Session tidak ditemukan' })
    }

    if (session.isCompleted) {
      return reply.status(400).send({ error: 'Test sudah disubmit sebelumnya' })
    }

    // Get all soals for this periode
    const soals = await prisma.soalPeriode.findMany({
      where: { periodeTestId: parseInt(periodeId) }
    })

    // Calculate score
    let benar = 0
    let salah = 0
    let tidakDijawab = 0

    for (const soal of soals) {
      const jawaban = session.jawabans.find(j => j.soalPeriodeId === soal.id)
      if (!jawaban || !jawaban.jawaban) {
        tidakDijawab++
      } else if (jawaban.jawaban === soal.jawabanBenar) {
        benar++
      } else {
        salah++
      }
    }

    const totalSoal = soals.length
    const skor = totalSoal > 0 ? (benar / totalSoal) * 100 : 0

    // Update session and create hasil
    const [updatedSession, hasilTest] = await prisma.$transaction([
      prisma.testSessionPeriode.update({
        where: { id: session.id },
        data: {
          isCompleted: true,
          endTime: new Date()
        }
      }),
      prisma.hasilTestPeriode.create({
        data: {
          testSessionPeriodeId: session.id,
          totalSoal,
          benar,
          salah,
          tidakDijawab,
          skor
        }
      })
    ])

    return {
      success: true,
      hasilTest: {
        totalSoal,
        benar,
        salah,
        tidakDijawab,
        skor: Math.round(skor * 100) / 100
      }
    }
  })

  // Get test result for do-check
  fastify.get('/user/:periodeId/test/result', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { periodeId } = request.params
    const userId = request.user.id

    // Get session with results
    const session = await prisma.testSessionPeriode.findUnique({
      where: {
        userId_periodeTestId: {
          userId,
          periodeTestId: parseInt(periodeId)
        }
      },
      include: {
        jawabans: true,
        hasilTest: true,
        periodeTest: true
      }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Anda belum mengerjakan test ini' })
    }

    if (!session.isCompleted) {
      return reply.status(400).send({ error: 'Test belum diselesaikan' })
    }

    // Check if do-check is available
    const isDoCheckAvailable = session.periodeTest.status === 'docheck' || session.periodeTest.status === 'selesai'

    // Get soals (include jawaban benar dan pembahasan only if docheck available)
    const soals = await prisma.soalPeriode.findMany({
      where: { periodeTestId: parseInt(periodeId) },
      orderBy: { urutan: 'asc' }
    })

    const soalsWithAnswer = soals.map(soal => {
      const userJawaban = session.jawabans.find(j => j.soalPeriodeId === soal.id)
      return {
        id: soal.id,
        pertanyaan: soal.pertanyaan,
        opsiA: soal.opsiA,
        opsiB: soal.opsiB,
        opsiC: soal.opsiC,
        opsiD: soal.opsiD,
        urutan: soal.urutan,
        userJawaban: userJawaban?.jawaban || null,
        // Only show correct answer and pembahasan if do-check is available
        jawabanBenar: isDoCheckAvailable ? soal.jawabanBenar : null,
        pembahasan: isDoCheckAvailable ? soal.pembahasan : null,
        isCorrect: isDoCheckAvailable ? (userJawaban?.jawaban === soal.jawabanBenar) : null
      }
    })

    return {
      sessionId: session.id,
      periodeId: session.periodeTestId,
      periodeName: session.periodeTest.nama,
      status: session.periodeTest.status,
      isDoCheckAvailable,
      startTime: session.startTime,
      endTime: session.endTime,
      hasilTest: session.hasilTest,
      soals: soalsWithAnswer
    }
  })

  // ===============================
  // STATUS UPDATE (CRON-like)
  // ===============================

  // Update all periode statuses based on current time
  fastify.post('/update-statuses', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const now = new Date()

    // Get all non-selesai periodes
    const periodes = await prisma.periodeTest.findMany({
      where: { status: { not: 'selesai' } }
    })

    let updated = 0

    for (const periode of periodes) {
      let newStatus = periode.status

      if (periode.status === 'draft') continue

      if (periode.jamMulai && periode.jamBerakhir) {
        const mulai = new Date(periode.jamMulai)
        const berakhir = new Date(periode.jamBerakhir)
        const doCheckEnd = periode.doCheckBerakhir ? new Date(periode.doCheckBerakhir) : null

        if (now >= mulai && now < berakhir) {
          newStatus = 'aktif'
        } else if (now >= berakhir) {
          if (doCheckEnd && now >= doCheckEnd) {
            newStatus = 'selesai'
          } else {
            newStatus = 'docheck'
          }
        } else {
          newStatus = 'terjadwal'
        }
      }

      if (newStatus !== periode.status) {
        await prisma.periodeTest.update({
          where: { id: periode.id },
          data: { status: newStatus }
        })
        updated++
      }
    }

    return { message: `${updated} periode status diperbarui` }
  })
}

// Helper function to update periode statuses based on current time
async function updatePeriodeStatuses(prisma, subKategoriId = null) {
  const now = new Date()

  const whereClause = { status: { notIn: ['selesai', 'draft'] } }
  if (subKategoriId) {
    whereClause.subKategoriId = subKategoriId
  }

  const periodes = await prisma.periodeTest.findMany({
    where: whereClause
  })

  for (const periode of periodes) {
    let newStatus = periode.status

    if (periode.jamMulai && periode.jamBerakhir) {
      const mulai = new Date(periode.jamMulai)
      const berakhir = new Date(periode.jamBerakhir)
      const doCheckEnd = periode.doCheckBerakhir ? new Date(periode.doCheckBerakhir) : null

      if (now >= mulai && now < berakhir) {
        newStatus = 'aktif'
      } else if (now >= berakhir) {
        if (doCheckEnd && now >= doCheckEnd) {
          newStatus = 'selesai'
        } else {
          newStatus = 'docheck'
        }
      } else {
        newStatus = 'terjadwal'
      }
    }

    if (newStatus !== periode.status) {
      await prisma.periodeTest.update({
        where: { id: periode.id },
        data: { status: newStatus }
      })
    }
  }
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && !inQuotes) {
      inQuotes = true
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = false
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}
