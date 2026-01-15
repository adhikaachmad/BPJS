<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import { useWebSocket } from '@/composables/useWebSocket'

const route = useRoute()
const router = useRouter()
const quizStore = useQuizStore()

const sessionId = route.params.sessionId
const { connected, lastSaved, connect, saveAnswer, updateProgress } = useWebSocket(sessionId)

const timeRemaining = ref(0)
const showSubmitModal = ref(false)
const submitting = ref(false)

let timerInterval = null

const formattedTime = computed(() => {
  const minutes = Math.floor(timeRemaining.value / 60)
  const seconds = timeRemaining.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

const isTimeWarning = computed(() => timeRemaining.value < 300) // Less than 5 minutes
const isTimeCritical = computed(() => timeRemaining.value < 60) // Less than 1 minute

onMounted(async () => {
  // Load session if not already loaded
  if (!quizStore.session || quizStore.session.id !== parseInt(sessionId)) {
    // Session should be loaded, but if not, redirect
    router.push('/')
    return
  }

  // Connect WebSocket
  connect()

  // Start timer
  const startTime = new Date(quizStore.session.startTime).getTime()
  const duration = quizStore.modul.durasi * 60 * 1000 // in milliseconds
  const endTime = startTime + duration

  const updateTimer = () => {
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
    timeRemaining.value = remaining

    if (remaining === 0) {
      // Auto submit when time is up
      handleSubmit(true)
    }
  }

  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

// Watch for answer changes and auto-save
watch(() => quizStore.jawabans, (newVal, oldVal) => {
  if (quizStore.currentSoal) {
    const soalId = quizStore.currentSoal.id
    const opsiId = newVal[soalId]
    if (opsiId && opsiId !== oldVal?.[soalId]) {
      saveAnswer(soalId, opsiId)
    }
  }
}, { deep: true })

// Watch for index changes
watch(() => quizStore.currentIndex, (newIndex) => {
  updateProgress(newIndex)
})

function selectOption(opsiId) {
  if (!quizStore.currentSoal) return
  quizStore.setAnswer(quizStore.currentSoal.id, opsiId)
}

function isSelected(opsiId) {
  if (!quizStore.currentSoal) return false
  return quizStore.jawabans[quizStore.currentSoal.id] === opsiId
}

function isAnswered(index) {
  const soal = quizStore.soals[index]
  return soal && quizStore.jawabans[soal.id]
}

async function handleSubmit(autoSubmit = false) {
  if (!autoSubmit && quizStore.answeredCount < quizStore.totalSoal) {
    showSubmitModal.value = true
    return
  }

  submitting.value = true

  const result = await quizStore.submitTest()

  if (result.success) {
    router.push(`/result/${sessionId}`)
  } else {
    alert(result.error || 'Gagal submit test')
  }

  submitting.value = false
}

function confirmSubmit() {
  showSubmitModal.value = false
  submitting.value = true
  quizStore.submitTest().then(result => {
    if (result.success) {
      router.push(`/result/${sessionId}`)
    } else {
      alert(result.error || 'Gagal submit test')
    }
    submitting.value = false
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <!-- Module Info -->
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 gradient-bpjs rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 class="font-bold text-gray-800">{{ quizStore.modul?.nama }}</h1>
              <p class="text-xs text-gray-500">{{ quizStore.modul?.subKategori?.nama }}</p>
            </div>
          </div>

          <!-- Timer -->
          <div
            class="flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-lg font-bold"
            :class="{
              'bg-gray-100 text-gray-700': !isTimeWarning,
              'bg-amber-100 text-amber-700': isTimeWarning && !isTimeCritical,
              'bg-red-100 text-red-700 animate-pulse': isTimeCritical
            }"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ formattedTime }}</span>
          </div>

          <!-- Connection Status -->
          <div class="flex items-center space-x-2">
            <div
              class="w-2 h-2 rounded-full"
              :class="connected ? 'bg-green-500' : 'bg-red-500'"
            ></div>
            <span class="text-xs text-gray-500">
              {{ connected ? 'Tersimpan' : 'Offline' }}
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-3">
          <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress: {{ quizStore.answeredCount }}/{{ quizStore.totalSoal }} soal</span>
            <span>{{ Math.round(quizStore.progress) }}%</span>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-bpjs-500 transition-all duration-300"
              :style="{ width: `${quizStore.progress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow py-6">
      <div class="max-w-4xl mx-auto px-4">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <!-- Question Card -->
          <div class="lg:col-span-3">
            <div class="card">
              <!-- Question Number -->
              <div class="flex items-center justify-between mb-6">
                <span class="px-3 py-1 bg-bpjs-100 text-bpjs-700 rounded-full text-sm font-medium">
                  Soal {{ quizStore.currentIndex + 1 }} dari {{ quizStore.totalSoal }}
                </span>
              </div>

              <!-- Question Text -->
              <h2 class="text-lg font-medium text-gray-800 mb-6">
                {{ quizStore.currentSoal?.pertanyaan }}
              </h2>

              <!-- Options -->
              <div class="space-y-3">
                <button
                  v-for="(opsi, index) in quizStore.currentSoal?.opsis"
                  :key="opsi.id"
                  @click="selectOption(opsi.id)"
                  class="w-full text-left p-4 rounded-xl border-2 transition-all duration-200"
                  :class="isSelected(opsi.id)
                    ? 'border-bpjs-500 bg-bpjs-50'
                    : 'border-gray-200 hover:border-bpjs-300 hover:bg-gray-50'"
                >
                  <div class="flex items-start">
                    <span
                      class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3"
                      :class="isSelected(opsi.id)
                        ? 'bg-bpjs-500 text-white'
                        : 'bg-gray-200 text-gray-600'"
                    >
                      {{ String.fromCharCode(65 + index) }}
                    </span>
                    <span class="pt-1">{{ opsi.teks }}</span>
                  </div>
                </button>
              </div>

              <!-- Navigation -->
              <div class="flex items-center justify-between mt-8 pt-6 border-t">
                <button
                  @click="quizStore.prevSoal()"
                  :disabled="quizStore.isFirstSoal"
                  class="flex items-center px-4 py-2 text-gray-600 hover:text-bpjs-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Sebelumnya
                </button>

                <button
                  v-if="quizStore.isLastSoal"
                  @click="handleSubmit()"
                  :disabled="submitting"
                  class="btn-primary"
                >
                  <span v-if="submitting">Mengirim...</span>
                  <span v-else>Submit Jawaban</span>
                </button>

                <button
                  v-else
                  @click="quizStore.nextSoal()"
                  class="flex items-center px-4 py-2 text-bpjs-600 hover:text-bpjs-700 font-medium"
                >
                  Selanjutnya
                  <svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Question Navigator -->
          <div class="lg:col-span-1">
            <div class="card sticky top-32">
              <h3 class="font-semibold text-gray-800 mb-4">Navigasi Soal</h3>
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="(soal, index) in quizStore.soals"
                  :key="soal.id"
                  @click="quizStore.goToSoal(index)"
                  class="w-10 h-10 rounded-lg font-medium text-sm transition-all"
                  :class="{
                    'bg-bpjs-500 text-white': quizStore.currentIndex === index,
                    'bg-bpjs-100 text-bpjs-700': isAnswered(index) && quizStore.currentIndex !== index,
                    'bg-gray-100 text-gray-600 hover:bg-gray-200': !isAnswered(index) && quizStore.currentIndex !== index
                  }"
                >
                  {{ index + 1 }}
                </button>
              </div>

              <div class="mt-6 pt-4 border-t">
                <div class="flex items-center justify-between text-sm mb-2">
                  <div class="flex items-center">
                    <div class="w-3 h-3 rounded bg-bpjs-100 mr-2"></div>
                    <span class="text-gray-600">Terjawab</span>
                  </div>
                  <span class="font-medium">{{ quizStore.answeredCount }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center">
                    <div class="w-3 h-3 rounded bg-gray-100 mr-2"></div>
                    <span class="text-gray-600">Belum</span>
                  </div>
                  <span class="font-medium">{{ quizStore.totalSoal - quizStore.answeredCount }}</span>
                </div>
              </div>

              <button
                @click="handleSubmit()"
                :disabled="submitting"
                class="w-full mt-6 btn-primary text-sm"
              >
                Submit Jawaban
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Submit Confirmation Modal -->
    <div
      v-if="showSubmitModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-2xl p-6 max-w-md w-full animate-fade-in">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">Konfirmasi Submit</h3>
          <p class="text-gray-600 mb-6">
            Anda masih memiliki {{ quizStore.totalSoal - quizStore.answeredCount }} soal yang belum dijawab.
            Apakah Anda yakin ingin submit?
          </p>
          <div class="flex space-x-3">
            <button
              @click="showSubmitModal = false"
              class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50"
            >
              Kembali
            </button>
            <button
              @click="confirmSubmit"
              class="flex-1 btn-primary"
            >
              Ya, Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
