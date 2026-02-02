# Sikkerhetsdokumentasjon - Brannloggen

**Versjon:** 3.0
**Dato:** 1. februar 2026
**Ansvarlig:** Brannloggen
**Klassifisering:** Intern / Deles med oppdragsgiver

---

## 1. Oversikt

Brannloggen er en nettbasert plattform for registrering, overvåking og varsling av brann- og redningshendelser i Norge. Systemet er bygget for bruk av 110-sentraler, brannvesen og pressebrukere, og håndterer hendelsesdata som kan være tidskritisk.

### Teknologistakk

| Komponent | Teknologi | Versjon |
|-----------|-----------|---------|
| Frontend | Next.js (React) | 16.x |
| Backend/Database | Supabase (PostgreSQL) | Hosted |
| Autentisering | Supabase Auth (JWT) | - |
| Push-varsling | Web Push (VAPID), FCM, APNs | - |
| Mobilapp | Capacitor (iOS/Android) | 8.x |
| Hosting | Vercel (frontend) + Supabase (backend) | - |

---

## 2. Autentisering og autorisasjon

### 2.1 Autentiseringsflyt

- **Metode:** JWT-basert autentisering via Supabase Auth
- **Sesjonshåndtering:** HTTP-only cookies administrert av Supabase SSR
- **Token-fornyelse:** Automatisk via Supabase SDK
- **Timeout:** Server-side middleware verifiserer JWT med 3-sekunders timeout for robusthet
- **Idle timeout:** Automatisk utlogging etter 30 minutters inaktivitet (klient-side overvåkning av museklikk, tastatur, scroll og touch)
- **Innloggingsbeskyttelse:** Server-side rate limiting på innlogging – maks 5 forsøk per 15 minutter per IP-adresse

### 2.2 Rollebasert tilgangskontroll (RBAC)

Systemet har fire roller med strengt hierarki:

| Rolle | Tilgang | Beskrivelse |
|-------|---------|-------------|
| `admin` | Full tilgang | Systemadministrator – alle funksjoner |
| `110-admin` | Avgrenset admin | 110-sentral-administrator – begrenset til egen sentral |
| `operatør` | Operativ tilgang | Kan opprette/redigere hendelser innenfor sin sentral |
| `presse` | Lesetilgang | Kan se hendelser og pressemeldinger |

### 2.3 Rolleeskalering-beskyttelse

En database-trigger (`prevent_role_escalation`) sikrer at ingen bruker kan endre sin egen rolle. Kun administratorer kan tildele eller endre roller.

### 2.4 Middleware-beskyttelse

Next.js middleware beskytter alle dashboard-ruter:
- `/operator/*` – Krever innlogging
- `/admin/*` – Krever innlogging
- `/presse/*` – Krever innlogging

Uautentiserte brukere omdirigeres til `/login`.

---

## 3. Databasesikkerhet (Row-Level Security)

### 3.1 RLS-oversikt

Alle tabeller i Supabase har Row-Level Security (RLS) aktivert. Dette betyr at databasen selv håndhever tilgangskontroll – uavhengig av applikasjonskoden.

| Tabell | RLS | Lesetilgang | Skrivetilgang |
|--------|-----|-------------|---------------|
| hendelser | Aktivert | Alle (offentlig data) | Operatører/admins |
| hendelsesoppdateringer | Aktivert | Alle | Operatører/admins |
| interne_notater | Aktivert | Operatører/admins | Operatører/admins |
| brukerprofiler | Aktivert | Egen profil | Egen profil (uten rolle) |
| push_abonnenter | Aktivert | Alle | Begrenset til egen enhet |
| push_notification_queue | Aktivert | Kun admins | Triggers (SECURITY DEFINER) |
| aktivitetslogg | Aktivert | Kun admins | Kun egen bruker-ID |
| presseoppdateringer | Aktivert | Alle (offentlig) | Operatører/admins |
| presse_søknader | Aktivert | Egen søknad / admins | Alle kan søke |

