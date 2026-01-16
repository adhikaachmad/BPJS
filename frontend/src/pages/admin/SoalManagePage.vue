<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

// Quill toolbar configuration
const quillToolbar = [
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'align': [] }],
  ['link', 'image'],
  ['blockquote', 'code-block'],
  ['clean']
]

// Data
const kategoris = ref([])
const periodes = ref([])
const currentPeriode = ref(null)
const copySources = ref([])
const loading = ref(true)
const loadingPeriode = ref(false)
const saving = ref(false)

// Filters
const selectedKategori = ref('')
const selectedSubKategori = ref('')

// Tabs
const activeTab = ref('soal') // 'soal' or 'materi'

// Modals
const showPeriodeModal = ref(false)
const showSoalModal = ref(false)
const showUploadModal = ref(false)
const showCopyModal = ref(false)
const showJadwalModal = ref(false)
const showMateriModal = ref(false)
const showMateriCopyModal = ref(false)

// Forms
const periodeForm = ref({
  bulan: new Date().getMonth() + 1,
  tahun: new Date().getFullYear()
})

const soalForm = ref({
  pertanyaan: '',
  opsiA: '',
  opsiB: '',
  opsiC: '',
  opsiD: '',
  jawabanBenar: 'A',
  pembahasan: ''
})
const editingSoalId = ref(null)

const jadwalForm = ref({
  tanggal: '',
  jamMulai: '',
  jamBerakhir: '',
  doCheckBerakhir: ''
})

const uploadFile = ref(null)
const uploadErrors = ref([])
const selectedCopySource = ref('')

// Materi Form
const materiForm = ref({
  judul: '',
  konten: '',
  videoType: '',
  videoUrl: '',
  videoFile: '',
  pdfFile: ''
})
const editingMateriId = ref(null)
const materiCopySources = ref([])
const selectedMateriCopySource = ref('')
const uploadingVideo = ref(false)
const uploadingPdf = ref(false)
const videoFileInput = ref(null)
const pdfFileInput = ref(null)

// Computed
const subKategoris = computed(() => {
  if (!selectedKategori.value) return []
  const kat = kategoris.value.find(k => k.id === parseInt(selectedKategori.value))
  return kat?.subKategoris || []
})

const currentSubKategori = computed(() => {
  if (!selectedSubKategori.value) return null
  return subKategoris.value.find(s => s.id === parseInt(selectedSubKategori.value))
})

const bulanOptions = [
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

const tahunOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]
})

// Watchers
watch(selectedKategori, () => {
  selectedSubKategori.value = ''
  currentPeriode.value = null
  periodes.value = []
})

watch(selectedSubKategori, async () => {
  currentPeriode.value = null
  if (selectedSubKategori.value) {
    await fetchPeriodes()
  } else {
    periodes.value = []
  }
})

// Lifecycle
onMounted(async () => {
  await fetchKategoris()
})

// Methods
async function fetchKategoris() {
  loading.value = true
  try {
    const response = await api.get('/kategori')
    kategoris.value = response.data
  } catch (err) {
    console.error(err)
    alert('Gagal memuat data kategori')
  } finally {
    loading.value = false
  }
}

async function fetchPeriodes() {
  if (!selectedSubKategori.value) return
  loadingPeriode.value = true
  try {
    const response = await api.get(`/periode/sub-kategori/${selectedSubKategori.value}`)
    periodes.value = response.data
  } catch (err) {
    console.error(err)
  } finally {
    loadingPeriode.value = false
  }
}

async function fetchPeriodeDetail(id) {
  loadingPeriode.value = true
  try {
    const response = await api.get(`/periode/${id}`)
    currentPeriode.value = response.data
  } catch (err) {
    console.error(err)
    alert('Gagal memuat detail periode')
  } finally {
    loadingPeriode.value = false
  }
}

async function fetchCopySources() {
  if (!currentPeriode.value) return
  try {
    const response = await api.get(`/periode/${currentPeriode.value.id}/copy-sources`)
    copySources.value = response.data
  } catch (err) {
    console.error(err)
  }
}

// Periode CRUD
function openCreatePeriode() {
  periodeForm.value = {
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear()
  }
  showPeriodeModal.value = true
}

async function savePeriode() {
  if (!selectedSubKategori.value) return
  saving.value = true
  try {
    await api.post('/periode', {
      subKategoriId: parseInt(selectedSubKategori.value),
      bulan: periodeForm.value.bulan,
      tahun: periodeForm.value.tahun
    })
    showPeriodeModal.value = false
    await fetchPeriodes()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal membuat periode')
  } finally {
    saving.value = false
  }
}

async function deletePeriode(id) {
  if (!confirm('Yakin hapus periode ini? Semua soal akan ikut terhapus.')) return
  try {
    await api.delete(`/periode/${id}`)
    if (currentPeriode.value?.id === id) {
      currentPeriode.value = null
    }
    await fetchPeriodes()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus periode')
  }
}

