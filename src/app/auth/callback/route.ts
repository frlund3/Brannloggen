import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Only allow redirects to these internal paths to prevent open redirect
const ALLOWED_NEXT_PATHS = ['/oppdater-passord', '/login', '/operator/hendelser', '/presse/hendelser']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'invite' | 'signup' | 'email' | 'magiclink' | undefined
  const rawNext = searchParams.get('next') ?? '/login'

  // Validate next parameter: must be a relative path and in allowlist
  const next = ALLOWED_NEXT_PATHS.includes(rawNext) ? rawNext : '/login'

  const supabase = await createServerSupabaseClient()

  // Handle PKCE code exchange (standard flow)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If this is a recovery session and no explicit next was provided,
      // redirect to the password update page
      let redirectPath = next
      if (redirectPath === '/login' && data.session?.user?.recovery_sent_at) {
        const recoverySentAt = new Date(data.session.user.recovery_sent_at).getTime()
        const now = Date.now()
        // If recovery was sent within the last hour, this is likely a password reset flow
        if (now - recoverySentAt < 60 * 60 * 1000) {
          redirectPath = '/oppdater-passord'
        }
      }
      return NextResponse.redirect(new URL(redirectPath, origin))
    }
  }

  // Handle token_hash verification (email template flow)
  // This is used when the email template links directly with {{ .TokenHash }}
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // If all verification fails, redirect to login
  return NextResponse.redirect(new URL('/login', origin))
}
