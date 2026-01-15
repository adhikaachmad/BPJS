<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

// Quill toolbar configuration
const quillToolbar = [
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'align': [] }],
  ['link', 'image', 'video'],
  ['blockquote', 'code-block'],
  ['clean']
]

const kategoris = ref([])
const selectedKategoriId = ref('')
const selectedSubKategoriId = ref('')
const selectedModulId = ref('')
const moduls = ref([])
const materis = ref([])
const currentModul = ref(null)
const loading = ref(true)
const saving = ref(false)

const showModal = ref(false)
const editingMateri = ref(null)
const form = ref({
  judul: '',
  konten: '',
  videoUrl: '',
  pdfUrl: ''
})

const subKategoris = computed(() => {
  const kat = kategoris.value.find(k => k.id === parseInt(selectedKategoriId.value))
  return kat?.subKategoris || []
})

const kupasModuls = computed(() => {
  return moduls.value.filter(m => m.tipe === 'KUPAS_TUNTAS')
})

onMounted(async () => {
  await fetchKategoris()
  loading.value = false
})

async function fetchKategoris() {
  const response = await api.get('/kategori')
  kategoris.value = response.data
}

async function onKategoriChange() {
  selectedSubKategoriId.value = ''
  selectedModulId.value = ''
  moduls.value = []
  materis.value = []
  currentModul.value = null
}

async function onSubKategoriChange() {
  selectedModulId.value = ''
  materis.value = []
  currentModul.value = null

  if (selectedSubKategoriId.value) {
    const response = await api.get(`/modul/sub-kategori/${selectedSubKategoriId.value}`)
    moduls.value = response.data
  }
}

async function onModulChange() {
  if (selectedModulId.value) {
    await loadMateri()
  } else {
    materis.value = []
    currentModul.value = null
  }
}

async function loadMateri() {
  loading.value = true
  try {
    const response = await api.get(`/admin/materi/modul/${selectedModulId.value}`)
    currentModul.value = response.data
    materis.value = response.data.materis
  } catch (err) {
    console.error(err)
    alert('Gagal memuat materi')
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingMateri.value = null
  form.value = {
    judul: '',
    konten: '',
    videoUrl: '',
    pdfUrl: ''
  }
  showModal.value = true
}

function openEditModal(materi) {
  editingMateri.value = materi
  form.value = {
    judul: materi.judul,
    konten: materi.konten,
    videoUrl: materi.videoUrl || '',
    pdfUrl: materi.pdfUrl || ''
  }
  showModal.value = true
}

async function saveMateri() {
  if (!form.value.judul.trim()) {
    alert('Judul wajib diisi')
    return
  }

  saving.value = true
  try {
    if (editingMateri.value) {
      await api.put(`/admin/materi/${editingMateri.value.id}`, form.value)
    } else {
      await api.post('/admin/materi', {
        modulId: parseInt(selectedModulId.value),
        ...form.value
      })
    }
    showModal.value = false
    await loadMateri()
  } catch (err) {
    console.error(err)
    alert('Gagal menyimpan materi')
  } finally {
    saving.value = false
  }
}

async function deleteMateri(materi) {
  if (!confirm(`Hapus materi "${materi.judul}"?`)) return

  try {
    await api.delete(`/admin/materi/${materi.id}`)
    await loadMateri()
  } catch (err) {
    console.error(err)
    alert('Gagal menghapus materi')
  }
}

async function moveMateri(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= materis.value.length) return

  const items = [...materis.value]
  const temp = items[index]
  items[index] = items[newIndex]
  items[newIndex] = temp

  // Update urutan
  const order = items.map((item, idx) => ({
    id: item.id,
    urutan: idx + 1
  }))

  try {
    await api.put(`/admin/materi/reorder/${selectedModulId.value}`, { order })
    await loadMateri()
  } catch (err) {
    console.error(err)
    alert('Gagal mengubah urutan')
  }
}
</script>

