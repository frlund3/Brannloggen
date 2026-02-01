# Sikkerhetsdokumentasjon - Brannloggen

**Versjon:** 1.0
**Dato:** 1. februar 2026
**Ansvarlig:** Brannloggen
**Klassifisering:** Intern / Deles med oppdragsgiver

---

## 1. Oversikt

Brannloggen er en nettbasert plattform for registrering, overvaking og varsling av brannog redningshendelser i Norge. Systemet er bygget for bruk av 110-sentraler, brannvesen og pressebrukere, og handterer hendelsesdata som kan vare tidskritisk.

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
- **Sesjonshandtering:** HTTP-only cookies administrert av Supabase SSR
- **Token-fornyelse:** Automatisk via Supabase SDK
- **Timeout:** Server-side middleware verifiserer JWT med 3-sekunders timeout for robusthet

### 2.2 Rollebasert tilgangskontroll (RBAC)

Systemet har fire roller med strengt hierarki:

| Rolle | Tilgang | Beskrivelse |
|-------|---------|-------------|
| `admin` | Full tilgang | Systemadministrator - alle funksjoner |
| `110-admin` | Avgrenset admin | 110-sentral-administrator - begrenset til egen sentral |
| `operator` | Operativ tilgang | Kan opprette/redigere hendelser innenfor sin sentral |
| `presse` | Lesetilgang | Kan se hendelser og pressemeldinger |

### 2.3 Rolleeskalering-beskyttelse

En database-trigger (`prevent_role_escalation`) sikrer at ingen bruker kan endre sin egen rolle. Kun administratorer kan tildele eller endre roller.

### 2.4 Middleware-beskyttelse

Next.js middleware beskytter alle dashboard-ruter:
- `/operator/*` - Krever innlogging
- `/admin/*` - Krever innlogging
- `/presse/*` - Krever innlogging

Uautentiserte brukere omdirigeres til `/login`.

---

## 3. Databasesikkerhet (Row-Level Security)

### 3.1 RLS-oversikt

Alle tabeller i Supabase har Row-Level Security (RLS) aktivert. Dette betyr at databasen selv handhever tilgangskontroll - uavhengig av applikasjonskoden.

| Tabell | RLS | Lesetilgang | Skrivetilgang |
|--------|-----|-------------|---------------|
| hendelser | Aktivert | Alle (offentlig data) | Operatorer/admins |
| hendelsesoppdateringer | Aktivert | Alle | Operatorer/admins |
| interne_notater | Aktivert | Operatorer/admins | Operatorer/admins |
| brukerprofiler | Aktivert | Egen profil | Egen profil (uten rolle) |
| push_abonnenter | Aktivert | Alle | Begrenset til egen enhet |
| push_notification_queue | Aktivert | Kun admins | Triggers (SECURITY DEFINER) |
| aktivitetslogg | Aktivert | Kun admins | Kun egen bruker-ID |
| presseoppdateringer | Aktivert | Alle (offentlig) | Operatorer/admins |
| presse_soknader | Aktivert | Egen soknad / admins | Alle kan soke |

### 3.2 SECURITY DEFINER-funksjoner

Kritiske operasjoner bruker `SECURITY DEFINER`-funksjoner som kjorer med forhoyede rettigheter, men med streng `search_path`:

- `get_my_rolle()` - Returnerer innlogget brukers rolle
- `prevent_role_escalation()` - Forhindrer rolleeskalering
- `fn_queue_push_hendelse()` - Koer push-varsler ved hendelser
- `fn_process_push_queue()` - Trigger edge function for push-utsending

---

## 4. API-sikkerhet

### 4.1 Endepunkter

| Endepunkt | Metode | Autentisering | Formal |
|-----------|--------|---------------|--------|
| `/api/test-push` | GET/POST | JWT (innlogget bruker) | Push-statistikk og testing |
| Edge: `send-push` | POST | Service role key / JWT | Prosessering av push-ko |
| Edge: `create-user` | POST | Service role key | Opprettelse av brukerkontoer |
| Edge: `approve-presse` | POST | Service role key / JWT | Godkjenning av pressesoeknader |

### 4.2 Edge Function-sikkerhet

