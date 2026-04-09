"use client"

import ErrorBoundary from "@/components/error-boundary"
import OfflineBanner from "@/components/offline-banner"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      {children}
    </ErrorBoundary>
  )
}
