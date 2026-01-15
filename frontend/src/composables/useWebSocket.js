import { ref, onUnmounted } from 'vue'

export function useWebSocket(sessionId) {
  const socket = ref(null)
  const connected = ref(false)
  const lastSaved = ref(null)
  const saveQueue = ref({})
  let saveInterval = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5

  function connect() {
    const token = localStorage.getItem('token')
    if (!token || !sessionId) return

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/test`

    socket.value = new WebSocket(wsUrl)

    socket.value.onopen = () => {
      connected.value = true
      reconnectAttempts = 0

      // Authenticate
      socket.value.send(JSON.stringify({
        type: 'auth',
        token,
        sessionId
      }))

      // Start auto-save interval (every 3 seconds)
      saveInterval = setInterval(() => {
        if (Object.keys(saveQueue.value).length > 0) {
          saveBulk()
        }
      }, 3000)
    }

    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'auth_success':
          console.log('WebSocket authenticated')
          break
        case 'save_success':
        case 'bulk_save_success':
          lastSaved.value = new Date(data.timestamp)
          saveQueue.value = {}
          break
        case 'save_error':
          console.error('Save error:', data.message)
          break
        case 'ping':
          socket.value.send(JSON.stringify({ type: 'pong' }))
          break
      }
    }

    socket.value.onclose = () => {
      connected.value = false

      if (saveInterval) {
        clearInterval(saveInterval)
        saveInterval = null
      }

      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++
        setTimeout(() => {
          connect()
        }, 2000 * reconnectAttempts)
      }
    }

    socket.value.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  function saveAnswer(soalId, opsiId) {
    saveQueue.value[soalId] = opsiId

    // If connected, send immediately for single saves
    if (connected.value && socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({
        type: 'save_answer',
        soalId,
        opsiId
      }))
    }
  }

  function saveBulk() {
    if (!connected.value || socket.value?.readyState !== WebSocket.OPEN) return

    socket.value.send(JSON.stringify({
      type: 'save_bulk',
      jawabans: saveQueue.value
    }))
  }

  function updateProgress(currentSoal) {
    if (!connected.value || socket.value?.readyState !== WebSocket.OPEN) return

    socket.value.send(JSON.stringify({
      type: 'update_progress',
      currentSoal
    }))
  }

  function disconnect() {
    if (saveInterval) {
      clearInterval(saveInterval)
      saveInterval = null
    }

    if (socket.value) {
      socket.value.close()
      socket.value = null
    }

    connected.value = false
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    lastSaved,
    connect,
    saveAnswer,
    saveBulk,
    updateProgress,
    disconnect
  }
}
