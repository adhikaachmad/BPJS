<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const data = ref(null)
const loading = ref(true)
const error = ref(null)

const overallProgress = computed(() => {
  if (!data.value) return 0
  const { materiCompleted, materiTotal, testsCompleted, testsTotal } = data.value.summary
  const total = materiTotal + testsTotal
  if (total === 0) return 0
  return Math.round(((materiCompleted + testsCompleted) / total) * 100)
})

onMounted(async () => {
  try {
    const subKategoriId = route.params.subKategoriId
    const response = await api.get(`/test/rekapin/${subKategoriId}`)
    data.value = response.data
  } catch (err) {
    error.value = 'Gagal memuat data rekap'
    console.error(err)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push(`/sub-kategori/${route.params.subKategoriId}`)
}

function goToModul(modul) {
  if (modul.tipe === 'KUPAS_TUNTAS') {
    router.push(`/materi/${modul.id}`)
  } else if (modul.tipe === 'JITU') {
    router.push(`/modul/${modul.id}`)
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getScoreColor(score) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreBg(score) {
  if (score >= 80) return 'bg-emerald-50'
  if (score >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat rekap...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col justify-center items-center min-h-screen p-4">
      <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-red-500 mb-4">{{ error }}</p>
        <button @click="goBack" class="btn-primary">Kembali</button>
      </div>
    </div>

    <template v-else>
      <!-- Header -->
      <header class="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">
        <div class="max-w-5xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div>
              <button @click="goBack" class="flex items-center text-white/80 hover:text-white mb-2 transition-colors">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali
              </button>
              <h1 class="text-2xl font-bold">REKAPIN</h1>
              <p class="text-white/80 text-sm mt-1">Rekap Progress Pembelajaran</p>
            </div>

            <!-- User Info -->
            <div class="bg-white/20 rounded-xl px-4 py-3 text-right backdrop-blur-sm">
              <p class="font-semibold">{{ authStore.user?.nama }}</p>
              <p class="text-sm text-white/80">{{ authStore.user?.posisi }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Overall Progress -->
      <div class="max-w-5xl mx-auto px-4 -mt-4">
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-800">Progress Keseluruhan</h2>
            <span class="text-2xl font-bold text-amber-600">{{ overallProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div
              class="bg-gradient-to-r from-amber-500 to-orange-600 h-4 rounded-full transition-all duration-500"
              :style="{ width: `${overallProgress}%` }"
            ></div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div class="bg-violet-50 rounded-xl p-4 text-center">
              <div class="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg class="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-violet-600">
                {{ data?.summary?.materiCompleted }}/{{ data?.summary?.materiTotal }}
              </p>
              <p class="text-sm text-violet-700">Materi Selesai</p>
            </div>

            <div class="bg-blue-50 rounded-xl p-4 text-center">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-blue-600">{{ data?.summary?.testsCompleted }}</p>
              <p class="text-sm text-blue-700">Quiz Dikerjakan</p>
            </div>

            <div class="bg-emerald-50 rounded-xl p-4 text-center">
              <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-emerald-600">
                {{ data?.summary?.bestScore?.toFixed(1) || 0 }}%
              </p>
              <p class="text-sm text-emerald-700">Skor Terbaik</p>
            </div>

            <div class="bg-amber-50 rounded-xl p-4 text-center">
              <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-amber-600">
                {{ data?.summary?.averageScore?.toFixed(1) || 0 }}%
              </p>
              <p class="text-sm text-amber-700">Rata-rata Skor</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Module Progress -->
      <main class="max-w-5xl mx-auto px-4 py-8">
        <h2 class="text-lg font-bold text-gray-800 mb-4">Detail Progress Modul</h2>

        <div class="space-y-4">
          <div
            v-for="item in data?.moduls"
            :key="item.modul.id"
            class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div class="p-4 flex items-center justify-between">
              <div class="flex items-center">
                <!-- Module Icon -->
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center mr-4"
                  :class="{
                    'bg-gradient-to-br from-violet-500 to-purple-600': item.modul.tipe === 'KUPAS_TUNTAS',
                    'bg-gradient-to-br from-blue-500 to-indigo-600': item.modul.tipe === 'JITU',
                    'bg-gradient-to-br from-teal-500 to-cyan-600': item.modul.tipe === 'DO_CHECK',
                    'bg-gradient-to-br from-amber-500 to-orange-600': item.modul.tipe === 'REKAPIN'
                  }"
                >
                  <!-- Materi Icon -->
                  <svg v-if="item.modul.tipe === 'KUPAS_TUNTAS'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <!-- Quiz Icon -->
                  <svg v-else-if="item.modul.tipe === 'JITU'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <!-- Check Icon -->
                  <svg v-else-if="item.modul.tipe === 'DO_CHECK'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <!-- Recap Icon -->
                  <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <div>
                  <h3 class="font-semibold text-gray-800">{{ item.modul.nama }}</h3>
                  <p class="text-sm text-gray-500">{{ item.modul.deskripsi }}</p>
                </div>
              </div>

              <!-- Status -->
              <div class="text-right">
                <!-- Materi Status -->
                <template v-if="item.type === 'materi'">
                  <span
                    v-if="item.isCompleted"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700"
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Selesai
                  </span>
                  <span v-else class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    Belum Dibaca
                  </span>
                  <p v-if="item.completedAt" class="text-xs text-gray-400 mt-1">
                    {{ formatDate(item.completedAt) }}
                  </p>
                </template>

                <!-- Quiz Status -->
                <template v-else-if="item.type === 'quiz'">
                  <div v-if="item.isCompleted">
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      :class="[getScoreBg(item.bestScore), getScoreColor(item.bestScore)]"
                    >
                      {{ item.bestScore?.toFixed(1) }}%
                    </span>
                    <p class="text-xs text-gray-400 mt-1">
                      {{ item.attempts }} percobaan
                    </p>
                  </div>
                  <span v-else class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    Belum Dikerjakan
                  </span>
                </template>

                <!-- Other Status -->
                <template v-else>
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
                    -
                  </span>
                </template>
              </div>
            </div>

            <!-- Action Button -->
            <div v-if="item.type === 'materi' || item.type === 'quiz'" class="px-4 pb-4">
              <button
                @click="goToModul(item.modul)"
                class="w-full py-2 text-sm font-medium rounded-lg transition-colors"
                :class="{
                  'bg-violet-100 text-violet-700 hover:bg-violet-200': item.modul.tipe === 'KUPAS_TUNTAS',
                  'bg-blue-100 text-blue-700 hover:bg-blue-200': item.modul.tipe === 'JITU'
                }"
              >
                {{ item.isCompleted ? 'Lihat Kembali' : 'Mulai' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Test History -->
        <div v-if="data?.testHistory?.length > 0" class="mt-8">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Riwayat Quiz</h2>

          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Benar</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Skor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="history in data.testHistory" :key="history.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ formatDate(history.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-center text-sm text-gray-600">
                    {{ history.benar }}
                  </td>
                  <td class="px-4 py-3 text-center text-sm text-gray-600">
                    {{ history.totalSoal }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium"
                      :class="[getScoreBg(history.skor), getScoreColor(history.skor)]"
                    >
                      {{ history.skor?.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>
