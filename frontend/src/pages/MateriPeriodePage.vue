<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import PdfViewerModal from '@/components/common/PdfViewerModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const periode = ref(null)
const materis = ref([])
const progress = ref({ isCompleted: false })
const loading = ref(true)
const error = ref(null)
const currentMateriIndex = ref(0)
const completing = ref(false)

// PDF Viewer Modal
const showPdfModal = ref(false)
const currentPdfUrl = ref('')
const currentPdfTitle = ref('')

const currentMateri = computed(() => materis.value[currentMateriIndex.value] || null)
const isLastMateri = computed(() => currentMateriIndex.value === materis.value.length - 1)
const isFirstMateri = computed(() => currentMateriIndex.value === 0)

onMounted(async () => {
  await loadData()
})

async function loadData() {
  try {
    const periodeId = route.params.periodeId

    // Fetch periode with materi (using user endpoints)
    const [periodeRes, materiRes, progressRes] = await Promise.all([
      api.get(`/periode/user/${periodeId}`),
      api.get(`/periode/user/${periodeId}/materi`),
      api.get(`/periode/user/${periodeId}/materi-progress`).catch(() => ({ data: { isCompleted: false } }))
    ])

    periode.value = periodeRes.data
    materis.value = materiRes.data.sort((a, b) => a.urutan - b.urutan)
    progress.value = progressRes.data
  } catch (err) {
    if (err.response?.status === 403) {
      error.value = 'Anda tidak memiliki akses ke periode ini'
    } else if (err.response?.status === 404) {
      error.value = 'Periode tidak ditemukan'
    } else {
      error.value = 'Gagal memuat materi'
    }
    console.error(err)
  } finally {
    loading.value = false
  }
}

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
    await api.post(`/periode/user/${periode.value.id}/materi-progress/complete`)
    progress.value.isCompleted = true
    progress.value.completedAt = new Date().toISOString()
  } catch (err) {
    console.error(err)
    alert('Gagal menandai materi sebagai selesai')
  } finally {
    completing.value = false
  }
}

function goToQuiz() {
  // Navigate to quiz/test for this periode
  router.push(`/periode/${periode.value.id}/test`)
}

function goBack() {
  router.back()
}