### 3.2 SECURITY DEFINER-funksjoner

Kritiske operasjoner bruker `SECURITY DEFINER`-funksjoner som kjører med forhøyede rettigheter, men med streng `search_path`:

- `get_my_rolle()` – Returnerer innlogget brukers rolle
- `prevent_role_escalation()` – Forhindrer rolleeskalering
- `fn_queue_push_hendelse()` – Køer push-varsler ved hendelser
- `fn_process_push_queue()` – Trigger edge function for push-utsending

---

## 4. API-sikkerhet

### 4.1 Endepunkter

| Endepunkt | Metode | Autentisering | Formål |
|-----------|--------|---------------|--------|
| `/api/test-push` | GET/POST | JWT (innlogget bruker) | Push-statistikk og testing |
| `/api/auth/login` | POST | Rate-begrenset | Innlogging med brute-force-beskyttelse |
| Edge: `send-push` | POST | Service role key / JWT | Prosessering av push-kø |
| Edge: `create-user` | POST | Service role key | Opprettelse av brukerkontoer |
| Edge: `approve-presse` | POST | Service role key / JWT | Godkjenning av pressesøknader |

### 4.2 Edge Function-sikkerhet

- **Autentisering:** Eksakt match av service role key (Bearer token) eller verifisert JWT
- **CORS:** Begrenset til `https://brannloggen.no` (konfigurerbart via miljøvariabel)
- **Feilhåndtering:** Generiske feilmeldinger returneres til klient; detaljerte feil logges server-side

### 4.3 Sikkerhetsheadere

Følgende HTTP-headere er konfigurert på alle sider:

| Header | Verdi | Formål |
|--------|-------|--------|
| `X-Content-Type-Options` | `nosniff` | Forhindrer MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Forhindrer clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Begrenser referrer-informasjon |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blokkerer unødvendige APIer |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Tvinger HTTPS |
| `X-DNS-Prefetch-Control` | `on` | Optimert DNS-oppslag |
| `Content-Security-Policy` | Se seksjon 4.4 | Kontrollerer hvilke ressurser nettleseren kan laste |

### 4.4 Content Security Policy (CSP)

En streng Content Security Policy er konfigurert for å begrense hvilke ressurser nettleseren har lov til å laste. Dette beskytter mot XSS, data-injeksjon og andre kode-injeksjonsangrep.

| Direktiv | Verdi | Formål |
|----------|-------|--------|
| `default-src` | `'self'` | Kun ressurser fra eget domene som standard |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | Scripts kun fra eget domene + Next.js-krav |
| `style-src` | `'self' 'unsafe-inline'` | Stiler fra eget domene + Tailwind CSS |
| `img-src` | `'self' data: blob: https://*.supabase.co` | Bilder fra eget domene og Supabase storage |
| `font-src` | `'self' data:` | Fonter kun fra eget domene |
| `connect-src` | `'self' https://*.supabase.co wss://*.supabase.co https://ws.geonorge.no` | API-kall kun til godkjente domener |
| `worker-src` | `'self' blob:` | Service workers kun fra eget domene |
| `frame-ancestors` | `'self'` | Forhindrer embedding i andre sider (clickjacking) |
| `base-uri` | `'self'` | Forhindrer base tag-hijacking |
| `form-action` | `'self'` | Skjemaer kan kun sendes til eget domene |
| `upgrade-insecure-requests` | – | Oppgraderer HTTP til HTTPS automatisk |

**Godkjente eksterne domener:**

| Domene | Formål | Protokoll |
|--------|--------|-----------|
| `*.supabase.co` | Database, auth, storage, realtime | HTTPS + WSS |
| `ws.geonorge.no` | Adresseoppslag (offentlig norsk API) | HTTPS |

### 4.5 Rate Limiting

API-endepunkter er beskyttet med rate limiting for å forhindre misbruk og DDoS-angrep:

