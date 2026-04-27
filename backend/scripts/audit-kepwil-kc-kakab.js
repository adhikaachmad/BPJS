// Audit / cleanup users where kc/kakab are inconsistent with their parent.
//
// Usage:
//   node backend/scripts/audit-kepwil-kc-kakab.js          # audit only (no writes)
//   node backend/scripts/audit-kepwil-kc-kakab.js --fix    # nullify mismatched kc/kakab
//
// Created for pentest finding #1 (BAC – Kepwil↔KC↔Kakab, CWE-639, 2026-04-27).
import { PrismaClient } from '../generated/prisma-client/index.js'

const prisma = new PrismaClient()
const FIX = process.argv.includes('--fix')

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ kcId: { not: null } }, { kakabId: { not: null } }] },
    select: { id: true, npp: true, nama: true, kepwilId: true, kcId: true, kakabId: true }
  })
  const kcs = new Map((await prisma.kantorCabang.findMany({ select: { id: true, kepwilId: true, nama: true } })).map(r => [r.id, r]))
  const kakabs = new Map((await prisma.kantorKabupaten.findMany({ select: { id: true, kantorCabangId: true, nama: true } })).map(r => [r.id, r]))

  const mismatches = []
  for (const u of users) {
    const reasons = []
    if (u.kcId != null) {
      const kc = kcs.get(u.kcId)
      if (!kc) reasons.push(`kcId ${u.kcId} tidak ditemukan`)
      else if (kc.kepwilId !== u.kepwilId) reasons.push(`KC "${kc.nama}" milik kepwil ${kc.kepwilId}, bukan ${u.kepwilId}`)
    }
    if (u.kakabId != null) {
      const kk = kakabs.get(u.kakabId)
      if (!kk) reasons.push(`kakabId ${u.kakabId} tidak ditemukan`)
      else if (kk.kantorCabangId !== u.kcId) reasons.push(`Kakab "${kk.nama}" milik kc ${kk.kantorCabangId}, bukan ${u.kcId}`)
    }
    if (reasons.length) mismatches.push({ user: u, reasons })
  }

  console.log(`Total users with kc/kakab assigned: ${users.length}`)
  console.log(`Mismatches: ${mismatches.length}`)
  for (const m of mismatches.slice(0, 20)) {
    console.log(`  - id=${m.user.id} npp=${m.user.npp} ${m.user.nama}: ${m.reasons.join(' | ')}`)
  }
  if (mismatches.length > 20) console.log(`  ... +${mismatches.length - 20} more`)

  if (FIX && mismatches.length > 0) {
    console.log('\n--fix: nullifying kcId/kakabId on mismatched users...')
    let n = 0
    for (const m of mismatches) {
      await prisma.user.update({ where: { id: m.user.id }, data: { kcId: null, kakabId: null } })
      n++
    }
    console.log(`Updated ${n} users.`)
  } else if (mismatches.length > 0) {
    console.log('\nDry run only. Re-run with --fix to apply.')
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
