// Derive an empirical Kepwil → Provinces mapping from production data.
// Strategy:
//   1. Pull every KantorCabang and KantorKabupaten with their kepwilId
//   2. Infer the province from the office name using a fuzzy keyword table
//   3. Per kepwil, collect the distinct provinces that appeared
//   4. Print a JS object suitable for pasting into DashboardPage.vue
import { PrismaClient } from '../generated/prisma-client/index.js'

const prisma = new PrismaClient()

// City / kabupaten / regency keywords → official province name
// Keys are lower-cased. Match is substring-based (longest-key-first).
const cityToProvince = {
  // Aceh
  'aceh': 'Aceh', 'banda aceh': 'Aceh', 'lhokseumawe': 'Aceh', 'langsa': 'Aceh', 'meulaboh': 'Aceh', 'sabang': 'Aceh', 'subulussalam': 'Aceh', 'takengon': 'Aceh',
  // Sumatera Utara
  'medan': 'Sumatera Utara', 'pematangsiantar': 'Sumatera Utara', 'pematang siantar': 'Sumatera Utara', 'binjai': 'Sumatera Utara',
  'tebing tinggi': 'Sumatera Utara', 'sibolga': 'Sumatera Utara', 'padangsidempuan': 'Sumatera Utara', 'padang sidempuan': 'Sumatera Utara', 'gunungsitoli': 'Sumatera Utara',
  'kisaran': 'Sumatera Utara', 'lubuk pakam': 'Sumatera Utara', 'tanjung balai': 'Sumatera Utara', 'tarutung': 'Sumatera Utara', 'rantau prapat': 'Sumatera Utara', 'labuhan batu': 'Sumatera Utara',
  // Sumatera Barat
  'padang': 'Sumatera Barat', 'bukittinggi': 'Sumatera Barat', 'payakumbuh': 'Sumatera Barat', 'solok': 'Sumatera Barat', 'pariaman': 'Sumatera Barat',
  'sawahlunto': 'Sumatera Barat', 'padang panjang': 'Sumatera Barat', 'pasaman': 'Sumatera Barat',
  // Riau
  'pekanbaru': 'Riau', 'dumai': 'Riau', 'pangkalan kerinci': 'Riau', 'bangkinang': 'Riau', 'bengkalis': 'Riau', 'rengat': 'Riau',
  // Kepulauan Riau
  'batam': 'Kepulauan Riau', 'tanjungpinang': 'Kepulauan Riau', 'tanjung pinang': 'Kepulauan Riau', 'natuna': 'Kepulauan Riau', 'karimun': 'Kepulauan Riau',
  // Jambi
  'jambi': 'Jambi', 'muara bungo': 'Jambi', 'sungai penuh': 'Jambi', 'kerinci': 'Jambi',
  // Sumatera Selatan
  'palembang': 'Sumatera Selatan', 'lubuk linggau': 'Sumatera Selatan', 'lubuklinggau': 'Sumatera Selatan', 'pagar alam': 'Sumatera Selatan', 'prabumulih': 'Sumatera Selatan', 'sekayu': 'Sumatera Selatan', 'baturaja': 'Sumatera Selatan',
  // Bengkulu
  'bengkulu': 'Bengkulu', 'curup': 'Bengkulu',
  // Lampung
  'bandar lampung': 'Lampung', 'metro': 'Lampung', 'kota bumi': 'Lampung', 'kotabumi': 'Lampung', 'kalianda': 'Lampung', 'pringsewu': 'Lampung',
  // Bangka Belitung
  'pangkalpinang': 'Kepulauan Bangka Belitung', 'pangkal pinang': 'Kepulauan Bangka Belitung', 'tanjungpandan': 'Kepulauan Bangka Belitung', 'tanjung pandan': 'Kepulauan Bangka Belitung', 'belitung': 'Kepulauan Bangka Belitung', 'bangka': 'Kepulauan Bangka Belitung',
  // DKI Jakarta
  'jakarta': 'DKI Jakarta', 'jakarta pusat': 'DKI Jakarta', 'jakarta selatan': 'DKI Jakarta', 'jakarta utara': 'DKI Jakarta', 'jakarta barat': 'DKI Jakarta', 'jakarta timur': 'DKI Jakarta',
  // Jawa Barat
  'bandung': 'Jawa Barat', 'bekasi': 'Jawa Barat', 'depok': 'Jawa Barat', 'bogor': 'Jawa Barat', 'cirebon': 'Jawa Barat', 'sukabumi': 'Jawa Barat',
  'tasikmalaya': 'Jawa Barat', 'cimahi': 'Jawa Barat', 'banjar': 'Jawa Barat', 'garut': 'Jawa Barat', 'karawang': 'Jawa Barat', 'purwakarta': 'Jawa Barat',
  'subang': 'Jawa Barat', 'sumedang': 'Jawa Barat', 'majalengka': 'Jawa Barat', 'kuningan': 'Jawa Barat', 'indramayu': 'Jawa Barat', 'cianjur': 'Jawa Barat',
  'soreang': 'Jawa Barat',
  // Banten
  'serang': 'Banten', 'cilegon': 'Banten', 'tangerang': 'Banten', 'pandeglang': 'Banten', 'lebak': 'Banten', 'rangkasbitung': 'Banten',
  // Jawa Tengah
  'semarang': 'Jawa Tengah', 'solo': 'Jawa Tengah', 'surakarta': 'Jawa Tengah', 'magelang': 'Jawa Tengah', 'pekalongan': 'Jawa Tengah', 'tegal': 'Jawa Tengah',
  'salatiga': 'Jawa Tengah', 'kudus': 'Jawa Tengah', 'jepara': 'Jawa Tengah', 'pati': 'Jawa Tengah', 'rembang': 'Jawa Tengah', 'blora': 'Jawa Tengah',
  'purwokerto': 'Jawa Tengah', 'banyumas': 'Jawa Tengah', 'cilacap': 'Jawa Tengah', 'kebumen': 'Jawa Tengah', 'purworejo': 'Jawa Tengah', 'klaten': 'Jawa Tengah',
  'boyolali': 'Jawa Tengah', 'sragen': 'Jawa Tengah', 'wonogiri': 'Jawa Tengah', 'karanganyar': 'Jawa Tengah', 'sukoharjo': 'Jawa Tengah', 'temanggung': 'Jawa Tengah',
  'ungaran': 'Jawa Tengah',
  // DIY
  'yogyakarta': 'Daerah Istimewa Yogyakarta', 'jogja': 'Daerah Istimewa Yogyakarta', 'sleman': 'Daerah Istimewa Yogyakarta', 'bantul': 'Daerah Istimewa Yogyakarta', 'kulon progo': 'Daerah Istimewa Yogyakarta', 'gunung kidul': 'Daerah Istimewa Yogyakarta', 'gunungkidul': 'Daerah Istimewa Yogyakarta', 'wates': 'Daerah Istimewa Yogyakarta',
  // Jawa Timur
  'surabaya': 'Jawa Timur', 'malang': 'Jawa Timur', 'kediri': 'Jawa Timur', 'madiun': 'Jawa Timur', 'mojokerto': 'Jawa Timur', 'pasuruan': 'Jawa Timur',
  'probolinggo': 'Jawa Timur', 'batu': 'Jawa Timur', 'blitar': 'Jawa Timur', 'tulungagung': 'Jawa Timur', 'jombang': 'Jawa Timur', 'lamongan': 'Jawa Timur',
  'gresik': 'Jawa Timur', 'sidoarjo': 'Jawa Timur', 'banyuwangi': 'Jawa Timur', 'jember': 'Jawa Timur', 'bondowoso': 'Jawa Timur', 'situbondo': 'Jawa Timur',
  'lumajang': 'Jawa Timur', 'tuban': 'Jawa Timur', 'bojonegoro': 'Jawa Timur', 'ngawi': 'Jawa Timur', 'magetan': 'Jawa Timur', 'ponorogo': 'Jawa Timur',
  'pacitan': 'Jawa Timur', 'trenggalek': 'Jawa Timur', 'nganjuk': 'Jawa Timur', 'pamekasan': 'Jawa Timur', 'sumenep': 'Jawa Timur', 'sampang': 'Jawa Timur',
  'bangkalan': 'Jawa Timur',
  // Bali
  'denpasar': 'Bali', 'badung': 'Bali', 'gianyar': 'Bali', 'tabanan': 'Bali', 'klungkung': 'Bali', 'bangli': 'Bali', 'karangasem': 'Bali', 'singaraja': 'Bali', 'buleleng': 'Bali', 'jembrana': 'Bali', 'negara': 'Bali',
  // NTB
  'mataram': 'Nusa Tenggara Barat', 'lombok': 'Nusa Tenggara Barat', 'bima': 'Nusa Tenggara Barat', 'sumbawa': 'Nusa Tenggara Barat', 'dompu': 'Nusa Tenggara Barat', 'praya': 'Nusa Tenggara Barat', 'selong': 'Nusa Tenggara Barat',
  // NTT
  'kupang': 'Nusa Tenggara Timur', 'ende': 'Nusa Tenggara Timur', 'maumere': 'Nusa Tenggara Timur', 'atambua': 'Nusa Tenggara Timur', 'soe': 'Nusa Tenggara Timur', 'waingapu': 'Nusa Tenggara Timur', 'ruteng': 'Nusa Tenggara Timur', 'larantuka': 'Nusa Tenggara Timur',
  // Kalimantan Barat
  'pontianak': 'Kalimantan Barat', 'singkawang': 'Kalimantan Barat', 'sintang': 'Kalimantan Barat', 'sanggau': 'Kalimantan Barat', 'ketapang': 'Kalimantan Barat', 'mempawah': 'Kalimantan Barat',
  // Kalimantan Tengah
  'palangka raya': 'Kalimantan Tengah', 'palangkaraya': 'Kalimantan Tengah', 'sampit': 'Kalimantan Tengah', 'pangkalan bun': 'Kalimantan Tengah', 'kapuas': 'Kalimantan Tengah', 'muara teweh': 'Kalimantan Tengah',
  // Kalimantan Selatan
  'banjarmasin': 'Kalimantan Selatan', 'banjarbaru': 'Kalimantan Selatan', 'martapura': 'Kalimantan Selatan', 'amuntai': 'Kalimantan Selatan', 'tanjung': 'Kalimantan Selatan', 'kandangan': 'Kalimantan Selatan', 'barabai': 'Kalimantan Selatan',
  // Kalimantan Timur
  'samarinda': 'Kalimantan Timur', 'balikpapan': 'Kalimantan Timur', 'bontang': 'Kalimantan Timur', 'tenggarong': 'Kalimantan Timur', 'sangatta': 'Kalimantan Timur', 'tarakan': 'Kalimantan Utara',
  // Kalimantan Utara
  'tanjung selor': 'Kalimantan Utara', 'nunukan': 'Kalimantan Utara', 'malinau': 'Kalimantan Utara',
  // Sulawesi Utara
  'manado': 'Sulawesi Utara', 'bitung': 'Sulawesi Utara', 'tomohon': 'Sulawesi Utara', 'kotamobagu': 'Sulawesi Utara', 'tondano': 'Sulawesi Utara',
  // Sulawesi Tengah
  'palu': 'Sulawesi Tengah', 'poso': 'Sulawesi Tengah', 'luwuk': 'Sulawesi Tengah', 'tolitoli': 'Sulawesi Tengah', 'donggala': 'Sulawesi Tengah',
  // Sulawesi Selatan
  'makassar': 'Sulawesi Selatan', 'parepare': 'Sulawesi Selatan', 'pare-pare': 'Sulawesi Selatan', 'palopo': 'Sulawesi Selatan', 'bone': 'Sulawesi Selatan', 'watampone': 'Sulawesi Selatan',
  'maros': 'Sulawesi Selatan', 'bantaeng': 'Sulawesi Selatan', 'sinjai': 'Sulawesi Selatan', 'enrekang': 'Sulawesi Selatan', 'makale': 'Sulawesi Selatan', 'pinrang': 'Sulawesi Selatan', 'sengkang': 'Sulawesi Selatan',
  'bulukumba': 'Sulawesi Selatan', 'sungguminasa': 'Sulawesi Selatan', 'gowa': 'Sulawesi Selatan',
  // Sulawesi Tenggara
  'kendari': 'Sulawesi Tenggara', 'baubau': 'Sulawesi Tenggara', 'bau-bau': 'Sulawesi Tenggara', 'kolaka': 'Sulawesi Tenggara', 'unaaha': 'Sulawesi Tenggara', 'raha': 'Sulawesi Tenggara',
  // Gorontalo
  'gorontalo': 'Gorontalo', 'limboto': 'Gorontalo',
  // Sulawesi Barat
  'mamuju': 'Sulawesi Barat', 'majene': 'Sulawesi Barat', 'polewali': 'Sulawesi Barat',
  // Maluku
  'ambon': 'Maluku', 'tual': 'Maluku', 'masohi': 'Maluku', 'namlea': 'Maluku', 'saumlaki': 'Maluku',
  // Maluku Utara
  'ternate': 'Maluku Utara', 'tidore': 'Maluku Utara', 'sofifi': 'Maluku Utara', 'tobelo': 'Maluku Utara', 'labuha': 'Maluku Utara',
  // Papua (incl. pemekaran)
  'jayapura': 'Papua', 'biak': 'Papua', 'sentani': 'Papua', 'sarmi': 'Papua', 'waropen': 'Papua',
  'manokwari': 'Papua Barat', 'sorong': 'Papua Barat', 'fakfak': 'Papua Barat', 'kaimana': 'Papua Barat',
  'merauke': 'Papua Selatan', 'asmat': 'Papua Selatan',
  'nabire': 'Papua Tengah', 'timika': 'Papua Tengah',
  'wamena': 'Papua Pegunungan', 'jayawijaya': 'Papua Pegunungan'
}