| Endepunkt | Grense | Vindu | Identifikator |
|-----------|--------|-------|---------------|
| `/api/auth/login` (POST) | 5 forespørsler | 15 minutter | IP-adresse |
| `/api/test-push` (GET) | 10 forespørsler | 60 sekunder | IP-adresse |
| `/api/test-push` (POST) | 10 forespørsler | 60 sekunder | IP-adresse |

**Implementasjonsdetaljer:**
- Sliding window-algoritme per IP-adresse
- HTTP 429 (Too Many Requests) med `Retry-After`-header ved overskridelse
- `X-RateLimit-Limit` og `X-RateLimit-Remaining`-headere i respons
- Automatisk opprydding av utløpte oppføringer for å forhindre minnelekkasje
- IP-identifikasjon via `X-Forwarded-For` (Vercel/Cloudflare) eller `X-Real-IP`

**Edge Functions:**
Supabase Edge Functions har innebygd rate limiting på plattformnivå. I tillegg begrenser vår kø-prosessering til maks 50 elementer per kjøring.

### 4.6 Input-validering (Zod)

Alle API-endepunkter og edge functions bruker Zod-skjemavalidering for streng typesikker input-validering:

| Edge Function | Validerte felt | Regler |
|---------------|---------------|--------|
| `create-user` | `fullt_navn` | String, 2–200 tegn |
| | `epost` | Gyldig e-postformat, maks 254 tegn |
| | `rolle` | Enum: admin, 110-admin, operatør, presse |
| | `sentral_ids` | Valgfri array av UUID-strenger |
| `approve-presse` | `soknad_id` | Gyldig UUID |
| | `action` | Enum: godkjent, avvist |
| | `avvisningsgrunn` | Valgfri string, maks 500 tegn |

**Valideringsprinsipper:**
- All input valideres før den behandles (fail-fast)
- Ugyldige forespørsler gir HTTP 400 med brukervennlig feilmelding
- Ugyldig JSON fanges separat med tydelig feilmelding
- Ingen interne feildetaljer eksponeres til klient
- Database-constraints gir et ekstra sikkerhetslag (defence in depth)

### 4.7 Filopplastingssikkerhet

Alle filopplastinger (bilder til hendelser) valideres før opplasting:

| Kontroll | Beskrivelse |
|----------|-------------|
| Filstørrelse | Maks 10 MB per fil |
| Filtype (endelse) | Kun: jpg, jpeg, png, gif, webp, svg |
| MIME-type | Validert mot tillatte bildetyper |
| Magic bytes | Filinnhold verifiseres mot kjente bildeformat-signaturer (JPEG, PNG, GIF, WebP) |
| Tom fil | Avvises umiddelbart |

**Sikkerhetstiltak:**
- Flerlagsvalidering: metadata (type, størrelse, endelse) + innholdsanalyse (magic bytes)
- SVG-filer sjekkes for MIME-type men ikke magic bytes (tekstbasert format)
- Filnavn sanitiseres med tidsstempel for å unngå path traversal
- Supabase Storage håndterer lagring med egne sikkerhetskontroller

---

## 5. Push-varsling og kryptering

### 5.1 Arkitektur

Push-varsling følger en købasert arkitektur:

1. Database-trigger køer hendelse i `push_notification_queue`
2. pg_net trigger kaller `send-push` edge function asynkront
3. Edge function filtrerer abonnenter basert på preferanser
4. Varsler sendes via plattform-spesifikke kanaler

### 5.2 Kryptering

| Plattform | Protokoll | Kryptering |
|-----------|-----------|------------|
| Web Push | RFC 8291/8292 | AES-128-GCM + ECDH P-256 + VAPID |
| iOS (APNs) | TLS 1.3 | ES256 JWT-signert |
| Android (FCM) | TLS 1.3 | Server key autentisering |

### 5.3 Web Push-detaljer

