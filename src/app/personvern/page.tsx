'use client'

import { useSentraler } from '@/hooks/useSupabaseData'

export default function PersonvernPage() {
  const { data: sentraler, loading } = useSentraler()

  const sentralerMedEpost = sentraler.filter(s => s.kontakt_epost)

  return (
    <div className="min-h-screen bg-theme text-theme">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <a href="/" className="text-sm text-blue-400 hover:text-blue-300 mb-6 inline-block">&larr; Tilbake til forsiden</a>

        <h1 className="text-2xl font-bold mb-6">Personvernerklæring</h1>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">1. Behandlingsansvarlig</h2>
            <p>
              Brannloggen er en tjeneste for formidling av hendelser fra norske brannvesen.
              Kontakt oss via e-post for spørsmål om personvern.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">2. Hvilke data samler vi inn?</h2>

            <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1">For vanlige brukere (publikum)</h3>
            <ul className="list-disc list-inside space-y-1 text-theme-secondary">
              <li>Push-token (enhetsidentifikator) dersom du aktiverer varsler</li>
              <li>Dine valgte varselpreferanser (fylker, kategorier, 110-sentraler)</li>
              <li>Plattform (iOS, Android eller Web)</li>
            </ul>
            <p className="mt-2 text-theme-secondary">
              Vi samler ikke inn navn, e-postadresse eller annen personlig informasjon fra vanlige brukere.
            </p>

            <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1">For innloggede brukere (operatører/admin/presse)</h3>
            <ul className="list-disc list-inside space-y-1 text-theme-secondary">
              <li>Fullt navn og e-postadresse</li>
              <li>Rolle og tilknytning til 110-sentraler</li>
              <li>Handlingslogg (audit log) med tidspunkt</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">3. Behandlingsgrunnlag</h2>
            <ul className="list-disc list-inside space-y-1 text-theme-secondary">
              <li><strong className="text-gray-300">Samtykke:</strong> Push-varsler aktiveres kun etter ditt eksplisitte samtykke.</li>
              <li><strong className="text-gray-300">Berettiget interesse:</strong> For innloggede operatører som bruker systemet i tjeneste.</li>
              <li><strong className="text-gray-300">Informasjon av allmenn interesse:</strong> Formidling av branninformasjon til publikum.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">4. Deling av data</h2>
            <p>
              Vi deler ikke personopplysninger med tredjeparter utover det som er nødvendig
              for drift av tjenesten:
            </p>
            <ul className="list-disc list-inside space-y-1 text-theme-secondary mt-2">
              <li><strong className="text-gray-300">Supabase:</strong> Database og autentisering (EU-basert hosting)</li>
              <li><strong className="text-gray-300">Apple/Google:</strong> Push-varsler sendes via APNs/FCM</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">5. Lagring og sletting</h2>
            <p>
              Push-tokens lagres så lenge varsler er aktive. Innloggede brukerprofiler
              lagres så lenge kontoen er aktiv. Handlingsloggen oppbevares i inntil 12 måneder.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">6. Dine rettigheter</h2>
            <p>Etter GDPR har du rett til:</p>
            <ul className="list-disc list-inside space-y-1 text-theme-secondary mt-2">
              <li>Innsyn i hvilke data vi har om deg</li>
              <li>Retting av uriktige opplysninger</li>
              <li>Sletting av dine data</li>
              <li>Å trekke tilbake samtykke for push-varsler</li>
              <li>Å klage til Datatilsynet</li>
            </ul>
            <p className="mt-2">
              For å slette push-varsler: deaktiver varsler i appen eller slett appen.
              Push-tokenet vil da automatisk bli ugyldig.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">7. Informasjonskapsler (cookies)</h2>
            <p>
              Vi bruker kun nødvendige informasjonskapsler for autentisering (innlogging).
              Vi bruker ikke analyse- eller markedsføringscookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">8. Sikkerhet</h2>
            <p>
              All dataoverføring er kryptert med TLS. Tilgang til data er begrenset
              gjennom rollebasert tilgangskontroll (RLS). Push-tokens er kun tilgjengelig
              for administratorer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">9. Kontakt 110-sentraler</h2>
            <p className="mb-3">
              For spørsmål om personvern knyttet til en spesifikk 110-sentral, kontakt dem direkte:
            </p>
            {loading ? (
              <p className="text-theme-muted text-xs">Laster kontaktinformasjon...</p>
            ) : sentralerMedEpost.length > 0 ? (
              <div className="bg-theme-card rounded-xl border border-theme divide-y divide-theme">
                {sentralerMedEpost.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map(s => (
                  <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-theme">{s.kort_navn}</span>
                    <a href={`mailto:${s.kontakt_epost}`} className="text-sm text-blue-400 hover:text-blue-300">
                      {s.kontakt_epost}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-theme-muted text-xs">Ingen kontakt-e-poster registrert ennå.</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme mb-2">10. Endringer</h2>
            <p>
              Denne personvernerklæringen kan oppdateres. Vesentlige endringer vil
              bli varslet i appen.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-theme">
          <p className="text-xs text-theme-muted">Sist oppdatert: Februar 2026</p>
        </div>
      </div>
    </div>
  )
}
