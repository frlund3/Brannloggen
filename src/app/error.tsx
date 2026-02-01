'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-theme flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-theme mb-2">Noe gikk galt</h2>
        <p className="text-sm text-theme-secondary mb-4">{error.message || 'En uventet feil oppstod.'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Prøv igjen
        </button>
      </div>
    </div>
  )
}
