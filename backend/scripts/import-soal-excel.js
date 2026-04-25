import { PrismaClient } from '@prisma/client'
import XLSX from 'xlsx'

const prisma = new PrismaClient()

const EXCEL_PATH = '/mnt/c/Users/adhik/Downloads/#Bank Soal TAD - 12 Bulan.xlsx'
const SUB_KATEGORI_SLUG = 'satpam'
const TAHUN = 2026

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

async function main() {
  // Get Satpam sub-kategori
  const subKategori = await prisma.subKategori.findFirst({
    where: { slug: SUB_KATEGORI_SLUG }
  })

  if (!subKategori) {
    console.error('Sub-kategori Satpam tidak ditemukan!')
    process.exit(1)
  }

  console.log(`Sub-kategori: ${subKategori.nama} (ID: ${subKategori.id})`)

  // Delete existing test sessions, jawabans, hasil, and soals for Satpam
  console.log('\n--- Menghapus data soal lama ---')

  const existingPeriodes = await prisma.periodeTest.findMany({
    where: { subKategoriId: subKategori.id },
    select: { id: true, nama: true }
  })

  for (const periode of existingPeriodes) {
    // Delete test sessions (cascades to jawaban & hasil)
    const deletedSessions = await prisma.testSessionPeriode.deleteMany({
      where: { periodeTestId: periode.id }
    })
    // Delete soals
    const deletedSoals = await prisma.soalPeriode.deleteMany({
      where: { periodeTestId: periode.id }
    })
    console.log(`  ${periode.nama}: ${deletedSoals.count} soal & ${deletedSessions.count} sesi dihapus`)
  }

  // Delete existing periodes
  const deletedPeriodes = await prisma.periodeTest.deleteMany({
    where: { subKategoriId: subKategori.id }
  })
  console.log(`  ${deletedPeriodes.count} periode dihapus`)

  // Read Excel
  console.log('\n--- Membaca file Excel ---')
  const wb = XLSX.readFile(EXCEL_PATH)
  console.log(`Sheets: ${wb.SheetNames.join(', ')}`)

  let totalImported = 0

  for (let bulan = 1; bulan <= 12; bulan++) {
    const sheetName = String(bulan)
    const ws = wb.Sheets[sheetName]

    if (!ws) {
      console.log(`Sheet ${sheetName} tidak ditemukan, skip.`)
      continue
    }

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

    // Create PeriodeTest
    const periodeName = `${BULAN_NAMES[bulan - 1]} ${TAHUN}`
    const periode = await prisma.periodeTest.create({
      data: {
        subKategoriId: subKategori.id,
        nama: periodeName,
        bulan: bulan,
        tahun: TAHUN,
        status: 'draft'
      }
    })

    console.log(`\n--- Bulan ${bulan}: ${periodeName} (Periode ID: ${periode.id}) ---`)

    // Parse soal from rows (skip header rows 0, 1, 2)
    const soalData = []
    let skipped = 0

    for (let i = 3; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length < 9) {
        skipped++
        continue
      }

      const materiPokok = row[1] ? String(row[1]).trim() : null
      const pertanyaan = row[3] ? String(row[3]).trim() : null
      const opsiA = row[4] ? String(row[4]).trim() : null
      const opsiB = row[5] ? String(row[5]).trim() : null
      const opsiC = row[6] ? String(row[6]).trim() : null
      const opsiD = row[7] ? String(row[7]).trim() : null
      const jawabanBenar = row[8] ? String(row[8]).trim().toUpperCase() : null
      const referensi = row[9] ? String(row[9]).trim() : null
      const ukpf = row[10] ? String(row[10]).trim() : null

      // Validate
      if (!pertanyaan || !opsiA || !opsiB || !opsiC || !opsiD || !['A', 'B', 'C', 'D'].includes(jawabanBenar)) {
        skipped++
        continue
      }

      soalData.push({
        periodeTestId: periode.id,
        pertanyaan,
        opsiA,
        opsiB,
        opsiC,
        opsiD,
        jawabanBenar,
        pembahasan: referensi, // Referensi ditampilkan sebagai pembahasan di do-check
        materiPokok,
        referensi,
        ukpf,
        urutan: soalData.length + 1
      })
    }

    // Bulk insert
    const result = await prisma.soalPeriode.createMany({
      data: soalData
    })

    console.log(`  Imported: ${result.count} soal (skipped: ${skipped} rows)`)
    totalImported += result.count
  }

  console.log(`\n=== SELESAI ===`)
  console.log(`Total soal imported: ${totalImported}`)
  console.log(`Total periode created: 12`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