- **Autentisering:** Eksakt match av service role key (Bearer token) eller verifisert JWT
- **CORS:** Begrenset til `https://brannloggen.no` (konfigurerbart via miljovariabel)
- **Feilhandtering:** Generiske feilmeldinger returneres til klient; detaljerte feil logges server-side

### 4.3 Sikkerhedsheadere

Folgende HTTP-headere er konfigurert pa alle sider:

| Header | Verdi | Formal |
|--------|-------|--------|
| `X-Content-Type-Options` | `nosniff` | Forhindrer MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Forhindrer clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Begrenser referrer-informasjon |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blokkerer unodvendige APIer |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Tvinger HTTPS |
| `X-DNS-Prefetch-Control` | `on` | Optimert DNS-oppslag |

---

## 5. Push-varsling og kryptering

### 5.1 Arkitektur

Push-varsling folger en ko-basert arkitektur:

1. Database-trigger koer hendelse i `push_notification_queue`
2. pg_net trigger kaller `send-push` edge function asynkront
3. Edge function filtrerer abonnenter basert pa preferanser
4. Varsler sendes via plattform-spesifikke kanaler

### 5.2 Kryptering

| Plattform | Protokoll | Kryptering |
|-----------|-----------|------------|
| Web Push | RFC 8291/8292 | AES-128-GCM + ECDH P-256 + VAPID |
| iOS (APNs) | TLS 1.3 | ES256 JWT-signert |
| Android (FCM) | TLS 1.3 | Server key autentisering |

### 5.3 Web Push-detaljer

- **VAPID-signering:** ES256 (ECDSA P-256) med privat noekkel fra miljovariabel
- **Payload-kryptering:** Full RFC 8291 aes128gcm-implementasjon
  - Ephemeral ECDH-noekkelpar per melding
  - HKDF-basert noekkelavledning
  - AES-128-GCM symmetrisk kryptering
- **Token-gyldighet:** 12 timer (VAPID JWT expiry)

---

## 6. Dataminimering og GDPR

### 6.1 Personopplysninger som behandles

| Datakategori | Brukere | Formal | Rettslig grunnlag |
|-------------|---------|--------|-------------------|
| E-post og navn | Interne brukere | Kontoadministrasjon | Berettiget interesse (ansatte) |
| Push-token | Alle med varsling | Levering av varsler | Samtykke |
| Varslingspreferanser | Alle med varsling | Filtrering av varsler | Samtykke |
| Aktivitetslogg | Interne brukere | Revisjonsspor | Berettiget interesse |

### 6.2 Datalagring og sletting

| Data | Oppbevaringstid | Sletting |
|------|----------------|----------|
| Aktivitetslogg | Maks 12 maneder | Automatisk daglig opprydding (pg_cron) |
| Push-ko (behandlet) | Maks 30 dager | Automatisk daglig opprydding |
| Push-token | Sa lenge varsling er aktiv | Slettes ved deaktivering |
| Brukerkontoer | Sa lenge ansettelsesforhold | Manuell sletting av admin |

### 6.3 Brukerrettigheter (GDPR Artikkel 15-22)

- **Innsyn:** Brukere kan se egne data via dashboard
- **Retting:** Brukere kan oppdatere egen profil
- **Sletting:** Kan kreves via e-post til post@brannloggen.no
- **Dataportabilitet:** Aktivitetslogg kan eksporteres av admin
- **Samtykke-tilbaketrekking:** Deaktivering av push-varsling sletter token

### 6.4 Underleverandorer (Databehandlere)

| Leverandor | Tjeneste | Lokasjon | DPA |
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

Edge functions aksepterer kun foresporsler fra:
- `https://brannloggen.no` (produksjon)
- Konfigurerbart via `ALLOWED_ORIGIN` miljovariabel

### 7.3 Hemmelighetshandtering

- **Miljoevariabler:** Alle sensitiv konfigurasjon lagres som miljoevariabler
- **Supabase Vault:** Database-hemmeligheter (service role key, URL) lagres i Supabase Vault
- **Ingen hardkodede hemmeligheter:** Ingen private noekler eller tokens i kildekoden
- **Git:** `.env`-filer er ekskludert via `.gitignore`

