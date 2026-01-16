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
  <div class="min-h-screen bg-gray-100">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat soal...</p>
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
        <button @click="router.back()" class="btn-primary">Kembali</button>
      </div>
    </div>

    <!-- Quiz Interface -->
    <template v-else>
      <!-- Header -->
      <header class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg sticky top-0 z-20">
        <div class="max-w-5xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <button @click="goBack" class="flex items-center text-white/80 hover:text-white transition-colors mb-1">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Keluar
              </button>
              <h1 class="text-xl font-bold">Test {{ periodeName }}</h1>
            </div>

            <div class="text-right">
              <p class="text-sm opacity-80">Dijawab</p>
              <p class="text-2xl font-bold">{{ answeredCount }} / {{ soals.length }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Progress Bar -->
      <div class="bg-white border-b border-gray-200 sticky top-[76px] z-10">
        <div class="max-w-5xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-600">
              Soal {{ currentSoalIndex + 1 }} dari {{ soals.length }}
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
      <main class="max-w-5xl mx-auto px-4 py-8">
        <!-- Soal Card -->
        <div v-if="currentSoal" class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <!-- Soal Header -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
            <span class="inline-block px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-full">
              Soal {{ currentSoalIndex + 1 }}
            </span>
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
                  'border-blue-500 bg-blue-50 text-blue-700': jawabans[currentSoal.id] === key,
                  'border-gray-200 hover:border-blue-300 hover:bg-gray-50': jawabans[currentSoal.id] !== key
                }"
              >
                <div class="flex items-start">
                  <span
                    class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0"
                    :class="{
                      'bg-blue-500 text-white': jawabans[currentSoal.id] === key,
                      'bg-gray-200 text-gray-600': jawabans[currentSoal.id] !== key
                    }"
                  >
                    {{ key }}
                  </span>
                  <span class="text-gray-700">{{ option }}</span>
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
            class="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Sebelumnya
          </button>

          <button
            v-if="isLastSoal"
            @click="openConfirmSubmit"
            class="flex items-center px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Selesai & Submit
          </button>

          <button
            v-else
            @click="nextSoal"
            class="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
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
              v-for="(soal, index) in soals"
              :key="soal.id"
              @click="goToSoal(index)"
              class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
              :class="{
                'bg-blue-500 text-white': index === currentSoalIndex,
                'bg-emerald-100 text-emerald-700 hover:bg-emerald-200': jawabans[soal.id] && index !== currentSoalIndex,
                'bg-gray-100 text-gray-600 hover:bg-gray-200': !jawabans[soal.id] && index !== currentSoalIndex
              }"
            >
              {{ index + 1 }}
            </button>
          </div>

          <div class="flex items-center justify-center space-x-6 mt-4 text-sm text-gray-500">
            <div class="flex items-center">
              <span class="w-4 h-4 bg-emerald-100 rounded mr-2"></span>
              Sudah dijawab
            </div>
            <div class="flex items-center">
              <span class="w-4 h-4 bg-gray-100 rounded mr-2"></span>
              Belum dijawab
            </div>
            <div class="flex items-center">
              <span class="w-4 h-4 bg-blue-500 rounded mr-2"></span>
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
          <div class="absolute inset-0 bg-black/50"></div>

          <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">Konfirmasi Submit</h3>

            <div class="mb-6">
              <p class="text-gray-600 mb-4">Apakah Anda yakin ingin menyelesaikan test ini?</p>

              <div class="bg-gray-50 rounded-xl p-4">
                <div class="flex justify-between mb-2">
                  <span class="text-gray-600">Total Soal</span>
                  <span class="font-bold">{{ soals.length }}</span>
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

              <p v-if="unansweredCount > 0" class="text-amber-600 text-sm mt-3">
                Perhatian: Masih ada {{ unansweredCount }} soal yang belum dijawab!
              </p>
            </div>

            <div class="flex space-x-3">
              <button
                @click="closeConfirmSubmit"
                class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                @click="submitTest"
                :disabled="submitting"
                class="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
              >
                <span v-if="submitting">Menyimpan...</span>
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