- **VAPID-signering:** ES256 (ECDSA P-256) med privat nøkkel fra miljøvariabel
- **Payload-kryptering:** Full RFC 8291 aes128gcm-implementasjon
  - Ephemeral ECDH-nøkkelpar per melding
  - HKDF-basert nøkkelavledning
  - AES-128-GCM symmetrisk kryptering
- **Token-gyldighet:** 12 timer (VAPID JWT expiry)

---

## 6. Dataminimering og GDPR

### 6.1 Personopplysninger som behandles

| Datakategori | Brukere | Formål | Rettslig grunnlag |
|-------------|---------|--------|-------------------|
| E-post og navn | Interne brukere | Kontoadministrasjon | Berettiget interesse (ansatte) |
| Push-token | Alle med varsling | Levering av varsler | Samtykke |
| Varslingspreferanser | Alle med varsling | Filtrering av varsler | Samtykke |
| Aktivitetslogg | Interne brukere | Revisjonsspor | Berettiget interesse |

### 6.2 Datalagring og sletting

| Data | Oppbevaringstid | Sletting |
|------|----------------|----------|
| Aktivitetslogg | Maks 12 måneder | Automatisk daglig opprydding (pg_cron) |
| Push-kø (behandlet) | Maks 30 dager | Automatisk daglig opprydding |
| Push-token | Så lenge varsling er aktiv | Slettes ved deaktivering |
| Brukerkontoer | Så lenge ansettelsesforhold | Manuell sletting av admin |

### 6.3 Brukerrettigheter (GDPR Artikkel 15–22)

- **Innsyn:** Brukere kan se egne data via dashboard
- **Retting:** Brukere kan oppdatere egen profil
- **Sletting:** Kan kreves via e-post til post@brannloggen.no
- **Dataportabilitet:** Aktivitetslogg kan eksporteres av admin
- **Samtykke-tilbaketrekking:** Deaktivering av push-varsling sletter token

### 6.4 Underleverandører (Databehandlere)

| Leverandør | Tjeneste | Lokasjon | DPA |
|------------|----------|----------|-----|
| Supabase | Database, autentisering, edge functions | EU (AWS eu-central-1) | Ja |
| Vercel | Frontend-hosting | Global CDN (EU-prioritert) | Ja |
| Apple (APNs) | iOS push-levering | USA | Standardavtale |
| Google (FCM) | Android push-levering | USA | Standardavtale |

---

## 7. Nettverkssikkerhet

### 7.1 Transportkryptering

- **Alle forbindelser:** TLS 1.2+ (HTTPS tvunget via HSTS)
- **Database-tilkobling:** Kryptert via Supabase plattform
- **Push-varsler:** Ende-til-ende kryptert (Web Push) eller TLS (APNs/FCM)
- **Ingen HTTP-fallback:** Applikasjonen bruker aldri ukrypterte forbindelser

### 7.2 CORS-policy

Edge functions aksepterer kun forespørsler fra:
- `https://brannloggen.no` (produksjon)
- Konfigurerbart via `ALLOWED_ORIGIN` miljøvariabel

### 7.3 Hemmelighetshåndtering

- **Miljøvariabler:** All sensitiv konfigurasjon lagres som miljøvariabler
- **Supabase Vault:** Database-hemmeligheter (service role key, URL) lagres i Supabase Vault
- **Ingen hardkodede hemmeligheter:** Ingen private nøkler eller tokens i kildekoden
- **Git:** `.env`-filer er ekskludert via `.gitignore`

---

## 8. Injeksjonsbeskyttelse

### 8.1 SQL-injeksjon

- **Mitigering:** Alle databasespørringer bruker parameteriserte queries via Supabase SDK
- **Ingen rå SQL:** Applikasjonskoden benytter aldri rå SQL-strengbygging
- **Migrasjoner:** SQL-migrasjoner bruker `format()` med `%I` (identifier quoting) for dynamiske spørringer

### 8.2 XSS (Cross-Site Scripting)

