'use client';

/**
 * Admin Branding & Theme Page - Hotel Manager
 * Simplified: pick a theme preset OR a single brand color + template
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import { GET_HOTEL_BY_ID } from '@/lib/graphql/queries/hotels';
import { UPDATE_HOTEL } from '@/lib/graphql/queries/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Palette,
  Loader2,
  AlertCircle,
  CheckCircle,
  Save,
  Eye,
  LayoutTemplate,
  Check,
  Star,
} from 'lucide-react';
import { TEMPLATE_CATALOG, type TemplateMeta } from '@/components/tenant/templates/registry';
import type { HotelTemplateName } from '@/lib/tenant/tenant-context';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: 'transparent';
  heroStyle: 'full';
}

/** Generate a harmonious secondary (darker) and accent (warm complement) from a single brand color */
function deriveColors(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * 0.8);
  const dg = Math.round(g * 0.8);
  const db = Math.round(b * 0.8);
  const secondary = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  const accent = '#f59e0b';
  return { secondary, accent };
}

const THEME_PRESETS = [
  { name: 'Classic Blue', color: '#2563eb', desc: 'Professional & trustworthy' },
  { name: 'Emerald Green', color: '#059669', desc: 'Fresh & natural' },
  { name: 'Royal Purple', color: '#7c3aed', desc: 'Luxurious & bold' },
  { name: 'Crimson Red', color: '#dc2626', desc: 'Vibrant & energetic' },
  { name: 'Ocean Teal', color: '#0891b2', desc: 'Calm & coastal' },
  { name: 'Midnight', color: '#1f2937', desc: 'Sleek & modern' },
  { name: 'Amber Warm', color: '#d97706', desc: 'Warm & inviting' },
  { name: 'Rose', color: '#e11d48', desc: 'Elegant & romantic' },
];

