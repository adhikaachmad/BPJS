<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import vSelect from 'vue-select'
import 'vue-select/dist/vue-select.css'

const users = ref([])
const subKategoris = ref([])
const loading = ref(true)
const showModal = ref(false)
const editMode = ref(false)

// Bulk import state
const showImportModal = ref(false)
const showImportResultModal = ref(false)
const importLoading = ref(false)
const importResults = ref(null)
const csvFileInput = ref(null)

// Location data
const provinsiList = ref([])
const kabupatenList = ref([])
const loadingKabupaten = ref(false)

const form = ref({
  id: null,
  npp: '',
  nama: '',
  email: '',
  posisi: '',
  vendor: '',
  kepwil: '',
  kcKabupaten: '',
  kakabKabupaten: '',
  password: '',
  subKategoriId: ''
})
const saving = ref(false)
const pagination = ref({ page: 1, total: 0, totalPages: 0 })
const search = ref('')
const filterSubKategori = ref('')

// Group sub kategoris by kategori for display
const groupedSubKategoris = computed(() => {
  const grouped = {}
  subKategoris.value.forEach(sub => {
    const katNama = sub.kategoriNama
    if (!grouped[katNama]) {
      grouped[katNama] = []
    }
    grouped[katNama].push(sub)
  })
  return grouped
})

// Get selected province ID for fetching kabupaten
const selectedProvinsiId = computed(() => {
  const provinsi = provinsiList.value.find(p => p.nama === form.value.kepwil)
  return provinsi?.id || null
})

// Watch for kepwil changes to fetch kabupaten
watch(() => form.value.kepwil, async (newVal) => {
  if (newVal) {
    await fetchKabupaten(selectedProvinsiId.value)
  } else {
    kabupatenList.value = []
    form.value.kcKabupaten = ''
    form.value.kakabKabupaten = ''
  }
})

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchSubKategoris(), fetchProvinsi()])
})

async function fetchProvinsi() {
  try {
    const response = await api.get('/lokasi/provinsi')
    provinsiList.value = response.data.data
  } catch (err) {
    console.error('Failed to fetch provinsi:', err)
  }
}

async function fetchKabupaten(provinsiId) {
  if (!provinsiId) {
    kabupatenList.value = []
    return
  }

  loadingKabupaten.value = true
  try {
    const response = await api.get(`/lokasi/kabupaten/${provinsiId}`)
    kabupatenList.value = response.data.data
  } catch (err) {
    console.error('Failed to fetch kabupaten:', err)
    kabupatenList.value = []
  } finally {
    loadingKabupaten.value = false
  }
}

async function fetchSubKategoris() {
  const response = await api.get('/kategori')
  subKategoris.value = response.data.flatMap(k =>
    k.subKategoris.map(s => ({ ...s, kategoriNama: k.nama }))
  )
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = { page: pagination.value.page }
    if (search.value) params.search = search.value
    if (filterSubKategori.value) params.subKategoriId = filterSubKategori.value

    const response = await api.get('/user', { params })
    users.value = response.data.data
    pagination.value = response.data.pagination
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    id: null,
    npp: '',
    nama: '',
    email: '',
    posisi: '',
    vendor: '',
    kepwil: '',
    kcKabupaten: '',
    kakabKabupaten: '',
    password: '',
    subKategoriId: ''
  }
  kabupatenList.value = []
}

function openCreate() {
  resetForm()
  editMode.value = false
  showModal.value = true
}

async function openEdit(user) {
  form.value = {
    id: user.id,
    npp: user.npp,
    nama: user.nama,
    email: user.email || '',
    posisi: user.posisi || '',
    vendor: user.vendor || '',
    kepwil: user.kepwil || '',
    kcKabupaten: user.kcKabupaten || '',
    kakabKabupaten: user.kakabKabupaten || '',
    password: '',
    subKategoriId: user.subKategoriId
  }

  // If user has kepwil, fetch the kabupaten list
  if (user.kepwil) {
    const provinsi = provinsiList.value.find(p => p.nama === user.kepwil)
    if (provinsi) {
      await fetchKabupaten(provinsi.id)
    }
  }

  editMode.value = true
  showModal.value = true
}

