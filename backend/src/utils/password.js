// Password policy: min 12 chars, must include upper, lower, digit, and symbol.
// Returns error message (string) if invalid, or null if valid.
export function validatePasswordStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 12) {
    return 'Password minimal 12 karakter'
  }
  if (!/[A-Z]/.test(pw)) return 'Password harus mengandung huruf besar'
  if (!/[a-z]/.test(pw)) return 'Password harus mengandung huruf kecil'
  if (!/[0-9]/.test(pw)) return 'Password harus mengandung angka'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password harus mengandung simbol (mis. !@#$%)'
  return null
}
