import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useAdminStore = defineStore('admin', () => {
  const stats = ref(null)
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      const response = await api.get('/admin/dashboard')
      stats.value = response.data.stats
      return response.data
    } catch (err) {
      console.error(err)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    loading,
    fetchDashboard
  }
})
