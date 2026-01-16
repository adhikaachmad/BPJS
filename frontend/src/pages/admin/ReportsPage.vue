<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const results = ref([])
const kategoris = ref([])
const loading = ref(true)
const pagination = ref({ page: 1, total: 0, totalPages: 0 })

// Generate year options (2 years ahead + current year + 5 years back = 8 years total)
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear + 2 - i)

// Month options
const monthOptions = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
]

const filters = ref({
  kategoriId: '',
  subKategoriId: '',
  periodeBulan: '',
  periodeTahun: ''
})
const exporting = ref(false)
const exportType = ref('')

// Get sub kategoris based on selected kategori
const availableSubKategoris = computed(() => {
  if (!filters.value.kategoriId) {
    // Return all sub kategoris from all kategoris
    return kategoris.value.flatMap(k =>
      k.subKategoris.map(s => ({ ...s, kategoriNama: k.nama }))
    )
  }
  const kategori = kategoris.value.find(k => k.id === parseInt(filters.value.kategoriId))
  return kategori?.subKategoris?.map(s => ({ ...s, kategoriNama: kategori.nama })) || []
})

// Reset subKategoriId when kategoriId changes
watch(() => filters.value.kategoriId, () => {
  filters.value.subKategoriId = ''
})

onMounted(async () => {
  await Promise.all([fetchKategoris(), fetchResults()])
})

async function fetchKategoris() {
  const response = await api.get('/kategori')
  kategoris.value = response.data
}

async function fetchResults() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      ...filters.value
    }
    Object.keys(params).forEach(k => !params[k] && delete params[k])

    const response = await api.get('/admin/results', { params })
    results.value = response.data.data
    pagination.value = response.data.pagination
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.value.page = 1
  fetchResults()
}

function resetFilters() {
  filters.value = { kategoriId: '', subKategoriId: '', periodeBulan: '', periodeTahun: '' }
  applyFilters()
}

