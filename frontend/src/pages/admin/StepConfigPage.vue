<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const steps = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editingStep = ref(null)

const gradientOptions = [
  { from: 'violet-500', to: 'purple-600', name: 'Violet-Purple' },
  { from: 'blue-500', to: 'indigo-600', name: 'Blue-Indigo' },
  { from: 'teal-500', to: 'cyan-600', name: 'Teal-Cyan' },
  { from: 'amber-500', to: 'orange-600', name: 'Amber-Orange' },
  { from: 'rose-500', to: 'pink-600', name: 'Rose-Pink' },
  { from: 'emerald-500', to: 'green-600', name: 'Emerald-Green' }
]

onMounted(async () => {
  await fetchSteps()
})

async function fetchSteps() {
  loading.value = true
  try {
    const response = await api.get('/step-config')
    steps.value = response.data
  } catch (err) {
    console.error(err)
    alert('Gagal memuat konfigurasi step')
  } finally {
    loading.value = false
  }
}

function openEdit(step) {
  editingStep.value = { ...step }
  showModal.value = true
}

function selectGradient(opt) {
  editingStep.value.gradientFrom = opt.from
  editingStep.value.gradientTo = opt.to
}

async function saveStep() {
  if (!editingStep.value) return

  saving.value = true
  try {
    await api.put(`/step-config/${editingStep.value.id}`, {
      nama: editingStep.value.nama,
      deskripsi: editingStep.value.deskripsi,
      gradientFrom: editingStep.value.gradientFrom,
      gradientTo: editingStep.value.gradientTo
    })
    showModal.value = false
    await fetchSteps()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

function getStepLabel(id) {
  const labels = {
    materi: 'Materi/Pembelajaran',
    test: 'Test/Kuesioner',
    docheck: 'Koreksi Jawaban',
    rekap: 'Rekap Hasil'
  }
  return labels[id] || id
}
</script>

<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Konfigurasi Step Pembelajaran</h1>
        <p class="text-gray-600 mt-1">Atur nama dan tampilan setiap step yang dilihat pengguna</p>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="step in steps"
          :key="step.id"
          class="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <!-- Preview Header -->
          <div
            class="p-6 text-white"
            :class="`bg-gradient-to-br from-${step.gradientFrom} to-${step.gradientTo}`"
          >
            <div class="opacity-90" v-html="step.icon"></div>
            <h3 class="text-xl font-bold mt-4">{{ step.nama }}</h3>
          </div>

          <!-- Content -->
          <div class="p-5">
            <div class="mb-4">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {{ getStepLabel(step.id) }}
              </span>
            </div>

            <p class="text-gray-600 text-sm mb-4">{{ step.deskripsi }}</p>

            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>Urutan: {{ step.urutan }}</span>
              <button
                @click="openEdit(step)"
                class="px-4 py-2 bg-bpjs-500 text-white rounded-lg hover:bg-bpjs-600 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">Edit Step: {{ getStepLabel(editingStep?.id) }}</h2>

          <form @submit.prevent="saveStep">
            <!-- Preview -->
            <div class="mb-6">
              <label class="block text-gray-700 mb-2 font-medium">Preview</label>
              <div
                class="p-4 rounded-xl text-white"
                :class="`bg-gradient-to-br from-${editingStep?.gradientFrom} to-${editingStep?.gradientTo}`"
              >
                <div class="opacity-90" v-html="editingStep?.icon"></div>
                <h3 class="text-lg font-bold mt-2">{{ editingStep?.nama }}</h3>
                <p class="text-sm opacity-80 mt-1">{{ editingStep?.deskripsi }}</p>
              </div>
            </div>

            <!-- Nama -->
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Nama Step</label>
              <input
                v-model="editingStep.nama"
                type="text"
                class="input-field"
                placeholder="Contoh: Kupas Tuntas"
                required
              />
            </div>

            <!-- Deskripsi -->
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Deskripsi</label>
              <textarea
                v-model="editingStep.deskripsi"
                class="input-field"
                rows="2"
                placeholder="Deskripsi singkat step ini"
              ></textarea>
            </div>

            <!-- Gradient Color -->
            <div class="mb-6">
              <label class="block text-gray-700 mb-2">Warna Gradient</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in gradientOptions"
                  :key="opt.name"
                  type="button"
                  @click="selectGradient(opt)"
                  class="h-12 rounded-xl border-2 transition-all"
                  :class="[
                    `bg-gradient-to-br from-${opt.from} to-${opt.to}`,
                    editingStep?.gradientFrom === opt.from ? 'border-gray-800 ring-2 ring-offset-2' : 'border-transparent'
                  ]"
                  :title="opt.name"
                ></button>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex space-x-3">
              <button
                type="button"
                @click="showModal = false"
                class="flex-1 btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                class="flex-1 btn-primary"
                :disabled="saving"
              >
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
