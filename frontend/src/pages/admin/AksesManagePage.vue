<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import api from '@/utils/api'

const loading = ref(true)
const saving = ref({})
const kategoris = ref([])
const error = ref(null)
const successMessage = ref('')

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const response = await api.get('/admin/sub-kategori-access')
    kategoris.value = response.data
  } catch (err) {
    error.value = 'Gagal memuat data'
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function toggleAccess(subKategori) {
  saving.value[subKategori.id] = true
  error.value = null
  successMessage.value = ''

  try {
    const response = await api.put(`/admin/sub-kategori/${subKategori.id}/toggle-access`, {
      isActive: !subKategori.isActive
    })

    // Update local state
    subKategori.isActive = !subKategori.isActive
    successMessage.value = response.data.message

    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal mengubah akses'
  } finally {
    saving.value[subKategori.id] = false
  }
}

function getActiveCount(kategori) {
  return kategori.subKategoris.filter(sk => sk.isActive).length
}

function getTotalCount(kategori) {
  return kategori.subKategoris.length
}
</script>

<template>
  <AdminLayout>
    <div class="p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-800">Akses Login SubKategori</h1>
        <p class="text-gray-600 mt-1">Kelola akses login untuk setiap sub kategori. SubKategori yang dinonaktifkan akan menampilkan halaman "Coming Soon".</p>
      </div>

      <!-- Success Message -->
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="successMessage" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center">
          <svg class="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-green-700">{{ successMessage }}</span>
        </div>
      </transition>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
        <svg class="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-red-700">{{ error }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-600"></div>
      </div>

      <!-- Kategoris List -->
      <div v-else class="space-y-6">
        <div
          v-for="kategori in kategoris"
          :key="kategori.id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <!-- Kategori Header -->
          <div class="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-bpjs-100 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-bpjs-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-gray-800">{{ kategori.nama }}</h2>
                  <p class="text-sm text-gray-500">{{ kategori.deskripsi }}</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500">
                  {{ getActiveCount(kategori) }} / {{ getTotalCount(kategori) }} aktif
                </span>
                <div class="flex items-center space-x-1">
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="getActiveCount(kategori) === getTotalCount(kategori) ? 'bg-green-500' : getActiveCount(kategori) > 0 ? 'bg-yellow-500' : 'bg-red-500'"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- SubKategoris List -->
          <div class="divide-y divide-gray-100">
            <div
              v-for="subKategori in kategori.subKategoris"
              :key="subKategori.id"
              class="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center space-x-4">
                <!-- Status Indicator -->
                <div
                  class="w-3 h-3 rounded-full flex-shrink-0"
                  :class="subKategori.isActive ? 'bg-green-500' : 'bg-gray-300'"
                ></div>

                <div>
                  <div class="flex items-center space-x-2">
                    <h3 class="font-semibold text-gray-800">{{ subKategori.nama }}</h3>
                    <span
                      class="px-2 py-0.5 text-xs rounded-full"
                      :class="subKategori.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ subKategori.isActive ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-0.5">
                    {{ subKategori._count?.users || 0 }} pengguna terdaftar
                    <span class="mx-1">•</span>
                    <span class="text-gray-400">/login/{{ subKategori.slug }}</span>
                  </p>
                </div>
              </div>

              <!-- Toggle Switch -->
              <button
                @click="toggleAccess(subKategori)"
                :disabled="saving[subKategori.id]"
                class="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-bpjs-500 focus:ring-offset-2 disabled:opacity-50"
                :class="subKategori.isActive ? 'bg-green-500' : 'bg-gray-300'"
              >
                <span v-if="saving[subKategori.id]" class="absolute inset-0 flex items-center justify-center">
                  <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                <span
                  v-else
                  class="inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform"
                  :class="subKategori.isActive ? 'translate-x-8' : 'translate-x-1'"
                ></span>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="kategori.subKategoris.length === 0" class="px-6 py-8 text-center text-gray-500">
            Belum ada sub kategori
          </div>
        </div>
      </div>

      <!-- Info Box -->
      <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div class="flex items-start space-x-3">
          <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="text-sm text-blue-700">
            <p class="font-medium mb-1">Catatan:</p>
            <ul class="list-disc list-inside space-y-1 text-blue-600">
              <li>SubKategori yang <strong>aktif</strong> dapat diakses untuk login oleh pengguna</li>
              <li>SubKategori yang <strong>nonaktif</strong> akan menampilkan halaman "Coming Soon" saat diakses</li>
              <li>Pengguna yang sudah login tidak akan terpengaruh sampai sesi mereka berakhir</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
