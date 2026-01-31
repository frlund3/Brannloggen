import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Pass through all requests - auth is handled client-side
  // by AuthProvider and DashboardLayout to avoid cookie sync issues
  return NextResponse.next({ request })
}