async function exportExcel() {
  exporting.value = true
  exportType.value = 'excel'
  try {
    const params = { ...filters.value }
    Object.keys(params).forEach(k => !params[k] && delete params[k])

    const response = await api.get('/report/export/excel', {
      params,
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `hasil-test-${Date.now()}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (err) {
    alert('Gagal export Excel')
  } finally {
    exporting.value = false
    exportType.value = ''
  }
}

async function exportPDF() {
  exporting.value = true
  exportType.value = 'pdf'
  try {
    const params = { ...filters.value }
    Object.keys(params).forEach(k => !params[k] && delete params[k])

    const response = await api.get('/report/export/pdf', {
      params,
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `hasil-test-${Date.now()}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (err) {
    alert('Gagal export PDF')
  } finally {
    exporting.value = false
    exportType.value = ''
  }
}

function getScoreColor(skor) {
  if (skor >= 80) return 'text-emerald-600'
  if (skor >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreBg(skor) {
  if (skor >= 80) return 'bg-emerald-50'
  if (skor >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

function formatPeriode(bulan, tahun) {
  if (!bulan || !tahun) return '-'
  const month = monthOptions.find(m => m.value === bulan)
  return `${month?.label || bulan} ${tahun}`
}
</script>

<template>
  <AdminLayout>
    <div class="p-6 lg:p-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Laporan Hasil Test</h1>
          <p class="text-gray-500 text-sm mt-1">Lihat dan export hasil test pengguna</p>
        </div>
        <div class="flex space-x-3">
          <button
            @click="exportExcel"
            :disabled="exporting"
            class="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
          >
            <svg v-if="exporting && exportType === 'excel'" class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
          <button
            @click="exportPDF"
            :disabled="exporting"
            class="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
          >
            <svg v-if="exporting && exportType === 'pdf'" class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Filter Data</h3>
          <button @click="resetFilters" class="text-sm text-gray-500 hover:text-gray-700">
            Reset Filter
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <!-- Kategori -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
            <select v-model="filters.kategoriId" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white">
              <option value="">Semua Kategori</option>
              <option v-for="kat in kategoris" :key="kat.id" :value="kat.id">
                {{ kat.nama }}
              </option>
            </select>
          </div>
          <!-- Sub Kategori -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Sub Kategori</label>
            <select v-model="filters.subKategoriId" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white">
              <option value="">Semua Sub Kategori</option>
              <option v-for="sub in availableSubKategoris" :key="sub.id" :value="sub.id">
                {{ sub.nama }}
              </option>
            </select>
          </div>
          <!-- Periode Bulan -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Periode Bulan</label>
            <select v-model="filters.periodeBulan" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white">
              <option value="">Semua Bulan</option>
              <option v-for="month in monthOptions" :key="month.value" :value="month.value">
                {{ month.label }}
              </option>
            </select>
          </div>
          <!-- Periode Tahun -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Periode Tahun</label>
            <select v-model="filters.periodeTahun" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white">
              <option value="">Semua Tahun</option>
              <option v-for="year in yearOptions" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>
          <!-- Apply Button -->
          <div class="lg:col-span-2 flex items-end">
            <button @click="applyFilters" class="w-full px-4 py-2.5 bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white rounded-xl font-medium shadow-lg shadow-bpjs-500/30 hover:shadow-xl transition-all">
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500 mb-4"></div>
          <p class="text-gray-500">Memuat data...</p>
        </div>
      </div>

      <!-- Results Table -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1400px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kepwil</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">KC</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kakab</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub Kategori</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modul</th>
                <th class="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Materi</th>
                <th class="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Skor</th>
                <th class="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Benar</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="result in results" :key="result.id" class="hover:bg-gray-50 transition-colors">
                <!-- User Info -->
                <td class="px-4 py-4">
                  <div class="flex items-center">
                    <div class="w-9 h-9 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span class="text-white font-bold text-sm">{{ result.user?.nama?.charAt(0) }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-gray-900 truncate">{{ result.user?.nama }}</p>
                      <p class="text-xs text-gray-500 font-mono">{{ result.user?.npp }}</p>
                    </div>
                  </div>
                </td>
                <!-- Vendor -->
                <td class="px-4 py-4">
                  <span v-if="result.user?.vendor" class="inline-flex items-center px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium max-w-[100px] truncate" :title="result.user?.vendor">
                    {{ result.user?.vendor }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Kepwil -->
                <td class="px-4 py-4">
                  <span v-if="result.user?.kepwil" class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium max-w-[110px] truncate" :title="result.user?.kepwil">
                    {{ result.user?.kepwil }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- KC -->
                <td class="px-4 py-4">
                  <span v-if="result.user?.kcKabupaten" class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium max-w-[110px] truncate" :title="result.user?.kcKabupaten">
                    {{ result.user?.kcKabupaten }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Kakab -->
                <td class="px-4 py-4">
                  <span v-if="result.user?.kakabKabupaten" class="inline-flex items-center px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium max-w-[110px] truncate" :title="result.user?.kakabKabupaten">
                    {{ result.user?.kakabKabupaten }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Sub Kategori -->
                <td class="px-4 py-4">
                  <p class="text-sm text-gray-900">{{ result.modul?.subKategori?.nama }}</p>
                  <p class="text-xs text-gray-500">{{ result.modul?.subKategori?.kategori?.nama }}</p>
                </td>
                <!-- Modul -->
                <td class="px-4 py-4">
                  <p class="text-sm text-gray-900 font-medium">{{ result.modul?.nama }}</p>
                </td>
                <!-- Materi Status -->
                <td class="px-4 py-4 text-center">
                  <span
                    v-if="result.materiProgress?.isCompleted"
                    class="inline-flex items-center px-2 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-medium"
                  >
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Selesai
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium"
                  >
                    Belum
                  </span>
                </td>
                <!-- Skor -->
                <td class="px-4 py-4 text-center">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-xl text-sm font-bold"
                    :class="[getScoreBg(result.hasilTest?.skor || 0), getScoreColor(result.hasilTest?.skor || 0)]"
                  >
                    {{ (result.hasilTest?.skor || 0).toFixed(1) }}%
                  </span>
                </td>
                <!-- Benar/Total -->
                <td class="px-4 py-4 text-center">
                  <span class="text-sm text-gray-600">
                    {{ result.hasilTest?.benar || 0 }}/{{ result.hasilTest?.totalSoal || 0 }}
                  </span>
                </td>
                <!-- Waktu -->
                <td class="px-4 py-4">
                  <p class="text-sm text-gray-900">{{ new Date(result.endTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p>
                  <p class="text-xs text-gray-500">{{ new Date(result.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="results.length === 0" class="text-center py-16">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-gray-500 font-medium">Tidak ada data hasil test</p>
          <p class="text-sm text-gray-400 mt-1">Data akan muncul setelah pengguna mengerjakan test</p>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p class="text-sm text-gray-500">
            Menampilkan <span class="font-medium">{{ results.length }}</span> dari <span class="font-medium">{{ pagination.total }}</span> hasil
          </p>
          <div class="flex space-x-1">
            <button
              v-for="page in pagination.totalPages"
              :key="page"
              @click="pagination.page = page; fetchResults()"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="page === pagination.page ? 'bg-bpjs-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
