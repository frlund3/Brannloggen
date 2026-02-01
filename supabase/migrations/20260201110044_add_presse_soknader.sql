-- Table for press access requests (self-registration)
CREATE TABLE public.presse_soknader (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fullt_navn text NOT NULL,
  epost text NOT NULL UNIQUE,
  mediehus text NOT NULL,
  telefon text,
  status text NOT NULL DEFAULT 'venter'
    CHECK (status IN ('venter', 'godkjent', 'avvist')),
  behandlet_av uuid REFERENCES auth.users(id),
  behandlet_tidspunkt timestamptz,
  avvisningsgrunn text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE presse_soknader ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit a press access request
CREATE POLICY "Anyone can submit presse request"
  ON presse_soknader FOR INSERT
  WITH CHECK (true);

-- Admins can view and manage all requests
CREATE POLICY "Admins can manage presse_soknader"
  ON presse_soknader FOR ALL
  USING (public.get_my_rolle() IN ('admin', '110-admin'))
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin'));
