'use client'

import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export function ErrorBoundaryProvider({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
