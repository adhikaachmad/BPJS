import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

export default async function reportRoutes(fastify, options) {
  const { prisma } = fastify

  // Export results to Excel
  fastify.get('/export/excel', {
    preHandler: [fastify.authenticateAdmin]
  }, async (request, reply) => {
    const { kategoriId, subKategoriId, modulId, startDate, endDate } = request.query

    const where = { isCompleted: true }

    if (modulId) {
      where.modulId = parseInt(modulId)
    } else if (subKategoriId) {
      where.modul = { subKategoriId: parseInt(subKategoriId) }
    } else if (kategoriId) {
      where.modul = { subKategori: { kategoriId: parseInt(kategoriId) } }
    }

    if (startDate || endDate) {
      where.endTime = {}
      if (startDate) where.endTime.gte = new Date(startDate)
      if (endDate) where.endTime.lte = new Date(endDate)
    }

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

    // Header styling
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIP', key: 'nip', width: 15 },
      { header: 'Nama', key: 'nama', width: 25 },
      { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Sub Kategori', key: 'subKategori', width: 20 },
      { header: 'Modul', key: 'modul', width: 20 },
      { header: 'Total Soal', key: 'totalSoal', width: 12 },
      { header: 'Benar', key: 'benar', width: 10 },
      { header: 'Salah', key: 'salah', width: 10 },
      { header: 'Skor', key: 'skor', width: 10 },
      { header: 'Tanggal Test', key: 'tanggal', width: 20 }
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
        nip: result.user.nip,
        nama: result.user.nama,
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
    worksheet.addRow({
      no: '',
      nip: 'TOTAL',
      nama: `${totalTests} test`,
      kategori: '',
      subKategori: '',
      modul: '',
      totalSoal: '',
      benar: '',
      salah: '',
      skor: `Rata-rata: ${avgScore.toFixed(2)}`,
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
    const { kategoriId, subKategoriId, modulId, startDate, endDate } = request.query

    const where = { isCompleted: true }

    if (modulId) {
      where.modulId = parseInt(modulId)
    } else if (subKategoriId) {
      where.modul = { subKategoriId: parseInt(subKategoriId) }
    } else if (kategoriId) {
      where.modul = { subKategori: { kategoriId: parseInt(kategoriId) } }
    }

    if (startDate || endDate) {
      where.endTime = {}
      if (startDate) where.endTime.gte = new Date(startDate)
      if (endDate) where.endTime.lte = new Date(endDate)
    }

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
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' })

    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('LAPORAN HASIL TEST KUESIONER', { align: 'center' })
    doc.fontSize(14).font('Helvetica').text('BPJS Kesehatan', { align: 'center' })
    doc.moveDown()

    // Date range
    let dateText = 'Periode: '
    if (startDate && endDate) {
      dateText += `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`
    } else {
      dateText += 'Semua waktu'
    }
    doc.fontSize(10).text(dateText, { align: 'center' })
    doc.moveDown()

    // Table header
    const tableTop = doc.y + 10
    const colWidths = [30, 80, 120, 80, 80, 80, 50, 40, 40, 50, 100]
    const headers = ['No', 'NIP', 'Nama', 'Kategori', 'Sub Kategori', 'Modul', 'Total', 'Benar', 'Salah', 'Skor', 'Tanggal']

    let x = 50
    doc.fontSize(9).font('Helvetica-Bold')

    // Draw header background
    doc.rect(50, tableTop - 5, 700, 20).fill('#00A650')
    doc.fillColor('white')

    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' })
      x += colWidths[i]
    })

    // Table rows
    doc.fillColor('black').font('Helvetica')
    let rowY = tableTop + 25

    results.slice(0, 30).forEach((result, index) => { // Limit to 30 rows for PDF
      if (rowY > 500) {
        doc.addPage()
        rowY = 50
      }

      x = 50
      const rowData = [
        (index + 1).toString(),
        result.user.nip,
        result.user.nama.substring(0, 20),
        result.modul.subKategori.kategori.nama,
        result.modul.subKategori.nama,
        result.modul.nama,
        (result.hasilTest?.totalSoal || 0).toString(),
        (result.hasilTest?.benar || 0).toString(),
        (result.hasilTest?.salah || 0).toString(),
        (result.hasilTest?.skor?.toFixed(1) || '0.0') + '%',
        result.endTime?.toLocaleDateString('id-ID') || '-'
      ]

      // Alternate row color
      if (index % 2 === 0) {
        doc.rect(50, rowY - 3, 700, 15).fill('#f0f0f0')
        doc.fillColor('black')
      }

      rowData.forEach((data, i) => {
        doc.fontSize(8).text(data, x, rowY, { width: colWidths[i], align: 'left' })
        x += colWidths[i]
      })

      rowY += 18
    })

    // Summary
    doc.moveDown(2)
    const totalTests = results.length
    const avgScore = results.reduce((acc, r) => acc + (r.hasilTest?.skor || 0), 0) / (totalTests || 1)

    doc.fontSize(10).font('Helvetica-Bold')
    doc.text(`Total Test: ${totalTests}`, 50, rowY + 20)
    doc.text(`Rata-rata Skor: ${avgScore.toFixed(2)}%`, 50, rowY + 35)

    // Footer
    doc.fontSize(8).font('Helvetica')
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 550)

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
