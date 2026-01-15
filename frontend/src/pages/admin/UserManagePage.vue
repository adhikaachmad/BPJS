<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import vSelect from 'vue-select'
import 'vue-select/dist/vue-select.css'

// Daftar Provinsi Indonesia (Kantor Wilayah BPJS Kesehatan)
const regionalList = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Bengkulu',
  'Lampung',
  'Kepulauan Bangka Belitung',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'Daerah Istimewa Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Sulawesi Tengah',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Gorontalo',
  'Sulawesi Barat',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya'
]

const users = ref([])
const subKategoris = ref([])
const loading = ref(true)
const showModal = ref(false)
const editMode = ref(false)
const form = ref({
  id: null,
  nip: '',
  nama: '',
  email: '',
  posisi: '',
  kantorCabang: '',
  kantorWilayah: '',
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

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchSubKategoris()])
})

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
    nip: '',
    nama: '',
    email: '',
    posisi: '',
    kantorCabang: '',
    kantorWilayah: '',
    password: '',
    subKategoriId: ''
  }
}

function openCreate() {
  resetForm()
  editMode.value = false
  showModal.value = true
}

function openEdit(user) {
  form.value = {
    id: user.id,
    nip: user.nip,
    nama: user.nama,
    email: user.email || '',
    posisi: user.posisi || '',
    kantorCabang: user.kantorCabang || '',
    kantorWilayah: user.kantorWilayah || '',
    password: '', // Don't show password
    subKategoriId: user.subKategoriId
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
        <button @click="openCreate" class="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white rounded-xl font-medium shadow-lg shadow-bpjs-500/30 hover:shadow-xl hover:shadow-bpjs-500/40 transition-all">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tambah User
        </button>
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
                placeholder="Cari NIP, nama, atau email..."
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
          <table class="w-full min-w-[800px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Posisi</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kantor</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub Kategori</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Test</th>
                <th class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center mr-3 shadow">
                      <span class="text-white font-bold text-sm">{{ user.nama?.charAt(0) }}</span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ user.nama }}</p>
                      <p class="text-sm text-gray-500 font-mono">{{ user.nip }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                    {{ user.posisi }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <p class="text-sm text-gray-900">{{ user.kantorCabang || '-' }}</p>
                  <p class="text-xs text-gray-500">{{ user.kantorWilayah || '' }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="text-sm text-gray-900">{{ user.subKategori?.nama }}</p>
                  <p class="text-xs text-gray-500">{{ user.subKategori?.kategori?.nama }}</p>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                    {{ user._count?.testSessions || 0 }} test
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      @click="openEdit(user)"
                      class="p-2 text-gray-500 hover:text-bpjs-600 hover:bg-bpjs-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="deleteUser(user.id)"
                      class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto transform transition-all">
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
                  <!-- NIP -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">NIP <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.nip"
                      type="text"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
                      :disabled="editMode"
                      required
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
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Posisi <span class="text-red-500">*</span></label>
                    <input v-model="form.posisi" type="text" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" required placeholder="Satpam, Office Boy, dll" />
                  </div>

                  <!-- Kantor Cabang -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Kantor Cabang</label>
                    <input v-model="form.kantorCabang" type="text" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all" placeholder="KC Jakarta Pusat" />
                  </div>

                  <!-- Kantor Wilayah -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Kantor Wilayah <span class="text-red-500">*</span></label>
                    <v-select
                      v-model="form.kantorWilayah"
                      :options="regionalList"
                      placeholder="Cari atau pilih provinsi..."
                      :clearable="false"
                      class="wilayah-select"
                    />
                  </div>
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
    </div>
  </AdminLayout>
</template>

<style>
.wilayah-select .vs__dropdown-toggle {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  min-height: 44px;
}

.wilayah-select .vs__dropdown-toggle:focus-within {
  border-color: #00A650;
  box-shadow: 0 0 0 3px rgba(0, 166, 80, 0.1);
}

.wilayah-select .vs__search {
  padding: 0;
  margin: 0;
}

.wilayah-select .vs__search::placeholder {
  color: #9ca3af;
}

.wilayah-select .vs__dropdown-menu {
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  max-height: 200px;
}

.wilayah-select .vs__dropdown-option {
  padding: 0.625rem 1rem;
}

.wilayah-select .vs__dropdown-option--highlight {
  background: #00A650;
  color: white;
}

.wilayah-select .vs__selected {
  margin: 0;
  padding: 0;
}

.wilayah-select .vs__clear,
.wilayah-select .vs__open-indicator {
  fill: #9ca3af;
}
</style>
