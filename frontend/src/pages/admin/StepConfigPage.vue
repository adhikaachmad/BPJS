<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const steps = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editingStep = ref(null)
const uploading = ref(false)

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

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!allowed.includes(file.type)) {
    alert('Format file tidak didukung. Gunakan PNG, JPG, atau WebP.')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    editingStep.value.image = response.data.path
  } catch (err) {
    console.error(err)
    alert('Gagal upload gambar')
  } finally {
    uploading.value = false
  }
}

function removeImage() {
  editingStep.value.image = null
}

async function saveStep() {
  if (!editingStep.value) return

  saving.value = true
  try {
    await api.put(`/step-config/${editingStep.value.id}`, {
      nama: editingStep.value.nama,
      deskripsi: editingStep.value.deskripsi,
      gradientFrom: editingStep.value.gradientFrom,
      gradientTo: editingStep.value.gradientTo,
      image: editingStep.value.image
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
            class="p-6 text-white relative overflow-hidden"
            :class="`bg-gradient-to-br from-${step.gradientFrom} to-${step.gradientTo}`"
          >
            <!-- Image Preview -->
            <div v-if="step.image" class="flex items-center justify-center">
              <img :src="step.image" :alt="step.nama" class="h-24 object-contain rounded-lg" />
            </div>
            <!-- SVG Icon Fallback -->
            <div v-else class="opacity-90" v-html="step.icon"></div>
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
                class="p-4 rounded-xl text-white relative overflow-hidden"
                :class="`bg-gradient-to-br from-${editingStep?.gradientFrom} to-${editingStep?.gradientTo}`"
              >
                <div v-if="editingStep?.image" class="flex items-center justify-center">
                  <img :src="editingStep.image" :alt="editingStep.nama" class="h-20 object-contain rounded-lg" />
                </div>
                <div v-else class="opacity-90" v-html="editingStep?.icon"></div>
                <h3 class="text-lg font-bold mt-2">{{ editingStep?.nama }}</h3>
                <p class="text-sm opacity-80 mt-1">{{ editingStep?.deskripsi }}</p>
              </div>
            </div>

            <!-- Image Upload -->
            <div class="mb-4">
              <label class="block text-gray-700 mb-2 font-medium">Gambar Step</label>
              <div v-if="editingStep?.image" class="mb-3">
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <img :src="editingStep.image" class="h-16 w-16 object-contain rounded-lg bg-white border" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-600 truncate">{{ editingStep.image }}</p>
                  </div>
                  <button
                    type="button"
                    @click="removeImage"
                    class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus gambar"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <label
                class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-bpjs-400 hover:bg-gray-50 transition-all"
                :class="uploading ? 'opacity-50 pointer-events-none' : ''"
              >
                <div class="flex flex-col items-center">
                  <svg v-if="!uploading" class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div v-else class="w-8 h-8 border-4 border-gray-300 border-t-bpjs-500 rounded-full animate-spin mb-2"></div>
                  <p class="text-sm text-gray-500">
                    {{ uploading ? 'Mengupload...' : (editingStep?.image ? 'Ganti gambar' : 'Upload gambar') }}
                  </p>
                  <p class="text-xs text-gray-400 mt-1">PNG, JPG, WebP</p>
                </div>
                <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp" @change="handleImageUpload" />
              </label>
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
