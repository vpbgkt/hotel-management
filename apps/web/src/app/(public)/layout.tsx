'use client';

/**
 * Public Layout — Single Hotel Website
 * Wraps all guest-facing pages with hotel branding, themed header/footer.
 */

import { TenantProvider, useTenant } from '@/lib/tenant/tenant-context';
import { TenantHeader } from '@/components/tenant/tenant-header';
import { TenantFooter } from '@/components/tenant/tenant-footer';

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { hotel } = useTenant();

  const themeClass = hotel?.template
    ? `theme-${hotel.template.toLowerCase().replace(/_/g, '-')}`
    : 'theme-modern-minimal';

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <TenantHeader />
      <main className="min-h-screen">{children}</main>
      <TenantFooter />
    </div>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantProvider>
      <ThemeWrapper>{children}</ThemeWrapper>
    </TenantProvider>
  );
}
