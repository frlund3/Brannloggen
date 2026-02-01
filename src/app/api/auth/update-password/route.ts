import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'password1', 'iloveyou', 'sunshine1', 'princess1', 'football1',
  'abc12345', 'monkey123', 'shadow123', 'master123', 'dragon123',
  'passord1', 'passord123', 'hemmelig', 'brannvesen', 'brannmann',
])

function validatePassword(password: string): string | null {
  if (typeof password !== 'string') {
    return 'Ugyldig passord'
  }
  if (password.length < 8) {
    return 'Passordet må være minst 8 tegn'
  }
  if (password.length > 128) {
    return 'Passordet kan ikke være lengre enn 128 tegn'
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Passordet er for vanlig. Velg et sterkere passord.'
  }
  // Require at least one letter and one number
  if (!/[a-zA-ZæøåÆØÅ]/.test(password) || !/\d/.test(password)) {
    return 'Passordet må inneholde minst én bokstav og ett tall'
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { password } = body

    // Server-side validation
    const validationError = validatePassword(password)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify session exists
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Ingen aktiv sesjon. Lenken kan ha utløpt.' }, { status: 401 })
    }

    // Update password
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return NextResponse.json({ error: 'Kunne ikke oppdatere passordet. Prøv igjen.' }, { status: 500 })
    }

    // Sign out after password change
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}