async function publishPeriode() {
  if (!currentPeriode.value) return
  if (!confirm('Yakin publish periode ini? Pastikan jadwal dan soal sudah lengkap.')) return
  try {
    await api.post(`/periode/${currentPeriode.value.id}/publish`)
    await fetchPeriodeDetail(currentPeriode.value.id)
    await fetchPeriodes()
    alert('Periode berhasil dipublish!')
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal publish periode')
  }
}

// Jadwal
function openJadwalModal() {
  if (!currentPeriode.value) return
  jadwalForm.value = {
    tanggal: currentPeriode.value.tanggal ? formatDateInput(currentPeriode.value.tanggal) : '',
    jamMulai: currentPeriode.value.jamMulai ? formatDateTimeInput(currentPeriode.value.jamMulai) : '',
    jamBerakhir: currentPeriode.value.jamBerakhir ? formatDateTimeInput(currentPeriode.value.jamBerakhir) : '',
    doCheckBerakhir: currentPeriode.value.doCheckBerakhir ? formatDateTimeInput(currentPeriode.value.doCheckBerakhir) : ''
  }
  showJadwalModal.value = true
}

async function saveJadwal() {
  if (!currentPeriode.value) return
  saving.value = true
  try {
    await api.put(`/periode/${currentPeriode.value.id}`, {
      tanggal: jadwalForm.value.tanggal || null,
      jamMulai: jadwalForm.value.jamMulai || null,
      jamBerakhir: jadwalForm.value.jamBerakhir || null,
      doCheckBerakhir: jadwalForm.value.doCheckBerakhir || null
    })
    showJadwalModal.value = false
    await fetchPeriodeDetail(currentPeriode.value.id)
    await fetchPeriodes()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan jadwal')
  } finally {
    saving.value = false
  }
}

// Soal CRUD
function openCreateSoal() {
  editingSoalId.value = null
  soalForm.value = {
    pertanyaan: '',
    opsiA: '',
    opsiB: '',
    opsiC: '',
    opsiD: '',
    jawabanBenar: 'A',
    pembahasan: ''
  }
  showSoalModal.value = true
}

function openEditSoal(soal) {
  editingSoalId.value = soal.id
  soalForm.value = {
    pertanyaan: soal.pertanyaan,
    opsiA: soal.opsiA,
    opsiB: soal.opsiB,
    opsiC: soal.opsiC,
    opsiD: soal.opsiD,
    jawabanBenar: soal.jawabanBenar,
    pembahasan: soal.pembahasan || ''
  }
  showSoalModal.value = true
}