function getYoutubeEmbedUrl(url) {
  if (!url) return null
  // Handle various YouTube URL formats
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`
  }
  // Handle Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  return url
}

function getVideoUrl(materi) {
  if (materi.videoType === 'url' && materi.videoUrl) {
    return getYoutubeEmbedUrl(materi.videoUrl)
  } else if (materi.videoType === 'upload' && materi.videoFile) {
    return materi.videoFile
  }
  return null
}

function isUploadedVideo(materi) {
  return materi.videoType === 'upload' && materi.videoFile
}

function openPdfViewer(materi) {
  currentPdfUrl.value = materi.pdfFile
  currentPdfTitle.value = materi.judul
  showPdfModal.value = true
}

function closePdfViewer() {
  showPdfModal.value = false
  currentPdfUrl.value = ''
  currentPdfTitle.value = ''
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat materi...</p>
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
        <button @click="goBack" class="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors">
          Kembali
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="materis.length === 0" class="flex flex-col justify-center items-center min-h-screen p-4">
      <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Belum Ada Materi</h3>
        <p class="text-gray-500 mb-6">Materi untuk periode ini belum tersedia</p>
        <button @click="goBack" class="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors">
          Kembali
        </button>
      </div>
    </div>

    <template v-else>
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
                <nav class="flex items-center text-sm text-gray-500 mb-0.5">
                  <span>{{ periode?.subKategori?.nama }}</span>
                  <svg class="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span class="text-gray-900 font-medium">Materi</span>
                </nav>
                <h1 class="text-xl font-bold text-gray-900">{{ periode?.nama }}</h1>
              </div>
            </div>

            <!-- Progress Badge -->
            <div v-if="progress.isCompleted" class="flex items-center px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg class="w-5 h-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium text-emerald-700">Selesai Dibaca</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Progress Bar -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">
              Materi {{ currentMateriIndex + 1 }} dari {{ materis.length }}
            </span>
            <span class="text-sm font-medium text-violet-600">
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
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="currentMateri" class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <!-- Materi Title -->
          <div class="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
            <h2 class="text-xl font-bold text-white">{{ currentMateri.judul }}</h2>
          </div>

          <!-- Video Section - Embedded (YouTube/Vimeo) -->
          <div v-if="getVideoUrl(currentMateri) && !isUploadedVideo(currentMateri)" class="aspect-video bg-black">
            <iframe
              :src="getVideoUrl(currentMateri)"
              class="w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>

          <!-- Video Section - Uploaded -->
          <div v-else-if="isUploadedVideo(currentMateri)" class="aspect-video bg-black">
            <video
              :src="currentMateri.videoFile"
              class="w-full h-full"
              controls
              controlsList="nodownload"
              oncontextmenu="return false;"
            >
              Browser Anda tidak mendukung video player.
            </video>
          </div>

          <!-- PDF Section -->
          <div v-if="currentMateri.pdfFile" class="p-4 bg-gray-50 border-b border-gray-200">
            <button
              type="button"
              @click.prevent.stop="openPdfViewer(currentMateri)"
              class="inline-flex items-center px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baca PDF
            </button>
          </div>

          <!-- Content -->
          <div class="p-6 prose prose-lg max-w-none" v-html="currentMateri.konten"></div>
        </div>

        <!-- Navigation Dots -->
        <div class="flex justify-center mt-8 space-x-2">
          <button
            v-for="(materi, index) in materis"
            :key="materi.id"
            @click="goToMateri(index)"
            class="w-3 h-3 rounded-full transition-all duration-200"
            :class="index === currentMateriIndex
              ? 'bg-violet-600 scale-125'
              : 'bg-gray-300 hover:bg-gray-400'"
          ></button>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-between mt-8">
          <button
            @click="prevMateri"
            :disabled="isFirstMateri"
            class="flex items-center px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all"
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
              class="flex items-center px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all"
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
              @click="goToQuiz"
              class="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
            >
              Lanjut ke Quiz
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <button
            v-else
            @click="nextMateri"
            class="flex items-center px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-all"
          >
            Selanjutnya
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Materi List -->
        <div class="mt-12">
          <h3 class="text-lg font-bold text-gray-900 mb-4">Daftar Materi</h3>
          <div class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <button
              v-for="(materi, index) in materis"
              :key="materi.id"
              @click="goToMateri(index)"
              class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              :class="index === currentMateriIndex ? 'bg-violet-50' : ''"
            >
              <div class="flex items-center">
                <span
                  class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mr-4 transition-colors"
                  :class="index === currentMateriIndex
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-600'"
                >
                  {{ index + 1 }}
                </span>
                <div>
                  <span class="font-medium" :class="index === currentMateriIndex ? 'text-violet-700' : 'text-gray-900'">
                    {{ materi.judul }}
                  </span>
                  <div class="flex items-center space-x-3 mt-1">
                    <span v-if="materi.videoUrl || materi.videoFile" class="inline-flex items-center text-xs text-gray-400">
                      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Video
                    </span>
                    <span v-if="materi.pdfFile" class="inline-flex items-center text-xs text-gray-400">
                      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </span>
                  </div>
                </div>
              </div>
              <svg
                v-if="index === currentMateriIndex"
                class="w-5 h-5 text-violet-600"
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

    <!-- PDF Viewer Modal -->
    <PdfViewerModal
      :show="showPdfModal"
      :pdf-url="currentPdfUrl"
      :title="currentPdfTitle"
      @close="closePdfViewer"
    />
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

/* Disable video download */
video::-webkit-media-controls-enclosure {
  overflow: hidden;
}

video::-webkit-media-controls-panel {
  width: calc(100% + 30px);
}
</style>
