-- ================================================================
-- VITRINE SAAS — Extension : Annonces + Communauté
-- Coller dans Supabase → SQL Editor → New Query → Run
-- À exécuter APRÈS le schema.sql de base
-- ================================================================

-- ── Table annonces (toi → tous les vendeurs) ──────────────────
CREATE TABLE IF NOT EXISTS annonces (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre       TEXT NOT NULL,
  contenu     TEXT NOT NULL,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','promotion','alerte','nouveau')),
  whatsapp_envoye BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Qui a lu quelle annonce
CREATE TABLE IF NOT EXISTS annonces_lues (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  annonce_id  UUID REFERENCES annonces(id) ON DELETE CASCADE,
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  lu_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(annonce_id, vendor_id)
);

-- ── Table messages communauté (temps réel) ────────────────────
CREATE TABLE IF NOT EXISTS communaute_messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id    UUID REFERENCES vendors(id) ON DELETE CASCADE,
  contenu      TEXT NOT NULL,
  image_url    TEXT,
  reply_to_id  UUID REFERENCES communaute_messages(id) ON DELETE SET NULL,
  mentions     TEXT[] DEFAULT '{}',   -- slugs mentionnés ex: ['marie-mode','paul-shop']
  signalements INTEGER DEFAULT 0,
  cache        BOOLEAN DEFAULT false,  -- masqué par superadmin
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour chargement rapide
CREATE INDEX IF NOT EXISTS idx_annonces_date    ON annonces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communaute_date  ON communaute_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_annonces_lues_v  ON annonces_lues(vendor_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE annonces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonces_lues     ENABLE ROW LEVEL SECURITY;
ALTER TABLE communaute_messages ENABLE ROW LEVEL SECURITY;

-- Annonces : lecture publique (vendeurs connectés)
CREATE POLICY "Annonces lecture"  ON annonces FOR SELECT USING (true);
CREATE POLICY "Annonces insert"   ON annonces FOR INSERT WITH CHECK (true);
CREATE POLICY "Annonces update"   ON annonces FOR UPDATE USING (true);
CREATE POLICY "Annonces delete"   ON annonces FOR DELETE USING (true);

-- Annonces lues
CREATE POLICY "Lues insert" ON annonces_lues FOR INSERT WITH CHECK (true);
CREATE POLICY "Lues select" ON annonces_lues FOR SELECT USING (true);

-- Communauté : tous les vendeurs lisent et écrivent
CREATE POLICY "Communaute select" ON communaute_messages FOR SELECT USING (true);
CREATE POLICY "Communaute insert" ON communaute_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Communaute update" ON communaute_messages FOR UPDATE USING (true);

-- ── Activer le Realtime sur communaute_messages ───────────────
-- (Dans Supabase → Database → Replication → activer communaute_messages)
ALTER PUBLICATION supabase_realtime ADD TABLE communaute_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE annonces;