- **React-rammeverk:** Automatisk escaping av all brukerinput ved rendering
- **Ingen `dangerouslySetInnerHTML`:** Ikke brukt noe sted i applikasjonen
- **Ingen `eval()` eller `innerHTML`:** Ingen usikre JavaScript-mønstre
- **Content-Type headers:** `nosniff` forhindrer MIME-type-angrep

### 8.3 CSRF (Cross-Site Request Forgery)

- **Supabase SSR:** Cookie-basert autentisering med SameSite-beskyttelse
- **JWT-verifisering:** Alle API-kall krever gyldig JWT-token

---

## 9. Logging og overvåkning

### 9.1 Aktivitetslogg

Alle sensitive operasjoner logges i `aktivitetslogg`-tabellen:

- **Hva logges:** Handling, tabell, rad-ID, hendelse-tittel, tidspunkt
- **Hvem:** Bruker-ID (knyttet til auth.users)
- **Tilgang:** Kun administratorer kan lese logger
- **Oppbevaring:** Automatisk sletting etter 12 måneder

**Loggede handlinger:**

| Kategori | Handlinger |
|----------|-----------|
| Autentisering | `innlogget`, `utlogget`, `innlogging_feilet` |
| Hendelser | `opprettet`, `redigert`, `deaktivert`, `avsluttet`, `gjenåpnet` |
| Bilder | `bilde_lastet_opp`, `bilde_fjernet` |
| Oppdateringer | `ny_oppdatering`, `redigert_oppdatering`, `deaktivert_oppdatering` |
| Pressemeldinger | `ny_pressemelding`, `redigert_pressemelding`, `deaktivert_pressemelding` |
| Notater | `ny_notat`, `redigert_notat`, `deaktivert_notat` |

### 9.2 Edge Function-logging

- Feil logges server-side via `console.error()`
- Tilgjengelig via Supabase dashboard (Edge Function logs)
- Ingen personopplysninger i feilmeldinger til klient

---

## 10. Sikkerhetsarkitektur – diagram

```
Bruker (nettleser/app)
  |
  | HTTPS (TLS 1.2+)
  v
[Vercel CDN] -- Security Headers (HSTS, X-Frame-Options, CSP)
  |
  | Next.js Middleware (JWT-verifisering, rutebeskyttelse)
  v
[Next.js App]
  |
  | Supabase SDK (JWT Bearer)
  v
[Supabase]
  |- Auth (JWT-utstedelse, brukerverifisering)
  |- Database (RLS-håndhevelse på alle tabeller)
  |    |- Triggers (SECURITY DEFINER)
  |    |- pg_net (async HTTP for push)
  |- Edge Functions (isolert Deno-runtime)
  |    |- send-push (VAPID/AES-128-GCM kryptering)
  |    |- create-user (admin-beskyttet)
  |    |- approve-presse (admin-beskyttet)
  |- Vault (hemmelighetslagring)
  v
[Push-tjenester]
  |- APNs (iOS) -- TLS + ES256 JWT
  |- FCM (Android) -- TLS + Server Key
  |- Web Push -- AES-128-GCM + VAPID ES256
```

---

## 11. Kjente begrensninger og anbefalinger

### 11.1 Implementert sikkerhetsstatus

