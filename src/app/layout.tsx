import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeToaster } from '@/components/providers/ThemeToaster'
import { PushInit } from '@/components/providers/PushInit'
import { ErrorBoundaryProvider } from '@/components/providers/ErrorBoundaryProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Brannloggen - Hendelser fra norske brannvesen',
  description: 'Følg hendelser fra brannvesenet i Norge i sanntid. Brann, ulykker, redningsaksjoner og mer.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#d42020',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-theme text-theme">
        <ThemeProvider>
          <ErrorBoundaryProvider>
            <AuthProvider>{children}</AuthProvider>
          </ErrorBoundaryProvider>
          <ThemeToaster />
          <PushInit />
        </ThemeProvider>
      </body>
    </html>
  )
}
