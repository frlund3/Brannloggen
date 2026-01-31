import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Brannloggen - Hendelser fra norske brannvesen',
  description: 'Følg hendelser fra brannvesenet i Norge i sanntid. Brann, ulykker, redningsaksjoner og mer.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-white">
        {children}
      </body>
    </html>
  )
}
