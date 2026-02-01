import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Only allow redirects to these internal paths to prevent open redirect
const ALLOWED_NEXT_PATHS = ['/oppdater-passord', '/login', '/operator/hendelser', '/presse/hendelser']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/login'

  // Validate next parameter: must be a relative path and in allowlist
  const next = ALLOWED_NEXT_PATHS.includes(rawNext) ? rawNext : '/login'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // If code exchange fails, redirect to login
  return NextResponse.redirect(new URL('/login', origin))
}
