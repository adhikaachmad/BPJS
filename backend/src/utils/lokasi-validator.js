/**
 * Validates that kc/kakab IDs are consistent with their parent in the
 * Kepwil > KantorCabang > KantorKabupaten hierarchy.
 *
 * Returns null when valid, or { status, error } when invalid — caller decides
 * whether to reply.send (single-record) or push to results.failed (bulk).
 *
 * Rules:
 *   - kcId requires kepwilId. KC.kepwilId must equal kepwilId.
 *   - kakabId requires kcId. Kakab.kantorCabangId must equal kcId.
 */
export async function validateKepwilKcKakab(prisma, { kepwilId, kcId, kakabId }) {
  const kw = toIntOrNull(kepwilId)
  const kc = toIntOrNull(kcId)
  const kk = toIntOrNull(kakabId)

  if (kc != null && kw == null) {
    return { status: 400, error: 'Kantor Cabang memerlukan Kepwil' }
  }
  if (kk != null && kc == null) {
    return { status: 400, error: 'Kantor Kabupaten memerlukan Kantor Cabang' }
  }

  if (kc != null) {
    const row = await prisma.kantorCabang.findUnique({
      where: { id: kc },
      select: { kepwilId: true }
    })
    if (!row) return { status: 400, error: 'Kantor Cabang tidak ditemukan' }
    if (row.kepwilId !== kw) {
      return { status: 400, error: 'Kantor Cabang tidak sesuai dengan Kepwil yang dipilih' }
    }
  }

  if (kk != null) {
    const row = await prisma.kantorKabupaten.findUnique({
      where: { id: kk },
      select: { kantorCabangId: true }
    })
    if (!row) return { status: 400, error: 'Kantor Kabupaten tidak ditemukan' }
    if (row.kantorCabangId !== kc) {
      return { status: 400, error: 'Kantor Kabupaten tidak sesuai dengan Kantor Cabang yang dipilih' }
    }
  }

  return null
}

function toIntOrNull(v) {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(v)
  return Number.isFinite(n) ? n : null
}
