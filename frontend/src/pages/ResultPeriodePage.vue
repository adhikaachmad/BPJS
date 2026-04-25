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

// Score rating categories
const scoreRatings = [
  { key: 'sangat-buruk', label: 'Sangat Buruk', min: 0, max: 20, color: 'from-red-500 to-red-600', textColor: 'text-red-500', bgActive: 'bg-red-500', ring: 'ring-red-300' },
  { key: 'buruk', label: 'Buruk', min: 20, max: 40, color: 'from-rose-400 to-rose-500', textColor: 'text-rose-400', bgActive: 'bg-rose-400', ring: 'ring-rose-200' },
  { key: 'cukup', label: 'Cukup', min: 40, max: 60, color: 'from-amber-400 to-amber-500', textColor: 'text-amber-500', bgActive: 'bg-amber-400', ring: 'ring-amber-200' },
  { key: 'baik', label: 'Baik', min: 60, max: 80, color: 'from-lime-400 to-lime-500', textColor: 'text-lime-500', bgActive: 'bg-lime-500', ring: 'ring-lime-200' },
  { key: 'sangat-baik', label: 'Sangat Baik', min: 80, max: 101, color: 'from-emerald-500 to-emerald-600', textColor: 'text-emerald-500', bgActive: 'bg-emerald-500', ring: 'ring-emerald-200' }
]

function getActiveRating(skor) {
  if (skor == null) return null
  return scoreRatings.find(r => skor >= r.min && skor < r.max) || scoreRatings[0]
}

function getScoreClass(skor) {
  if (skor >= 80) return 'text-emerald-600'
  if (skor >= 60) return 'text-lime-600'
  if (skor >= 40) return 'text-amber-600'
  if (skor >= 20) return 'text-rose-500'
  return 'text-red-600'
}

function getScoreBgClass(skor) {
  if (skor >= 80) return 'bg-emerald-50 border-emerald-200'
  if (skor >= 60) return 'bg-lime-50 border-lime-200'
  if (skor >= 40) return 'bg-amber-50 border-amber-200'
  if (skor >= 20) return 'bg-rose-50 border-rose-200'
  return 'bg-red-50 border-red-200'
}