| Område | Status | Detaljer |
|--------|--------|----------|
| Rate limiting | Implementert | Sliding window per IP, inkludert innlogging (5 forsøk/15 min) og API-ruter |
| Brute-force-beskyttelse | Implementert | Server-side rate limiting på innlogging, generiske feilmeldinger |
| Sesjonstimeout | Implementert | Automatisk utlogging etter 30 minutters inaktivitet |
| Filopplastingssikkerhet | Implementert | Filstørrelse, MIME-type, filendelse og magic bytes-validering |
| Autentiseringslogging | Implementert | Innlogging, utlogging og feilede forsøk logges i aktivitetslogg |
| Input-validering | Implementert | Zod-skjemavalidering på alle edge functions |
| Content Security Policy | Implementert | Streng CSP med godkjente domener |
| Sikkerhetsheadere | Implementert | HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| RLS (Row-Level Security) | Implementert | Alle tabeller med rollebaserte policies |
| Rolleeskalering-beskyttelse | Implementert | Database-trigger forhindrer selvtildeling av roller |
| GDPR-dataoppbevaring | Implementert | Automatisk sletting via pg_cron (12 mnd logg, 30 dager kø) |
| Feilmeldingssanitisering | Implementert | Generiske feilmeldinger til klient, detaljert logging server-side |
| JWT-verifisering | Implementert | Eksakt Bearer-match + Supabase auth.getUser() verifisering |
| Mobil UI-integritet | Implementert | Varselpanelet bruker viewport-forankret posisjonering på mobil for å sikre at all hendelsesinformasjon er synlig og tilgjengelig på alle skjermstørrelser |

### 11.2 Anbefalte fremtidige tiltak

| Prioritet | Tiltak | Beskrivelse | Kostnad/Innsats |
|-----------|--------|-------------|-----------------|
| Høy | Penetrasjonstesting | Ekstern sikkerhetsgjennomgang av autorisert tester. Anbefales sterkt for statlig bruk. Bør utføres før produksjonslansering og deretter årlig. | Moderat |
| Høy | Automatisk sårbarhetsscanning | `npm audit` og Dependabot/Snyk i CI/CD-pipeline for å oppdage kjente sårbarheter i avhengigheter. | Lav |
| Medium | WAF (Web Application Firewall) | Cloudflare, AWS WAF eller lignende foran Vercel for DDoS-beskyttelse og bot-filtrering. | Moderat |
| Medium | SIEM-integrasjon | Koble aktivitetslogg til sentralt loggverktøy (Splunk, ELK, Azure Sentinel) for overvåkning og varsling. | Moderat |
| Medium | Distribuert rate limiting | Oppgrader til Redis/Upstash-basert rate limiting for multi-instans-deployments. | Lav |
| Lav | Subresource Integrity (SRI) | Legg til integrity-attributter på alle eksterne scripts (for fremtidig bruk). | Lav |
| Lav | CSP nonce-basert | Erstatt `'unsafe-inline'` med nonce-basert CSP for enda strengere script-kontroll. | Moderat |

### 11.3 Anbefaling: Penetrasjonstesting

For statlig bruk anbefales det sterkt å gjennomføre en formell penetrasjonstest. Følgende områder bør testes:

1. **Autentisering og sesjonshåndtering**
   - JWT token-manipulering
   - Sesjonsfiksering og session replay
   - Brute-force mot innlogging

2. **Autorisasjon og tilgangskontroll**
   - Horisontal og vertikal privilegieeskalering
   - RLS-bypass-forsøk
   - IDOR (Insecure Direct Object Reference)

3. **Input-validering**
   - SQL-injeksjon via Supabase API
   - XSS via hendelsesdata
   - SSRF via edge functions

4. **API-sikkerhet**
   - Rate limiting-omgåelse
   - Edge function-autentisering
   - CORS-policy-testing

5. **Infrastruktur**
   - Supabase-konfigurasjon
   - Vercel-sikkerhet
   - DNS- og sertifikatkonfigurasjon

**Anbefalte standarder:**
- OWASP Testing Guide v4
- OWASP Application Security Verification Standard (ASVS) Level 2
- NSMs grunnprinsipper for IKT-sikkerhet

---

## 12. Samsvar og sertifiseringer

| Krav | Status | Merknad |
|------|--------|---------|
| GDPR | Implementert | Personvernerklæring, samtykke, automatisk sletting, oppbevaringsfrister |
| NSMs grunnprinsipper | Implementert | Identifisere, beskytte, oppdage, respondere |
| OWASP Top 10 (2021) | Adressert | Se seksjon 12.1 |
| eIDAS | Ikke relevant | Ingen elektronisk signering |

### 12.1 OWASP Top 10 (2021) – Status

