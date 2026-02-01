'use client'

import { Toaster } from 'sonner'
import { useTheme } from './ThemeProvider'

export function ThemeToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} position="top-right" richColors closeButton />
}
