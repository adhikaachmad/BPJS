<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const schedules = ref([])
const loading = ref(true)
const saving = ref(false)

const showJituModal = ref(false)
const showDocheckModal = ref(false)
const selectedSchedule = ref(null)

const jituForm = ref({
  isScheduled: false,
  jadwalMulai: '',
  jadwalSelesai: ''
})

const docheckForm = ref({
  publishDoCheck: ''
})

onMounted(async () => {
  await fetchSchedules()
})

async function fetchSchedules() {
  loading.value = true
  try {
    const response = await api.get('/admin/scheduling-overview')
    schedules.value = response.data
  } catch (err) {
    console.error(err)
    alert('Gagal memuat data jadwal')
  } finally {
    loading.value = false
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function toInputDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toISOString().slice(0, 16)
}

function getJituStatus(jitu) {
  if (!jitu) return { text: 'Tidak ada', class: 'bg-gray-100 text-gray-600' }
  if (!jitu.isScheduled) return { text: 'Tidak Terjadwal', class: 'bg-gray-100 text-gray-600' }

  const now = new Date()
  const mulai = jitu.jadwalMulai ? new Date(jitu.jadwalMulai) : null
  const selesai = jitu.jadwalSelesai ? new Date(jitu.jadwalSelesai) : null

  if (mulai && now < mulai) {
    return { text: 'Belum Mulai', class: 'bg-yellow-100 text-yellow-700' }
  }
  if (selesai && now > selesai) {
    return { text: 'Sudah Berakhir', class: 'bg-red-100 text-red-700' }
  }
  if (mulai && selesai) {
    return { text: 'Sedang Berlangsung', class: 'bg-emerald-100 text-emerald-700' }
  }
  return { text: 'Terjadwal', class: 'bg-blue-100 text-blue-700' }
}

function getDocheckStatus(docheck) {
  if (!docheck) return { text: 'Tidak ada', class: 'bg-gray-100 text-gray-600' }
  if (!docheck.publishDoCheck) return { text: 'Langsung Publish', class: 'bg-emerald-100 text-emerald-700' }

  const now = new Date()
  const publish = new Date(docheck.publishDoCheck)

  if (now < publish) {
    return { text: 'Menunggu Publish', class: 'bg-yellow-100 text-yellow-700' }
  }
  return { text: 'Sudah Publish', class: 'bg-emerald-100 text-emerald-700' }
}

function openJituModal(schedule) {
  selectedSchedule.value = schedule
  const jitu = schedule.jituModul
  jituForm.value = {
    isScheduled: jitu?.isScheduled || false,
    jadwalMulai: toInputDateTime(jitu?.jadwalMulai),
    jadwalSelesai: toInputDateTime(jitu?.jadwalSelesai)
  }
  showJituModal.value = true
}

function openDocheckModal(schedule) {
  selectedSchedule.value = schedule
  const docheck = schedule.docheckModul
  docheckForm.value = {
    publishDoCheck: toInputDateTime(docheck?.publishDoCheck)
  }
  showDocheckModal.value = true
}

async function saveJituSchedule() {
  if (!selectedSchedule.value?.jituModul) return

  saving.value = true
  try {
    await api.put(`/admin/scheduling/jitu/${selectedSchedule.value.jituModul.id}`, {
      isScheduled: jituForm.value.isScheduled,
      jadwalMulai: jituForm.value.jadwalMulai || null,
      jadwalSelesai: jituForm.value.jadwalSelesai || null
    })
    showJituModal.value = false
    await fetchSchedules()
  } catch (err) {
    console.error(err)
    alert('Gagal menyimpan jadwal')
  } finally {
    saving.value = false
  }
}

async function saveDocheckSchedule() {
  if (!selectedSchedule.value?.docheckModul) return

  saving.value = true
  try {
    await api.put(`/admin/scheduling/docheck/${selectedSchedule.value.docheckModul.id}`, {
      publishDoCheck: docheckForm.value.publishDoCheck || null
    })
    showDocheckModal.value = false
    await fetchSchedules()
  } catch (err) {
    console.error(err)
    alert('Gagal menyimpan jadwal')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <div class="p-6 lg:p-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Penjadwalan Quiz & Pembahasan</h1>
        <p class="text-gray-500 text-sm mt-1">Atur jadwal akses JITU dan waktu publish DO-CHECK</p>
      </div>

      <!-- Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-lg">Jadwal JITU</h3>
              <p class="text-white/80 text-sm mt-1">Atur waktu kapan quiz dapat diakses oleh user</p>
            </div>
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-lg">Publish DO-CHECK</h3>
              <p class="text-white/80 text-sm mt-1">Atur waktu kapan pembahasan dapat dilihat</p>
            </div>
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <!-- Schedule Table -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Sub Kategori</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Status JITU</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Jadwal JITU</th>
                <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Status DO-CHECK</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Publish DO-CHECK</th>
                <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="schedule in schedules" :key="schedule.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-medium text-gray-900">{{ schedule.nama }}</p>
                </td>
                <td class="px-6 py-4">
                  <span class="text-sm text-gray-600">{{ schedule.kategori }}</span>
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    :class="getJituStatus(schedule.jituModul).class"
                  >
                    {{ getJituStatus(schedule.jituModul).text }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div v-if="schedule.jituModul?.isScheduled" class="text-sm">
                    <p class="text-gray-600">
                      <span class="text-gray-400">Mulai:</span>
                      {{ formatDateTime(schedule.jituModul.jadwalMulai) }}
                    </p>
                    <p class="text-gray-600">
                      <span class="text-gray-400">Selesai:</span>
                      {{ formatDateTime(schedule.jituModul.jadwalSelesai) }}
                    </p>
                  </div>
                  <span v-else class="text-sm text-gray-400">Tidak terjadwal</span>
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    :class="getDocheckStatus(schedule.docheckModul).class"
                  >
                    {{ getDocheckStatus(schedule.docheckModul).text }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="text-sm text-gray-600">
                    {{ formatDateTime(schedule.docheckModul?.publishDoCheck) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center space-x-2">
                    <button
                      v-if="schedule.jituModul"
                      @click="openJituModal(schedule)"
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Atur Jadwal JITU"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      v-if="schedule.docheckModul"
                      @click="openDocheckModal(schedule)"
                      class="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Atur Publish DO-CHECK"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- JITU Modal -->
      <div v-if="showJituModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Jadwal Quiz JITU</h3>
              <p class="text-sm text-gray-500">{{ selectedSchedule?.nama }}</p>
            </div>
            <button @click="showJituModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p class="font-medium text-gray-900">Aktifkan Penjadwalan</p>
                <p class="text-sm text-gray-500">Quiz hanya bisa diakses sesuai jadwal</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="jituForm.isScheduled" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div v-if="jituForm.isScheduled" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Waktu Mulai</label>
                <input
                  v-model="jituForm.jadwalMulai"
                  type="datetime-local"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Waktu Selesai</label>
                <input
                  v-model="jituForm.jadwalSelesai"
                  type="datetime-local"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div class="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-700">
                <strong>Contoh:</strong> Jika jadwal mulai 9 Jan 2026 07:00 dan selesai 9 Jan 2026 08:00,
                maka user hanya bisa mengerjakan quiz dalam rentang waktu tersebut.
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
            <button
              @click="showJituModal = false"
              class="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              @click="saveJituSchedule"
              :disabled="saving"
              class="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- DO-CHECK Modal -->
      <div v-if="showDocheckModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-50">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Publish Pembahasan DO-CHECK</h3>
              <p class="text-sm text-gray-500">{{ selectedSchedule?.nama }}</p>
            </div>
            <button @click="showDocheckModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <div class="p-4 bg-teal-50 rounded-xl">
              <p class="text-sm text-teal-700">
                Atur waktu kapan pembahasan dan kunci jawaban dapat dilihat oleh user.
                Ini mencegah kebocoran jawaban jika ada user yang selesai lebih dulu.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Waktu Publish Pembahasan</label>
              <input
                v-model="docheckForm.publishDoCheck"
                type="datetime-local"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
              <p class="text-xs text-gray-500 mt-1">Kosongkan jika pembahasan langsung bisa diakses setelah selesai quiz</p>
            </div>

            <div class="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-700">
              <strong>Tips:</strong> Set waktu publish setelah jadwal quiz selesai,
              misalnya 9 Jan 2026 08:30 jika quiz berakhir jam 08:00.
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
            <button
              @click="showDocheckModal = false"
              class="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              @click="saveDocheckSchedule"
              :disabled="saving"
              class="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-teal-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