// Pre-sort keys by length (longest first) so multi-word keys win
const sortedKeys = Object.keys(cityToProvince).sort((a, b) => b.length - a.length)

function inferProvince(name) {
  if (!name) return null
  const lower = name.toLowerCase()
  for (const k of sortedKeys) {
    if (lower.includes(k)) return cityToProvince[k]
  }
  return null
}

async function run() {
  // Pull KCs with their kepwil
  const kcs = await prisma.kantorCabang.findMany({
    include: { kepwil: true }
  })

  // Map: kepwil name → Set<province>
  const kwToProvinces = {}
  const unmatched = []
  let matched = 0

  for (const kc of kcs) {
    const kwName = kc.kepwil?.nama
    if (!kwName) continue
    const prov = inferProvince(kc.nama)
    if (prov) {
      matched++
      if (!kwToProvinces[kwName]) kwToProvinces[kwName] = new Set()
      kwToProvinces[kwName].add(prov)
    } else {
      unmatched.push({ kepwil: kwName, kc: kc.nama })
    }
  }

  // For unmatched KCs, also try to infer from their KantorKabupaten children
  if (unmatched.length > 0) {
    const unmatchedKcIds = (await prisma.kantorCabang.findMany({
      where: { nama: { in: unmatched.map(u => u.kc) } },
      select: { id: true, nama: true, kepwil: { select: { nama: true } } }
    }))
    for (const kc of unmatchedKcIds) {
      const kakabs = await prisma.kantorKabupaten.findMany({
        where: { kantorCabangId: kc.id }, select: { nama: true }
      })
      for (const k of kakabs) {
        const prov = inferProvince(k.nama)
        if (prov && kc.kepwil?.nama) {
          matched++
          if (!kwToProvinces[kc.kepwil.nama]) kwToProvinces[kc.kepwil.nama] = new Set()
          kwToProvinces[kc.kepwil.nama].add(prov)
          break
        }
      }
    }
  }

  // Sort kepwil keys by canonical Roman numeral order
  const ORDER = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
  const sortedKw = Object.keys(kwToProvinces).sort((a, b) => {
    const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  console.log('\n=== Coverage ===')
  console.log(`KCs scanned: ${kcs.length}`)
  console.log(`Matched (province inferred): ${matched}`)
  console.log(`Unmatched KCs (still): ${kcs.length - matched}`)
  if (kcs.length - matched > 0 && unmatched.length > 0) {
    console.log('Sample unmatched:', unmatched.slice(0, 5))
  }

  console.log('\n=== Empirical kepwilToProvinces (paste into DashboardPage.vue) ===\n')
  console.log('const kepwilToProvinces = {')
  for (const kw of sortedKw) {
    const provs = Array.from(kwToProvinces[kw]).sort()
    const padded = `'${kw}':`.padEnd(8)
    console.log(`  ${padded}${JSON.stringify(provs)},`)
  }
  console.log('}')

  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