| # | Risiko | Status | Tiltak |
|---|--------|--------|--------|
| A01 | Broken Access Control | Mitigert | RLS på alle tabeller, RBAC, rolleeskalerings-trigger, middleware-rutebeskyttelse |
| A02 | Cryptographic Failures | Mitigert | TLS 1.2+, HSTS, AES-128-GCM (Web Push), ES256 (VAPID/APNs), ingen hardkodede hemmeligheter |
| A03 | Injection | Mitigert | Parameteriserte queries (Supabase SDK), Zod input-validering, ingen rå SQL i app-kode |
| A04 | Insecure Design | Mitigert | Købasert push-arkitektur, SECURITY DEFINER med search_path, defence in depth |
| A05 | Security Misconfiguration | Mitigert | Sikkerhetsheadere, CSP, CORS-begrensning, streng RLS |
| A06 | Vulnerable Components | Delvis | Ingen kjente sårbarheter (npm audit clean). Anbefaler automatisk scanning i CI/CD. |
| A07 | Auth Failures | Mitigert | JWT-verifisering, eksakt service key-match, rate limiting på innlogging (5/15min), idle timeout (30 min), autentiseringslogging |
| A08 | Software/Data Integrity | Mitigert | HTTPS-only, CSP, `upgrade-insecure-requests` |
| A09 | Logging Failures | Mitigert | Aktivitetslogg for alle sensitive operasjoner, edge function server-logging |
| A10 | SSRF | Mitigert | Ingen bruker-kontrollerte URL-kall, CSP connect-src begrenser utgående tilkoblinger |

---

## 13. Samlet sikkerhetsvurdering

### 13.1 Overordnet vurdering

Brannloggen har en **solid sikkerhetsarkitektur** som er godt tilpasset en applikasjon for statlig bruk. Sikkerheten er bygget i flere lag (defence in depth), der hvert lag gir beskyttelse selv om et annet skulle svikte.

### 13.2 Styrker

- **Databasesikkerhet (RLS):** Alle tabeller har Row-Level Security med gjennomtenkte policies. Tilgangskontroll håndheves på databasenivå – ikke bare i applikasjonskoden. Dette er den viktigste enkeltkontrollen i systemet.
- **Rolleeskalering-beskyttelse:** Database-trigger forhindrer at brukere kan gi seg selv høyere roller. Selv om en angriper skulle få tilgang til API-et, kan de ikke eskalere rettigheter.
- **Kryptering:** Web Push-implementasjonen følger RFC 8291/8292 korrekt med AES-128-GCM og ECDH P-256. All kommunikasjon er TLS-kryptert med HSTS.
- **Input-validering:** Zod-skjemavalidering på alle edge functions sikrer at uventet input avvises tidlig.
- **Feilhåndtering:** Generiske feilmeldinger til klient, detaljert logging server-side. Ingen informasjonslekkasje.
- **GDPR:** Automatisk dataminimering med pg_cron-jobber for sletting av logg (12 mnd) og push-kø (30 dager).
- **Sesjonssikkerhet:** Automatisk utlogging etter 30 minutters inaktivitet beskytter mot uovervåkede sesjoner.
- **Brute-force-beskyttelse:** Server-side rate limiting på innlogging (5 forsøk per 15 minutter) forhindrer passordgjetting.
- **Filopplastingssikkerhet:** Flerlagsvalidering med filstørrelse, MIME-type, filendelse og magic bytes-sjekk forhindrer opplasting av skadelig innhold.
- **Sikkerhetslogging:** Alle autentiseringshendelser (innlogging, utlogging) logges for revisjonsspor og hendelsesanalyse.

### 13.3 Gjenstående risikoer

