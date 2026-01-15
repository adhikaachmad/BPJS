<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'

const kategoris = ref([])
const loading = ref(true)
const showModal = ref(false)
const editMode = ref(false)
const form = ref({ id: null, nama: '', deskripsi: '' })
const saving = ref(false)

// Sub kategori
const showSubModal = ref(false)
const selectedKategori = ref(null)
const subForm = ref({ id: null, nama: '', deskripsi: '' })

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  try {
    const response = await api.get('/kategori')
    kategoris.value = response.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editMode.value = false
  form.value = { id: null, nama: '', deskripsi: '' }
  showModal.value = true
}

function openEdit(kategori) {
  editMode.value = true
  form.value = { ...kategori }
  showModal.value = true
}

async function saveKategori() {
  saving.value = true
  try {
    if (editMode.value) {
      await api.put(`/kategori/${form.value.id}`, form.value)
    } else {
      await api.post('/kategori', form.value)
    }
    showModal.value = false
    fetchData()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

async function deleteKategori(id) {
  if (!confirm('Yakin hapus kategori ini?')) return
  try {
    await api.delete(`/kategori/${id}`)
    fetchData()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus')
  }
}

function openSubKategori(kategori) {
  selectedKategori.value = kategori
  subForm.value = { id: null, nama: '', deskripsi: '' }
  showSubModal.value = true
}

async function saveSubKategori() {
  saving.value = true
  try {
    if (subForm.value.id) {
      await api.put(`/kategori/sub-kategori/${subForm.value.id}`, subForm.value)
    } else {
      await api.post(`/kategori/${selectedKategori.value.id}/sub-kategori`, subForm.value)
    }
    showSubModal.value = false
    fetchData()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

async function deleteSubKategori(id) {
  if (!confirm('Yakin hapus sub kategori ini?')) return
  try {
    await api.delete(`/kategori/sub-kategori/${id}`)
    fetchData()
  } catch (err) {
    alert(err.response?.data?.error || 'Gagal menghapus')
  }
}

function editSubKategori(sub) {
  subForm.value = { ...sub }
  showSubModal.value = true
}
</script>

<template>
  <AdminLayout>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Manajemen Kategori</h1>
        <button @click="openCreate" class="btn-primary">
          + Tambah Kategori
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
      </div>

      <div v-else class="space-y-4">
        <div v-for="kategori in kategoris" :key="kategori.id" class="card">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-800">{{ kategori.nama }}</h3>
              <p class="text-gray-500 text-sm">{{ kategori.deskripsi }}</p>
            </div>
            <div class="flex space-x-2">
              <button @click="openSubKategori(kategori)" class="px-3 py-1 bg-bpjs-100 text-bpjs-600 rounded-lg text-sm hover:bg-bpjs-200">
                + Sub Kategori
              </button>
              <button @click="openEdit(kategori)" class="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                Edit
              </button>
              <button @click="deleteKategori(kategori.id)" class="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200">
                Hapus
              </button>
            </div>
          </div>

          <!-- Sub Kategoris -->
          <div v-if="kategori.subKategoris?.length" class="border-t pt-4">
            <p class="text-sm text-gray-500 mb-2">Sub Kategori:</p>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="sub in kategori.subKategoris"
                :key="sub.id"
                class="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm"
              >
                <span>{{ sub.nama }}</span>
                <button @click="editSubKategori(sub); selectedKategori = kategori" class="ml-2 text-gray-400 hover:text-gray-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button @click="deleteSubKategori(sub.id)" class="ml-1 text-gray-400 hover:text-red-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kategori Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full">
          <h2 class="text-xl font-bold mb-4">{{ editMode ? 'Edit Kategori' : 'Tambah Kategori' }}</h2>
          <form @submit.prevent="saveKategori">
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Nama Kategori</label>
              <input v-model="form.nama" type="text" class="input-field" required />
            </div>
            <div class="mb-6">
              <label class="block text-gray-700 mb-2">Deskripsi</label>
              <textarea v-model="form.deskripsi" class="input-field" rows="3"></textarea>
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

      <!-- Sub Kategori Modal -->
      <div v-if="showSubModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full">
          <h2 class="text-xl font-bold mb-4">{{ subForm.id ? 'Edit' : 'Tambah' }} Sub Kategori</h2>
          <p class="text-gray-500 mb-4">Untuk: {{ selectedKategori?.nama }}</p>
          <form @submit.prevent="saveSubKategori">
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Nama Sub Kategori</label>
              <input v-model="subForm.nama" type="text" class="input-field" required />
            </div>
            <div class="mb-6">
              <label class="block text-gray-700 mb-2">Deskripsi</label>
              <textarea v-model="subForm.deskripsi" class="input-field" rows="3"></textarea>
            </div>
            <div class="flex space-x-3">
              <button type="button" @click="showSubModal = false" class="flex-1 btn-secondary">Batal</button>
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