---

## 8. Injeksjonsbeskyttelse

### 8.1 SQL-injeksjon

- **Mitigering:** Alle databasespoerringer bruker parameteriserte queries via Supabase SDK
- **Ingen raSTRE SQL:** Applikasjonskoden benytter aldri raa SQL-strengbygging
- **Migrasjoner:** SQL-migrasjoner bruker `format()` med `%I` (identifier quoting) for dynamiske sporringer

### 8.2 XSS (Cross-Site Scripting)

- **React-rammeverk:** Automatisk escaping av all brukerinput ved rendering
- **Ingen `dangerouslySetInnerHTML`:** Ikke brukt noe sted i applikasjonen
- **Ingen `eval()` eller `innerHTML`:** Ingen usikre JavaScript-monstre
- **Content-Type headers:** `nosniff` forhindrer MIME-type-angrep

### 8.3 CSRF (Cross-Site Request Forgery)

- **Supabase SSR:** Cookie-basert autentisering med SameSite-beskyttelse
- **JWT-verifisering:** Alle API-kall krever gyldig JWT-token

---

## 9. Logging og overvakning

### 9.1 Aktivitetslogg

Alle sensitive operasjoner logges i `aktivitetslogg`-tabellen:

- **Hva logges:** Handling, tabell, rad-ID, hendelse-tittel, tidspunkt
- **Hvem:** Bruker-ID (knyttet til auth.users)
- **Tilgang:** Kun administratorer kan lese logger
- **Oppbevaring:** Automatisk sletting etter 12 maneder

### 9.2 Edge Function-logging

- Feil logges server-side via `console.error()`
- Tilgjengelig via Supabase dashboard (Edge Function logs)
- Ingen personopplysninger i feilmeldinger til klient

---

## 10. Sikkerhetsarkitektur - diagram

```
Bruker (nettleser/app)
  |
  | HTTPS (TLS 1.2+)
  v
[Vercel CDN] -- Security Headers (HSTS, X-Frame-Options, CSP)
  |
  | Next.js Middleware (JWT-verifisering, rutebeskytte)
  v
[Next.js App]
  |
  | Supabase SDK (JWT Bearer)
  v
[Supabase]
  |- Auth (JWT-utstedelse, brukerverifisering)
  |- Database (RLS-haandheving pa alle tabeller)
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

### 11.1 Navaerende begrensninger

| Omrade | Status | Anbefaling |
|--------|--------|------------|
| Rate limiting | Ikke implementert | Vurder Vercel Rate Limiting eller custom middleware |
| Input-validering | Grunnleggende | Vurder Zod-skjemavalidering for alle endepunkter |
| Penetrasjonstesting | Ikke utfort | Anbefales for fullstendig sikkerhetstest |
| SIEM-integrasjon | Ikke implementert | Kan kobles til via Supabase webhooks |

### 11.2 Fremtidige forbedringer

1. **Content Security Policy (CSP):** Bor legges til nar alle tredjepartsressurser er kartlagt
2. **Subresource Integrity (SRI):** For alle eksterne scripts
3. **Automatisk sarbarhetsscanning:** npm audit i CI/CD-pipeline
4. **WAF (Web Application Firewall):** Vurder Cloudflare eller lignende foran Vercel

---

## 12. Samsvar og sertifiseringer

| Krav | Status | Merknad |
|------|--------|---------|
| GDPR | Implementert | Personvernerklaering, samtykke, sletting, oppbevaringsfrister |
| NSMs grunnprinsipper | Delvis | Identifisere, beskytte, oppdage - implementert |
| OWASP Top 10 | Adressert | Injeksjon, XSS, autentisering, tilgangskontroll |
| eIDAS | Ikke relevant | Ingen elektronisk signering |

---

## 13. Kontaktinformasjon

For sikkerhetssporsmaal eller rapportering av sarbarhet:
- **E-post:** post@brannloggen.no
- **Datatilsynet:** datatilsynet.no (klageinstans for GDPR)

---

*Dette dokumentet oppdateres ved vesentlige endringer i sikkerhetsarkitekturen.*
