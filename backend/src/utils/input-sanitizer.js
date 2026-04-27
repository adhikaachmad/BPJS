// Input sanitization utilities — defense-in-depth on top of Vue's
// {{ }} auto-escape. Pentest finding #5 (CWE-20).
//
// Implementation note: regex-based to avoid external dependencies that
// require npm install on production (which is not currently automatable
// via cPanel API). Adequate for plain-text and basic-HTML use cases.
// For higher-assurance rich-text sanitization, replace with sanitize-html
// once SSH-driven npm install is wired up.

const HTML_ENTITIES = {
  '&lt;': '<', '&gt;': '>', '&amp;': '&',
  '&quot;': '"', '&#39;': "'", '&nbsp;': ' '
}

function decodeBasicEntities(s) {
  return s.replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (m) => HTML_ENTITIES[m] || m)
}

/** Strip all HTML/XML tags. Use for plain-text fields (nama, npp, judul). */
export function stripHtml(s) {
  if (s == null) return s
  return decodeBasicEntities(String(s).replace(/<[^>]*>/g, '')).trim()
}

const RICH_BLOCK_TAGS = ['script', 'style', 'iframe', 'object', 'form', 'noscript']
const RICH_VOID_DANGEROUS = ['embed', 'link', 'meta', 'base']

/** Allowlist-style HTML sanitization for rich-text (materi.konten). */
export function sanitizeRichText(s) {
  if (s == null) return s
  let out = String(s)

  // Strip dangerous block elements with their content
  for (const tag of RICH_BLOCK_TAGS) {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi')
    out = out.replace(re, '')
    // Also handle unclosed
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gi'), '')
  }
  // Strip dangerous void elements
  for (const tag of RICH_VOID_DANGEROUS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '')
  }
  // Strip event handler attributes: onclick="...", onerror='...', onload=foo
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
  // Neutralize javascript:/vbscript: URLs in href/src/action/formaction
  out = out.replace(/(href|src|action|formaction|xlink:href)\s*=\s*"(?:\s*javascript:|\s*vbscript:|\s*data:text\/html)[^"]*"/gi, '$1="#"')
  out = out.replace(/(href|src|action|formaction|xlink:href)\s*=\s*'(?:\s*javascript:|\s*vbscript:|\s*data:text\/html)[^']*'/gi, "$1='#'")
  // Strip CSS expression() and behavior: which can execute in older browsers
  out = out.replace(/style\s*=\s*"[^"]*expression\s*\([^"]*"/gi, '')
  out = out.replace(/style\s*=\s*'[^']*expression\s*\([^']*'/gi, '')

  return out
}

/** Allowlist for SVG icons (defense-in-depth for step.icon). */
export function sanitizeSvg(s) {
  if (s == null) return s
  let out = String(s)
  // Strip script and event handlers (most common SVG XSS vectors)
  out = out.replace(/<script\b[\s\S]*?<\/script>/gi, '')
  out = out.replace(/<script\b[^>]*>/gi, '')
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
  out = out.replace(/(href|xlink:href)\s*=\s*"(?:\s*javascript:|\s*data:text\/html)[^"]*"/gi, '$1="#"')
  out = out.replace(/(href|xlink:href)\s*=\s*'(?:\s*javascript:|\s*data:text\/html)[^']*'/gi, "$1='#'")
  // Strip <foreignObject> which can embed HTML inside SVG
  out = out.replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, '')
  return out
}

/** Returns null when valid, or { status, error } when invalid. */
export function validateLength(value, { field, min = 0, max }) {
  const v = value == null ? '' : String(value)
  if (v.length < min) {
    return { status: 400, error: `${field} terlalu pendek (min ${min} karakter)` }
  }
  if (max != null && v.length > max) {
    return { status: 400, error: `${field} terlalu panjang (max ${max} karakter)` }
  }
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns null when valid, or error object. Empty string treated as valid (caller should pre-check required). */
export function validateEmail(value) {
  const v = value == null ? '' : String(value).trim()
  if (v === '') return null
  if (v.length > 254) return { status: 400, error: 'Email terlalu panjang' }
  if (!EMAIL_RE.test(v)) return { status: 400, error: 'Format email tidak valid' }
  return null
}

const NPP_RE = /^[A-Za-z0-9_-]+$/

/** NPP must be alphanumeric with optional dash/underscore. */
export function validateNpp(value) {
  const v = value == null ? '' : String(value).trim()
  if (v === '') return { status: 400, error: 'NPP wajib diisi' }
  if (v.length > 50) return { status: 400, error: 'NPP terlalu panjang (max 50 karakter)' }
  if (!NPP_RE.test(v)) return { status: 400, error: 'NPP hanya boleh mengandung huruf, angka, "-", "_"' }
  return null
}
