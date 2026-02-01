'use client'

export default function PresseInfoPage() {
  return (
    <div className="min-h-screen bg-theme">
      <header className="sticky top-0 z-30 bg-theme/95 backdrop-blur border-b border-theme">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="Brannloggen" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold text-theme">Brannloggen</span>
          </a>
          <a
            href="/login"
            className="px-3 py-1.5 bg-theme-card hover:bg-theme-card-hover text-theme-secondary hover:text-theme rounded-lg text-sm transition-colors"
          >
            Logg inn
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="w-14 h-14 bg-cyan-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-theme mb-2">Pressetilgang</h1>
          <p className="text-theme-secondary">Informasjon om pressetilgang til Brannloggen</p>
        </div>

        <div className="space-y-6">
          <section className="bg-theme-card border border-theme rounded-xl p-5">
            <h2 className="text-lg font-semibold text-theme mb-3">Om pressetilgang</h2>
            <div className="text-sm text-theme-secondary space-y-3">
              <p>
                Journalister og redaksjoner kan søke om pressetilgang til Brannloggen. Med pressetilgang
                får du tilgang til pressemeldinger og utvidet informasjon om hendelser som ikke er
                tilgjengelig for offentligheten.
              </p>
              <p>
                Alle pressebrukere må være tilknyttet et mediehus eller en redaksjon. Ved registrering
                velger du et mediehus fra listen, eller skriver inn navnet på ditt mediehus om det
                ikke finnes.
              </p>
              <p>
                Søknaden behandles manuelt, og du vil motta en e-post med innloggingsinformasjon
                når kontoen din er godkjent.
              </p>
            </div>
          </section>

          <section className="bg-theme-card border border-theme rounded-xl p-5">
            <h2 className="text-lg font-semibold text-theme mb-3">Krav til pressetilgang</h2>
            <ul className="text-sm text-theme-secondary space-y-2 list-disc list-inside">
              <li>Du må være tilknyttet en redaksjon eller et mediehus</li>
              <li>E-postadressen bør være en jobb-e-post knyttet til mediehuset</li>
              <li>Pressebevis eller redaksjonell tilknytning kan kreves ved behov</li>
              <li>Godkjente brukere får tilgang til pressemeldinger og utvidet informasjon om hendelser</li>
            </ul>
          </section>

          <section className="bg-theme-card border border-theme rounded-xl p-5">
            <h2 className="text-lg font-semibold text-theme mb-3">Hva får du tilgang til?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <h3 className="text-sm font-medium text-cyan-400 mb-1">Pressemeldinger</h3>
                <p className="text-xs text-theme-muted">Offisielle pressemeldinger knyttet til hendelser</p>
              </div>
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <h3 className="text-sm font-medium text-cyan-400 mb-1">Utvidet informasjon</h3>
                <p className="text-xs text-theme-muted">Mer detaljert informasjon om pågående hendelser</p>
              </div>
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <h3 className="text-sm font-medium text-cyan-400 mb-1">Push-varsler</h3>
                <p className="text-xs text-theme-muted">Varsler om nye pressemeldinger og oppdateringer</p>
              </div>
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <h3 className="text-sm font-medium text-cyan-400 mb-1">Presseportal</h3>
                <p className="text-xs text-theme-muted">Egen presseportal med dedikert oversikt</p>
              </div>
            </div>
          </section>

          <div className="text-center py-4">
            <a
              href="/presse-registrering"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Søk om pressetilgang
            </a>
            <p className="text-xs text-theme-muted mt-3">
              Allerede registrert som presse? <a href="/presse/hendelser" className="text-cyan-400 hover:text-cyan-300">Logg inn til presseportalen</a>
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a href="/" className="text-sm text-theme-muted hover:text-theme-secondary">
            Tilbake til forsiden
          </a>
        </div>
      </main>
    </div>
  )
}
