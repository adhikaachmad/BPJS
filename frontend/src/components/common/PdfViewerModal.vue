<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  pdfUrl: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: 'PDF Viewer'
  }
})

const emit = defineEmits(['close'])

const loading = ref(true)
const error = ref(false)
const errorMessage = ref('')
const blobUrl = ref(null)

// Load PDF document
async function loadPdf() {
  if (!props.pdfUrl) return

  loading.value = true
  error.value = false
  errorMessage.value = ''

  // Cleanup previous blob URL
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = null
  }

  try {
    // Extract filename from pdfUrl
    let filename = props.pdfUrl
    if (filename.includes('/')) {
      filename = filename.split('/').pop()
    }

    console.log('Loading PDF:', filename)

    // Use POST endpoint with base64 response
    const response = await fetch('/api/upload/pdf/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Gagal mengambil PDF`)
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error('Data PDF tidak valid')
    }

    // Convert base64 to Blob
    const binaryString = atob(result.data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/pdf' })

    // Create blob URL
    blobUrl.value = URL.createObjectURL(blob)

    console.log('PDF loaded, blob URL created')
    loading.value = false
  } catch (err) {
    console.error('Error loading PDF:', err)
    error.value = true
    errorMessage.value = err.message || 'Gagal memuat PDF'
    loading.value = false
  }
}

function closeModal() {
  emit('close')
  // Cleanup blob URL
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = null
  }
}

// Load PDF when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadPdf()
  } else {
    if (blobUrl.value) {
      URL.revokeObjectURL(blobUrl.value)
      blobUrl.value = null
    }
  }
})

// Prevent body scroll when modal is open
watch(() => props.show, (newVal) => {
  document.body.style.overflow = newVal ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

        <!-- Modal Content -->
        <div class="relative w-full max-w-6xl h-[95vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div class="flex items-center">
              <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 class="text-lg font-bold">{{ title }}</h3>
            </div>

            <!-- Close Button -->
            <button
              @click="closeModal"
              class="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Tutup"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- PDF Viewer Area -->
          <div class="flex-1 bg-gray-200 relative">
            <!-- Loading State -->
            <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-700 z-10">
              <div class="text-center text-white">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Memuat PDF...</p>
              </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="absolute inset-0 flex items-center justify-center bg-gray-700 z-10">
              <div class="text-center text-white">
                <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-lg font-medium mb-2">Gagal memuat PDF</p>
                <p class="text-gray-400 text-sm">{{ errorMessage }}</p>
              </div>
            </div>

            <!-- PDF iframe -->
            <iframe
              v-else-if="blobUrl"
              :src="blobUrl + '#toolbar=0&navpanes=0'"
              class="w-full h-full border-0"
              title="PDF Viewer"
            ></iframe>
          </div>

          <!-- Footer -->
          <div class="px-6 py-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
            <div class="flex items-center text-sm text-gray-500">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Gunakan scroll atau zoom di viewer untuk navigasi</span>
            </div>
            <button
              @click="closeModal"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
