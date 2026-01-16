<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)

const result = ref(null)
const currentSoalIndex = ref(0)
const viewMode = ref('summary') // 'summary' | 'review'

const currentSoal = computed(() => result.value?.soals?.[currentSoalIndex.value] || null)
const isFirstSoal = computed(() => currentSoalIndex.value === 0)
const isLastSoal = computed(() => currentSoalIndex.value === (result.value?.soals?.length || 0) - 1)

onMounted(async () => {
  await loadResult()
})

async function loadResult() {
  loading.value = true
  error.value = null

  try {
    const response = await api.get(`/periode/user/${route.params.periodeId}/test/result`)
    result.value = response.data
  } catch (err) {
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Gagal memuat hasil test'
    }
    console.error(err)
  } finally {
    loading.value = false
  }
}

function startReview() {
  viewMode.value = 'review'
  currentSoalIndex.value = 0
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function backToSummary() {
  viewMode.value = 'summary'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function nextSoal() {
  if (!isLastSoal.value) {
    currentSoalIndex.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevSoal() {
  if (!isFirstSoal.value) {
    currentSoalIndex.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToSoal(index) {
  currentSoalIndex.value = index
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goBack() {
  router.back()
}

function getScoreClass(skor) {
  if (skor >= 80) return 'text-emerald-600'
  if (skor >= 60) return 'text-blue-600'
  if (skor >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreLabel(skor) {
  if (skor >= 80) return 'Sangat Baik'
  if (skor >= 60) return 'Baik'
  if (skor >= 40) return 'Cukup'
  return 'Perlu Belajar Lagi'
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat hasil...</p>
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

    <!-- Result Content -->
    <template v-else-if="result">
      <!-- Header -->
      <header class="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg">
        <div class="max-w-5xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div>
              <button @click="goBack" class="flex items-center text-white/80 hover:text-white mb-2 transition-colors">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali
              </button>
              <h1 class="text-2xl font-bold">Hasil Test {{ result.periodeName }}</h1>
              <p class="text-white/80 text-sm mt-1">
                {{ result.isDoCheckAvailable ? 'Do-Check Tersedia' : 'Menunggu Pembahasan' }}
              </p>
            </div>

            <div class="text-right">
              <p class="text-4xl font-bold" :class="getScoreClass(result.hasilTest?.skor)">
                {{ result.hasilTest?.skor?.toFixed(0) }}
              </p>
              <p class="text-sm opacity-80">{{ getScoreLabel(result.hasilTest?.skor) }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Summary View -->
      <template v-if="viewMode === 'summary'">
        <main class="max-w-5xl mx-auto px-4 py-8">
          <!-- Score Card -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-6 text-center">Ringkasan Hasil</h2>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 text-center">
                <p class="text-3xl font-bold text-emerald-600">{{ result.hasilTest?.skor?.toFixed(0) }}</p>
                <p class="text-sm text-gray-500">Skor</p>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center">
                <p class="text-3xl font-bold text-green-600">{{ result.hasilTest?.benar }}</p>
                <p class="text-sm text-gray-500">Benar</p>
              </div>
              <div class="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 text-center">
                <p class="text-3xl font-bold text-red-600">{{ result.hasilTest?.salah }}</p>
                <p class="text-sm text-gray-500">Salah</p>
              </div>
              <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 text-center">
                <p class="text-3xl font-bold text-gray-600">{{ result.hasilTest?.tidakDijawab }}</p>
                <p class="text-sm text-gray-500">Tidak Dijawab</p>
              </div>
            </div>

            <!-- Progress Bar Visual -->
            <div class="mb-6">
              <div class="flex h-4 rounded-full overflow-hidden">
                <div
                  class="bg-green-500"
                  :style="{ width: `${(result.hasilTest?.benar / result.hasilTest?.totalSoal) * 100}%` }"
                ></div>
                <div
                  class="bg-red-500"
                  :style="{ width: `${(result.hasilTest?.salah / result.hasilTest?.totalSoal) * 100}%` }"
                ></div>
                <div
                  class="bg-gray-300"
                  :style="{ width: `${(result.hasilTest?.tidakDijawab / result.hasilTest?.totalSoal) * 100}%` }"
                ></div>
              </div>
              <div class="flex justify-between mt-2 text-xs text-gray-500">
                <span>{{ result.hasilTest?.benar }} Benar</span>
                <span>{{ result.hasilTest?.salah }} Salah</span>
                <span>{{ result.hasilTest?.tidakDijawab }} Tidak Dijawab</span>
              </div>
            </div>

            <!-- Do-Check Button -->
            <div v-if="result.isDoCheckAvailable" class="text-center">
              <button
                @click="startReview"
                class="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all"
              >
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Lihat Pembahasan
              </button>
            </div>
            <div v-else class="text-center">
              <div class="bg-amber-50 rounded-xl p-4 inline-block">
                <svg class="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-amber-700">Pembahasan akan tersedia setelah waktu pengerjaan berakhir</p>
              </div>
            </div>
          </div>

          <!-- Quick Overview (if do-check available) -->
          <div v-if="result.isDoCheckAvailable" class="bg-white rounded-2xl shadow-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Ringkasan Jawaban</h3>
            <div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
              <button
                v-for="(soal, index) in result.soals"
                :key="soal.id"
                @click="startReview(); currentSoalIndex = index"
                class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                :class="{
                  'bg-green-100 text-green-700 hover:bg-green-200': soal.isCorrect === true,
                  'bg-red-100 text-red-700 hover:bg-red-200': soal.isCorrect === false,
                  'bg-gray-100 text-gray-600 hover:bg-gray-200': soal.isCorrect === null
                }"
              >
                {{ index + 1 }}
              </button>
            </div>

            <div class="flex items-center justify-center space-x-6 mt-4 text-sm text-gray-500">
              <div class="flex items-center">
                <span class="w-4 h-4 bg-green-100 rounded mr-2"></span>
                Benar
              </div>
              <div class="flex items-center">
                <span class="w-4 h-4 bg-red-100 rounded mr-2"></span>
                Salah
              </div>
              <div class="flex items-center">
                <span class="w-4 h-4 bg-gray-100 rounded mr-2"></span>
                Tidak Dijawab
              </div>
            </div>
          </div>
        </main>
      </template>

      <!-- Review View (Do-Check) -->
      <template v-else-if="viewMode === 'review'">
        <!-- Progress Bar -->
        <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div class="max-w-5xl mx-auto px-4 py-3">
            <div class="flex items-center justify-between mb-2">
              <button @click="backToSummary" class="text-sm text-teal-600 hover:text-teal-700 font-medium">
                &larr; Kembali ke Ringkasan
              </button>
              <span class="text-sm text-gray-500">
                Soal {{ currentSoalIndex + 1 }} dari {{ result.soals.length }}
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${((currentSoalIndex + 1) / result.soals.length) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <main class="max-w-5xl mx-auto px-4 py-8">
          <!-- Soal Card with Answer -->
          <div v-if="currentSoal" class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <!-- Soal Header -->
            <div
              class="px-6 py-4 border-b"
              :class="{
                'bg-green-50 border-green-100': currentSoal.isCorrect === true,
                'bg-red-50 border-red-100': currentSoal.isCorrect === false,
                'bg-gray-50 border-gray-100': currentSoal.isCorrect === null
              }"
            >
              <div class="flex items-center justify-between">
                <span
                  class="inline-block px-3 py-1 text-sm font-medium rounded-full"
                  :class="{
                    'bg-green-500 text-white': currentSoal.isCorrect === true,
                    'bg-red-500 text-white': currentSoal.isCorrect === false,
                    'bg-gray-500 text-white': currentSoal.isCorrect === null
                  }"
                >
                  Soal {{ currentSoalIndex + 1 }}
                </span>
                <span
                  class="text-sm font-medium"
                  :class="{
                    'text-green-600': currentSoal.isCorrect === true,
                    'text-red-600': currentSoal.isCorrect === false,
                    'text-gray-600': currentSoal.isCorrect === null
                  }"
                >
                  {{ currentSoal.isCorrect === true ? 'Benar' : currentSoal.isCorrect === false ? 'Salah' : 'Tidak Dijawab' }}
                </span>
              </div>
            </div>

            <!-- Pertanyaan -->
            <div class="p-6">
              <p class="text-lg text-gray-800 mb-6 leading-relaxed">{{ currentSoal.pertanyaan }}</p>

              <!-- Options with Correct/Wrong indicators -->
              <div class="space-y-3">
                <div
                  v-for="(option, key) in { A: currentSoal.opsiA, B: currentSoal.opsiB, C: currentSoal.opsiC, D: currentSoal.opsiD }"
                  :key="key"
                  class="p-4 rounded-xl border-2 transition-all"
                  :class="{
                    'border-green-500 bg-green-50': key === currentSoal.jawabanBenar,
                    'border-red-500 bg-red-50': currentSoal.userJawaban === key && key !== currentSoal.jawabanBenar,
                    'border-gray-200 bg-gray-50': key !== currentSoal.jawabanBenar && currentSoal.userJawaban !== key
                  }"
                >
                  <div class="flex items-start">
                    <span
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0"
                      :class="{
                        'bg-green-500 text-white': key === currentSoal.jawabanBenar,
                        'bg-red-500 text-white': currentSoal.userJawaban === key && key !== currentSoal.jawabanBenar,
                        'bg-gray-300 text-gray-600': key !== currentSoal.jawabanBenar && currentSoal.userJawaban !== key
                      }"
                    >
                      {{ key }}
                    </span>
                    <div class="flex-1">
                      <span class="text-gray-700">{{ option }}</span>
                      <div class="flex items-center mt-1 space-x-2">
                        <span v-if="key === currentSoal.jawabanBenar" class="text-xs text-green-600 font-medium">
                          Jawaban Benar
                        </span>
                        <span v-if="currentSoal.userJawaban === key" class="text-xs text-blue-600 font-medium">
                          Jawaban Anda
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Pembahasan -->
              <div v-if="currentSoal.pembahasan" class="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 class="font-bold text-blue-800 mb-2 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pembahasan
                </h4>
                <p class="text-blue-700">{{ currentSoal.pembahasan }}</p>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex items-center justify-between mb-8">
            <button
              @click="prevSoal"
              :disabled="isFirstSoal"
              class="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Sebelumnya
            </button>

            <button
              v-if="isLastSoal"
              @click="backToSummary"
              class="flex items-center px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
              Selesai Review
            </button>

            <button
              v-else
              @click="nextSoal"
              class="flex items-center px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
              Selanjutnya
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <!-- Soal Navigator -->
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Navigasi Soal</h3>
            <div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
              <button
                v-for="(soal, index) in result.soals"
                :key="soal.id"
                @click="goToSoal(index)"
                class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                :class="{
                  'ring-2 ring-teal-500': index === currentSoalIndex,
                  'bg-green-100 text-green-700 hover:bg-green-200': soal.isCorrect === true,
                  'bg-red-100 text-red-700 hover:bg-red-200': soal.isCorrect === false,
                  'bg-gray-100 text-gray-600 hover:bg-gray-200': soal.isCorrect === null
                }"
              >
                {{ index + 1 }}
              </button>
            </div>
          </div>
        </main>
      </template>
    </template>
  </div>
</template>