function getScoreLabel(skor) {
  return getActiveRating(skor)?.label || 'Belum Dinilai'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat hasil...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col justify-center items-center min-h-screen p-4">
      <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md text-center">
        <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button @click="goBack" class="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
          Kembali
        </button>
      </div>
    </div>

    <!-- Result Content -->
    <template v-else-if="result">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button @click="goBack" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div class="h-8 w-px bg-gray-200"></div>
              <div>
                <p class="text-sm text-gray-500">Hasil Test</p>
                <h1 class="text-lg font-bold text-gray-900">{{ result.periodeName }}</h1>
              </div>
            </div>

            <div class="flex items-center space-x-3">
              <div
                class="px-4 py-2 rounded-xl border"
                :class="getScoreBgClass(result.hasilTest?.skor)"
              >
                <span class="text-2xl font-bold" :class="getScoreClass(result.hasilTest?.skor)">
                  {{ result.hasilTest?.skor?.toFixed(0) }}
                </span>
                <span class="text-sm ml-1" :class="getScoreClass(result.hasilTest?.skor)">poin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Summary View -->
      <template v-if="viewMode === 'summary'">
        <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <!-- Score Section -->
          <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6">
            <!-- Score Display -->
            <div class="text-center mb-6">
              <p class="text-5xl sm:text-6xl font-extrabold" :class="getScoreClass(result.hasilTest?.skor)">
                {{ result.hasilTest?.skor?.toFixed(0) }}
              </p>
              <p class="text-gray-500 mt-1">Skor Anda</p>
            </div>

            <!-- Emoji Rating Row -->
            <div class="flex justify-center items-end gap-2 sm:gap-3 mb-2">
              <div
                v-for="rating in scoreRatings"
                :key="rating.key"
                class="flex flex-col items-center"
              >
                <div
                  class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300"
                  :class="[
                    getActiveRating(result.hasilTest?.skor)?.key === rating.key
                      ? `bg-gradient-to-br ${rating.color} shadow-lg ring-2 ${rating.ring} scale-110`
                      : 'bg-gray-100'
                  ]"
                >
                  <span v-if="rating.key === 'sangat-buruk'">😡</span>
                  <span v-else-if="rating.key === 'buruk'">😟</span>
                  <span v-else-if="rating.key === 'cukup'">😐</span>
                  <span v-else-if="rating.key === 'baik'">😊</span>
                  <span v-else-if="rating.key === 'sangat-baik'">🤩</span>
                </div>
                <p
                  class="text-[10px] sm:text-xs mt-1.5 font-medium text-center leading-tight"
                  :class="getActiveRating(result.hasilTest?.skor)?.key === rating.key ? rating.textColor : 'text-gray-400'"
                >
                  {{ rating.label }}
                </p>
              </div>
            </div>
          </div>

          <!-- Stat Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <!-- Total Soal -->
            <div class="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div class="bg-slate-700 px-4 py-2">
                <p class="text-white text-xs font-semibold tracking-wide uppercase">Total Soal</p>
              </div>
              <div class="bg-white px-4 py-5 relative overflow-hidden">
                <p class="text-3xl sm:text-4xl font-extrabold text-slate-800 relative z-10">{{ result.hasilTest?.totalSoal }}</p>
                <svg class="absolute right-2 bottom-2 w-12 h-12 text-slate-100 z-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
            </div>

            <!-- Benar -->
            <div class="rounded-2xl overflow-hidden shadow-sm border border-emerald-100">
              <div class="bg-emerald-500 px-4 py-2">
                <p class="text-white text-xs font-semibold tracking-wide uppercase">Benar</p>
              </div>
              <div class="bg-white px-4 py-5 relative overflow-hidden">
                <p class="text-3xl sm:text-4xl font-extrabold text-emerald-600 relative z-10">{{ result.hasilTest?.benar }}</p>
                <svg class="absolute right-2 bottom-2 w-12 h-12 text-emerald-50 z-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>

            <!-- Salah -->
            <div class="rounded-2xl overflow-hidden shadow-sm border border-red-100">
              <div class="bg-red-500 px-4 py-2">
                <p class="text-white text-xs font-semibold tracking-wide uppercase">Salah</p>
              </div>
              <div class="bg-white px-4 py-5 relative overflow-hidden">
                <p class="text-3xl sm:text-4xl font-extrabold text-red-600 relative z-10">{{ result.hasilTest?.salah }}</p>
                <svg class="absolute right-2 bottom-2 w-12 h-12 text-red-50 z-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
            </div>

            <!-- Tidak Dijawab -->
            <div class="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div class="bg-gray-700 px-4 py-2">
                <p class="text-white text-xs font-semibold tracking-wide uppercase">Tidak Dijawab</p>
              </div>
              <div class="bg-white px-4 py-5 relative overflow-hidden">
                <p class="text-3xl sm:text-4xl font-extrabold text-gray-600 relative z-10">{{ result.hasilTest?.tidakDijawab }}</p>
                <svg class="absolute right-2 bottom-2 w-12 h-12 text-gray-100 z-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Distribusi Jawaban</h3>
            <div class="flex h-5 rounded-full overflow-hidden bg-gray-200">
              <div
                v-if="result.hasilTest?.benar > 0"
                class="bg-emerald-500 transition-all duration-500 flex items-center justify-center"
                :style="{ width: `${(result.hasilTest?.benar / result.hasilTest?.totalSoal) * 100}%` }"
              >
                <span v-if="(result.hasilTest?.benar / result.hasilTest?.totalSoal) >= 0.15" class="text-[10px] font-bold text-white">{{ ((result.hasilTest?.benar / result.hasilTest?.totalSoal) * 100).toFixed(0) }}%</span>
              </div>
              <div
                v-if="result.hasilTest?.salah > 0"
                class="bg-red-500 transition-all duration-500 flex items-center justify-center"
                :style="{ width: `${(result.hasilTest?.salah / result.hasilTest?.totalSoal) * 100}%` }"
              >
                <span v-if="(result.hasilTest?.salah / result.hasilTest?.totalSoal) >= 0.15" class="text-[10px] font-bold text-white">{{ ((result.hasilTest?.salah / result.hasilTest?.totalSoal) * 100).toFixed(0) }}%</span>
              </div>
              <div
                v-if="result.hasilTest?.tidakDijawab > 0"
                class="bg-gray-400 transition-all duration-500 flex items-center justify-center"
                :style="{ width: `${(result.hasilTest?.tidakDijawab / result.hasilTest?.totalSoal) * 100}%` }"
              >
                <span v-if="(result.hasilTest?.tidakDijawab / result.hasilTest?.totalSoal) >= 0.15" class="text-[10px] font-bold text-white">{{ ((result.hasilTest?.tidakDijawab / result.hasilTest?.totalSoal) * 100).toFixed(0) }}%</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-4 mt-3">
              <div class="flex items-center text-sm text-gray-600">
                <span class="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
                Benar ({{ result.hasilTest?.benar }})
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Salah ({{ result.hasilTest?.salah }})
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <span class="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                Tidak Dijawab ({{ result.hasilTest?.tidakDijawab }})
              </div>
            </div>
          </div>

          <!-- Do-Check Button -->
          <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6">
            <div v-if="result.isDoCheckAvailable" class="text-center">
              <button
                @click="startReview"
                class="px-8 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all inline-flex items-center shadow-md hover:shadow-lg"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Lihat Pembahasan
              </button>
            </div>
            <div v-else class="text-center">
              <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 inline-block">
                <svg class="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-amber-700 text-sm">Pembahasan akan tersedia setelah waktu pengerjaan berakhir</p>
              </div>
            </div>
          </div>

          <!-- Quick Overview (if do-check available) -->
          <div v-if="result.isDoCheckAvailable" class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Ringkasan Jawaban</h3>
            <div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
              <button
                v-for="(soal, index) in result.soals"
                :key="soal.id"
                @click="startReview(); currentSoalIndex = index"
                class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                :class="{
                  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200': soal.isCorrect === true,
                  'bg-red-100 text-red-700 hover:bg-red-200': soal.isCorrect === false,
                  'bg-gray-100 text-gray-600 hover:bg-gray-200': soal.isCorrect === null
                }"
              >
                {{ index + 1 }}
              </button>
            </div>

            <div class="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-100">
              <div class="flex items-center text-sm text-gray-500">
                <span class="w-4 h-4 bg-emerald-100 rounded mr-2"></span>
                Benar
              </div>
              <div class="flex items-center text-sm text-gray-500">
                <span class="w-4 h-4 bg-red-100 rounded mr-2"></span>
                Salah
              </div>
              <div class="flex items-center text-sm text-gray-500">
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
          <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div class="flex items-center justify-between mb-2">
              <button @click="backToSummary" class="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Ringkasan
              </button>
              <span class="text-sm font-medium text-gray-600">
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

        <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Soal Card with Answer -->
          <div v-if="currentSoal" class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
            <!-- Soal Header -->
            <div
              class="px-6 py-4 border-b"
              :class="{
                'bg-emerald-50 border-emerald-100': currentSoal.isCorrect === true,
                'bg-red-50 border-red-100': currentSoal.isCorrect === false,
                'bg-gray-50 border-gray-100': currentSoal.isCorrect === null
              }"
            >
              <div class="flex items-center justify-between">
                <span
                  class="inline-block px-3 py-1 text-sm font-medium rounded-lg"
                  :class="{
                    'bg-emerald-600 text-white': currentSoal.isCorrect === true,
                    'bg-red-600 text-white': currentSoal.isCorrect === false,
                    'bg-gray-500 text-white': currentSoal.isCorrect === null
                  }"
                >
                  Soal {{ currentSoalIndex + 1 }}
                </span>
                <span
                  class="text-sm font-medium flex items-center"
                  :class="{
                    'text-emerald-600': currentSoal.isCorrect === true,
                    'text-red-600': currentSoal.isCorrect === false,
                    'text-gray-600': currentSoal.isCorrect === null
                  }"
                >
                  <svg v-if="currentSoal.isCorrect === true" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else-if="currentSoal.isCorrect === false" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                    'border-emerald-500 bg-emerald-50': key === currentSoal.jawabanBenar,
                    'border-red-500 bg-red-50': currentSoal.userJawaban === key && key !== currentSoal.jawabanBenar,
                    'border-gray-200 bg-gray-50': key !== currentSoal.jawabanBenar && currentSoal.userJawaban !== key
                  }"
                >
                  <div class="flex items-start">
                    <span
                      class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0"
                      :class="{
                        'bg-emerald-600 text-white': key === currentSoal.jawabanBenar,
                        'bg-red-600 text-white': currentSoal.userJawaban === key && key !== currentSoal.jawabanBenar,
                        'bg-gray-200 text-gray-600': key !== currentSoal.jawabanBenar && currentSoal.userJawaban !== key
                      }"
                    >
                      {{ key }}
                    </span>
                    <div class="flex-1 pt-2">
                      <span class="text-gray-700">{{ option }}</span>
                      <div class="flex items-center mt-2 space-x-2">
                        <span v-if="key === currentSoal.jawabanBenar" class="inline-flex items-center text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">
                          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Jawaban Benar
                        </span>
                        <span v-if="currentSoal.userJawaban === key && key !== currentSoal.jawabanBenar" class="inline-flex items-center text-xs text-red-600 font-medium bg-red-100 px-2 py-0.5 rounded-full">
                          Jawaban Anda
                        </span>
                        <span v-if="currentSoal.userJawaban === key && key === currentSoal.jawabanBenar" class="inline-flex items-center text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full">
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
              class="flex items-center px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Sebelumnya
            </button>

            <button
              v-if="isLastSoal"
              @click="backToSummary"
              class="flex items-center px-8 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all"
            >
              Selesai Review
            </button>

            <button
              v-else
              @click="nextSoal"
              class="flex items-center px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all"
            >
              Selanjutnya
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <!-- Soal Navigator -->
          <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Navigasi Soal</h3>
            <div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
              <button
                v-for="(soal, index) in result.soals"
                :key="soal.id"
                @click="goToSoal(index)"
                class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                :class="{
                  'ring-2 ring-teal-500 ring-offset-1': index === currentSoalIndex,
                  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200': soal.isCorrect === true,
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
