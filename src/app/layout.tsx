import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Toaster } from 'sonner'
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-white">
        <AuthProvider>{children}</AuthProvider>
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
