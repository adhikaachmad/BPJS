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
        _count: { select: { soals: true } },
        subKategori: {
          include: { kategori: true }
        }
      },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }]
    })

    return periodes.map(p => ({
      ...p,
      jumlahSoal: p._count.soals
    }))
  })

  // Get single periode with soals
  fastify.get('/:id', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { id } = request.params

    const periode = await prisma.periodeTest.findUnique({
      where: { id: parseInt(id) },
      include: {
        soals: { orderBy: { urutan: 'asc' } },
        subKategori: {
          include: { kategori: true }
        },
        _count: { select: { soals: true, testSessions: true } }
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
