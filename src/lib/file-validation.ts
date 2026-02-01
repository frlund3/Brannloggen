/**
 * File upload validation for security hardening (ASVS Level 2).
 * Validates file type, size, and content before upload.
 */

/** Maximum file size: 10 MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Allowed image MIME types */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
])

/** Magic bytes for common image formats */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
]

interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a file before upload.
 * Checks: file size, extension, MIME type, and magic bytes.
 */
export function validateImageFile(file: File): ValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return { valid: false, error: `Filen er for stor (${sizeMB} MB). Maks ${MAX_FILE_SIZE / (1024 * 1024)} MB.` }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Filen er tom.' }
  }

  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Filtypen .${ext || '?'} er ikke tillatt. Bruk: ${[...ALLOWED_EXTENSIONS].join(', ')}.` }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `MIME-typen ${file.type || 'ukjent'} er ikke tillatt.` }
  }

  return { valid: true }
}

/**
 * Validates file content by checking magic bytes.
 * This is an async check that reads the first bytes of the file.
 */
export async function validateImageContent(file: File): Promise<ValidationResult> {
  // SVG files are text-based, skip magic byte check
  if (file.type === 'image/svg+xml') {
    return { valid: true }
  }

  try {
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    const matchesMagic = MAGIC_BYTES.some(({ bytes: magic }) =>
      magic.every((byte, i) => bytes[i] === byte)
    )

    if (!matchesMagic) {
      return { valid: false, error: 'Filinnholdet samsvarer ikke med bildeformatet. Filen kan være skadet eller manipulert.' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Kunne ikke validere filinnholdet.' }
  }
}

/**
 * Full validation: checks metadata + content.
 */
export async function validateImageFileFull(file: File): Promise<ValidationResult> {
  const metaResult = validateImageFile(file)
  if (!metaResult.valid) return metaResult

  return validateImageContent(file)
}
