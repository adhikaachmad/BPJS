<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import vSelect from 'vue-select'
import 'vue-select/dist/vue-select.css'

const authStore = useAuthStore()

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
const kepwilList = ref([])
const kcList = ref([])
const kakabList = ref([])
const loadingKc = ref(false)
const loadingKakab = ref(false)

const form = ref({
  id: null,
  npp: '',
  nama: '',
  email: '',
  posisi: '',
  vendor: '',
  kepwilId: null,
  kcId: null,
  kakabId: null,
  password: '',
  subKategoriId: ''
})
// Reset password state
const showResetPasswordModal = ref(false)
const resetPasswordUser = ref(null)
const resetNewPassword = ref('')
const resetPasswordLoading = ref(false)

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

// Watch for kepwil changes to fetch KC list
watch(() => form.value.kepwilId, async (newVal) => {
  if (newVal) {
    await fetchKc(newVal)
  } else {
    kcList.value = []
    kakabList.value = []
    form.value.kcId = null
    form.value.kakabId = null
  }
})

// Watch for KC changes to fetch Kakab list
watch(() => form.value.kcId, async (newVal) => {
  if (newVal) {
    await fetchKakab(newVal)
  } else {
    kakabList.value = []
    form.value.kakabId = null
  }
})

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchSubKategoris(), fetchKepwil()])
})

async function fetchKepwil() {
  try {
    const response = await api.get('/lokasi/kepwil')
    kepwilList.value = response.data.data
  } catch (err) {
    console.error('Failed to fetch kepwil:', err)
  }
}

async function fetchKc(kepwilId) {
  if (!kepwilId) {
    kcList.value = []
    return
  }

  loadingKc.value = true
  try {
    const response = await api.get(`/lokasi/kc/${kepwilId}`)
    kcList.value = response.data.data
  } catch (err) {
    console.error('Failed to fetch KC:', err)
    kcList.value = []
  } finally {
    loadingKc.value = false
  }
}

