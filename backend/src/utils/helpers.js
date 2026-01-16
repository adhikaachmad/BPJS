/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} - Random string
 */
export function generateRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Format date to Indonesian locale
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDateID(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Calculate remaining time in seconds
 * @param {Date} startTime - Start time
 * @param {number} durationMinutes - Duration in minutes
 * @returns {number} - Remaining seconds
 */
export function calculateRemainingTime(startTime, durationMinutes) {
  const endTime = new Date(startTime).getTime() + (durationMinutes * 60 * 1000)
  const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
  return remaining
}

/**
 * Validate NPP format
 * @param {string} npp - NPP to validate
 * @returns {boolean} - Is valid NPP
 */
export function isValidNPP(npp) {
  // NPP format: 12-18 digits (from vendor)
  return /^\d{12,18}$/.test(npp)
}

/**
 * Parse CSV string to array of objects
 * @param {string} csvString - CSV content
 * @param {string} delimiter - Column delimiter
 * @returns {Array} - Array of objects
 */
export function parseCSV(csvString, delimiter = ',') {
  const lines = csvString.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim())
    const obj = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    data.push(obj)
  }

  return data
}

/**
 * Sanitize string for safe display
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str) {
  if (!str) return ''
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