async function saveSoal() {
  if (!currentPeriode.value) return
  saving.value = true
  try {
    if (editingSoalId.value) {
      await api.put(`/periode/soal/${editingSoalId.value}`, soalForm.value)
    } else {
      await api.post(`/periode/${currentPeriode.value.id}/soal`, soalForm.value)
    }
    showSoalModal.value = false
    await fetchPeriodeDetail(currentPeriode.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan soal')
  } finally {
    saving.value = false
  }
}

async function deleteSoal(id) {
  if (!confirm('Yakin hapus soal ini?')) return
  try {
    await api.delete(`/periode/soal/${id}`)
    await fetchPeriodeDetail(currentPeriode.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus soal')
  }
}

// Upload CSV
function openUploadModal() {
  uploadFile.value = null
  uploadErrors.value = []
  showUploadModal.value = true
}

function handleFileSelect(event) {
  uploadFile.value = event.target.files[0]
}

async function uploadCSV() {
  if (!uploadFile.value || !currentPeriode.value) return
  saving.value = true
  uploadErrors.value = []
  try {
    const formData = new FormData()
    formData.append('file', uploadFile.value)

    const response = await api.post(`/periode/${currentPeriode.value.id}/upload-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.data.errors) {
      uploadErrors.value = response.data.errors
    }

    alert(response.data.message)
    showUploadModal.value = false
    await fetchPeriodeDetail(currentPeriode.value.id)
  } catch (err) {
    if (err.response?.data?.errors) {
      uploadErrors.value = err.response.data.errors
    }
    alert(err.response?.data?.error || 'Gagal upload CSV')
  } finally {
    saving.value = false
  }
}

async function downloadTemplate() {
  try {
    const response = await api.get('/periode/template/csv', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'template_soal.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (err) {
    alert('Gagal download template')
  }
}

// Copy from periode
async function openCopyModal() {
  await fetchCopySources()
  selectedCopySource.value = ''
  showCopyModal.value = true
}

async function copyFromPeriode() {
  if (!selectedCopySource.value || !currentPeriode.value) return
  saving.value = true
  try {
    const response = await api.post(`/periode/${currentPeriode.value.id}/copy-from/${selectedCopySource.value}`)
    alert(response.data.message)
    showCopyModal.value = false
    await fetchPeriodeDetail(currentPeriode.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyalin soal')
  } finally {
    saving.value = false
  }
}

// Materi CRUD
function openCreateMateri() {
  editingMateriId.value = null
  materiForm.value = {
    judul: '',
    konten: '',
    videoType: '',
    videoUrl: '',
    videoFile: '',
    pdfFile: ''
  }
  showMateriModal.value = true
}

function openEditMateri(materi) {
  editingMateriId.value = materi.id
  materiForm.value = {
    judul: materi.judul,
    konten: materi.konten,
    videoType: materi.videoType || '',
    videoUrl: materi.videoUrl || '',
    videoFile: materi.videoFile || '',
    pdfFile: materi.pdfFile || ''
  }
  showMateriModal.value = true
}

async function saveMateri() {
  if (!currentPeriode.value) return
  saving.value = true
  try {
    const data = {
      judul: materiForm.value.judul,
      konten: materiForm.value.konten,
      videoType: materiForm.value.videoType || null,
      videoUrl: materiForm.value.videoUrl || null,
      videoFile: materiForm.value.videoFile || null,
      pdfFile: materiForm.value.pdfFile || null
    }

    if (editingMateriId.value) {
      await api.put(`/periode/materi/${editingMateriId.value}`, data)
    } else {
      await api.post(`/periode/${currentPeriode.value.id}/materi`, data)
    }
    showMateriModal.value = false
    await fetchPeriodeDetail(currentPeriode.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan materi')
  } finally {
    saving.value = false
  }
}

async function deleteMateri(id) {
  if (!confirm('Yakin hapus materi ini?')) return
  try {
    const response = await api.delete(`/periode/materi/${id}`)
    // Delete associated files if any
    if (response.data.filesToDelete) {
      const { videoFile, pdfFile } = response.data.filesToDelete
      if (videoFile) {
        try { await api.delete('/upload/file', { data: { filepath: videoFile } }) } catch (e) { }
      }
      if (pdfFile) {
        try { await api.delete('/upload/file', { data: { filepath: pdfFile } }) } catch (e) { }
      }
    }
    await fetchPeriodeDetail(currentPeriode.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus materi')
  }
}

// Video upload
async function handleVideoUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  uploadingVideo.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    materiForm.value.videoFile = response.data.path
    materiForm.value.videoType = 'upload'
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal upload video')
  } finally {
    uploadingVideo.value = false
    if (videoFileInput.value) videoFileInput.value.value = ''
  }
}

function removeVideoFile() {
  materiForm.value.videoFile = ''
  materiForm.value.videoType = ''
}

// PDF upload
async function handlePdfUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  uploadingPdf.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/upload/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    materiForm.value.pdfFile = response.data.path
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal upload PDF')
  } finally {
    uploadingPdf.value = false
    if (pdfFileInput.value) pdfFileInput.value.value = ''
  }
}

function removePdfFile() {
  materiForm.value.pdfFile = ''
}

// Copy materi from periode
async function fetchMateriCopySources() {
  if (!currentPeriode.value) return
  try {
    const response = await api.get(`/periode/${currentPeriode.value.id}/materi-copy-sources`)
    materiCopySources.value = response.data
  } catch (err) {
    console.error(err)
  }
}

async function openMateriCopyModal() {
  await fetchMateriCopySources()
  selectedMateriCopySource.value = ''
  showMateriCopyModal.value = true
}

async function copyMateriFromPeriode() {
  if (!selectedMateriCopySource.value || !currentPeriode.value) return
  saving.value = true
  try {
    const response = await api.post(`/periode/${currentPeriode.value.id}/materi/copy-from/${selectedMateriCopySource.value}`)
    alert(response.data.message)
    showMateriCopyModal.value = false
    await fetchPeriodeDetail(currentPeriode.value.id)
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyalin materi')
  } finally {
    saving.value = false
  }
}

// Helpers
function formatDateInput(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

function formatDateTimeInput(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toISOString().slice(0, 16)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusBadge(status) {
  const badges = {
    draft: { text: 'Draft', class: 'bg-gray-100 text-gray-700' },
    terjadwal: { text: 'Terjadwal', class: 'bg-blue-100 text-blue-700' },
    aktif: { text: 'Aktif', class: 'bg-green-100 text-green-700' },
    docheck: { text: 'Do-Check', class: 'bg-purple-100 text-purple-700' },
    selesai: { text: 'Selesai', class: 'bg-gray-100 text-gray-600' }
  }
  return badges[status] || badges.draft
}

function selectPeriode(periode) {
  fetchPeriodeDetail(periode.id)
}
</script>

<template>
  <AdminLayout>
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Pembuatan Soal & Jadwal</h1>
          <p class="text-gray-500 text-sm mt-1">Kelola soal dan jadwal test per periode</p>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar - Kategori & SubKategori Selection -->
        <div class="lg:col-span-1">
          <div class="card sticky top-24 space-y-4">
            <h3 class="font-semibold text-gray-800">Pilih Sub-Kategori</h3>

            <!-- Kategori -->
            <div>
              <label class="block text-sm text-gray-600 mb-1">Kategori</label>
              <select v-model="selectedKategori" class="input-field text-sm">
                <option value="">Pilih Kategori</option>
                <option v-for="kat in kategoris" :key="kat.id" :value="kat.id">
                  {{ kat.nama }}
                </option>
              </select>
            </div>

            <!-- Sub Kategori -->
            <div>
              <label class="block text-sm text-gray-600 mb-1">Sub Kategori</label>
              <select
                v-model="selectedSubKategori"
                class="input-field text-sm"
                :disabled="!selectedKategori"
              >
                <option value="">Pilih Sub Kategori</option>
                <option v-for="sub in subKategoris" :key="sub.id" :value="sub.id">
                  {{ sub.nama }}
                </option>
              </select>
            </div>

            <!-- Periode List -->
            <div v-if="selectedSubKategori" class="mt-4 pt-4 border-t border-gray-200">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-medium text-gray-700">Daftar Periode</h4>
                <button @click="openCreatePeriode" class="text-bpjs-600 hover:text-bpjs-700 text-sm font-medium">
                  + Baru
                </button>
              </div>

              <div v-if="loadingPeriode && !currentPeriode" class="py-4 text-center">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-bpjs-500 mx-auto"></div>
              </div>

              <div v-else-if="periodes.length === 0" class="text-center py-4 text-gray-500 text-sm">
                Belum ada periode
              </div>

              <div v-else class="space-y-2 max-h-64 overflow-y-auto">
                <button
                  v-for="periode in periodes"
                  :key="periode.id"
                  @click="selectPeriode(periode)"
                  class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border"
                  :class="currentPeriode?.id === periode.id
                    ? 'bg-bpjs-50 border-bpjs-500 text-bpjs-700'
                    : 'border-gray-200 hover:bg-gray-50'"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{{ periode.nama }}</span>
                    <span
                      class="px-2 py-0.5 rounded-full text-xs"
                      :class="getStatusBadge(periode.status).class"
                    >
                      {{ getStatusBadge(periode.status).text }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ periode.jumlahSoal || periode._count?.soals || 0 }} soal, {{ periode.jumlahMateri || periode._count?.materis || 0 }} materi
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="lg:col-span-3">
          <!-- No Selection State -->
          <div v-if="!selectedSubKategori" class="card text-center py-16">
            <svg class="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 class="text-lg font-medium text-gray-600 mb-2">Pilih Sub-Kategori</h3>
            <p class="text-gray-500">Pilih kategori dan sub-kategori dari panel samping untuk mengelola soal</p>
          </div>

          <!-- No Periode Selected -->
          <div v-else-if="!currentPeriode" class="card text-center py-16">
            <svg class="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-600 mb-2">Pilih atau Buat Periode</h3>
            <p class="text-gray-500 mb-4">Pilih periode dari daftar atau buat periode baru</p>
            <button @click="openCreatePeriode" class="btn-primary">
              + Buat Periode Baru
            </button>
          </div>

          <!-- Periode Detail -->
          <div v-else class="space-y-6">
            <!-- Periode Header -->
            <div class="card bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="text-white/70 text-sm">{{ currentSubKategori?.nama }}</span>
                    <span class="text-white/50">/</span>
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="currentPeriode.status === 'draft' ? 'bg-white/20' : 'bg-white/30'"
                    >
                      {{ getStatusBadge(currentPeriode.status).text }}
                    </span>
                  </div>
                  <h2 class="text-2xl font-bold">{{ currentPeriode.nama }}</h2>
                  <div class="mt-2 text-white/80 text-sm space-y-1">
                    <p v-if="currentPeriode.tanggal">
                      Tanggal: {{ formatDate(currentPeriode.tanggal) }}
                    </p>
                    <p v-if="currentPeriode.jamMulai && currentPeriode.jamBerakhir">
                      Waktu: {{ formatTime(currentPeriode.jamMulai) }} - {{ formatTime(currentPeriode.jamBerakhir) }}
                    </p>
                  </div>
                </div>
                <div class="text-right flex space-x-6">
                  <div class="text-center">
                    <p class="text-3xl font-bold">{{ currentPeriode.soals?.length || 0 }}</p>
                    <p class="text-white/80 text-sm">Soal</p>
                  </div>
                  <div class="text-center">
                    <p class="text-3xl font-bold">{{ currentPeriode.materis?.length || 0 }}</p>
                    <p class="text-white/80 text-sm">Materi</p>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-2">
                <button
                  v-if="currentPeriode.status === 'draft'"
                  @click="openJadwalModal"
                  class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Atur Jadwal
                </button>
                <button
                  v-if="currentPeriode.status === 'draft'"
                  @click="publishPeriode"
                  :disabled="!currentPeriode.soals?.length || !currentPeriode.jamMulai"
                  class="px-4 py-2 bg-white text-bpjs-600 hover:bg-white/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Publish
                </button>
                <button
                  v-if="currentPeriode.status === 'draft'"
                  @click="deletePeriode(currentPeriode.id)"
                  class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Hapus Periode
                </button>
              </div>
            </div>

            <!-- Jadwal Info Card -->
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800">Pengaturan Jadwal</h3>
                <button
                  v-if="currentPeriode.status === 'draft'"
                  @click="openJadwalModal"
                  class="text-bpjs-600 hover:text-bpjs-700 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-3 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500 mb-1">Tanggal Pelaksanaan</p>
                  <p class="font-medium text-gray-800">{{ formatDate(currentPeriode.tanggal) }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500 mb-1">Jam Mulai</p>
                  <p class="font-medium text-gray-800">{{ formatTime(currentPeriode.jamMulai) }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500 mb-1">Jam Berakhir</p>
                  <p class="font-medium text-gray-800">{{ formatTime(currentPeriode.jamBerakhir) }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500 mb-1">Do-Check Berakhir</p>
                  <p class="font-medium text-gray-800">{{ currentPeriode.doCheckBerakhir ? formatDateTime(currentPeriode.doCheckBerakhir) : 'Tidak dibatasi' }}</p>
                </div>
              </div>
            </div>

            <!-- Tabs -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="flex border-b border-gray-200">
                <button
                  @click="activeTab = 'soal'"
                  class="flex-1 px-6 py-4 text-sm font-medium transition-colors relative"
                  :class="activeTab === 'soal' ? 'text-bpjs-600 bg-bpjs-50' : 'text-gray-600 hover:bg-gray-50'"
                >
                  <div class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Kelola Soal</span>
                    <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100" :class="activeTab === 'soal' ? 'bg-bpjs-100 text-bpjs-700' : 'text-gray-600'">
                      {{ currentPeriode.soals?.length || 0 }}
                    </span>
                  </div>
                  <div v-if="activeTab === 'soal'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-bpjs-500"></div>
                </button>
                <button
                  @click="activeTab = 'materi'"
                  class="flex-1 px-6 py-4 text-sm font-medium transition-colors relative"
                  :class="activeTab === 'materi' ? 'text-bpjs-600 bg-bpjs-50' : 'text-gray-600 hover:bg-gray-50'"
                >
                  <div class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Kelola Materi</span>
                    <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100" :class="activeTab === 'materi' ? 'bg-bpjs-100 text-bpjs-700' : 'text-gray-600'">
                      {{ currentPeriode.materis?.length || 0 }}
                    </span>
                  </div>
                  <div v-if="activeTab === 'materi'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-bpjs-500"></div>
                </button>
              </div>

              <!-- Soal Tab Content -->
              <div v-if="activeTab === 'soal'" class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-800">Kelola Soal</h3>
                <div v-if="currentPeriode.status === 'draft'" class="flex flex-wrap gap-2">
                  <button @click="downloadTemplate" class="btn-secondary text-sm">
                    Download Template
                  </button>
                  <button @click="openUploadModal" class="btn-secondary text-sm">
                    Upload CSV
                  </button>
                  <button @click="openCopyModal" class="btn-secondary text-sm">
                    Salin dari Periode Lain
                  </button>
                  <button @click="openCreateSoal" class="btn-primary text-sm">
                    + Tambah Soal
                  </button>
                </div>
              </div>

              <!-- Soal List -->
              <div v-if="currentPeriode.soals?.length > 0" class="space-y-4">
                <div
                  v-for="(soal, index) in currentPeriode.soals"
                  :key="soal.id"
                  class="border border-gray-200 rounded-xl p-4"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                      <span class="w-8 h-8 bg-bpjs-100 text-bpjs-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {{ index + 1 }}
                      </span>
                      <p class="text-gray-800 font-medium flex-1">{{ soal.pertanyaan }}</p>
                    </div>
                    <div v-if="currentPeriode.status === 'draft'" class="flex items-center space-x-2">
                      <button @click="openEditSoal(soal)" class="text-gray-500 hover:text-bpjs-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button @click="deleteSoal(soal.id)" class="text-gray-500 hover:text-red-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 ml-11">
                    <div
                      v-for="opsi in ['A', 'B', 'C', 'D']"
                      :key="opsi"
                      class="px-3 py-2 rounded-lg text-sm flex items-center"
                      :class="soal.jawabanBenar === opsi
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'"
                    >
                      <span
                        class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mr-2"
                        :class="soal.jawabanBenar === opsi ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'"
                      >
                        {{ opsi }}
                      </span>
                      <span class="flex-1">{{ soal[`opsi${opsi}`] }}</span>
                      <svg v-if="soal.jawabanBenar === opsi" class="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  <div v-if="soal.pembahasan" class="mt-3 ml-11 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <span class="font-medium">Pembahasan:</span> {{ soal.pembahasan }}
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="text-center py-12 bg-gray-50 rounded-xl">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="text-lg font-medium text-gray-600 mb-2">Belum Ada Soal</h3>
                <p class="text-gray-500 mb-4">Tambahkan soal secara manual atau upload CSV</p>
                <div class="flex justify-center gap-3">
                  <button @click="openUploadModal" class="btn-secondary">
                    Upload CSV
                  </button>
                  <button @click="openCreateSoal" class="btn-primary">
                    + Tambah Soal
                  </button>
                </div>
              </div>
              </div>

              <!-- Materi Tab Content -->
              <div v-if="activeTab === 'materi'" class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-800">Kelola Materi</h3>
                  <div v-if="currentPeriode.status === 'draft'" class="flex flex-wrap gap-2">
                    <button @click="openMateriCopyModal" class="btn-secondary text-sm">
                      Salin dari Periode Lain
                    </button>
                    <button @click="openCreateMateri" class="btn-primary text-sm">
                      + Tambah Materi
                    </button>
                  </div>
                </div>

                <!-- Materi List -->
                <div v-if="currentPeriode.materis?.length > 0" class="space-y-4">
                  <div
                    v-for="(materi, index) in currentPeriode.materis"
                    :key="materi.id"
                    class="border border-gray-200 rounded-xl p-4"
                  >
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex items-center space-x-3">
                        <span class="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {{ index + 1 }}
                        </span>
                        <div>
                          <p class="text-gray-800 font-medium">{{ materi.judul }}</p>
                          <div class="flex items-center space-x-2 mt-1">
                            <span v-if="materi.videoType || materi.videoUrl" class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {{ materi.videoType === 'upload' ? 'Video Upload' : 'Video URL' }}
                            </span>
                            <span v-if="materi.pdfFile" class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">
                              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              PDF
                            </span>
                          </div>
                        </div>
                      </div>
                      <div v-if="currentPeriode.status === 'draft'" class="flex items-center space-x-2">
                        <button @click="openEditMateri(materi)" class="text-gray-500 hover:text-bpjs-600">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button @click="deleteMateri(materi.id)" class="text-gray-500 hover:text-red-600">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div class="ml-11 text-sm text-gray-600 line-clamp-2" v-html="materi.konten.substring(0, 200) + '...'"></div>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-else class="text-center py-12 bg-gray-50 rounded-xl">
                  <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 class="text-lg font-medium text-gray-600 mb-2">Belum Ada Materi</h3>
                  <p class="text-gray-500 mb-4">Tambahkan materi pembelajaran untuk periode ini</p>
                  <button @click="openCreateMateri" class="btn-primary">
                    + Tambah Materi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Create Periode -->
      <div v-if="showPeriodeModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full">
          <h2 class="text-xl font-bold mb-4">Buat Periode Baru</h2>
          <p class="text-gray-500 text-sm mb-4">{{ currentSubKategori?.nama }}</p>

          <form @submit.prevent="savePeriode">
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-gray-700 mb-2">Bulan</label>
                <select v-model="periodeForm.bulan" class="input-field" required>
                  <option v-for="bulan in bulanOptions" :key="bulan.value" :value="bulan.value">
                    {{ bulan.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-gray-700 mb-2">Tahun</label>
                <select v-model="periodeForm.tahun" class="input-field" required>
                  <option v-for="tahun in tahunOptions" :key="tahun" :value="tahun">
                    {{ tahun }}
                  </option>
                </select>
              </div>
            </div>

            <div class="flex space-x-3">
              <button type="button" @click="showPeriodeModal = false" class="flex-1 btn-secondary">
                Batal
              </button>
              <button type="submit" class="flex-1 btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Buat Periode' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Jadwal -->
      <div v-if="showJadwalModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full">
          <h2 class="text-xl font-bold mb-4">Pengaturan Jadwal</h2>

          <form @submit.prevent="saveJadwal">
            <div class="space-y-4 mb-6">
              <div>
                <label class="block text-gray-700 mb-2">Tanggal Pelaksanaan</label>
                <input v-model="jadwalForm.tanggal" type="date" class="input-field" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 mb-2">Jam Mulai</label>
                  <input v-model="jadwalForm.jamMulai" type="datetime-local" class="input-field" />
                </div>
                <div>
                  <label class="block text-gray-700 mb-2">Jam Berakhir</label>
                  <input v-model="jadwalForm.jamBerakhir" type="datetime-local" class="input-field" />
                </div>
              </div>
              <div>
                <label class="block text-gray-700 mb-2">Do-Check Berakhir (Opsional)</label>
                <input v-model="jadwalForm.doCheckBerakhir" type="datetime-local" class="input-field" />
                <p class="text-xs text-gray-500 mt-1">Kosongkan jika Do-Check tidak dibatasi waktu</p>
              </div>
            </div>

            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6 text-sm text-yellow-700">
              <strong>Info:</strong> Do-Check akan otomatis aktif setelah jam berakhir test. User dapat melihat pembahasan dan kunci jawaban.
            </div>

            <div class="flex space-x-3">
              <button type="button" @click="showJadwalModal = false" class="flex-1 btn-secondary">
                Batal
              </button>
              <button type="submit" class="flex-1 btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan Jadwal' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Soal -->
      <div v-if="showSoalModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">{{ editingSoalId ? 'Edit Soal' : 'Tambah Soal' }}</h2>

          <form @submit.prevent="saveSoal">
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Pertanyaan</label>
              <textarea
                v-model="soalForm.pertanyaan"
                class="input-field"
                rows="3"
                required
                placeholder="Masukkan pertanyaan..."
              ></textarea>
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Opsi Jawaban</label>
              <p class="text-sm text-gray-500 mb-3">Pilih jawaban yang benar dengan mengklik huruf</p>
              <div class="space-y-3">
                <div v-for="opsi in ['A', 'B', 'C', 'D']" :key="opsi" class="flex items-center space-x-2">
                  <button
                    type="button"
                    @click="soalForm.jawabanBenar = opsi"
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all flex-shrink-0"
                    :class="soalForm.jawabanBenar === opsi
                      ? 'bg-green-500 text-white ring-2 ring-green-300 ring-offset-2'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'"
                  >
                    {{ opsi }}
                  </button>
                  <input
                    v-model="soalForm[`opsi${opsi}`]"
                    type="text"
                    class="input-field flex-1"
                    :placeholder="`Masukkan opsi ${opsi}...`"
                    required
                  />
                  <span
                    v-if="soalForm.jawabanBenar === opsi"
                    class="text-green-500 text-xs font-medium px-2 py-1 bg-green-50 rounded"
                  >
                    Benar
                  </span>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 mb-2">Pembahasan (Opsional)</label>
              <textarea
                v-model="soalForm.pembahasan"
                class="input-field"
                rows="2"
                placeholder="Penjelasan jawaban untuk Do-Check..."
              ></textarea>
            </div>

            <div class="flex space-x-3">
              <button type="button" @click="showSoalModal = false" class="flex-1 btn-secondary">
                Batal
              </button>
              <button type="submit" class="flex-1 btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan Soal' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Upload CSV -->
      <div v-if="showUploadModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full">
          <h2 class="text-xl font-bold mb-4">Upload Soal via CSV</h2>

          <div class="mb-4">
            <button @click="downloadTemplate" class="text-bpjs-600 hover:text-bpjs-700 text-sm font-medium underline">
              Download template CSV
            </button>
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Pilih File CSV</label>
            <input
              type="file"
              accept=".csv"
              @change="handleFileSelect"
              class="input-field"
            />
          </div>

          <div class="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600">
            <strong>Format CSV:</strong><br>
            pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, pembahasan
          </div>

          <div v-if="uploadErrors.length > 0" class="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 max-h-32 overflow-y-auto">
            <strong>Error:</strong>
            <ul class="mt-1 list-disc list-inside">
              <li v-for="(error, index) in uploadErrors" :key="index">
                Baris {{ error.line }}: {{ error.error }}
              </li>
            </ul>
          </div>

          <div class="flex space-x-3">
            <button type="button" @click="showUploadModal = false" class="flex-1 btn-secondary">
              Batal
            </button>
            <button @click="uploadCSV" class="flex-1 btn-primary" :disabled="!uploadFile || saving">
              {{ saving ? 'Mengupload...' : 'Upload' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Copy from Periode -->
      <div v-if="showCopyModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full">
          <h2 class="text-xl font-bold mb-4">Salin Soal dari Periode Lain</h2>

          <div v-if="copySources.length === 0" class="text-center py-8 text-gray-500">
            Tidak ada periode lain dengan soal yang tersedia
          </div>

          <div v-else>
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Pilih Periode Sumber</label>
              <select v-model="selectedCopySource" class="input-field">
                <option value="">Pilih Periode</option>
                <option v-for="source in copySources" :key="source.id" :value="source.id">
                  {{ source.nama }} ({{ source.jumlahSoal }} soal)
                </option>
              </select>
            </div>

            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-700">
              <strong>Info:</strong> Soal akan disalin ke periode ini. Soal asli di periode sumber tidak terpengaruh.
            </div>
          </div>

          <div class="flex space-x-3">
            <button type="button" @click="showCopyModal = false" class="flex-1 btn-secondary">
              Batal
            </button>
            <button
              @click="copyFromPeriode"
              class="flex-1 btn-primary"
              :disabled="!selectedCopySource || saving"
            >
              {{ saving ? 'Menyalin...' : 'Salin Soal' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Materi -->
      <div v-if="showMateriModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">{{ editingMateriId ? 'Edit Materi' : 'Tambah Materi' }}</h2>

          <form @submit.prevent="saveMateri">
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Judul Materi <span class="text-red-500">*</span></label>
              <input
                v-model="materiForm.judul"
                type="text"
                class="input-field"
                required
                placeholder="Masukkan judul materi..."
              />
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Konten <span class="text-red-500">*</span></label>
              <div class="border border-gray-200 rounded-xl overflow-hidden">
                <QuillEditor
                  v-model:content="materiForm.konten"
                  content-type="html"
                  :toolbar="quillToolbar"
                  theme="snow"
                  style="min-height: 250px;"
                  placeholder="Masukkan konten materi..."
                />
              </div>
              <p class="text-xs text-gray-500 mt-1">Gunakan toolbar untuk format teks, upload gambar, dan lainnya</p>
            </div>

            <!-- Video Section -->
            <div class="mb-4 p-4 bg-gray-50 rounded-xl">
              <label class="block text-gray-700 mb-3 font-medium">Video (Opsional)</label>

              <div class="flex items-center space-x-4 mb-3">
                <label class="flex items-center">
                  <input type="radio" v-model="materiForm.videoType" value="" class="mr-2">
                  <span class="text-sm text-gray-600">Tidak Ada</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" v-model="materiForm.videoType" value="url" class="mr-2">
                  <span class="text-sm text-gray-600">URL Eksternal</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" v-model="materiForm.videoType" value="upload" class="mr-2">
                  <span class="text-sm text-gray-600">Upload File</span>
                </label>
              </div>

              <!-- URL Input -->
              <div v-if="materiForm.videoType === 'url'" class="mt-3">
                <input
                  v-model="materiForm.videoUrl"
                  type="url"
                  class="input-field"
                  placeholder="https://www.youtube.com/embed/..."
                />
                <p class="text-xs text-gray-500 mt-1">Masukkan URL embed video (YouTube, Vimeo, dll)</p>
              </div>

              <!-- Upload Input -->
              <div v-if="materiForm.videoType === 'upload'" class="mt-3">
                <div v-if="materiForm.videoFile" class="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-2">
                  <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span class="text-sm text-blue-700">{{ materiForm.videoFile.split('/').pop() }}</span>
                  </div>
                  <button type="button" @click="removeVideoFile" class="text-red-500 hover:text-red-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div v-else>
                  <input
                    ref="videoFileInput"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    @change="handleVideoUpload"
                    class="input-field"
                    :disabled="uploadingVideo"
                  />
                  <p class="text-xs text-gray-500 mt-1">Format: MP4, WebM, OGG. Maksimal 100MB</p>
                </div>
                <div v-if="uploadingVideo" class="flex items-center space-x-2 mt-2 text-blue-600">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span class="text-sm">Mengupload video...</span>
                </div>
              </div>
            </div>

            <!-- PDF Section -->
            <div class="mb-6 p-4 bg-gray-50 rounded-xl">
              <label class="block text-gray-700 mb-3 font-medium">PDF (Opsional)</label>

              <div v-if="materiForm.pdfFile" class="flex items-center justify-between p-3 bg-red-50 rounded-lg mb-2">
                <div class="flex items-center space-x-2">
                  <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span class="text-sm text-red-700">{{ materiForm.pdfFile.split('/').pop() }}</span>
                </div>
                <button type="button" @click="removePdfFile" class="text-red-500 hover:text-red-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div v-else>
                <input
                  ref="pdfFileInput"
                  type="file"
                  accept="application/pdf"
                  @change="handlePdfUpload"
                  class="input-field"
                  :disabled="uploadingPdf"
                />
                <p class="text-xs text-gray-500 mt-1">Format: PDF. Maksimal 20MB</p>
              </div>
              <div v-if="uploadingPdf" class="flex items-center space-x-2 mt-2 text-red-600">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                <span class="text-sm">Mengupload PDF...</span>
              </div>
            </div>

            <div class="flex space-x-3">
              <button type="button" @click="showMateriModal = false" class="flex-1 btn-secondary">
                Batal
              </button>
              <button type="submit" class="flex-1 btn-primary" :disabled="saving || uploadingVideo || uploadingPdf">
                {{ saving ? 'Menyimpan...' : 'Simpan Materi' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Copy Materi from Periode -->
      <div v-if="showMateriCopyModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full">
          <h2 class="text-xl font-bold mb-4">Salin Materi dari Periode Lain</h2>

          <div v-if="materiCopySources.length === 0" class="text-center py-8 text-gray-500">
            Tidak ada periode lain dengan materi yang tersedia
          </div>

          <div v-else>
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Pilih Periode Sumber</label>
              <select v-model="selectedMateriCopySource" class="input-field">
                <option value="">Pilih Periode</option>
                <option v-for="source in materiCopySources" :key="source.id" :value="source.id">
                  {{ source.nama }} ({{ source.jumlahMateri }} materi)
                </option>
              </select>
            </div>

            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-700">
              <strong>Info:</strong> Materi akan disalin ke periode ini. File video dan PDF akan menggunakan referensi yang sama.
            </div>
          </div>

          <div class="flex space-x-3">
            <button type="button" @click="showMateriCopyModal = false" class="flex-1 btn-secondary">
              Batal
            </button>
            <button
              @click="copyMateriFromPeriode"
              class="flex-1 btn-primary"
              :disabled="!selectedMateriCopySource || saving"
            >
              {{ saving ? 'Menyalin...' : 'Salin Materi' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