async function fetchKakab(kcId) {
  if (!kcId) {
    kakabList.value = []
    return
  }

  loadingKakab.value = true
  try {
    const response = await api.get(`/lokasi/kakab/${kcId}`)
    kakabList.value = response.data.data
  } catch (err) {
    console.error('Failed to fetch Kakab:', err)
    kakabList.value = []
  } finally {
    loadingKakab.value = false
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
    kepwilId: null,
    kcId: null,
    kakabId: null,
    password: '',
    subKategoriId: ''
  }
  kcList.value = []
  kakabList.value = []
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
    kepwilId: user.kepwilId || null,
    kcId: user.kcId || null,
    kakabId: user.kakabId || null,
    password: '',
    subKategoriId: user.subKategoriId
  }

  // If user has kepwil, fetch the KC list
  if (user.kepwilId) {
    await fetchKc(user.kepwilId)
  }

  // If user has KC, fetch the Kakab list
  if (user.kcId) {
    await fetchKakab(user.kcId)
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

// Reset password functions
function openResetPassword(user) {
  resetPasswordUser.value = user
  resetNewPassword.value = ''
  showResetPasswordModal.value = true
}

async function resetPassword() {
  if (!resetNewPassword.value || resetNewPassword.value.length < 6) {
    alert('Password minimal 6 karakter')
    return
  }

  resetPasswordLoading.value = true
  try {
    await api.put(`/user/${resetPasswordUser.value.id}/reset-password`, {
      newPassword: resetNewPassword.value
    })
    alert('Password berhasil direset!')
    showResetPasswordModal.value = false
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal mereset password')
  } finally {
    resetPasswordLoading.value = false
  }
}

// Kepwil options for v-select
const kepwilOptions = computed(() => kepwilList.value.map(p => ({ label: p.nama, value: p.id })))

// KC options for v-select
const kcOptions = computed(() => kcList.value.map(k => ({ label: k.nama, value: k.id })))

// Kakab options for v-select
const kakabOptions = computed(() => kakabList.value.map(k => ({ label: k.nama, value: k.id })))

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

    if (response.data.successCount > 0) {
      fetchUsers()
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal mengimport data')
    console.error(err)
  } finally {
    importLoading.value = false
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

      <!-- Wilayah Info for ADMIN_KEPWIL -->
      <div v-if="authStore.isAdminKepwil" class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-emerald-800">Menampilkan data untuk wilayah:</p>
            <p class="font-semibold text-emerald-900">{{ authStore.adminKepwil }}</p>
          </div>
        </div>
      </div>

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
          <table class="w-full table-fixed">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:22%">User</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:12%">Kepwil</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:16%">KC</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:16%">Kakab</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:10%">Posisi</th>
                <th class="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:12%">Sub Kategori</th>
                <th class="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:5%">Test</th>
                <th class="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider" style="width:7%">Aksi</th>
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
                    <div class="min-w-0 overflow-hidden">
                      <p class="font-medium text-gray-900 truncate" :title="user.nama">{{ user.nama }}</p>
                      <p class="text-xs text-gray-500 font-mono">{{ user.npp }}</p>
                    </div>
                  </div>
                </td>
                <!-- Kepwil -->
                <td class="px-4 py-4">
                  <span v-if="user.kepwil" class="inline-block px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium truncate max-w-full" :title="user.kepwil?.nama">
                    {{ user.kepwil?.nama }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- KC -->
                <td class="px-4 py-4">
                  <span v-if="user.kc" class="inline-block px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium truncate max-w-full" :title="user.kc?.nama">
                    {{ user.kc?.nama }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Kakab -->
                <td class="px-4 py-4">
                  <span v-if="user.kakab" class="inline-block px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium truncate max-w-full" :title="user.kakab?.nama">
                    {{ user.kakab?.nama }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <!-- Posisi -->
                <td class="px-4 py-4">
                  <span class="inline-block px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium truncate max-w-full">
                    {{ user.posisi }}
                  </span>
                </td>
                <!-- Sub Kategori -->
                <td class="px-4 py-4">
                  <p class="text-sm text-gray-900 truncate" :title="user.subKategori?.nama">{{ user.subKategori?.nama }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ user.subKategori?.kategori?.nama }}</p>
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
                    <button @click="openResetPassword(user)" class="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Password">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>
                    <button @click="openEdit(user)" class="p-1.5 text-gray-500 hover:text-bpjs-600 hover:bg-bpjs-50 rounded-lg transition-colors" title="Edit">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button @click="deleteUser(user.id)" class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
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
        <div v-if="pagination.totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 gap-3">
          <p class="text-sm text-gray-500">
            Halaman <span class="font-semibold text-gray-700">{{ pagination.page }}</span> dari <span class="font-semibold text-gray-700">{{ pagination.totalPages }}</span>
            <span class="text-gray-400 mx-1">&middot;</span>
            <span class="font-medium">{{ pagination.total }}</span> user
          </p>
          <div class="flex items-center space-x-1">
            <!-- Prev -->
            <button
              @click="pagination.page > 1 && (pagination.page--, fetchUsers())"
              :disabled="pagination.page === 1"
              class="p-2 rounded-lg text-sm font-medium transition-colors"
              :class="pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 border border-gray-200 bg-white'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <!-- First page -->
            <button
              v-if="pagination.page > 3"
              @click="pagination.page = 1; fetchUsers()"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            >1</button>
            <span v-if="pagination.page > 4" class="px-1 text-gray-400 text-sm">...</span>

            <!-- Page numbers -->
            <template v-for="page in pagination.totalPages" :key="page">
              <button
                v-if="page >= pagination.page - 2 && page <= pagination.page + 2"
                @click="pagination.page = page; fetchUsers()"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="page === pagination.page ? 'bg-bpjs-500 text-white shadow-sm shadow-bpjs-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
              >
                {{ page }}
              </button>
            </template>

            <!-- Last page -->
            <span v-if="pagination.page < pagination.totalPages - 3" class="px-1 text-gray-400 text-sm">...</span>
            <button
              v-if="pagination.page < pagination.totalPages - 2"
              @click="pagination.page = pagination.totalPages; fetchUsers()"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            >{{ pagination.totalPages }}</button>

            <!-- Next -->
            <button
              @click="pagination.page < pagination.totalPages && (pagination.page++, fetchUsers())"
              :disabled="pagination.page === pagination.totalPages"
              class="p-2 rounded-lg text-sm font-medium transition-colors"
              :class="pagination.page === pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 border border-gray-200 bg-white'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <Teleport to="body">
        <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="showModal = false"></div>

            <div class="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all">
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

              <form @submit.prevent="saveUser" class="p-6 max-h-[70vh] overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- NPP -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">NPP <span class="text-red-500">*</span></label>
                    <input v-model="form.npp" type="text" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" :disabled="editMode" required placeholder="Nomor Pokok Pegawai" />
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
                    <input v-model="form.password" type="password" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" :required="!editMode" :placeholder="editMode ? 'Kosongkan jika tidak diubah' : 'Masukkan password'" />
                  </div>

                  <!-- Sub Kategori -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Sub Kategori <span class="text-red-500">*</span></label>
                    <select v-model="form.subKategoriId" @change="onSubKategoriChange" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white" required>
                      <option value="">Pilih Sub Kategori</option>
                      <optgroup v-for="(subs, katNama) in groupedSubKategoris" :key="katNama" :label="katNama">
                        <option v-for="sub in subs" :key="sub.id" :value="sub.id">{{ sub.nama }}</option>
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
                    <!-- Kepwil (Kedeputian Wilayah) -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        Kedeputian Wilayah
                      </label>
                      <v-select
                        v-model="form.kepwilId"
                        :options="kepwilOptions"
                        :reduce="opt => opt.value"
                        label="label"
                        placeholder="Pilih Kepwil..."
                        class="lokasi-select"
                      />
                    </div>

                    <!-- KC (Kantor Cabang) -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        Kantor Cabang (KC)
                      </label>
                      <v-select
                        v-model="form.kcId"
                        :options="kcOptions"
                        :reduce="opt => opt.value"
                        label="label"
                        :disabled="!form.kepwilId || loadingKc"
                        :loading="loadingKc"
                        placeholder="Pilih KC..."
                        class="lokasi-select"
                      />
                    </div>

                    <!-- Kakab (Kantor Kabupaten) -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">
                        Kantor Kabupaten (Kakab)
                      </label>
                      <v-select
                        v-model="form.kakabId"
                        :options="kakabOptions"
                        :reduce="opt => opt.value"
                        label="label"
                        :disabled="!form.kcId || loadingKakab"
                        :loading="loadingKakab"
                        placeholder="Pilih Kakab..."
                        class="lokasi-select"
                      />
                    </div>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">
                    * Pilih Kepwil terlebih dahulu, lalu KC, lalu Kakab
                  </p>
                </div>

                <!-- Footer -->
                <div class="flex space-x-3 mt-6 pt-4 border-t border-gray-100">
                  <button type="button" @click="showModal = false" class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                    Batal
                  </button>
                  <button type="submit" class="flex-1 px-4 py-2.5 bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white rounded-xl font-medium shadow-lg shadow-bpjs-500/30 hover:shadow-xl disabled:opacity-50 transition-all" :disabled="saving">
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
                    <li class="flex items-start"><span class="text-bpjs-500 mr-2">1.</span>Download template CSV terlebih dahulu</li>
                    <li class="flex items-start"><span class="text-bpjs-500 mr-2">2.</span>Isi data sesuai format pada template</li>
                    <li class="flex items-start"><span class="text-bpjs-500 mr-2">3.</span>Kolom wajib: npp, nama, posisi, subKategoriId</li>
                    <li class="flex items-start"><span class="text-bpjs-500 mr-2">4.</span>Password default: password123</li>
                  </ul>
                </div>
                <div class="flex gap-3">
                  <button @click="showImportModal = false" class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">Batal</button>
                  <button @click="triggerFileInput" class="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all">Pilih File CSV</button>
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
                <div v-if="importResults.results.success.length > 0" class="mb-6">
                  <h4 class="font-medium text-gray-900 mb-2 flex items-center">
                    <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
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
                <div v-if="importResults.results.failed.length > 0">
                  <h4 class="font-medium text-gray-900 mb-2 flex items-center">
                    <svg class="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
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
              <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <button @click="showImportResultModal = false" class="w-full px-4 py-2.5 bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white rounded-xl font-medium shadow-lg shadow-bpjs-500/30 hover:shadow-xl transition-all">Tutup</button>
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

      <!-- Reset Password Modal -->
      <Teleport to="body">
        <div v-if="showResetPasswordModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="showResetPasswordModal = false"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all">
              <div class="px-6 py-4 border-b border-gray-100">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-bold text-gray-900">Reset Password User</h2>
                  <button @click="showResetPasswordModal = false" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form @submit.prevent="resetPassword" class="p-6">
                <!-- User info -->
                <div class="bg-gray-50 rounded-xl p-4 mb-4">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center">
                      <span class="text-white font-bold text-sm">{{ resetPasswordUser?.nama?.charAt(0) }}</span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ resetPasswordUser?.nama }}</p>
                      <p class="text-xs text-gray-500 font-mono">NPP: {{ resetPasswordUser?.npp }}</p>
                    </div>
                  </div>
                </div>

                <!-- New password -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Password Baru</label>
                  <input
                    v-model="resetNewPassword"
                    type="password"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
                    placeholder="Minimal 6 karakter"
                    minlength="6"
                    required
                  />
                  <p class="text-xs text-gray-500 mt-1.5">Password lama akan diganti dengan password baru ini</p>
                </div>

                <!-- Actions -->
                <div class="flex space-x-3">
                  <button type="button" @click="showResetPasswordModal = false" class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                    Batal
                  </button>
                  <button type="submit" :disabled="resetPasswordLoading || resetNewPassword.length < 6" class="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl disabled:opacity-50 transition-all">
                    {{ resetPasswordLoading ? 'Menyimpan...' : 'Reset Password' }}
                  </button>
                </div>
              </form>
            </div>
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
