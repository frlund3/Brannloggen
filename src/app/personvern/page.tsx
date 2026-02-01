export default function PersonvernPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <a href="/" className="text-sm text-blue-400 hover:text-blue-300 mb-6 inline-block">&larr; Tilbake til forsiden</a>

        <h1 className="text-2xl font-bold mb-6">Personvernerklaering</h1>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Behandlingsansvarlig</h2>
            <p>
              Brannloggen er en tjeneste for formidling av hendelser fra norske brannvesen.
              Kontakt oss via e-post for spoersmaal om personvern.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Hvilke data samler vi inn?</h2>

            <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1">For vanlige brukere (publikum)</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Push-token (enhetsidentifikator) dersom du aktiverer varsler</li>
              <li>Dine valgte varselpreferanser (fylker, kategorier, 110-sentraler)</li>
              <li>Plattform (iOS, Android eller Web)</li>
            </ul>
            <p className="mt-2 text-gray-400">
              Vi samler ikke inn navn, e-postadresse eller annen personlig informasjon fra vanlige brukere.
            </p>

            <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1">For innloggede brukere (operatoerer/admin/presse)</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Fullt navn og e-postadresse</li>
              <li>Rolle og tilknytning til 110-sentraler</li>
              <li>Handlingslogg (audit log) med tidspunkt</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Behandlingsgrunnlag</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong className="text-gray-300">Samtykke:</strong> Push-varsler aktiveres kun etter ditt eksplisitte samtykke.</li>
              <li><strong className="text-gray-300">Berettiget interesse:</strong> For innloggede operatoerer som bruker systemet i tjeneste.</li>
              <li><strong className="text-gray-300">Informasjon av allmenn interesse:</strong> Formidling av branninformasjon til publikum.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Deling av data</h2>
            <p>
              Vi deler ikke personopplysninger med tredjeparter utover det som er noedvendig
              for drift av tjenesten:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
              <li><strong className="text-gray-300">Supabase:</strong> Database og autentisering (EU-basert hosting)</li>
              <li><strong className="text-gray-300">Apple/Google:</strong> Push-varsler sendes via APNs/FCM</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Lagring og sletting</h2>
            <p>
              Push-tokens lagres saa lenge varsler er aktive. Innloggede brukerprofiler
              lagres saa lenge kontoen er aktiv. Handlingsloggen oppbevares i inntil 12 maaneder.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Dine rettigheter</h2>
            <p>Etter GDPR har du rett til:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
              <li>Innsyn i hvilke data vi har om deg</li>
              <li>Retting av uriktige opplysninger</li>
              <li>Sletting av dine data</li>
              <li>Aa trekke tilbake samtykke for push-varsler</li>
              <li>Aa klage til Datatilsynet</li>
            </ul>
            <p className="mt-2">
              For aa slette push-varsler: deaktiver varsler i appen eller slett appen.
              Push-tokenet vil da automatisk bli ugyldig.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Informasjonskapsler (cookies)</h2>
            <p>
              Vi bruker kun noedvendige informasjonskapsler for autentisering (innlogging).
              Vi bruker ikke analyse- eller markedsfoerings-cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Sikkerhet</h2>
            <p>
              All dataoverfoering er kryptert med TLS. Tilgang til data er begrenset
              gjennom rollebasert tilgangskontroll (RLS). Push-tokens er kun tilgjengelig
              for administratorer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Endringer</h2>
            <p>
              Denne personvernerkl&aelig;ringen kan oppdateres. Vesentlige endringer vil
              bli varslet i appen.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
          <p className="text-xs text-gray-500">Sist oppdatert: Februar 2026</p>
        </div>
      </div>
    </div>
  )
}
