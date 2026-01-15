<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const modul = ref(null)
const materis = ref([])
const progress = ref({ isCompleted: false })
const loading = ref(true)
const error = ref(null)
const currentMateriIndex = ref(0)
const completing = ref(false)

const currentMateri = computed(() => materis.value[currentMateriIndex.value] || null)
const isLastMateri = computed(() => currentMateriIndex.value === materis.value.length - 1)
const isFirstMateri = computed(() => currentMateriIndex.value === 0)

onMounted(async () => {
  try {
    const response = await api.get(`/materi/modul/${route.params.modulId}`)
    modul.value = response.data.modul
    materis.value = response.data.materis
    progress.value = response.data.progress

    // Verify this is a KUPAS_TUNTAS modul
    if (modul.value.tipe !== 'KUPAS_TUNTAS') {
      error.value = 'Modul ini bukan modul materi'
      return
    }
  } catch (err) {
    if (err.response?.status === 403) {
      error.value = 'Anda tidak memiliki akses ke modul ini'
    } else {
      error.value = 'Gagal memuat materi'
    }
    console.error(err)
  } finally {
    loading.value = false
  }
})

function nextMateri() {
  if (!isLastMateri.value) {
    currentMateriIndex.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevMateri() {
  if (!isFirstMateri.value) {
    currentMateriIndex.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToMateri(index) {
  currentMateriIndex.value = index
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function completeMateri() {
  completing.value = true
  try {
    await api.post(`/materi/complete/${modul.value.id}`)
    progress.value.isCompleted = true
    progress.value.completedAt = new Date().toISOString()
  } catch (err) {
    console.error(err)
    alert('Gagal menandai materi sebagai selesai')
  } finally {
    completing.value = false
  }
}

function goToJitu() {
  // Find JITU modul in same sub-kategori
  router.push(`/sub-kategori/${modul.value.subKategoriId}`)
}

function goBack() {
  router.push(`/sub-kategori/${modul.value.subKategoriId}`)
}

function getYoutubeEmbedUrl(url) {
  if (!url) return null
  // Handle various YouTube URL formats
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`
  }
  return url
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat materi...</p>
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
      <header class="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg">
        <div class="max-w-5xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div>
              <button @click="goBack" class="flex items-center text-white/80 hover:text-white mb-2 transition-colors">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali
              </button>
              <h1 class="text-2xl font-bold">{{ modul?.nama }}</h1>
              <p class="text-white/80 text-sm mt-1">{{ modul?.deskripsi }}</p>
            </div>

            <!-- Progress Badge -->
            <div v-if="progress.isCompleted" class="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div class="flex items-center text-emerald-200">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Selesai
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Progress Bar -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-5xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-600">
              Materi {{ currentMateriIndex + 1 }} dari {{ materis.length }}
            </span>
            <span class="text-sm text-gray-500">
              {{ Math.round(((currentMateriIndex + 1) / materis.length) * 100) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${((currentMateriIndex + 1) / materis.length) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Materi Content -->
      <main class="max-w-5xl mx-auto px-4 py-8">
        <div v-if="currentMateri" class="bg-white rounded-2xl shadow-lg overflow-hidden">
          <!-- Materi Title -->
          <div class="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-violet-100">
            <h2 class="text-xl font-bold text-gray-800">{{ currentMateri.judul }}</h2>
          </div>

          <!-- Video Section -->
          <div v-if="currentMateri.videoUrl" class="aspect-video bg-black">
            <iframe
              :src="getYoutubeEmbedUrl(currentMateri.videoUrl)"
              class="w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>

          <!-- PDF Section -->
          <div v-if="currentMateri.pdfUrl" class="p-4 bg-gray-50 border-b">
            <a
              :href="currentMateri.pdfUrl"
              target="_blank"
              class="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </a>
          </div>

          <!-- Content -->
          <div class="p-6 prose prose-lg max-w-none" v-html="currentMateri.konten"></div>
        </div>

        <!-- Navigation Dots -->
        <div class="flex justify-center mt-6 space-x-2">
          <button
            v-for="(materi, index) in materis"
            :key="materi.id"
            @click="goToMateri(index)"
            class="w-3 h-3 rounded-full transition-all"
            :class="index === currentMateriIndex
              ? 'bg-violet-500 scale-125'
              : 'bg-gray-300 hover:bg-gray-400'"
          ></button>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-between mt-8">
          <button
            @click="prevMateri"
            :disabled="isFirstMateri"
            class="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Sebelumnya
          </button>

          <div v-if="isLastMateri && !progress.isCompleted">
            <button
              @click="completeMateri"
              :disabled="completing"
              class="flex items-center px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              <svg v-if="completing" class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Selesai Baca Materi
            </button>
          </div>

          <div v-else-if="isLastMateri && progress.isCompleted">
            <button
              @click="goToJitu"
              class="flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
            >
              Lanjut ke Quiz JITU
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <button
            v-else
            @click="nextMateri"
            class="flex items-center px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all"
          >
            Selanjutnya
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Materi List (Accordion) -->
        <div class="mt-12">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Daftar Materi</h3>
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden divide-y divide-gray-100">
            <button
              v-for="(materi, index) in materis"
              :key="materi.id"
              @click="goToMateri(index)"
              class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              :class="index === currentMateriIndex ? 'bg-violet-50' : ''"
            >
              <div class="flex items-center">
                <span
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4"
                  :class="index === currentMateriIndex
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-100 text-gray-600'"
                >
                  {{ index + 1 }}
                </span>
                <span class="font-medium" :class="index === currentMateriIndex ? 'text-violet-600' : 'text-gray-700'">
                  {{ materi.judul }}
                </span>
              </div>
              <svg
                v-if="index === currentMateriIndex"
                class="w-5 h-5 text-violet-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
.prose img {
  @apply rounded-lg shadow-md mx-auto;
}

.prose h1, .prose h2, .prose h3 {
  @apply text-gray-800;
}

.prose p {
  @apply text-gray-600 leading-relaxed;
}

.prose ul, .prose ol {
  @apply text-gray-600;
}

.prose a {
  @apply text-violet-600 hover:text-violet-700;
}
</style>
