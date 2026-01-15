<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'

const route = useRoute()
const router = useRouter()
const quizStore = useQuizStore()

const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  const result = await quizStore.getResult(route.params.sessionId)
  if (!result) {
    error.value = 'Gagal memuat hasil test'
  }
  loading.value = false
})

const scoreGrade = computed(() => {
  const skor = quizStore.result?.hasilTest?.skor || 0
  if (skor >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' }
  if (skor >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' }
  if (skor >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' }
  if (skor >= 60) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' }
  return { grade: 'E', color: 'text-red-600', bg: 'bg-red-100' }
})

function goHome() {
  quizStore.reset()
  router.push('/')
}

function goToSubKategori() {
  quizStore.reset()
  const subKategoriId = quizStore.result?.modul?.subKategoriId
  if (subKategoriId) {
    router.push(`/sub-kategori/${subKategoriId}`)
  } else {
    router.push('/')
  }
}

function goToDoCheck() {
  router.push(`/docheck/${route.params.sessionId}`)
}

function tryAgain() {
  quizStore.reset()
  router.push(`/modul/${quizStore.result?.modul?.id}`)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
    <div class="max-w-3xl mx-auto px-4">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-red-500 mb-4">{{ error }}</p>
        <button @click="$router.go(0)" class="btn-primary">Coba Lagi</button>
      </div>

      <template v-else>
        <!-- Result Card -->
        <div class="card text-center mb-6">
          <!-- Score Circle -->
          <div class="relative w-48 h-48 mx-auto mb-6">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                class="text-gray-200"
                stroke-width="8"
                stroke="currentColor"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
              />
              <circle
                class="text-bpjs-500 transition-all duration-1000"
                stroke-width="8"
                stroke="currentColor"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
                :stroke-dasharray="264"
                :stroke-dashoffset="264 - (264 * (quizStore.result?.hasilTest?.skor || 0)) / 100"
                stroke-linecap="round"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-4xl font-bold text-gray-800">
                {{ (quizStore.result?.hasilTest?.skor || 0).toFixed(0) }}
              </span>
              <span class="text-gray-500">dari 100</span>
            </div>
          </div>

          <!-- Grade Badge -->
          <div
            class="inline-flex items-center px-6 py-2 rounded-full text-2xl font-bold mb-4"
            :class="[scoreGrade.bg, scoreGrade.color]"
          >
            Grade: {{ scoreGrade.grade }}
          </div>

          <h1 class="text-2xl font-bold text-gray-800 mb-2">
            {{ quizStore.result?.hasilTest?.skor >= 70 ? 'Selamat!' : 'Tetap Semangat!' }}
          </h1>
          <p class="text-gray-600">
            {{ quizStore.result?.hasilTest?.skor >= 70
              ? 'Anda telah berhasil menyelesaikan test dengan baik.'
              : 'Terus tingkatkan pemahaman Anda.' }}
          </p>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="card text-center">
            <div class="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-2xl font-bold text-gray-800">{{ quizStore.result?.hasilTest?.totalSoal }}</p>
            <p class="text-sm text-gray-500">Total Soal</p>
          </div>

          <div class="card text-center">
            <div class="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="text-2xl font-bold text-green-600">{{ quizStore.result?.hasilTest?.benar }}</p>
            <p class="text-sm text-gray-500">Benar</p>
          </div>

          <div class="card text-center">
            <div class="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p class="text-2xl font-bold text-red-600">{{ quizStore.result?.hasilTest?.salah }}</p>
            <p class="text-sm text-gray-500">Salah</p>
          </div>
        </div>

        <!-- Module Info -->
        <div class="card mb-6">
          <h3 class="font-semibold text-gray-800 mb-4">Detail Test</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Modul</span>
              <span class="font-medium">{{ quizStore.result?.modul?.nama }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Waktu Mulai</span>
              <span class="font-medium">
                {{ new Date(quizStore.result?.session?.startTime).toLocaleString('id-ID') }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Waktu Selesai</span>
              <span class="font-medium">
                {{ new Date(quizStore.result?.session?.endTime).toLocaleString('id-ID') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <!-- Primary Action: Lihat Koreksi -->
          <button
            @click="goToDoCheck"
            class="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all flex items-center justify-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Lihat Koreksi & Pembahasan
          </button>

          <div class="flex space-x-4">
            <button @click="goToSubKategori" class="flex-1 btn-secondary">
              Kembali ke Modul
            </button>
            <button @click="tryAgain" class="flex-1 btn-primary">
              Coba Lagi
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
