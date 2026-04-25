<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const subKategoris = ref([])
const periodes = ref([])
const users = ref([])
const loading = ref(false)
const loadingUsers = ref(false)

// Filters
const selectedSubKategori = ref('')
const selectedPeriode = ref('')
const search = ref('')
const searchTimeout = ref(null)

// Pagination
const pagination = ref({ page: 1, total: 0, totalPages: 0, perPage: 20 })

// Summary
const summary = ref({ total: 0, completed: 0, inProgress: 0, notStarted: 0 })

// Selection
const selectedUsers = ref([])
const resetMateri = ref(false)

// Modal
const showConfirmModal = ref(false)
const confirmAction = ref('') // 'reset-selected', 'reset-all', 'reopen'
const resetting = ref(false)

// Reopen modal
const showReopenModal = ref(false)
const reopenForm = ref({
  targetStatus: 'draft',
  jamMulai: '',
  jamBerakhir: ''
})
const reopening = ref(false)

const selectedPeriodeData = computed(() => {
  return periodes.value.find(p => p.id === parseInt(selectedPeriode.value))
})

const allSelected = computed(() => {
  if (users.value.length === 0) return false
  return users.value.every(u => selectedUsers.value.includes(u.id))
})

const hasTestUsers = computed(() => {
  return users.value.some(u => u.testStatus !== 'belum')
})

onMounted(async () => {
  await fetchSubKategoris()
})

watch(selectedSubKategori, async (val) => {
  selectedPeriode.value = ''
  users.value = []
  summary.value = { total: 0, completed: 0, inProgress: 0, notStarted: 0 }
  if (val) await fetchPeriodes()
})

watch(selectedPeriode, async (val) => {
  selectedUsers.value = []
  if (val) await fetchUsers()
  else {
    users.value = []
    summary.value = { total: 0, completed: 0, inProgress: 0, notStarted: 0 }
  }
})

watch(search, () => {
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    pagination.value.page = 1
    fetchUsers()
  }, 300)
})

async function fetchSubKategoris() {
  try {
    const res = await api.get('/kategori')
    const all = []
    for (const kat of res.data) {
      for (const sub of (kat.subKategoris || [])) {
        all.push({ id: sub.id, nama: `${kat.nama} - ${sub.nama}` })
      }
    }
    subKategoris.value = all
  } catch (err) {
    console.error('Failed to fetch sub-kategoris:', err)
  }
}

async function fetchPeriodes() {
  loading.value = true
  try {
    const res = await api.get('/periode/admin/reset-test/periodes', {
      params: { subKategoriId: selectedSubKategori.value }
    })
    periodes.value = res.data
  } catch (err) {
    console.error('Failed to fetch periodes:', err)
  } finally {
    loading.value = false
  }
}

async function fetchUsers() {
  if (!selectedPeriode.value) return
  loadingUsers.value = true
  try {
    const res = await api.get('/periode/admin/reset-test/users', {
      params: {
        periodeTestId: selectedPeriode.value,
        search: search.value,
        page: pagination.value.page
      }
    })
    users.value = res.data.users
    pagination.value = res.data.pagination
    summary.value = res.data.summary
  } catch (err) {
    console.error('Failed to fetch users:', err)
  } finally {
    loadingUsers.value = false
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedUsers.value = []
  } else {
    selectedUsers.value = users.value.map(u => u.id)
  }
}

function toggleUser(userId) {
  const idx = selectedUsers.value.indexOf(userId)
  if (idx > -1) {
    selectedUsers.value.splice(idx, 1)
  } else {
    selectedUsers.value.push(userId)
  }
}

function openConfirmModal(action) {
  confirmAction.value = action
  showConfirmModal.value = true
}

function closeConfirmModal() {
  showConfirmModal.value = false
  confirmAction.value = ''
}

async function executeReset() {
  resetting.value = true
  try {
    const body = {
      periodeTestId: parseInt(selectedPeriode.value),
      resetMateri: resetMateri.value
    }

    if (confirmAction.value === 'reset-all') {
      body.resetAll = true
    } else {
      body.userIds = selectedUsers.value
    }

    await api.post('/periode/admin/reset-test', body)
    closeConfirmModal()
    selectedUsers.value = []
    await fetchUsers()
    await fetchPeriodes()
  } catch (err) {
    console.error('Reset failed:', err)
    alert('Gagal mereset: ' + (err.response?.data?.error || err.message))
  } finally {
    resetting.value = false
  }
}

function openReopenModal() {
  reopenForm.value = { targetStatus: 'draft', jamMulai: '', jamBerakhir: '' }
  showReopenModal.value = true
}

