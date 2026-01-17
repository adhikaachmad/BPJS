<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const submitting = ref(false)

const sessionId = ref(null)
const periodeId = ref(null)
const periodeName = ref('')
const soals = ref([])
const jawabans = ref({}) // { soalId: 'A'|'B'|'C'|'D' }

const currentSoalIndex = ref(0)
const showConfirmSubmit = ref(false)

const currentSoal = computed(() => soals.value[currentSoalIndex.value] || null)
const isFirstSoal = computed(() => currentSoalIndex.value === 0)
const isLastSoal = computed(() => currentSoalIndex.value === soals.value.length - 1)
const answeredCount = computed(() => Object.values(jawabans.value).filter(j => j).length)
const unansweredCount = computed(() => soals.value.length - answeredCount.value)

onMounted(async () => {
  await startTest()
})

// Warn before leaving
onBeforeUnmount(() => {
  // Clean up if needed
})

async function startTest() {
  loading.value = true
  error.value = null

  try {
    const response = await api.post(`/periode/user/${route.params.periodeId}/test/start`)

    sessionId.value = response.data.sessionId
    periodeId.value = response.data.periodeId
    periodeName.value = response.data.periodeName
    soals.value = response.data.soals

    // Load existing answers
    if (response.data.jawabans) {
      for (const j of response.data.jawabans) {
        jawabans.value[j.soalPeriodeId] = j.jawaban
      }
    }
  } catch (err) {
    if (err.response?.data?.error) {
      error.value = err.response.data.message || err.response.data.error
    } else {
      error.value = 'Gagal memulai test'
    }
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function selectAnswer(option) {
  if (!currentSoal.value) return

  const soalId = currentSoal.value.id
  const prevAnswer = jawabans.value[soalId]

  // Update locally first for immediate feedback
  jawabans.value[soalId] = option

  try {
    await api.post(`/periode/user/${periodeId.value}/test/answer`, {
      soalPeriodeId: soalId,
      jawaban: option
    })
  } catch (err) {
    console.error('Failed to save answer:', err)
    // Revert on error
    jawabans.value[soalId] = prevAnswer
  }
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

function openConfirmSubmit() {
  showConfirmSubmit.value = true
}

function closeConfirmSubmit() {
  showConfirmSubmit.value = false
}

async function submitTest() {
  submitting.value = true

  try {
    const response = await api.post(`/periode/user/${periodeId.value}/test/submit`)

    // Redirect to result page
    router.push(`/periode/${periodeId.value}/result`)
  } catch (err) {
    console.error('Failed to submit test:', err)
    alert(err.response?.data?.error || 'Gagal submit test')
  } finally {
    submitting.value = false
    showConfirmSubmit.value = false
  }
}

function goBack() {
  if (confirm('Yakin ingin keluar? Jawaban yang sudah disimpan akan tetap tersimpan.')) {
    router.back()
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat soal...</p>
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
        <button @click="router.back()" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Kembali
        </button>
      </div>
    </div>

    <!-- Quiz Interface -->
    <template v-else>
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button @click="goBack" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div class="h-8 w-px bg-gray-200"></div>
              <div>
                <p class="text-sm text-gray-500">Test Periode</p>
                <h1 class="text-lg font-bold text-gray-900">{{ periodeName }}</h1>
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <div class="text-right">
                <p class="text-sm text-gray-500">Progress</p>
                <p class="text-lg font-bold text-blue-600">{{ answeredCount }} / {{ soals.length }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Progress Bar -->
      <div class="bg-white border-b border-gray-200 sticky top-[73px] z-10">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">
              Soal {{ currentSoalIndex + 1 }} dari {{ soals.length }}
            </span>
            <span class="text-sm font-medium text-blue-600">
              {{ Math.round(((currentSoalIndex + 1) / soals.length) * 100) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${((currentSoalIndex + 1) / soals.length) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Soal Card -->
        <div v-if="currentSoal" class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <!-- Soal Header -->
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-lg">
                Soal {{ currentSoalIndex + 1 }}
              </span>
              <span v-if="jawabans[currentSoal.id]" class="inline-flex items-center text-white/80 text-sm">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Dijawab
              </span>
            </div>
          </div>

          <!-- Pertanyaan -->
          <div class="p-6">
            <p class="text-lg text-gray-800 mb-6 leading-relaxed">{{ currentSoal.pertanyaan }}</p>

            <!-- Options -->
            <div class="space-y-3">
              <button
                v-for="(option, key) in { A: currentSoal.opsiA, B: currentSoal.opsiB, C: currentSoal.opsiC, D: currentSoal.opsiD }"
                :key="key"
                @click="selectAnswer(key)"
                class="w-full p-4 text-left rounded-xl border-2 transition-all duration-200"
                :class="{
                  'border-blue-500 bg-blue-50': jawabans[currentSoal.id] === key,
                  'border-gray-200 hover:border-blue-300 hover:bg-gray-50': jawabans[currentSoal.id] !== key
                }"
              >
                <div class="flex items-start">
                  <span
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 transition-colors"
                    :class="{
                      'bg-blue-600 text-white': jawabans[currentSoal.id] === key,
                      'bg-gray-100 text-gray-600': jawabans[currentSoal.id] !== key
                    }"
                  >
                    {{ key }}
                  </span>
                  <span class="text-gray-700 pt-2">{{ option }}</span>
                </div>
              </button>
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
            @click="openConfirmSubmit"
            class="flex items-center px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Selesai & Submit
          </button>

          <button
            v-else
            @click="nextSoal"
            class="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
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
              v-for="(soal, index) in soals"
              :key="soal.id"
              @click="goToSoal(index)"
              class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
              :class="{
                'bg-blue-600 text-white ring-2 ring-blue-300': index === currentSoalIndex,
                'bg-emerald-100 text-emerald-700 hover:bg-emerald-200': jawabans[soal.id] && index !== currentSoalIndex,
                'bg-gray-100 text-gray-600 hover:bg-gray-200': !jawabans[soal.id] && index !== currentSoalIndex
              }"
            >
              {{ index + 1 }}
            </button>
          </div>

          <div class="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-100">
            <div class="flex items-center text-sm text-gray-500">
              <span class="w-4 h-4 bg-emerald-100 rounded mr-2"></span>
              Sudah dijawab
            </div>
            <div class="flex items-center text-sm text-gray-500">
              <span class="w-4 h-4 bg-gray-100 rounded mr-2"></span>
              Belum dijawab
            </div>
            <div class="flex items-center text-sm text-gray-500">
              <span class="w-4 h-4 bg-blue-600 rounded mr-2"></span>
              Soal sekarang
            </div>
          </div>
        </div>
      </main>
    </template>

    <!-- Confirm Submit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showConfirmSubmit"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeConfirmSubmit"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

          <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">Konfirmasi Submit</h3>
              <p class="text-gray-500 mt-2">Apakah Anda yakin ingin menyelesaikan test ini?</p>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <div class="flex justify-between mb-2">
                <span class="text-gray-600">Total Soal</span>
                <span class="font-bold text-gray-900">{{ soals.length }}</span>
              </div>
              <div class="flex justify-between mb-2">
                <span class="text-emerald-600">Sudah Dijawab</span>
                <span class="font-bold text-emerald-600">{{ answeredCount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-red-600">Belum Dijawab</span>
                <span class="font-bold text-red-600">{{ unansweredCount }}</span>
              </div>
            </div>

            <div v-if="unansweredCount > 0" class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <p class="text-amber-700 text-sm flex items-center">
                <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Masih ada {{ unansweredCount }} soal yang belum dijawab!
              </p>
            </div>

            <div class="flex space-x-3">
              <button
                @click="closeConfirmSubmit"
                class="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                @click="submitTest"
                :disabled="submitting"
                class="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                <span v-if="submitting" class="flex items-center justify-center">
                  <svg class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                </span>
                <span v-else>Ya, Submit</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
