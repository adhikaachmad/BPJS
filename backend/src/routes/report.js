import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

export default async function reportRoutes(fastify, options) {
  const { prisma } = fastify

  // Helper function to build where clause with periode filter
  function buildWhereClause(query) {
    const { kategoriId, subKategoriId, modulId, periodeBulan, periodeTahun } = query
    const where = { isCompleted: true }

    if (modulId) {
      where.modulId = parseInt(modulId)
    } else if (subKategoriId) {
      where.modul = { subKategoriId: parseInt(subKategoriId) }
    } else if (kategoriId) {
      where.modul = { subKategori: { kategoriId: parseInt(kategoriId) } }
    }

    // Filter by periode (month and year)
    if (periodeBulan || periodeTahun) {
      where.endTime = {}

      if (periodeBulan && periodeTahun) {
        // Filter by specific month and year
        const year = parseInt(periodeTahun)
        const month = parseInt(periodeBulan) - 1 // JavaScript months are 0-indexed
        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
        where.endTime.gte = startOfMonth
        where.endTime.lte = endOfMonth
      } else if (periodeTahun) {
        // Filter by year only
        const year = parseInt(periodeTahun)
        where.endTime.gte = new Date(year, 0, 1)
        where.endTime.lte = new Date(year, 11, 31, 23, 59, 59)
      } else if (periodeBulan) {
        // Filter by month only (current year)
        const year = new Date().getFullYear()
        const month = parseInt(periodeBulan) - 1
        where.endTime.gte = new Date(year, month, 1)
        where.endTime.lte = new Date(year, month + 1, 0, 23, 59, 59)
      }
    }

    return where
  }

  // Helper to get month name
  function getMonthName(month) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return months[month - 1] || ''
  }

  // Export results to Excel
  fastify.get('/export/excel', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const where = buildWhereClause(request.query)
    const { periodeBulan, periodeTahun } = request.query

    const results = await prisma.testSession.findMany({
      where,
      include: {
        user: true,
        modul: {
          include: {
            subKategori: {
              include: { kategori: true }
            }
          }
        },
        hasilTest: true
      },
      orderBy: { endTime: 'desc' }
    })

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BPJS Kuesioner System'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Hasil Test')

    // Header styling - Updated with new columns
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NPP', key: 'npp', width: 15 },
      { header: 'Nama', key: 'nama', width: 25 },
      { header: 'Vendor', key: 'vendor', width: 20 },
      { header: 'Kepwil', key: 'kepwil', width: 20 },
      { header: 'KC', key: 'kc', width: 20 },
      { header: 'Kakab', key: 'kakab', width: 20 },
      { header: 'Kategori', key: 'kategori', width: 15 },
      { header: 'Sub Kategori', key: 'subKategori', width: 15 },
      { header: 'Modul', key: 'modul', width: 20 },
      { header: 'Total Soal', key: 'totalSoal', width: 10 },
      { header: 'Benar', key: 'benar', width: 8 },
      { header: 'Salah', key: 'salah', width: 8 },
      { header: 'Skor', key: 'skor', width: 10 },
      { header: 'Tanggal Test', key: 'tanggal', width: 18 }
    ]

    // Style header
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00A650' }
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Add data
    results.forEach((result, index) => {
      worksheet.addRow({
        no: index + 1,
        npp: result.user.npp,
        nama: result.user.nama,
        vendor: result.user.vendor || '-',
        kepwil: result.user.kepwil || '-',
        kc: result.user.kcKabupaten || '-',
        kakab: result.user.kakabKabupaten || '-',
        kategori: result.modul.subKategori.kategori.nama,
        subKategori: result.modul.subKategori.nama,
        modul: result.modul.nama,
        totalSoal: result.hasilTest?.totalSoal || 0,
        benar: result.hasilTest?.benar || 0,
        salah: result.hasilTest?.salah || 0,
        skor: result.hasilTest?.skor?.toFixed(2) || '0.00',
        tanggal: result.endTime?.toLocaleString('id-ID') || '-'
      })
    })

    // Add summary row
    const totalTests = results.length
    const avgScore = results.reduce((acc, r) => acc + (r.hasilTest?.skor || 0), 0) / (totalTests || 1)

    worksheet.addRow({})

    // Periode info
    let periodeText = 'Semua Periode'
    if (periodeBulan && periodeTahun) {
      periodeText = `${getMonthName(parseInt(periodeBulan))} ${periodeTahun}`
    } else if (periodeTahun) {
      periodeText = `Tahun ${periodeTahun}`
    } else if (periodeBulan) {
      periodeText = `Bulan ${getMonthName(parseInt(periodeBulan))}`
    }

    worksheet.addRow({
      no: '',
      npp: 'PERIODE',
      nama: periodeText,
      vendor: '',
      kepwil: '',
      kc: '',
      kakab: '',
      kategori: '',
      subKategori: '',
      modul: '',
      totalSoal: '',
      benar: '',
      salah: '',
      skor: '',
      tanggal: ''
    })

    worksheet.addRow({
      no: '',
      npp: 'TOTAL',
      nama: `${totalTests} test`,
      vendor: '',
      kepwil: '',
      kc: '',
      kakab: '',
      kategori: '',
      subKategori: '',
      modul: '',
      totalSoal: '',
      benar: '',
      salah: '',
      skor: `Rata-rata: ${avgScore.toFixed(2)}%`,
      tanggal: ''
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    reply.header('Content-Disposition', `attachment; filename=hasil-test-${Date.now()}.xlsx`)

    return reply.send(Buffer.from(buffer))
  })

  // Export results to PDF
  fastify.get('/export/pdf', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const where = buildWhereClause(request.query)
    const { periodeBulan, periodeTahun } = request.query

    const results = await prisma.testSession.findMany({
      where,
      include: {
        user: true,
        modul: {
          include: {
            subKategori: {
              include: { kategori: true }
            }
          }
        },
        hasilTest: true
      },
      orderBy: { endTime: 'desc' }
    })

    // Create PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })

    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN HASIL TEST KUESIONER', { align: 'center' })
    doc.fontSize(12).font('Helvetica').text('BPJS Kesehatan', { align: 'center' })
    doc.moveDown(0.5)

    // Periode info
    let periodeText = 'Periode: Semua Waktu'
    if (periodeBulan && periodeTahun) {
      periodeText = `Periode: ${getMonthName(parseInt(periodeBulan))} ${periodeTahun}`
    } else if (periodeTahun) {
      periodeText = `Periode: Tahun ${periodeTahun}`
    } else if (periodeBulan) {
      periodeText = `Periode: Bulan ${getMonthName(parseInt(periodeBulan))}`
    }
    doc.fontSize(10).text(periodeText, { align: 'center' })
    doc.moveDown()

    // Table header - Updated with new columns
    const tableTop = doc.y + 5
    const colWidths = [25, 60, 90, 70, 70, 70, 70, 60, 45, 35, 35, 45, 70]
    const headers = ['No', 'NPP', 'Nama', 'Vendor', 'Kepwil', 'KC', 'Kakab', 'Sub Kat', 'Total', 'Benar', 'Salah', 'Skor', 'Tanggal']

    let x = 30
    doc.fontSize(7).font('Helvetica-Bold')

    // Draw header background
    doc.rect(30, tableTop - 3, 785, 16).fill('#00A650')
    doc.fillColor('white')

    headers.forEach((header, i) => {
      doc.text(header, x + 2, tableTop, { width: colWidths[i] - 4, align: 'left' })
      x += colWidths[i]
    })

    // Table rows
    doc.fillColor('black').font('Helvetica')
    let rowY = tableTop + 18

    results.slice(0, 25).forEach((result, index) => { // Limit to 25 rows for PDF
      if (rowY > 520) {
        doc.addPage()
        rowY = 50
      }

      x = 30
      const rowData = [
        (index + 1).toString(),
        result.user.npp,
        (result.user.nama || '').substring(0, 15),
        (result.user.vendor || '-').substring(0, 12),
        (result.user.kepwil || '-').substring(0, 12),
        (result.user.kcKabupaten || '-').substring(0, 12),
        (result.user.kakabKabupaten || '-').substring(0, 12),
        (result.modul.subKategori.nama || '').substring(0, 10),
        (result.hasilTest?.totalSoal || 0).toString(),
        (result.hasilTest?.benar || 0).toString(),
        (result.hasilTest?.salah || 0).toString(),
        (result.hasilTest?.skor?.toFixed(1) || '0.0') + '%',
        result.endTime?.toLocaleDateString('id-ID') || '-'
      ]

      // Alternate row color
      if (index % 2 === 0) {
        doc.rect(30, rowY - 2, 785, 14).fill('#f5f5f5')
        doc.fillColor('black')
      }

      rowData.forEach((data, i) => {
        doc.fontSize(7).text(data, x + 2, rowY, { width: colWidths[i] - 4, align: 'left' })
        x += colWidths[i]
      })

      rowY += 15
    })

    // Summary
    const totalTests = results.length
    const avgScore = results.reduce((acc, r) => acc + (r.hasilTest?.skor || 0), 0) / (totalTests || 1)

    doc.fontSize(9).font('Helvetica-Bold')
    doc.text(`Total Test: ${totalTests}`, 30, rowY + 15)
    doc.text(`Rata-rata Skor: ${avgScore.toFixed(2)}%`, 30, rowY + 28)

    if (results.length > 25) {
      doc.fontSize(8).font('Helvetica').fillColor('gray')
      doc.text(`* Menampilkan 25 dari ${results.length} data. Export Excel untuk data lengkap.`, 30, rowY + 45)
    }

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('black')
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 30, 560)

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        reply.header('Content-Type', 'application/pdf')
        reply.header('Content-Disposition', `attachment; filename=hasil-test-${Date.now()}.pdf`)
        resolve(reply.send(pdfBuffer))
      })
    })
  })

  // Get summary statistics
  fastify.get('/summary', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { kategoriId, subKategoriId, modulId } = request.query

    const where = { isCompleted: true }

    if (modulId) {
      where.modulId = parseInt(modulId)
    } else if (subKategoriId) {
      where.modul = { subKategoriId: parseInt(subKategoriId) }
    } else if (kategoriId) {
      where.modul = { subKategori: { kategoriId: parseInt(kategoriId) } }
    }

    const [totalTests, hasilStats] = await Promise.all([
      prisma.testSession.count({ where }),
      prisma.hasilTest.aggregate({
        where: { testSession: where },
        _avg: { skor: true },
        _min: { skor: true },
        _max: { skor: true }
      })
    ])

    // Score distribution
    const scoreRanges = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN skor >= 90 THEN 'A (90-100)'
          WHEN skor >= 80 THEN 'B (80-89)'
          WHEN skor >= 70 THEN 'C (70-79)'
          WHEN skor >= 60 THEN 'D (60-69)'
          ELSE 'E (< 60)'
        END as grade,
        COUNT(*) as count
      FROM HasilTest
      GROUP BY grade
      ORDER BY grade
    `

    return {
      totalTests,
      averageScore: hasilStats._avg.skor || 0,
      minScore: hasilStats._min.skor || 0,
      maxScore: hasilStats._max.skor || 0,
      scoreDistribution: scoreRanges
    }
  })
}