export default function AdminBrandingPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [saved, setSaved] = useState(false);
  const [brandColor, setBrandColor] = useState('#2563eb');
  const [selectedTemplate, setSelectedTemplate] = useState<HotelTemplateName>('STARTER');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hotelData, loading } = useQuery<any>(GET_HOTEL_BY_ID, {
    variables: { id: hotelId },
    skip: !hotelId,
  });

  const [updateHotel, { loading: saving }] = useMutation(UPDATE_HOTEL, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  useEffect(() => {
    if (hotelData?.hotel?.themeConfig?.primaryColor) {
      setBrandColor(hotelData.hotel.themeConfig.primaryColor);
    }
    if (hotelData?.hotel?.template) {
      setSelectedTemplate(hotelData.hotel.template);
    }
  }, [hotelData]);

  const derived = useMemo(() => deriveColors(brandColor), [brandColor]);

  const handleSave = async () => {
    const theme: ThemeConfig = {
      primaryColor: brandColor,
      secondaryColor: derived.secondary,
      accentColor: derived.accent,
      fontFamily: 'Inter',
      headerStyle: 'transparent',
      heroStyle: 'full',
    };
    await updateHotel({
      variables: {
        input: {
          hotelId,
          themeConfig: theme,
          template: selectedTemplate,
        },
      },
    });
  };

  const hotelName = hotelData?.hotel?.name || 'Your Hotel';

  if (!hotelId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">No Hotel Assigned</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branding & Theme</h1>
          <p className="text-gray-500 mt-1">Choose your brand color and website template</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Saved!
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Theme
          </Button>
        </div>
      </div>

      {/* ======= STEP 1: BRAND COLOR ======= */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand-600" />
            Step 1 — Brand Color
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Pick your hotel&apos;s brand color. We&apos;ll automatically generate matching tones for the entire site.
          </p>

          {/* Preset swatches */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {THEME_PRESETS.map((preset) => {
              const isActive = brandColor === preset.color;
              return (
                <button
                  key={preset.color}
                  onClick={() => setBrandColor(preset.color)}
                  className="group flex flex-col items-center gap-1.5"
                  title={preset.desc}
                >
                  <div
                    className={`w-12 h-12 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center ${
                      isActive ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.color }}
                  >
                    {isActive && <Check className="w-5 h-5 text-white drop-shadow" />}
                  </div>
                  <span className="text-[10px] text-gray-500 group-hover:text-gray-700 text-center leading-tight">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom color picker */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">Custom:</span>
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={brandColor}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(val)) setBrandColor(val);
              }}
              className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              placeholder="#2563eb"
            />
            <div className="flex rounded-lg overflow-hidden shadow-sm ml-2">
              <div className="w-8 h-8" style={{ backgroundColor: brandColor }} title="Brand" />
              <div className="w-8 h-8" style={{ backgroundColor: derived.secondary }} title="Dark" />
              <div className="w-8 h-8" style={{ backgroundColor: derived.accent }} title="Accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======= STEP 2: TEMPLATE ======= */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-brand-600" />
            Step 2 — Website Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Each template applies your brand color with a unique design style.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATE_CATALOG.map((tpl: TemplateMeta) => {
              const isSelected = selectedTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`relative text-left rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                    isSelected
                      ? 'border-gray-900 ring-2 ring-gray-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-10 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <TemplatePreview template={tpl.id as HotelTemplateName} brandColor={brandColor} hotelName={hotelName} />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{tpl.name}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{tpl.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ======= LIVE PREVIEW ======= */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-600" />
            Full Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <FullPreview template={selectedTemplate} brandColor={brandColor} hotelName={hotelName} />
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            This is an approximate preview. Visit your site to see the full experience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Preview Components
   ═══════════════════════════════════════════ */

function TemplatePreview({ template, brandColor, hotelName }: { template: HotelTemplateName; brandColor: string; hotelName: string }) {
  const d = deriveColors(brandColor);

  if (template === 'MODERN_MINIMAL') {
    return (
      <div className="h-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-1/2 px-4 py-5 flex flex-col justify-center bg-gray-50">
            <div className="text-[8px] uppercase tracking-widest text-gray-400 mb-1">Welcome to</div>
            <div className="text-xs font-semibold text-gray-900 truncate mb-2">{hotelName}</div>
            <div className="w-14 h-4 rounded-sm text-[7px] font-medium flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
              Book Now
            </div>
          </div>
          <div className="w-1/2" style={{ background: `linear-gradient(135deg, ${brandColor}30, ${d.secondary}30)` }} />
        </div>
      </div>
    );
  }

  if (template === 'LUXURY_RESORT') {
    return (
      <div className="h-28 relative overflow-hidden text-center flex flex-col items-center justify-center" style={{ background: `linear-gradient(135deg, ${d.secondary}, ${brandColor})` }}>
        <div className="text-[7px] uppercase tracking-[0.25em] text-white/50 mb-1">An Exquisite Escape</div>
        <div className="text-sm font-bold text-white mb-2" style={{ fontFamily: 'serif' }}>{hotelName}</div>
        <div className="w-20 h-4 border text-[7px] font-medium flex items-center justify-center text-white/80" style={{ borderColor: `${brandColor}88` }}>
          Reserve Suite
        </div>
      </div>
    );
  }

  if (template === 'HERITAGE_BOUTIQUE') {
    return (
      <div className="h-28 relative overflow-hidden text-center flex flex-col items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColor}ee, ${d.secondary}cc)` }}>
        <div className="text-white/40 text-[8px] mb-1">◈ ◇ ◈</div>
        <div className="text-[7px] uppercase tracking-[0.15em] text-white/60 mb-1">Est. Heritage</div>
        <div className="text-sm font-bold text-white" style={{ fontFamily: 'serif' }}>{hotelName}</div>
      </div>
    );
  }

  // STARTER
  return (
    <div className="h-28 relative overflow-hidden flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColor}, ${d.secondary})` }}>
      <div className="text-center">
        <div className="text-[8px] text-white/70 mb-1">Welcome to</div>
        <div className="text-sm font-bold text-white mb-2">{hotelName}</div>
        <div className="w-16 h-5 rounded-full text-[7px] font-medium flex items-center justify-center mx-auto" style={{ backgroundColor: d.accent, color: '#fff' }}>
          Book Now
        </div>
      </div>
    </div>
  );
}

function FullPreview({ template, brandColor, hotelName }: { template: HotelTemplateName; brandColor: string; hotelName: string }) {
  const d = deriveColors(brandColor);

  const roomCards = (
    <div className="grid grid-cols-3 gap-3 py-6 px-6">
      {['Deluxe Room', 'Ocean Suite', 'Garden Villa'].map((name, i) => (
        <div key={name} className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="h-16" style={{ background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}05)` }} />
          <div className="p-2">
            <div className="text-[10px] font-semibold text-gray-900">{name}</div>
            <div className="text-[9px] text-gray-500">₹{(3000 + i * 1500).toLocaleString()}/night</div>
            <div className="mt-1.5 w-full h-4 rounded text-[7px] font-medium flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
              Book Now
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (template === 'MODERN_MINIMAL') {
    return (
      <>
        <div className="px-6 py-3 bg-white flex items-center justify-between border-b border-gray-100">
          <span className="text-xs font-light tracking-widest uppercase text-gray-900">{hotelName}</span>
          <div className="flex gap-4 text-[10px] tracking-wide text-gray-400 uppercase">
            <span>Rooms</span><span>About</span><span>Contact</span>
          </div>
        </div>
        <div className="flex h-40">
          <div className="w-1/2 bg-gray-50 px-6 flex flex-col justify-center">
            <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-1">Welcome to</div>
            <div className="text-lg font-light text-gray-900 mb-2">{hotelName}</div>
            <div className="flex items-center gap-1 mb-3">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
            </div>
            <button className="self-start px-4 py-1.5 text-white text-[9px] uppercase tracking-wider rounded-none" style={{ backgroundColor: brandColor }}>
              Explore Rooms
            </button>
          </div>
          <div className="w-1/2" style={{ background: `linear-gradient(135deg, ${brandColor}15, ${d.secondary}25)` }}>
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">Hero Image</div>
          </div>
        </div>
        {roomCards}
      </>
    );
  }

  if (template === 'LUXURY_RESORT') {
    return (
      <>
        <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: d.secondary }}>
          <span className="text-xs font-semibold tracking-wide" style={{ color: `${brandColor}99`, fontFamily: 'serif' }}>{hotelName}</span>
          <div className="flex gap-4 text-[10px] tracking-wide" style={{ color: `${brandColor}55` }}>
            <span>Suites</span><span>Dining</span><span>Spa</span>
          </div>
        </div>
        <div className="px-6 py-16 text-center" style={{ background: `linear-gradient(135deg, ${d.secondary}ee, ${brandColor}cc)` }}>
          <div className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: `${brandColor}88` }}>An Exquisite Escape</div>
          <div className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'serif' }}>{hotelName}</div>
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1,2,3,4,5].map((i) => <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
          </div>
          <button className="px-5 py-1.5 border text-[9px] uppercase tracking-widest text-white/80" style={{ borderColor: `${brandColor}66` }}>
            Reserve Your Suite
          </button>
        </div>
        {roomCards}
      </>
    );
  }

  if (template === 'HERITAGE_BOUTIQUE') {
    return (
      <>
        <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#f5f0e8' }}>
          <span className="text-xs font-semibold" style={{ color: brandColor, fontFamily: 'serif' }}>◇ {hotelName} ◇</span>
          <div className="flex gap-4 text-[10px]" style={{ color: `${brandColor}88` }}>
            <span>Heritage</span><span>Rooms</span><span>Stories</span>
          </div>
        </div>
        <div className="px-6 py-14 text-center" style={{ background: `linear-gradient(135deg, ${brandColor}ee, ${d.secondary}dd)` }}>
          <div className="text-white/40 text-[10px] mb-1">◈ ◇ ◈</div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">Est. Since 1920</div>
          <div className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'serif' }}>{hotelName}</div>
          <button className="px-5 py-1.5 text-white/90 text-[9px] uppercase tracking-wider rounded-sm" style={{ backgroundColor: brandColor }}>
            Explore Heritage
          </button>
        </div>
        {roomCards}
      </>
    );
  }

  // STARTER
  return (
    <>
      <div className="px-6 py-3 flex items-center justify-between text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, ${d.secondary})` }}>
        <span className="font-bold text-sm">{hotelName}</span>
        <div className="flex gap-4 text-[10px] text-white/70">
          <span>Rooms</span><span>Gallery</span><span>Contact</span>
        </div>
      </div>
      <div className="px-6 py-14 text-center text-white" style={{ background: `linear-gradient(135deg, ${brandColor}ee, ${d.secondary}ee)` }}>
        <div className="flex items-center justify-center gap-1 mb-2">
          {[1,2,3,4,5].map((i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
        </div>
        <div className="text-xl font-bold mb-1">{hotelName}</div>
        <div className="text-white/70 text-xs mb-4">Your perfect stay awaits</div>
        <button className="px-5 py-1.5 rounded-full font-medium text-[10px] text-white" style={{ backgroundColor: d.accent }}>
          Book Now
        </button>
      </div>
      {roomCards}
    </>
  );
}
