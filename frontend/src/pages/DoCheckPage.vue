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
const currentIndex = ref(0)
const showAllAnswers = ref(false)

const currentReview = computed(() => data.value?.review[currentIndex.value] || null)
const isLastQuestion = computed(() => currentIndex.value === (data.value?.review.length || 0) - 1)
const isFirstQuestion = computed(() => currentIndex.value === 0)

const stats = computed(() => {
  if (!data.value?.review) return { benar: 0, salah: 0, total: 0 }
  const benar = data.value.review.filter(r => r.isCorrect).length
  return {
    benar,
    salah: data.value.review.length - benar,
    total: data.value.review.length
  }
})

onMounted(async () => {
  try {
    const sessionId = route.params.sessionId
    const response = await api.get(`/test/docheck/${sessionId}`)
    data.value = response.data
  } catch (err) {
    if (err.response?.status === 404) {
      error.value = 'Session tidak ditemukan atau Anda belum menyelesaikan quiz'
    } else {
      error.value = 'Gagal memuat data koreksi'
    }
    console.error(err)
  } finally {
    loading.value = false
  }
})

function nextQuestion() {
  if (!isLastQuestion.value) {
    currentIndex.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevQuestion() {
  if (!isFirstQuestion.value) {
    currentIndex.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToQuestion(index) {
  currentIndex.value = index
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goBack() {
  if (data.value?.modul?.subKategoriId) {
    router.push(`/sub-kategori/${data.value.modul.subKategoriId}`)
  } else {
    router.push('/')
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat koreksi...</p>
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
        <button @click="$router.go(-1)" class="btn-primary">Kembali</button>
      </div>
    </div>

    <template v-else>
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
              <h1 class="text-2xl font-bold">DO-CHECK</h1>
              <p class="text-white/80 text-sm mt-1">
                Koreksi Jawaban {{ data?.modul?.nama }}
              </p>
            </div>

            <!-- Score Badge -->
            <div class="bg-white/20 rounded-xl px-6 py-3 text-center backdrop-blur-sm">
              <p class="text-3xl font-bold">{{ data?.hasilTest?.skor?.toFixed(1) }}%</p>
              <p class="text-sm text-white/80">Skor Anda</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Summary Stats -->
      <div class="bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-5xl mx-auto px-4 py-4">
          <div class="grid grid-cols-3 gap-4 text-center">
            <div class="bg-emerald-50 rounded-xl p-3">
              <p class="text-2xl font-bold text-emerald-600">{{ stats.benar }}</p>
              <p class="text-sm text-emerald-700">Benar</p>
            </div>
            <div class="bg-red-50 rounded-xl p-3">
              <p class="text-2xl font-bold text-red-600">{{ stats.salah }}</p>
              <p class="text-sm text-red-700">Salah</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-2xl font-bold text-gray-600">{{ stats.total }}</p>
              <p class="text-sm text-gray-700">Total Soal</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Toggle View -->
      <div class="max-w-5xl mx-auto px-4 py-4">
        <div class="flex justify-end">
          <button
            @click="showAllAnswers = !showAllAnswers"
            class="flex items-center px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {{ showAllAnswers ? 'Tampilan Satu Per Satu' : 'Lihat Semua' }}
          </button>
        </div>
      </div>

      <!-- Single Question View -->
      <main v-if="!showAllAnswers" class="max-w-5xl mx-auto px-4 pb-8">
        <div v-if="currentReview" class="bg-white rounded-2xl shadow-lg overflow-hidden">
          <!-- Question Header -->
          <div
            class="px-6 py-4 border-b"
            :class="currentReview.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <span
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4"
                  :class="currentReview.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'"
                >
                  {{ currentReview.nomor }}
                </span>
                <span
                  class="px-3 py-1 rounded-full text-sm font-medium"
                  :class="currentReview.isCorrect
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'"
                >
                  {{ currentReview.isCorrect ? 'Benar' : 'Salah' }}
                </span>
              </div>
              <span class="text-sm text-gray-500">
                Soal {{ currentIndex + 1 }} dari {{ data?.review.length }}
              </span>
            </div>
          </div>

          <!-- Question Content -->
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-800 mb-6">{{ currentReview.pertanyaan }}</h3>

            <!-- Options -->
            <div class="space-y-3">
              <div
                v-for="opsi in currentReview.opsis"
                :key="opsi.id"
                class="p-4 rounded-xl border-2 transition-all"
                :class="{
                  'border-emerald-500 bg-emerald-50': opsi.isCorrect,
                  'border-red-500 bg-red-50': opsi.isSelected && !opsi.isCorrect,
                  'border-gray-200 bg-gray-50': !opsi.isCorrect && !opsi.isSelected
                }"
              >
                <div class="flex items-start">
                  <div
                    class="w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0"
                    :class="{
                      'bg-emerald-500 text-white': opsi.isCorrect,
                      'bg-red-500 text-white': opsi.isSelected && !opsi.isCorrect,
                      'bg-gray-300 text-gray-600': !opsi.isCorrect && !opsi.isSelected
                    }"
                  >
                    <svg v-if="opsi.isCorrect" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else-if="opsi.isSelected" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p
                      class="font-medium"
                      :class="{
                        'text-emerald-700': opsi.isCorrect,
                        'text-red-700': opsi.isSelected && !opsi.isCorrect,
                        'text-gray-600': !opsi.isCorrect && !opsi.isSelected
                      }"
                    >
                      {{ opsi.teks }}
                    </p>
                    <div class="flex items-center mt-1 text-sm">
                      <span v-if="opsi.isCorrect" class="text-emerald-600">Jawaban Benar</span>
                      <span v-if="opsi.isSelected" class="text-gray-500 ml-2">
                        (Jawaban Anda)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pembahasan -->
            <div v-if="currentReview.pembahasan" class="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div class="flex items-start">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold text-blue-800 mb-1">Pembahasan</h4>
                  <p class="text-blue-700">{{ currentReview.pembahasan }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-between mt-8">
          <button
            @click="prevQuestion"
            :disabled="isFirstQuestion"
            class="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Sebelumnya
          </button>

          <button
            v-if="!isLastQuestion"
            @click="nextQuestion"
            class="flex items-center px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all"
          >
            Selanjutnya
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            v-else
            @click="goBack"
            class="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
          >
            Selesai Review
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <!-- Question Navigator -->
        <div class="mt-8">
          <h3 class="text-sm font-medium text-gray-600 mb-3">Navigasi Soal</h3>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(review, index) in data?.review"
              :key="review.soalId"
              @click="goToQuestion(index)"
              class="w-10 h-10 rounded-lg font-medium text-sm transition-all"
              :class="{
                'ring-2 ring-offset-2': index === currentIndex,
                'bg-emerald-500 text-white ring-emerald-500': review.isCorrect,
                'bg-red-500 text-white ring-red-500': !review.isCorrect
              }"
            >
              {{ index + 1 }}
            </button>
          </div>
        </div>
      </main>

      <!-- All Questions View -->
      <main v-else class="max-w-5xl mx-auto px-4 pb-8">
        <div class="space-y-6">
          <div
            v-for="review in data?.review"
            :key="review.soalId"
            class="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <!-- Question Header -->
            <div
              class="px-6 py-4 border-b flex items-center"
              :class="review.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'"
            >
              <span
                class="w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 text-sm"
                :class="review.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'"
              >
                {{ review.nomor }}
              </span>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="review.isCorrect
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'"
              >
                {{ review.isCorrect ? 'Benar' : 'Salah' }}
              </span>
            </div>

            <!-- Question Content -->
            <div class="p-6">
              <h3 class="font-medium text-gray-800 mb-4">{{ review.pertanyaan }}</h3>

              <div class="space-y-2">
                <div
                  v-for="opsi in review.opsis"
                  :key="opsi.id"
                  class="p-3 rounded-lg text-sm"
                  :class="{
                    'bg-emerald-50 border border-emerald-200': opsi.isCorrect,
                    'bg-red-50 border border-red-200': opsi.isSelected && !opsi.isCorrect,
                    'bg-gray-50 border border-gray-100': !opsi.isCorrect && !opsi.isSelected
                  }"
                >
                  <span :class="opsi.isCorrect ? 'text-emerald-700' : opsi.isSelected ? 'text-red-700' : 'text-gray-600'">
                    {{ opsi.teks }}
                  </span>
                  <span v-if="opsi.isSelected" class="ml-2 text-xs text-gray-500">(Jawaban Anda)</span>
                </div>
              </div>

              <div v-if="review.pembahasan" class="mt-4 p-3 bg-blue-50 rounded-lg">
                <p class="text-sm text-blue-700">
                  <span class="font-semibold">Pembahasan:</span> {{ review.pembahasan }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 text-center">
          <button
            @click="goBack"
            class="inline-flex items-center px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all"
          >
            Kembali ke Sub Kategori
          </button>
        </div>
      </main>
    </template>
  </div>
</template>