| Risiko | Alvorlighet | Beskrivelse |
|--------|-------------|-------------|
| Ingen penetrasjonstesting | Middels | Automatisert testing kan ikke erstatte en manuell gjennomgang av en sikkerhetsspesialist |
| Ingen MFA/2FA | Middels | Tofaktorautentisering er ikke implementert. Anbefales for admin-roller. |
| `'unsafe-inline'` i CSP | Lav | Nødvendig for Next.js/Tailwind, men reduserer CSP-effektiviteten noe mot XSS |
| In-memory rate limiting | Lav | Fungerer per instans, men tilbakestilles ved ny deployment. Tilstrekkelig for nåværende skala. |
| Avhengighet av tredjeparter | Lav | Supabase og Vercel er kritiske komponenter. Bør ha beredskapsplan ved nedetid. |
| Passordpolicy | Lav | Passordkrav håndteres av Supabase Auth (standard 6 tegn). Anbefaler å konfigurere strengere krav i Supabase-dashboardet. |

### 13.4 Modenhetsnivå

Basert på OWASP Application Security Verification Standard (ASVS):

| Nivå | Beskrivelse | Status |
|------|-------------|--------|
| **Level 1** – Opportunistisk | Grunnleggende sikkerhetskontroller | **Oppfylt** |
| **Level 2** – Standard | Tilstrekkelig for de fleste applikasjoner | **Oppfylt** (mangler formell pentest og MFA) |
| **Level 3** – Avansert | For kritisk infrastruktur | Delvis (krever formell penetrasjonstesting, MFA og sikkerhetsrevisjon) |

### 13.5 ASVS Level 2 – Detaljert dekning

| ASVS-kategori | Status | Implementerte kontroller |
|---------------|--------|--------------------------|
| V2: Autentisering | Oppfylt | JWT-autentisering, rate-begrenset innlogging (5/15min), idle timeout (30 min), generiske feilmeldinger |
| V3: Sesjonshåndtering | Oppfylt | HTTP-only cookies, automatisk token-fornyelse, idle timeout med utlogging, SameSite-beskyttelse |
| V4: Tilgangskontroll | Oppfylt | RLS på alle tabeller, RBAC med 4 roller, rolleeskalerings-trigger, middleware-rutebeskyttelse |
| V5: Input-validering | Oppfylt | Zod-skjemavalidering, parameteriserte queries, filopplastingsvalidering med magic bytes |
| V6: Kryptografi | Oppfylt | TLS 1.2+, HSTS, AES-128-GCM (Web Push), ES256 (VAPID/APNs), ingen hardkodede hemmeligheter |
| V7: Feilhåndtering og logging | Oppfylt | Aktivitetslogg med 18 handlingstyper inkl. autentisering, generiske feilmeldinger, automatisk opprydding |
| V8: Databeskyttelse | Oppfylt | GDPR-automatisering, dataminimering, kryptert transport, pg_cron-basert sletting |
| V9: Kommunikasjon | Oppfylt | HTTPS-only, HSTS preload, CSP, CORS-begrensning |
| V10: Ondsinnet kode | Oppfylt | CSP forhindrer ekstern kodeinjeksjon, ingen eval/innerHTML, React auto-escaping |
| V12: Filer og ressurser | Oppfylt | Filstørrelsesbegrensning (10 MB), MIME-type-validering, magic bytes-verifisering, filendelse-hviteliste |
| V13: API-sikkerhet | Oppfylt | Rate limiting, JWT-verifisering, Zod-validering, CORS, generiske feilmeldinger |
| V14: Konfigurasjon | Oppfylt | Sikkerhetsheadere, CSP, Supabase Vault for hemmeligheter, ingen debug i produksjon |

**Konklusjon:** Applikasjonen oppfyller ASVS Level 1 fullstendig og oppfyller de tekniske kravene til ASVS Level 2. De eneste gjenstående punktene for full Level 2-sertifisering er formell penetrasjonstesting av en ekstern sikkerhetsspesialist og innføring av MFA/2FA for privilegerte kontoer. For statlig bruk er dette en sterk sikkerhetsposisjon som overgår kravene til de fleste sammenlignbare webapplikasjoner.