async function saveUser() {
  saving.value = true
  try {
    const data = { ...form.value }

    // Remove empty password for edit
    if (editMode.value && !data.password) {
      delete data.password
    }

    if (editMode.value) {
      await api.put(`/user/${form.value.id}`, data)
    } else {
      await api.post('/user', data)
    }
    showModal.value = false
    fetchUsers()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

async function deleteUser(id) {
  if (!confirm('Yakin hapus user ini?')) return
  try {
    await api.delete(`/user/${id}`)
    fetchUsers()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus')
  }
}

function handleSearch() {
  pagination.value.page = 1
  fetchUsers()
}

function handleFilterChange() {
  pagination.value.page = 1
  fetchUsers()
}

// Auto-fill posisi based on sub kategori selection
function onSubKategoriChange() {
  const selected = subKategoris.value.find(s => s.id === parseInt(form.value.subKategoriId))
  if (selected && !editMode.value) {
    form.value.posisi = selected.nama
  }
}

// Provinsi options for v-select
const provinsiOptions = computed(() => provinsiList.value.map(p => p.nama))

// Bulk import functions
async function downloadTemplate() {
  try {
    const response = await api.get('/user/template/csv', { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template-import-user.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert('Gagal mengunduh template')
    console.error(err)
  }
}

function openImportModal() {
  showImportModal.value = true
  importResults.value = null
}

function triggerFileInput() {
  csvFileInput.value?.click()
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.name.endsWith('.csv')) {
    alert('File harus berformat CSV')
    return
  }

  importLoading.value = true
  showImportModal.value = false

  try {
    const csvData = await file.text()
    const response = await api.post('/user/bulk-import-csv', {
      csvData,
      defaultPassword: 'password123'
    })

    importResults.value = response.data
    showImportResultModal.value = true

    // Refresh user list if any imports succeeded
    if (response.data.successCount > 0) {
      fetchUsers()
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal mengimport data')
    console.error(err)
  } finally {
    importLoading.value = false
    // Reset file input
    if (csvFileInput.value) {
      csvFileInput.value.value = ''
    }
  }
}
</script>

<template>
  <AdminLayout>
    <div class="p-6 lg:p-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Manajemen User</h1>
          <p class="text-gray-500 text-sm mt-1">Kelola data pengguna sistem kuesioner</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Download Template -->
          <button @click="downloadTemplate" class="inline-flex items-center px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Template CSV
          </button>
          <!-- Import CSV -->
          <button @click="openImportModal" class="inline-flex items-center px-3 py-2 bg-white border border-amber-300 text-amber-700 rounded-xl font-medium hover:bg-amber-50 transition-all">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
          </button>
          <!-- Add User -->
          <button @click="openCreate" class="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white rounded-xl font-medium shadow-lg shadow-bpjs-500/30 hover:shadow-xl hover:shadow-bpjs-500/40 transition-all">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah User
          </button>
        </div>
      </div>

      <!-- Hidden file input for CSV import -->
      <input
        ref="csvFileInput"
        type="file"
        accept=".csv"
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="search"
                type="text"
                placeholder="Cari NPP, nama, atau email..."
                class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
                @keyup.enter="handleSearch"
              />
            </div>
          </div>
          <select
            v-model="filterSubKategori"
            @change="handleFilterChange"
            class="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white"
          >
            <option value="">Semua Sub Kategori</option>
            <optgroup v-for="(subs, katNama) in groupedSubKategoris" :key="katNama" :label="katNama">
              <option v-for="sub in subs" :key="sub.id" :value="sub.id">
                {{ sub.nama }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500 mb-4"></div>
          <p class="text-gray-500">Memuat data...</p>
        </div>
      </div>

      <!-- Users Table -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1200px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kepwil</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">KC</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kakab</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Posisi</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub Kategori</th>
                <th class="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Test</th>
                <th class="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 transition-colors">
                <!-- User Info -->
                <td class="px-4 py-4">
                  <div class="flex items-center">
                    <div class="w-9 h-9 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center mr-3 shadow flex-shrink-0">
                      <span class="text-white font-bold text-sm">{{ user.nama?.charAt(0) }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-gray-900 truncate">{{ user.nama }}</p>
                      <p class="text-xs text-gray-500 font-mono">{{ user.npp }}</p>
                    </div>
                  </div>
                </td>
                <!-- Vendor -->
                <td class="px-4 py-4">
                  <span v-if="user.vendor" class="inline-flex items-center px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium max-w-[120px] truncate" :title="user.vendor">
                    {{ user.vendor }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Kepwil -->
                <td class="px-4 py-4">
                  <span v-if="user.kepwil" class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium max-w-[130px] truncate" :title="user.kepwil">
                    {{ user.kepwil }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- KC -->
                <td class="px-4 py-4">
                  <span v-if="user.kcKabupaten" class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium max-w-[130px] truncate" :title="user.kcKabupaten">
                    {{ user.kcKabupaten }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Kakab -->
                <td class="px-4 py-4">
                  <span v-if="user.kakabKabupaten" class="inline-flex items-center px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium max-w-[130px] truncate" :title="user.kakabKabupaten">
                    {{ user.kakabKabupaten }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Posisi -->
                <td class="px-4 py-4">
                  <span class="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                    {{ user.posisi }}
                  </span>
                </td>
                <!-- Sub Kategori -->
                <td class="px-4 py-4">
                  <p class="text-sm text-gray-900">{{ user.subKategori?.nama }}</p>
                  <p class="text-xs text-gray-500">{{ user.subKategori?.kategori?.nama }}</p>
                </td>
                <!-- Test Count -->
                <td class="px-4 py-4 text-center">
                  <span class="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                    {{ user._count?.testSessions || 0 }}
                  </span>
                </td>
                <!-- Aksi -->
                <td class="px-4 py-4 text-right">
                  <div class="flex items-center justify-end space-x-1">
                    <button
                      @click="openEdit(user)"
                      class="p-1.5 text-gray-500 hover:text-bpjs-600 hover:bg-bpjs-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="deleteUser(user.id)"
                      class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="users.length === 0" class="text-center py-16">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p class="text-gray-500 font-medium">Tidak ada data user</p>
          <p class="text-sm text-gray-400 mt-1">Klik tombol "Tambah User" untuk menambahkan pengguna baru</p>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p class="text-sm text-gray-500">
            Menampilkan <span class="font-medium">{{ users.length }}</span> dari <span class="font-medium">{{ pagination.total }}</span> user
          </p>
          <div class="flex space-x-1">
            <button
              v-for="page in pagination.totalPages"
              :key="page"
              @click="pagination.page = page; fetchUsers()"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="page === pagination.page ? 'bg-bpjs-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <Teleport to="body">
        <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="showModal = false"></div>

            <!-- Modal Panel -->
            <div class="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all">
              <!-- Header -->
              <div class="px-6 py-4 border-b border-gray-100">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-gray-900">{{ editMode ? 'Edit User' : 'Tambah User Baru' }}</h2>
                  <button @click="showModal = false" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Form -->
              <form @submit.prevent="saveUser" class="p-6 max-h-[70vh] overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- NPP -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">NPP <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.npp"
                      type="text"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
                      :disabled="editMode"
                      required
                      placeholder="Nomor Pokok Pegawai"
                    />
                  </div>

                  <!-- Nama -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Nama <span class="text-red-500">*</span></label>
                    <input v-model="form.nama" type="text" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" required />
                  </div>

                  <!-- Email -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input v-model="form.email" type="email" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" placeholder="email@bpjs.go.id" />
                  </div>

                  <!-- Vendor -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Vendor</label>
                    <input v-model="form.vendor" type="text" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" placeholder="Nama perusahaan vendor" />
                  </div>

                  <!-- Password -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">
                      Password
                      <span v-if="!editMode" class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="form.password"
                      type="password"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
                      :required="!editMode"
                      :placeholder="editMode ? 'Kosongkan jika tidak diubah' : 'Masukkan password'"
                    />
                  </div>

                  <!-- Sub Kategori -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Sub Kategori <span class="text-red-500">*</span></label>
                    <select
                      v-model="form.subKategoriId"
                      @change="onSubKategoriChange"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white"
                      required
                    >
                      <option value="">Pilih Sub Kategori</option>
                      <optgroup v-for="(subs, katNama) in groupedSubKategoris" :key="katNama" :label="katNama">
                        <option v-for="sub in subs" :key="sub.id" :value="sub.id">
                          {{ sub.nama }}
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  <!-- Posisi -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Posisi <span class="text-red-500">*</span></label>
                    <input v-model="form.posisi" type="text" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" required placeholder="Satpam, Office Boy, dll" />
                  </div>
                </div>

                <!-- Location Section -->
                <div class="mt-6 pt-4 border-t border-gray-200">
                  <h3 class="text-sm font-semibold text-gray-900 mb-4">Lokasi Kantor</h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Kepwil (Kantor Wilayah) -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        Kantor Wilayah (Kepwil)
                        <span class="text-xs text-gray-400 block">Provinsi</span>
                      </label>
                      <v-select
                        v-model="form.kepwil"
                        :options="provinsiOptions"
                        placeholder="Pilih Provinsi..."
                        class="lokasi-select"
                      />
                    </div>

                    <!-- KC (Kantor Cabang) -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        Kantor Cabang (KC)
                        <span class="text-xs text-gray-400 block">Kabupaten/Kota</span>
                      </label>
                      <v-select
                        v-model="form.kcKabupaten"
                        :options="kabupatenList"
                        :disabled="!form.kepwil || loadingKabupaten"
                        :loading="loadingKabupaten"
                        placeholder="Pilih Kabupaten..."
                        class="lokasi-select"
                      />
                    </div>

                    <!-- Kakab (Kantor Kabupaten) -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        Kantor Kabupaten (Kakab)
                        <span class="text-xs text-gray-400 block">Kabupaten/Kota</span>
                      </label>
                      <v-select
                        v-model="form.kakabKabupaten"
                        :options="kabupatenList"
                        :disabled="!form.kepwil || loadingKabupaten"
                        :loading="loadingKabupaten"
                        placeholder="Pilih Kabupaten..."
                        class="lokasi-select"
                      />
                    </div>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">
                    * Pilih Kepwil terlebih dahulu untuk menampilkan pilihan KC dan Kakab
                  </p>
                </div>

                <!-- Footer -->
                <div class="flex space-x-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    @click="showModal = false"
                    class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    class="flex-1 px-4 py-2.5 bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white rounded-xl font-medium shadow-lg shadow-bpjs-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
                    :disabled="saving"
                  >
                    {{ saving ? 'Menyimpan...' : 'Simpan' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Import Modal -->
      <Teleport to="body">
        <div v-if="showImportModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="showImportModal = false"></div>

            <div class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto transform transition-all p-6">
              <div class="text-center">
                <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Import User dari CSV</h3>
                <p class="text-gray-500 text-sm mb-6">Unggah file CSV sesuai dengan template untuk menambahkan banyak user sekaligus.</p>

                <div class="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                  <h4 class="font-medium text-gray-900 mb-2 text-sm">Panduan:</h4>
                  <ul class="text-xs text-gray-600 space-y-1">
                    <li class="flex items-start">
                      <span class="text-bpjs-500 mr-2">1.</span>
                      Download template CSV terlebih dahulu
                    </li>
                    <li class="flex items-start">
                      <span class="text-bpjs-500 mr-2">2.</span>
                      Isi data sesuai format pada template
                    </li>
                    <li class="flex items-start">
                      <span class="text-bpjs-500 mr-2">3.</span>
                      Kolom wajib: npp, nama, posisi, subKategoriId
                    </li>
                    <li class="flex items-start">
                      <span class="text-bpjs-500 mr-2">4.</span>
                      Password default: password123
                    </li>
                  </ul>
                </div>

                <div class="flex gap-3">
                  <button
                    @click="showImportModal = false"
                    class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    @click="triggerFileInput"
                    class="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all"
                  >
                    Pilih File CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Import Result Modal -->
      <Teleport to="body">
        <div v-if="showImportResultModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="showImportResultModal = false"></div>

            <div class="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all">
              <!-- Header -->
              <div class="px-6 py-4 border-b border-gray-100">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-gray-900">Hasil Import</h2>
                  <button @click="showImportResultModal = false" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="p-6 max-h-[70vh] overflow-y-auto" v-if="importResults">
                <!-- Summary Cards -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                  <div class="bg-gray-50 rounded-xl p-4 text-center">
                    <p class="text-2xl font-bold text-gray-900">{{ importResults.total }}</p>
                    <p class="text-xs text-gray-500">Total Data</p>
                  </div>
                  <div class="bg-green-50 rounded-xl p-4 text-center">
                    <p class="text-2xl font-bold text-green-600">{{ importResults.successCount }}</p>
                    <p class="text-xs text-green-600">Berhasil</p>
                  </div>
                  <div class="bg-red-50 rounded-xl p-4 text-center">
                    <p class="text-2xl font-bold text-red-600">{{ importResults.failedCount }}</p>
                    <p class="text-xs text-red-600">Gagal</p>
                  </div>
                </div>

                <!-- Success List -->
                <div v-if="importResults.results.success.length > 0" class="mb-6">
                  <h4 class="font-medium text-gray-900 mb-2 flex items-center">
                    <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Berhasil Diimport ({{ importResults.results.success.length }})
                  </h4>
                  <div class="bg-green-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                    <div class="space-y-1">
                      <div v-for="user in importResults.results.success" :key="user.id" class="flex items-center text-sm">
                        <span class="font-mono text-gray-600 mr-2">{{ user.npp }}</span>
                        <span class="text-gray-900">{{ user.nama }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Failed List -->
                <div v-if="importResults.results.failed.length > 0">
                  <h4 class="font-medium text-gray-900 mb-2 flex items-center">
                    <svg class="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Gagal Diimport ({{ importResults.results.failed.length }})
                  </h4>
                  <div class="bg-red-50 rounded-xl p-3 max-h-48 overflow-y-auto">
                    <div class="space-y-2">
                      <div v-for="(item, index) in importResults.results.failed" :key="index" class="text-sm border-b border-red-100 pb-2 last:border-0 last:pb-0">
                        <div class="flex items-center justify-between">
                          <span class="font-mono text-gray-600">{{ item.data.npp || 'N/A' }}</span>
                          <span class="text-red-600 text-xs">{{ item.error }}</span>
                        </div>
                        <p class="text-gray-500 text-xs mt-0.5">{{ item.data.nama || 'Nama tidak tersedia' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <button
                  @click="showImportResultModal = false"
                  class="w-full px-4 py-2.5 bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white rounded-xl font-medium shadow-lg shadow-bpjs-500/30 hover:shadow-xl transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Loading overlay for import -->
      <Teleport to="body">
        <div v-if="importLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <div class="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500 mx-auto mb-4"></div>
            <p class="text-gray-700 font-medium">Mengimport data...</p>
            <p class="text-gray-500 text-sm mt-1">Mohon tunggu sebentar</p>
          </div>
        </div>
      </Teleport>
    </div>
  </AdminLayout>
</template>

<style>
.lokasi-select .vs__dropdown-toggle {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  min-height: 44px;
}

.lokasi-select .vs__dropdown-toggle:focus-within {
  border-color: #00A650;
  box-shadow: 0 0 0 3px rgba(0, 166, 80, 0.1);
}

.lokasi-select.vs--disabled .vs__dropdown-toggle {
  background: #f3f4f6;
  cursor: not-allowed;
}

.lokasi-select .vs__search {
  padding: 0;
  margin: 0;
}

.lokasi-select .vs__search::placeholder {
  color: #9ca3af;
}

.lokasi-select .vs__dropdown-menu {
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  max-height: 200px;
}

.lokasi-select .vs__dropdown-option {
  padding: 0.625rem 1rem;
}

.lokasi-select .vs__dropdown-option--highlight {
  background: #00A650;
  color: white;
}

.lokasi-select .vs__selected {
  margin: 0;
  padding: 0;
}

.lokasi-select .vs__clear,
.lokasi-select .vs__open-indicator {
  fill: #9ca3af;
}

.lokasi-select .vs__spinner {
  border-left-color: #00A650;
}
</style>
