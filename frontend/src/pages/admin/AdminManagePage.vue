<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()

const admins = ref([])
const searchQuery = ref('')
const filterRole = ref('')
const loading = ref(true)
const showModal = ref(false)
const editMode = ref(false)
const saving = ref(false)

const form = ref({
  id: null,
  username: '',
  password: '',
  nama: '',
  role: 'ADMIN_KP',
  kepwilId: null,
  kcId: null
})

const kepwilList = ref([])
const loadingKepwil = ref(false)
const kcList = ref([])
const loadingKc = ref(false)

// Role options based on current admin's role
const roleOptions = computed(() => {
  if (authStore.isSuperAdmin) {
    return [
      { value: 'SUPER_ADMIN', label: 'Super Admin' },
      { value: 'ADMIN_KP', label: 'Admin KP (Kantor Pusat)' },
      { value: 'ADMIN_KEPWIL', label: 'Admin Kepwil (Kantor Wilayah)' }
    ]
  }
  // Admin KP can only create KP and Kepwil
  return [
    { value: 'ADMIN_KP', label: 'Admin KP (Kantor Pusat)' },
    { value: 'ADMIN_KEPWIL', label: 'Admin Kepwil (Kantor Wilayah)' }
  ]
})

// Role display mapping
const roleDisplay = {
  'SUPER_ADMIN': { label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
  'ADMIN_KP': { label: 'Admin KP', color: 'bg-blue-100 text-blue-800' },
  'ADMIN_KEPWIL': { label: 'Admin Kepwil', color: 'bg-emerald-100 text-emerald-800' }
}

// Watch for kepwil changes to fetch KC list
watch(() => form.value.kepwilId, async (newVal) => {
  if (newVal) {
    await fetchKc(newVal)
  } else {
    kcList.value = []
    form.value.kcId = null
  }
})

onMounted(async () => {
  await Promise.all([fetchAdmins(), fetchKepwil()])
})

async function fetchAdmins() {
  loading.value = true
  try {
    const response = await api.get('/admin/list')
    admins.value = response.data
  } catch (err) {
    console.error('Failed to fetch admins:', err)
  } finally {
    loading.value = false
  }
}

async function fetchKepwil() {
  loadingKepwil.value = true
  try {
    const response = await api.get('/lokasi/kepwil')
    kepwilList.value = response.data.data
  } catch (err) {
    console.error('Failed to fetch kepwil:', err)
  } finally {
    loadingKepwil.value = false
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

function resetForm() {
  form.value = {
    id: null,
    username: '',
    password: '',
    nama: '',
    role: 'ADMIN_KP',
    kepwilId: null,
    kcId: null
  }
  kcList.value = []
}

function openCreate() {
  resetForm()
  editMode.value = false
  showModal.value = true
}

async function openEdit(admin) {
  form.value = {
    id: admin.id,
    username: admin.username,
    password: '', // Don't prefill password
    nama: admin.nama,
    role: admin.role,
    kepwilId: admin.kepwilId || null,
    kcId: admin.kcId || null
  }

  // If admin has kepwil, fetch the KC list
  if (admin.kepwilId) {
    await fetchKc(admin.kepwilId)
  }

  editMode.value = true
  showModal.value = true
}

async function saveAdmin() {
  saving.value = true
  try {
    if (editMode.value) {
      await api.put(`/admin/${form.value.id}`, {
        nama: form.value.nama,
        password: form.value.password || undefined,
        role: form.value.role,
        kepwilId: form.value.role === 'ADMIN_KEPWIL' ? form.value.kepwilId : null,
        kcId: form.value.role === 'ADMIN_KEPWIL' ? form.value.kcId : null
      })
    } else {
      await api.post('/admin/create', {
        username: form.value.username,
        password: form.value.password,
        nama: form.value.nama,
        role: form.value.role,
        kepwilId: form.value.role === 'ADMIN_KEPWIL' ? form.value.kepwilId : null,
        kcId: form.value.role === 'ADMIN_KEPWIL' ? form.value.kcId : null
      })
    }
    showModal.value = false
    await fetchAdmins()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan admin')
  } finally {
    saving.value = false
  }
}

async function deleteAdmin(admin) {
  if (!confirm(`Yakin ingin menghapus admin "${admin.nama}"?`)) return

  try {
    await api.delete(`/admin/${admin.id}`)
    await fetchAdmins()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus admin')
  }
}

// Filtered admins based on search and role filter
const filteredAdmins = computed(() => {
  let list = admins.value
  if (filterRole.value) {
    list = list.filter(a => a.role === filterRole.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(a =>
      a.nama?.toLowerCase().includes(q) ||
      a.username?.toLowerCase().includes(q) ||
      a.kepwil?.toLowerCase().includes(q) ||
      a.kc?.toLowerCase().includes(q)
    )
  }
  return list
})

// Check if current admin can edit/delete target admin
function canModify(admin) {
  // Super Admin can modify anyone
  if (authStore.isSuperAdmin) return true
  // Admin KP can only modify non-Super Admins
  if (authStore.isAdminKP && admin.role !== 'SUPER_ADMIN') return true
  return false
}
</script>

<template>
  <AdminLayout>
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Kelola Admin</h1>
          <p class="text-gray-500 mt-1">Manajemen akun administrator sistem</p>
        </div>
        <button
          @click="openCreate"
          class="px-4 py-2 bg-bpjs-600 text-white rounded-xl hover:bg-bpjs-700 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Tambah Admin</span>
        </button>
      </div>

      <!-- Search & Filter -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama, username, atau wilayah..."
            class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
          />
        </div>
        <select
          v-model="filterRole"
          class="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white sm:w-52"
        >
          <option value="">Semua Role</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN_KP">Admin KP</option>
          <option value="ADMIN_KEPWIL">Admin Kepwil</option>
        </select>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-bpjs-500 border-t-transparent"></div>
        <p class="mt-2 text-gray-500">Memuat data admin...</p>
      </div>

      <!-- Admin List -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Username</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Wilayah</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="admin in filteredAdmins" :key="admin.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold">{{ admin.nama?.charAt(0) || 'A' }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ admin.nama }}</p>
                    <p class="text-xs text-gray-500">ID: {{ admin.id }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-gray-700">{{ admin.username }}</span>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex px-3 py-1 rounded-full text-xs font-medium"
                  :class="roleDisplay[admin.role]?.color || 'bg-gray-100 text-gray-800'"
                >
                  {{ roleDisplay[admin.role]?.label || admin.role }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div v-if="admin.kepwil || admin.kc">
                  <span v-if="admin.kepwil" class="text-gray-700">{{ admin.kepwil }}</span>
                  <span v-if="admin.kc" class="text-xs text-gray-500 block">KC: {{ admin.kc }}</span>
                </div>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4">
                <div v-if="canModify(admin)" class="flex items-center space-x-2">
                  <button
                    @click="openEdit(admin)"
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="admin.id !== authStore.user?.id"
                    @click="deleteAdmin(admin)"
                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <span v-else class="text-gray-400 text-sm">-</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filteredAdmins.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p class="mt-2 text-gray-500">Belum ada admin</p>
        </div>
      </div>

      <!-- Modal -->
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showModal = false"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div class="p-6 border-b border-gray-100">
            <h2 class="text-xl font-bold text-gray-900">
              {{ editMode ? 'Edit Admin' : 'Tambah Admin Baru' }}
            </h2>
          </div>

          <form @submit.prevent="saveAdmin" class="p-6 space-y-4">
            <!-- Username -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                v-model="form.username"
                type="text"
                :disabled="editMode"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-bpjs-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="username"
              />
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Password
                <span v-if="editMode" class="text-gray-400 font-normal">(kosongkan jika tidak ingin mengubah)</span>
              </label>
              <input
                v-model="form.password"
                type="password"
                :required="!editMode"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-bpjs-500 focus:border-transparent"
                placeholder="********"
              />
            </div>

            <!-- Nama -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                v-model="form.nama"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-bpjs-500 focus:border-transparent"
                placeholder="Nama lengkap admin"
              />
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                v-model="form.role"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-bpjs-500 focus:border-transparent"
              >
                <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Kepwil (only for ADMIN_KEPWIL) -->
            <div v-if="form.role === 'ADMIN_KEPWIL'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kedeputian Wilayah</label>
              <select
                v-model="form.kepwilId"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-bpjs-500 focus:border-transparent"
              >
                <option :value="null">Pilih Kepwil...</option>
                <option v-for="kw in kepwilList" :key="kw.id" :value="kw.id">
                  {{ kw.nama }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Admin hanya dapat mengakses data di wilayah ini</p>
            </div>

            <!-- KC (only for ADMIN_KEPWIL) -->
            <div v-if="form.role === 'ADMIN_KEPWIL'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kantor Cabang (KC)</label>
              <select
                v-model="form.kcId"
                :disabled="!form.kepwilId || loadingKc"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-bpjs-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option :value="null">Pilih KC...</option>
                <option v-for="kc in kcList" :key="kc.id" :value="kc.id">
                  {{ kc.nama }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Opsional - pilih KC spesifik untuk admin</p>
            </div>

            <!-- Actions -->
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showModal = false"
                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 bg-bpjs-600 text-white rounded-xl hover:bg-bpjs-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <span v-if="saving">Menyimpan...</span>
                <span v-else>{{ editMode ? 'Simpan Perubahan' : 'Tambah Admin' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
