# Push-varsler - Oppsett

Alt du trenger a gjore for at push-varsler skal fungere pa iOS, Android og web.

---

## Status na

| Del | Status |
|-----|--------|
| Push-tillatelse popup (iOS/Android/Web) | Ferdig |
| Badge pa app-ikon | Ferdig (kode) |
| Push-lyttere i appen | Ferdig |
| Service worker (web push) | Ferdig |
| AppDelegate (iOS token forwarding) | Ferdig |
| Send-push edge function | Ferdig |
| Firebase oppsett | **Mangler** |
| APNs oppsett | **Mangler** |
| VAPID-nokler (web) | **Mangler** |
| Database-trigger for push-ko | **Sjekk** |
| Supabase env-variabler | **Mangler** |

---

## 1. Firebase (Android)

1. Ga til https://console.firebase.google.com
2. Opprett prosjekt "Brannloggen"
3. Legg til Android-app:
   - Pakkenavn: `no.brannloggen.app`
   - App-kallenavn: Brannloggen
4. Last ned `google-services.json`
5. Legg filen i `android/app/google-services.json`
6. Under **Project Settings > Cloud Messaging**:
   - Aktiver Cloud Messaging API (V1) hvis ikke allerede aktivert
   - Kopier **Server Key** (under Legacy-fanen)
7. Sett i Supabase (se punkt 5):
   ```
   FCM_SERVER_KEY=<server key fra steg 6>
   ```

---

## 2. APNs (iOS)

### 2a. Apple Developer Portal

1. Logg inn pa https://developer.apple.com
2. Ga til **Certificates, Identifiers & Profiles**

### 2b. App ID

1. Under **Identifiers**, finn eller opprett App ID:
   - Bundle ID: `no.brannloggen.app`
   - Huk av **Push Notifications** under Capabilities
   - Lagre

### 2c. APNs Authentication Key

1. Ga til **Keys** > **Create a Key**
2. Gi den navn: "Brannloggen Push"
3. Huk av **Apple Push Notifications service (APNs)**
4. Klikk Continue > Register
5. **Last ned .p8-filen** (kan kun lastes ned en gang!)
6. Noter:
   - **Key ID** (vises pa key-siden, f.eks. `ABC123DEFG`)
   - **Team ID** (vises overst til hoyre i Developer-portalen, f.eks. `TEAM123456`)

### 2d. Sett i Supabase (se punkt 5):

```
APNS_KEY_ID=<Key ID fra steg 6>
APNS_TEAM_ID=<Team ID fra steg 6>
APNS_PRIVATE_KEY=<hele innholdet i .p8-filen, inkludert BEGIN/END-linjene>
```

### 2e. Xcode

1. Apne prosjektet: `npx cap open ios`
2. Velg **App** target > **Signing & Capabilities**
3. Klikk **+ Capability** > legg til **Push Notifications**
4. Klikk **+ Capability** > legg til **Background Modes** > huk av **Remote notifications**

---

## 3. VAPID (Web Push)

1. Generer nokkelpar:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Du far ut noe som:
   ```
   Public Key: BLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Sett i Vercel (miljovariabel for Next.js):
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Public Key>
   ```
4. Sett i Supabase (se punkt 5):
   ```
   VAPID_PRIVATE_KEY=<Private Key>
   VAPID_PUBLIC_KEY=<Public Key>
   ```

---

## 4. Database (Supabase)

### 4a. Sjekk at tabellene finnes

Kjor i SQL Editor:

```sql
-- Sjekk push_abonnenter
SELECT count(*) FROM push_abonnenter;

-- Sjekk push_notification_queue
SELECT count(*) FROM push_notification_queue;
```

Hvis de ikke finnes, ma de opprettes. Si fra sa lager jeg SQL for det.

### 4b. Database-trigger for automatisk push

Du trenger en trigger som legger til rader i `push_notification_queue` nar hendelser opprettes/oppdateres. Sjekk om den finnes:

```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'hendelser';
```

Hvis ingen trigger finnes for push, si fra sa lager jeg den.

### 4c. Security migration

Hvis du ikke har kjort denne enna:

```bash
# Kjor via Supabase CLI
supabase db push

# Eller kopier innholdet i filen og kjor direkte i SQL Editor:
# supabase/migrations/20260201190000_security_hardening.sql
```

---

## 5. Supabase Edge Function Secrets

Ga til **Supabase Dashboard > Edge Functions > Secrets** og legg til:

| Variabel | Verdi | Brukes til |
|----------|-------|------------|
| `ALLOWED_ORIGIN` | `https://brannloggen.no` | CORS-beskyttelse |
| `FCM_SERVER_KEY` | Fra Firebase (punkt 1) | Android push |
| `APNS_KEY_ID` | Fra Apple (punkt 2) | iOS push |
| `APNS_TEAM_ID` | Fra Apple (punkt 2) | iOS push |
| `APNS_PRIVATE_KEY` | Innhold i .p8-fil (punkt 2) | iOS push |
| `VAPID_PRIVATE_KEY` | Fra web-push (punkt 3) | Web push |
| `VAPID_PUBLIC_KEY` | Fra web-push (punkt 3) | Web push |

Merk: `SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` settes automatisk av Supabase.

---

## 6. Deploy edge function

```bash
supabase functions deploy send-push
```

---

## 7. Bygg og test appene

```bash
# Bygg Next.js
npm run build

# Synkroniser med Capacitor
npx cap sync

# iOS (krever macOS + Xcode)
npx cap open ios
# Bygg og kjor pa fysisk enhet (push fungerer ikke i simulator)

# Android (krever Android Studio)
npx cap open android
# Bygg og kjor pa fysisk enhet eller emulator
```

### Test push:

1. Apne appen pa telefon
2. Godta push-varsler nar popup vises
3. Opprett en ny hendelse via operator-panelet
4. Verifiser at varsel kommer og badge vises
5. Apne appen igjen - badge skal nullstilles

---

## Rekkefolgje (anbefalt)

1. Generer VAPID-nokler og sett opp web push forst (enklest a teste)
2. Sett opp Firebase for Android
3. Sett opp APNs for iOS
4. Deploy edge function
5. Test pa alle plattformer