<template>
  <AdminLayout>
    <div class="p-6 lg:p-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Kelola Materi KUPAS TUNTAS</h1>
        <p class="text-gray-500 text-sm mt-1">Tambah dan edit konten materi pembelajaran</p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
            <select
              v-model="selectedKategoriId"
              @change="onKategoriChange"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-white"
            >
              <option value="">Pilih Kategori</option>
              <option v-for="kat in kategoris" :key="kat.id" :value="kat.id">
                {{ kat.nama }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Sub Kategori</label>
            <select
              v-model="selectedSubKategoriId"
              @change="onSubKategoriChange"
              :disabled="!selectedKategoriId"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-white disabled:bg-gray-100"
            >
              <option value="">Pilih Sub Kategori</option>
              <option v-for="sub in subKategoris" :key="sub.id" :value="sub.id">
                {{ sub.nama }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Modul KUPAS TUNTAS</label>
            <select
              v-model="selectedModulId"
              @change="onModulChange"
              :disabled="!selectedSubKategoriId || kupasModuls.length === 0"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-white disabled:bg-gray-100"
            >
              <option value="">Pilih Modul</option>
              <option v-for="modul in kupasModuls" :key="modul.id" :value="modul.id">
                {{ modul.nama }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- No Module Selected -->
      <div v-if="!selectedModulId" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
        <div class="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900">Pilih Modul KUPAS TUNTAS</h3>
        <p class="text-gray-500 mt-1">Pilih kategori, sub kategori, dan modul untuk mengelola materi</p>
      </div>

      <!-- Materi List -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50">
          <div>
            <h3 class="font-semibold text-gray-900">{{ currentModul?.nama }}</h3>
            <p class="text-sm text-gray-500">{{ materis.length }} materi</p>
          </div>
          <button
            @click="openAddModal"
            class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Materi
          </button>
        </div>

        <!-- Materi Items -->
        <div v-if="loading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto"></div>
        </div>

        <div v-else-if="materis.length === 0" class="p-12 text-center">
          <p class="text-gray-500">Belum ada materi. Klik "Tambah Materi" untuk menambahkan.</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="(materi, index) in materis"
            :key="materi.id"
            class="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center flex-1">
              <div class="flex flex-col mr-4">
                <button
                  @click="moveMateri(index, -1)"
                  :disabled="index === 0"
                  class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  @click="moveMateri(index, 1)"
                  :disabled="index === materis.length - 1"
                  class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <span class="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm mr-4">
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{{ materi.judul }}</h4>
                <div class="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                  <span v-if="materi.videoUrl" class="flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Video
                  </span>
                  <span v-if="materi.pdfUrl" class="flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </span>
                  <span>{{ materi.konten?.length || 0 }} karakter</span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="openEditModal(materi)"
                class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="deleteMateri(materi)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ editingMateri ? 'Edit Materi' : 'Tambah Materi' }}
            </h3>
            <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Judul Materi *</label>
                <input
                  v-model="form.judul"
                  type="text"
                  placeholder="Masukkan judul materi"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">URL Video (YouTube)</label>
                <input
                  v-model="form.videoUrl"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
                <p class="text-xs text-gray-500 mt-1">Masukkan URL video YouTube untuk embed</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">URL PDF</label>
                <input
                  v-model="form.pdfUrl"
                  type="url"
                  placeholder="https://example.com/file.pdf"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
                <p class="text-xs text-gray-500 mt-1">Masukkan URL file PDF untuk download</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Konten Materi</label>
                <div class="border border-gray-200 rounded-xl overflow-hidden">
                  <QuillEditor
                    v-model:content="form.konten"
                    content-type="html"
                    :toolbar="quillToolbar"
                    theme="snow"
                    style="min-height: 300px;"
                  />
                </div>
                <p class="text-xs text-gray-500 mt-1">Gunakan editor di atas untuk membuat konten dengan formatting</p>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
            <button
              @click="showModal = false"
              class="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              @click="saveMateri"
              :disabled="saving"
              class="px-6 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