async function executeReopen() {
  reopening.value = true
  try {
    const body = { targetStatus: reopenForm.value.targetStatus }
    if (reopenForm.value.targetStatus === 'terjadwal') {
      body.jamMulai = reopenForm.value.jamMulai
      body.jamBerakhir = reopenForm.value.jamBerakhir
    }
    await api.put(`/periode/${selectedPeriode.value}/reopen`, body)
    showReopenModal.value = false
    await fetchPeriodes()
    await fetchUsers()
  } catch (err) {
    console.error('Reopen failed:', err)
    alert('Gagal membuka ulang: ' + (err.response?.data?.error || err.message))
  } finally {
    reopening.value = false
  }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.totalPages) return
  pagination.value.page = page
  fetchUsers()
}

function statusBadgeClass(status) {
  switch (status) {
    case 'selesai': return 'bg-green-100 text-green-800'
    case 'sedang': return 'bg-yellow-100 text-yellow-800'
    case 'belum': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'selesai': return 'Selesai'
    case 'sedang': return 'Sedang Mengerjakan'
    case 'belum': return 'Belum Test'
    default: return status
  }
}

function periodeStatusBadge(status) {
  switch (status) {
    case 'aktif': return 'bg-green-100 text-green-700'
    case 'terjadwal': return 'bg-blue-100 text-blue-700'
    case 'docheck': return 'bg-purple-100 text-purple-700'
    case 'selesai': return 'bg-gray-100 text-gray-700'
    case 'draft': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const confirmResetCount = computed(() => {
  if (confirmAction.value === 'reset-all') return summary.value.total
  return selectedUsers.value.length
})
</script>

<template>
  <AdminLayout>
    <div class="p-4 lg:p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Reset Test Session</h1>
        <p class="text-gray-500 mt-1">Reset test session pegawai agar bisa dijadwalkan ulang. Hanya pegawai yang belum test atau yang sudah di-reset yang bisa mengikuti test ulang.</p>
      </div>

      <!-- Filter Panel -->
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Sub Kategori -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Sub Kategori</label>
            <select v-model="selectedSubKategori" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-bpjs-500 focus:ring-bpjs-500">
              <option value="">-- Pilih Sub Kategori --</option>
              <option v-for="sub in subKategoris" :key="sub.id" :value="sub.id">{{ sub.nama }}</option>
            </select>
          </div>

          <!-- Periode -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Periode</label>
            <select v-model="selectedPeriode" :disabled="!selectedSubKategori || loading" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-bpjs-500 focus:ring-bpjs-500 disabled:bg-gray-100">
              <option value="">-- Pilih Periode --</option>
              <option v-for="p in periodes" :key="p.id" :value="p.id">
                {{ p.nama }} ({{ p.status }}) - {{ p.jumlahTestSession }} test session
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div v-if="selectedPeriode" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-sm text-gray-500">Total Pegawai</div>
          <div class="text-2xl font-bold text-gray-900 mt-1">{{ summary.total }}</div>
        </div>
        <div class="bg-white rounded-xl border border-green-200 p-4">
          <div class="text-sm text-green-600">Sudah Test</div>
          <div class="text-2xl font-bold text-green-700 mt-1">{{ summary.completed }}</div>
        </div>
        <div class="bg-white rounded-xl border border-yellow-200 p-4">
          <div class="text-sm text-yellow-600">Sedang Test</div>
          <div class="text-2xl font-bold text-yellow-700 mt-1">{{ summary.inProgress }}</div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <div class="text-sm text-gray-500">Belum Test</div>
          <div class="text-2xl font-bold text-gray-600 mt-1">{{ summary.notStarted }}</div>
        </div>
      </div>

      <!-- Periode Info + Actions -->
      <div v-if="selectedPeriodeData" class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-gray-700">Periode:</span>
            <span class="font-semibold text-gray-900">{{ selectedPeriodeData.nama }}</span>
            <span class="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full" :class="periodeStatusBadge(selectedPeriodeData.status)">
              {{ selectedPeriodeData.status }}
            </span>
          </div>
          <button
            @click="openReopenModal"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Buka Ulang Periode
          </button>
        </div>
      </div>

      <!-- Action Bar + Table -->
      <div v-if="selectedPeriode" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <!-- Action Bar -->
        <div class="p-4 border-b border-gray-200">
          <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div class="flex items-center gap-3 flex-wrap">
              <!-- Search -->
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  v-model="search"
                  type="text"
                  placeholder="Cari nama/NPP..."
                  class="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-bpjs-500 focus:ring-bpjs-500 w-56"
                />
              </div>

              <!-- Reset Materi checkbox -->
              <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" v-model="resetMateri" class="rounded border-gray-300 text-bpjs-600 focus:ring-bpjs-500" />
                Reset materi juga
              </label>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="openConfirmModal('reset-selected')"
                :disabled="selectedUsers.length === 0 || resetting"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Terpilih ({{ selectedUsers.length }})
              </button>

              <button
                @click="openConfirmModal('reset-all')"
                :disabled="!hasTestUsers || resetting"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Semua
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-600">
              <tr>
                <th class="px-4 py-3 text-left w-10">
                  <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" class="rounded border-gray-300 text-bpjs-600 focus:ring-bpjs-500" />
                </th>
                <th class="px-4 py-3 text-left">Nama & NPP</th>
                <th class="px-4 py-3 text-center">Status Materi</th>
                <th class="px-4 py-3 text-center">Status Test</th>
                <th class="px-4 py-3 text-center">Skor</th>
                <th class="px-4 py-3 text-center">Waktu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="loadingUsers">
                <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                  <svg class="animate-spin h-6 w-6 mx-auto mb-2 text-bpjs-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Memuat data...
                </td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                  {{ search ? 'Tidak ada hasil pencarian' : 'Tidak ada data pegawai' }}
                </td>
              </tr>
              <tr
                v-for="user in users"
                :key="user.id"
                class="hover:bg-gray-50 transition-colors"
                :class="selectedUsers.includes(user.id) ? 'bg-bpjs-50/50' : ''"
              >
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    :checked="selectedUsers.includes(user.id)"
                    @change="toggleUser(user.id)"
                    class="rounded border-gray-300 text-bpjs-600 focus:ring-bpjs-500"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">{{ user.nama }}</div>
                  <div class="text-xs text-gray-500">{{ user.npp }} &middot; {{ user.posisi }}</div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span v-if="user.materiCompleted" class="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                    Selesai
                  </span>
                  <span v-else class="text-xs text-gray-400">Belum</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" :class="statusBadgeClass(user.testStatus)">
                    {{ statusLabel(user.testStatus) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span v-if="user.skor !== null" class="font-semibold" :class="user.skor >= 70 ? 'text-green-600' : 'text-red-600'">
                    {{ Math.round(user.skor) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 text-center text-xs text-gray-500">
                  <div v-if="user.startTime">{{ formatDate(user.startTime) }}</div>
                  <div v-else class="text-gray-400">-</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div class="text-sm text-gray-500">
            Halaman {{ pagination.page }} dari {{ pagination.totalPages }} ({{ pagination.total }} pegawai)
          </div>
          <div class="flex items-center gap-1">
            <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              v-for="page in Math.min(pagination.totalPages, 5)"
              :key="page"
              @click="goToPage(page)"
              class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
              :class="pagination.page === page ? 'bg-bpjs-500 text-white' : 'hover:bg-gray-100 text-gray-600'"
            >
              {{ page }}
            </button>
            <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages" class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!selectedPeriode && !loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <h3 class="text-lg font-medium text-gray-600 mb-1">Pilih Sub Kategori & Periode</h3>
        <p class="text-gray-400 text-sm">Pilih sub kategori dan periode test untuk melihat daftar pegawai dan mengelola reset test session.</p>
      </div>
    </div>

    <!-- Confirm Reset Modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="closeConfirmModal"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Konfirmasi Reset</h3>
            </div>
          </div>

          <div class="bg-red-50 rounded-lg p-4 mb-5">
            <p class="text-sm text-red-800">
              <strong>{{ confirmResetCount }}</strong> pegawai akan di-reset test session-nya.
              <span v-if="resetMateri"> Progress materi juga akan dihapus.</span>
            </p>
            <p class="text-xs text-red-600 mt-2">
              Tindakan ini akan menghapus jawaban dan hasil test. Pegawai harus mengerjakan test ulang.
            </p>
          </div>

          <div class="flex gap-3 justify-end">
            <button @click="closeConfirmModal" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
              Batal
            </button>
            <button @click="executeReset" :disabled="resetting" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              <svg v-if="resetting" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Reset
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Reopen Modal -->
    <Teleport to="body">
      <div v-if="showReopenModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="showReopenModal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Buka Ulang Periode</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status Tujuan</label>
              <select v-model="reopenForm.targetStatus" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-bpjs-500 focus:ring-bpjs-500">
                <option value="draft">Draft</option>
                <option value="terjadwal">Terjadwal</option>
              </select>
            </div>

            <div v-if="reopenForm.targetStatus === 'terjadwal'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                <input type="datetime-local" v-model="reopenForm.jamMulai" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-bpjs-500 focus:ring-bpjs-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Jam Berakhir</label>
                <input type="datetime-local" v-model="reopenForm.jamBerakhir" class="w-full rounded-lg border-gray-300 shadow-sm focus:border-bpjs-500 focus:ring-bpjs-500" />
              </div>
            </div>
          </div>

          <div class="flex gap-3 justify-end mt-6">
            <button @click="showReopenModal = false" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
              Batal
            </button>
            <button @click="executeReopen" :disabled="reopening" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              <svg v-if="reopening" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Buka Ulang
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>
