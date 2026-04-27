import sanitizeHtml from 'sanitize-html'

const PLAIN_TEXT_OPTS = {
  allowedTags: [],
  allowedAttributes: {},
  textFilter: (t) => t
}

const RICH_TEXT_OPTS = {
  allowedTags: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'sub', 'sup',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'hr'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'style']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
  }
}

const SVG_OPTS = {
  allowedTags: [
    'svg', 'g', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline',
    'ellipse', 'defs', 'use', 'title', 'desc', 'linearGradient',
    'radialGradient', 'stop', 'filter', 'feGaussianBlur', 'feOffset',
    'feBlend', 'feFlood', 'feComposite', 'mask', 'clipPath'
  ],
  allowedAttributes: { '*': ['*'] },
  allowedSchemes: ['http', 'https'],
  allowVulnerableTags: false
}

/** Strip all HTML tags. Use for plain-text fields (nama, npp, email, etc.). */
export function stripHtml(s) {
  if (s == null) return s
  return sanitizeHtml(String(s), PLAIN_TEXT_OPTS).trim()
}

/** Sanitize rich text (materi konten, deskripsi panjang). Allows safe HTML tags. */
export function sanitizeRichText(s) {
  if (s == null) return s
  return sanitizeHtml(String(s), RICH_TEXT_OPTS)
}

/** Sanitize SVG markup (step icons). Strips script/event handlers, keeps shape tags. */
export function sanitizeSvg(s) {
  if (s == null) return s
  return sanitizeHtml(String(s), SVG_OPTS)
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
