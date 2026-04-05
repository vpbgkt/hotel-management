/**
 * Security utilities for tenant-rendered content.
 * Prevents XSS via user-controlled theme/content fields.
 */

const SAFE_HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SAFE_FONT_FAMILIES = new Set([
  'Inter', 'Playfair Display', 'Poppins', 'Lora',
  'Montserrat', 'Merriweather', 'Roboto', 'Open Sans',
  'Lato', 'Raleway', 'system-ui', 'sans-serif', 'serif',
]);

/**
 * Sanitize a hex color value. Returns fallback if invalid.
 * Prevents CSS injection via color fields.
 */
export function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  return SAFE_HEX_COLOR.test(color.trim()) ? color.trim() : fallback;
}

/**
 * Sanitize font family. Only allows whitelisted fonts.
 */
export function sanitizeFont(font: string | undefined, fallback = 'Inter'): string {
  if (!font) return fallback;
  return SAFE_FONT_FAMILIES.has(font.trim()) ? font.trim() : fallback;
}

/**
 * Sanitize a URL for use in img src or background-image.
 * Only allows https:, http: (dev), and relative paths.
 * Blocks javascript:, data: (except small safe images), and other schemes.
 */
export function sanitizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  // Allow relative paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
  } catch {
    // Invalid URL
  }
  return undefined;
}

/**
 * Sanitize plain text content. Strips HTML tags to prevent XSS.
 */
export function sanitizeText(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Build a safe inline style object for background gradients.
 */
export function safeGradientStyle(
  primary: string | undefined,
  secondary: string | undefined,
): React.CSSProperties {
  const p = sanitizeColor(primary, '#2563eb');
  const s = sanitizeColor(secondary, '#1e40af');
  return { background: `linear-gradient(135deg, ${p}, ${s})` };
}

/**
 * Sanitize an object for safe use in JSON-LD <script> tags.
 * Prevents script injection via `</script>` or HTML entities in values.
 * Only allows primitive values, arrays, and plain objects.
 */
export function sanitizeJsonLd(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (typeof obj === 'string') {
    // Escape characters that could break out of <script> or inject HTML
    return obj
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/'/g, '\\u0027')
      .replace(/"/g, '\\u0022');
  }
  if (Array.isArray(obj)) return obj.map(sanitizeJsonLd);
  if (typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      // Only allow safe property names (alphanumeric + @)
      if (/^[a-zA-Z@][a-zA-Z0-9@_-]*$/.test(key)) {
        clean[key] = sanitizeJsonLd(val);
      }
    }
    return clean;
  }
  return undefined;
}

/**
 * Validate a template name against the allowed set.
 * Prevents injection of arbitrary template values.
 */
const ALLOWED_TEMPLATES = new Set(['STARTER', 'MODERN_MINIMAL', 'LUXURY_RESORT', 'HERITAGE_BOUTIQUE']);
export function sanitizeTemplateName(name: string | undefined): string {
  if (!name) return 'STARTER';
  return ALLOWED_TEMPLATES.has(name) ? name : 'STARTER';
}
