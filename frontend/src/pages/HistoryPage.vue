<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()
const history = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await api.get('/periode/user/history')
    history.value = response.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})

function getGradeColor(skor) {
  if (skor >= 90) return 'bg-green-100 text-green-700'
  if (skor >= 80) return 'bg-blue-100 text-blue-700'
  if (skor >= 70) return 'bg-yellow-100 text-yellow-700'
  if (skor >= 60) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function getStatusBadge(status, progress) {
  if (progress.testCompleted) {
    return { text: 'Selesai', class: 'bg-green-100 text-green-700' }
  }
  if (status === 'aktif') {
    if (progress.materiCompleted) {
      return { text: 'Siap Test', class: 'bg-blue-100 text-blue-700' }
    }
    return { text: 'Baca Materi', class: 'bg-yellow-100 text-yellow-700' }
  }
  if (status === 'docheck') {
    return { text: 'Waktu Habis', class: 'bg-orange-100 text-orange-700' }
  }
  return { text: 'Selesai', class: 'bg-gray-100 text-gray-700' }
}

function viewResult(periodeId) {
  router.push(`/periode/${periodeId}/result`)
}

function goToPeriode(item) {
  if (item.userProgress.testCompleted) {
    // Sudah selesai test, lihat hasil
    router.push(`/periode/${item.id}/result`)
  } else if (item.status === 'aktif') {
    // Masih aktif, lanjutkan
    const subKategoriId = authStore.user?.subKategori?.id
    if (subKategoriId) {
      router.push(`/sub-kategori/${subKategoriId}`)
    }
  } else {
    // Periode sudah lewat, lihat hasil jika ada
    if (item.userProgress.hasilTest) {
      router.push(`/periode/${item.id}/result`)
    }
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Header -->
    <header class="gradient-bpjs text-white py-8">
      <div class="max-w-4xl mx-auto px-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold mb-2">Riwayat Test</h1>
            <p class="opacity-80">Lihat semua hasil test yang telah Anda selesaikan</p>
          </div>
          <div class="text-right">
            <p class="text-sm opacity-80">{{ authStore.user?.nama }}</p>
            <p class="text-xs opacity-60">{{ authStore.user?.posisi }}</p>
            <button @click="handleLogout" class="mt-2 text-sm underline opacity-80 hover:opacity-100">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Back button -->
      <button
        @click="router.back()"
        class="flex items-center text-gray-600 hover:text-bpjs-600 mb-6 transition-colors"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Kembali
      </button>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="history.length === 0" class="text-center py-20">
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Belum Ada Riwayat</h3>
        <p class="text-gray-500 mb-6">Anda belum menyelesaikan test apapun</p>
        <router-link to="/" class="btn-primary">Mulai Test</router-link>
      </div>

      <!-- History List -->
      <div v-else class="space-y-4">
        <div
          v-for="item in history"
          :key="item.id"
          class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl cursor-pointer transition-all duration-300"
          @click="goToPeriode(item)"
        >
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Icon -->
                <div class="w-14 h-14 gradient-bpjs rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <!-- Info -->
                <div>
                  <h3 class="font-bold text-lg text-gray-800">{{ item.nama }}</h3>
                  <div class="flex items-center space-x-3 mt-1">
                    <span class="text-sm text-gray-500">
                      <span class="inline-flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {{ item.jumlahMateri }} materi
                      </span>
                    </span>
                    <span class="text-sm text-gray-500">
                      <span class="inline-flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ item.jumlahSoal }} soal
                      </span>
                    </span>
                  </div>
                  <!-- Status Badge -->
                  <div class="mt-2">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getStatusBadge(item.status, item.userProgress).class"
                    >
                      {{ getStatusBadge(item.status, item.userProgress).text }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Score (if completed) -->
              <div v-if="item.userProgress.hasilTest" class="text-right">
                <div
                  class="inline-flex items-center px-4 py-2 rounded-xl text-lg font-bold"
                  :class="getGradeColor(item.userProgress.hasilTest.skor || 0)"
                >
                  {{ (item.userProgress.hasilTest.skor || 0).toFixed(0) }}%
                </div>
                <p class="text-sm text-gray-500 mt-1">
                  {{ item.userProgress.hasilTest.benar }}/{{ item.userProgress.hasilTest.totalSoal }} benar
                </p>
              </div>

              <!-- Arrow if no score -->
              <div v-else class="text-gray-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Progress bar for materi -->
          <div v-if="!item.userProgress.testCompleted && item.status === 'aktif'" class="px-6 pb-4">
            <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{{ item.userProgress.materiCompleted ? 'Materi selesai' : 'Baca materi dulu' }}</span>
            </div>
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-bpjs-400 to-bpjs-600 transition-all duration-500"
                :style="{ width: item.userProgress.materiCompleted ? '50%' : '0%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
