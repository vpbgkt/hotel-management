/**
 * Template Registry — Maps template names to their component sets.
 * Used for dynamic template loading across all tenant pages.
 */

import type { TemplateComponentSet } from './types';
import type { HotelTemplateName } from '@/lib/tenant/tenant-context';

// Lazy-load templates to avoid bundling all of them upfront
const templateLoaders: Record<HotelTemplateName, () => Promise<{ default: TemplateComponentSet } | TemplateComponentSet>> = {
  MODERN_MINIMAL: () =>
    import('./modern-minimal').then((m) => m.ModernMinimalTemplate),
  LUXURY_RESORT: () =>
    import('./luxury-resort').then((m) => m.LuxuryResortTemplate),
  HERITAGE_BOUTIQUE: () =>
    import('./heritage-boutique').then((m) => m.HeritageBoutiqueTemplate),
  // STARTER uses the legacy hotel page layout, no components needed
  STARTER: () =>
    import('./modern-minimal').then((m) => m.ModernMinimalTemplate),
};

/**
 * Get a template component set by name.
 * Falls back to Modern Minimal for unknown templates.
 */
export async function loadTemplate(name: HotelTemplateName): Promise<TemplateComponentSet> {
  const loader = templateLoaders[name] || templateLoaders.MODERN_MINIMAL;
  const result = await loader();
  // Handle both default export and direct export shapes
  if ('default' in result) return result.default as TemplateComponentSet;
  return result as TemplateComponentSet;
}

/**
 * Synchronous template map - for use ONLY when all templates
 * are already in the bundle (e.g., after dynamic import resolves).
 */
export { ModernMinimalTemplate } from './modern-minimal';
export { LuxuryResortTemplate } from './luxury-resort';
export { HeritageBoutiqueTemplate } from './heritage-boutique';

/**
 * Template metadata for the admin selector UI.
 */
export interface TemplateMeta {
  id: HotelTemplateName;
  name: string;
  description: string;
  preview: string; // Tailwind gradient for preview swatch
  fontHint: string;
}

export const TEMPLATE_CATALOG: TemplateMeta[] = [
  {
    id: 'STARTER',
    name: 'Classic Starter',
    description: 'The default Hotel Manager layout — bold and straightforward with a familiar hotel website feel.',
    preview: 'from-blue-600 to-blue-800',
    fontHint: 'Inter / Sans-serif',
  },
  {
    id: 'MODERN_MINIMAL',
    name: 'Modern Minimal',
    description: 'Clean aesthetic with asymmetric hero, generous whitespace, and contemporary typography.',
    preview: 'from-gray-900 to-gray-700',
    fontHint: 'Inter / Light weights',
  },
  {
    id: 'LUXURY_RESORT',
    name: 'Luxury Resort',
    description: 'Full-screen cinematic imagery, elegant serif typography, and dark accent sections.',
    preview: 'from-stone-900 to-amber-900',
    fontHint: 'Playfair Display / Serif',
  },
  {
    id: 'HERITAGE_BOUTIQUE',
    name: 'Heritage Boutique',
    description: 'Warm earthy tones, ornamental details, and story-driven layouts for heritage properties.',
    preview: 'from-amber-800 to-stone-700',
    fontHint: 'Playfair + Lora / Serif',
  },
];
