import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useQuizStore = defineStore('quiz', () => {
  const session = ref(null)
  const modul = ref(null)
  const soals = ref([])
  const jawabans = ref({})
  const currentIndex = ref(0)
  const loading = ref(false)
  const error = ref(null)
  const submitting = ref(false)
  const result = ref(null)

  const totalSoal = computed(() => soals.value.length)
  const currentSoal = computed(() => soals.value[currentIndex.value] || null)
  const answeredCount = computed(() => Object.keys(jawabans.value).filter(k => jawabans.value[k]).length)
  const progress = computed(() => totalSoal.value > 0 ? (answeredCount.value / totalSoal.value) * 100 : 0)

  const isFirstSoal = computed(() => currentIndex.value === 0)
  const isLastSoal = computed(() => currentIndex.value === totalSoal.value - 1)

  async function startTest(modulId) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/test/start', { modulId })
      session.value = response.data.session
      modul.value = response.data.modul
      soals.value = response.data.soals
      jawabans.value = response.data.jawabans || {}
      currentIndex.value = response.data.session.currentSoal || 0

      return {
        success: true,
        sessionId: session.value.id,
        resumed: response.data.resumed
      }
    } catch (err) {
      error.value = err.response?.data?.error || 'Gagal memulai test'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  function setAnswer(soalId, opsiId) {
    jawabans.value = { ...jawabans.value, [soalId]: opsiId }
  }

  function nextSoal() {
    if (currentIndex.value < soals.value.length - 1) {
      currentIndex.value++
    }
  }

  function prevSoal() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  function goToSoal(index) {
    if (index >= 0 && index < soals.value.length) {
      currentIndex.value = index
    }
  }

  async function saveAnswer(soalId, opsiId) {
    try {
      await api.post('/test/answer', {
        sessionId: session.value.id,
        soalId,
        opsiId
      })
      return true
    } catch (err) {
      console.error('Failed to save answer:', err)
      return false
    }
  }

  async function saveBulkAnswers() {
    try {
      await api.post('/test/answers/bulk', {
        sessionId: session.value.id,
        jawabans: jawabans.value
      })
      return true
    } catch (err) {
      console.error('Failed to save answers:', err)
      return false
    }
  }

  async function submitTest() {
    submitting.value = true
    error.value = null

    try {
      // Save all answers first
      await saveBulkAnswers()

      // Submit test
      const response = await api.post('/test/submit', {
        sessionId: session.value.id
      })

      result.value = response.data
      return { success: true, result: response.data }
    } catch (err) {
      error.value = err.response?.data?.error || 'Gagal submit test'
      return { success: false, error: error.value }
    } finally {
      submitting.value = false
    }
  }

  async function getResult(sessionId) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/test/result/${sessionId}`)
      result.value = response.data
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Gagal mengambil hasil'
      return null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    session.value = null
    modul.value = null
    soals.value = []
    jawabans.value = {}
    currentIndex.value = 0
    result.value = null
    error.value = null
  }

  return {
    session,
    modul,
    soals,
    jawabans,
    currentIndex,
    loading,
    error,
    submitting,
    result,
    totalSoal,
    currentSoal,
    answeredCount,
    progress,
    isFirstSoal,
    isLastSoal,
    startTest,
    setAnswer,
    nextSoal,
    prevSoal,
    goToSoal,
    saveAnswer,
    saveBulkAnswers,
    submitTest,
    getResult,
    reset
  }
})
