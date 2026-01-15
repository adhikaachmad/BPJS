<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuizStore } from '@/stores/quiz'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const quizStore = useQuizStore()

const modul = ref(null)
const loading = ref(true)
const starting = ref(false)
const error = ref(null)

onMounted(async () => {
  try {
    const response = await api.get(`/modul/${route.params.modulId}`)
    modul.value = response.data
  } catch (err) {
    error.value = 'Gagal memuat data modul'
  } finally {
    loading.value = false
  }
})

async function startTest() {
  starting.value = true
  error.value = null

  try {
    const result = await quizStore.startTest(modul.value.id)

    if (result.success) {
      router.push(`/quiz/${result.sessionId}`)
    } else {
      error.value = result.error
    }
  } catch (err) {
    error.value = 'Gagal memulai test'
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-3xl mx-auto px-4">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error && !modul" class="text-center py-20">
        <p class="text-red-500 mb-4">{{ error }}</p>
        <button @click="$router.go(0)" class="btn-primary">Coba Lagi</button>
      </div>

      <template v-else>
        <!-- Back Button -->
        <button
          @click="$router.back()"
          class="flex items-center text-gray-600 hover:text-bpjs-600 mb-6 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali
        </button>

        <!-- Modul Card -->
        <div class="card">
          <div class="text-center mb-8">
            <div class="inline-flex items-center px-4 py-2 bg-bpjs-100 text-bpjs-700 rounded-full text-sm font-medium mb-4">
              {{ modul.subKategori?.kategori?.nama }} - {{ modul.subKategori?.nama }}
            </div>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">{{ modul.nama }}</h1>
            <p class="text-gray-600">{{ modul.deskripsi }}</p>
          </div>

          <!-- Info Cards -->
          <div class="grid grid-cols-2 gap-4 mb-8">
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <div class="w-12 h-12 mx-auto bg-bpjs-100 rounded-xl flex items-center justify-center mb-2">
                <svg class="w-6 h-6 text-bpjs-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-gray-800">{{ modul._count?.soals || 0 }}</p>
              <p class="text-sm text-gray-500">Soal</p>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <div class="w-12 h-12 mx-auto bg-bpjs-100 rounded-xl flex items-center justify-center mb-2">
                <svg class="w-6 h-6 text-bpjs-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-gray-800">{{ modul.durasi }}</p>
              <p class="text-sm text-gray-500">Menit</p>
            </div>
          </div>

          <!-- Instructions -->
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <h3 class="font-semibold text-amber-800 mb-2 flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Petunjuk Pengerjaan
            </h3>
            <ul class="text-amber-700 text-sm space-y-1">
              <li>- Baca setiap soal dengan teliti sebelum menjawab</li>
              <li>- Jawaban akan tersimpan otomatis setiap 3 detik</li>
              <li>- Anda dapat berpindah antar soal dengan bebas</li>
              <li>- Pastikan semua soal sudah dijawab sebelum submit</li>
              <li>- Waktu akan berjalan otomatis setelah test dimulai</li>
            </ul>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p class="text-red-600 text-sm">{{ error }}</p>
          </div>

          <!-- Start Button -->
          <button
            @click="startTest"
            :disabled="starting || modul._count?.soals === 0"
            class="w-full btn-primary flex items-center justify-center text-lg py-4"
          >
            <span v-if="starting" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Mempersiapkan Test...
            </span>
            <span v-else-if="modul._count?.soals === 0">
              Tidak Ada Soal
            </span>
            <span v-else class="flex items-center">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mulai Test
            </span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
