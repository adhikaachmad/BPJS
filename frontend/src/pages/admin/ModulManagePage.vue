<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const moduls = ref([])
const subKategoris = ref([])
const loading = ref(true)
const showModal = ref(false)
const editMode = ref(false)
const form = ref({
  id: null,
  nama: '',
  deskripsi: '',
  durasi: 30,
  subKategoriId: '',
  gradientFrom: 'blue-500',
  gradientTo: 'indigo-600'
})
const saving = ref(false)

const gradientOptions = [
  { from: 'violet-500', to: 'purple-600', name: 'Violet-Purple' },
  { from: 'blue-500', to: 'indigo-600', name: 'Blue-Indigo' },
  { from: 'teal-500', to: 'cyan-600', name: 'Teal-Cyan' },
  { from: 'amber-500', to: 'orange-600', name: 'Amber-Orange' }
]

onMounted(async () => {
  await Promise.all([fetchModuls(), fetchSubKategoris()])
})

async function fetchSubKategoris() {
  const response = await api.get('/kategori')
  subKategoris.value = response.data.flatMap(k =>
    k.subKategoris.map(s => ({ ...s, kategoriNama: k.nama }))
  )
}

async function fetchModuls() {
  loading.value = true
  try {
    const response = await api.get('/modul')
    moduls.value = response.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editMode.value = false
  form.value = {
    id: null,
    nama: '',
    deskripsi: '',
    durasi: 30,
    subKategoriId: '',
    gradientFrom: 'blue-500',
    gradientTo: 'indigo-600'
  }
  showModal.value = true
}

function openEdit(modul) {
  editMode.value = true
  form.value = { ...modul }
  showModal.value = true
}

async function saveModul() {
  saving.value = true
  try {
    if (editMode.value) {
      await api.put(`/modul/${form.value.id}`, form.value)
    } else {
      await api.post('/modul', form.value)
    }
    showModal.value = false
    fetchModuls()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

async function deleteModul(id) {
  if (!confirm('Yakin hapus modul ini?')) return
  try {
    await api.delete(`/modul/${id}`)
    fetchModuls()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus')
  }
}

function selectGradient(opt) {
  form.value.gradientFrom = opt.from
  form.value.gradientTo = opt.to
}
</script>

<template>
  <AdminLayout>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Manajemen Modul</h1>
        <button @click="openCreate" class="btn-primary">
          + Tambah Modul
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="modul in moduls" :key="modul.id" class="card">
          <div
            class="w-full h-24 rounded-xl mb-4"
            :class="`bg-gradient-to-br from-${modul.gradientFrom} to-${modul.gradientTo}`"
          ></div>
          <h3 class="font-bold text-gray-800">{{ modul.nama }}</h3>
          <p class="text-sm text-gray-500 mb-2">{{ modul.deskripsi }}</p>
          <p class="text-xs text-gray-400 mb-4">
            {{ modul.subKategori?.kategori?.nama }} - {{ modul.subKategori?.nama }}
          </p>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">{{ modul.durasi }} menit | {{ modul._count?.soals || 0 }} soal</span>
            <div class="flex space-x-2">
              <button @click="openEdit(modul)" class="text-bpjs-600 hover:text-bpjs-800">Edit</button>
              <button @click="deleteModul(modul.id)" class="text-red-600 hover:text-red-800">Hapus</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-4">{{ editMode ? 'Edit Modul' : 'Tambah Modul' }}</h2>
          <form @submit.prevent="saveModul">
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Nama Modul</label>
              <input v-model="form.nama" type="text" class="input-field" required />
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Deskripsi</label>
              <textarea v-model="form.deskripsi" class="input-field" rows="2"></textarea>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Durasi (menit)</label>
              <input v-model.number="form.durasi" type="number" class="input-field" min="1" required />
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Sub Kategori</label>
              <select v-model="form.subKategoriId" class="input-field" required>
                <option value="">Pilih Sub Kategori</option>
                <option v-for="sub in subKategoris" :key="sub.id" :value="sub.id">
                  {{ sub.kategoriNama }} - {{ sub.nama }}
                </option>
              </select>
            </div>
            <div class="mb-6">
              <label class="block text-gray-700 mb-2">Warna Gradient</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="opt in gradientOptions"
                  :key="opt.name"
                  type="button"
                  @click="selectGradient(opt)"
                  class="h-12 rounded-xl border-2 transition-all"
                  :class="[
                    `bg-gradient-to-br from-${opt.from} to-${opt.to}`,
                    form.gradientFrom === opt.from ? 'border-gray-800 ring-2 ring-offset-2' : 'border-transparent'
                  ]"
                ></button>
              </div>
            </div>
            <div class="flex space-x-3">
              <button type="button" @click="showModal = false" class="flex-1 btn-secondary">Batal</button>
              <button type="submit" class="flex-1 btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
