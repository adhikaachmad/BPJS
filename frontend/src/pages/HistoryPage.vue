<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const history = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await api.get('/test/history')
    history.value = response.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})

function getGradeColor(skor) {
  if (skor >= 90) return 'bg-green-100 text-green-700'
  if (skor >= 80) return 'bg-blue-100 text-blue-700'
  if (skor >= 70) return 'bg-yellow-100 text-yellow-700'
  if (skor >= 60) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function viewResult(sessionId) {
  router.push(`/result/${sessionId}`)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Riwayat Test</h1>
      <p class="text-gray-600 mb-8">Lihat semua hasil test yang telah Anda selesaikan</p>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="history.length === 0" class="text-center py-20">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-1">Belum Ada Riwayat</h3>
        <p class="text-gray-500 mb-4">Anda belum menyelesaikan test apapun</p>
        <router-link to="/" class="btn-primary">Mulai Test</router-link>
      </div>

      <!-- History List -->
      <div v-else class="space-y-4">
        <div
          v-for="item in history"
          :key="item.id"
          class="card hover:shadow-lg cursor-pointer transition-shadow"
          @click="viewResult(item.id)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 gradient-bpjs rounded-xl flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <div>
                <h3 class="font-semibold text-gray-800">{{ item.modul?.nama }}</h3>
                <p class="text-sm text-gray-500">
                  {{ item.modul?.subKategori?.kategori?.nama }} - {{ item.modul?.subKategori?.nama }}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  {{ new Date(item.endTime).toLocaleString('id-ID') }}
                </p>
              </div>
            </div>

            <div class="text-right">
              <div
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold"
                :class="getGradeColor(item.hasilTest?.skor || 0)"
              >
                {{ (item.hasilTest?.skor || 0).toFixed(0) }}%
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ item.hasilTest?.benar }}/{{ item.hasilTest?.totalSoal }} benar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
