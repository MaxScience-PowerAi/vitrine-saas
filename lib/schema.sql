-- ================================================================
-- VITRINE SAAS — Script SQL Supabase
-- Coller dans : Supabase → SQL Editor → New Query → Run
-- ================================================================

-- Table vendeurs (avec toutes leurs infos personnelles + config boutique)
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,        -- URL boutique ex: "marie-mode"
  nom             TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  telephone       TEXT NOT NULL,
  residence       TEXT NOT NULL,
  password_hash   TEXT NOT NULL,               -- mot de passe hashé
  actif           BOOLEAN DEFAULT true,
  cgu_acceptee    BOOLEAN DEFAULT false,
  cgu_date        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Configuration de la boutique
  boutique_nom          TEXT NOT NULL DEFAULT '',
  boutique_tagline      TEXT DEFAULT '',
  boutique_description  TEXT DEFAULT '',
  boutique_telephone    TEXT DEFAULT '',
  boutique_whatsapp     TEXT DEFAULT '',
  boutique_location     TEXT DEFAULT 'Cameroun',
  boutique_cover_url    TEXT,
  boutique_theme        TEXT DEFAULT 'from-slate-900 to-slate-800',
  boutique_accent       TEXT DEFAULT 'blue'
);

-- Table produits
CREATE TABLE IF NOT EXISTS products (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id     UUID REFERENCES vendors(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  prix          INTEGER NOT NULL DEFAULT 0,
  prix_original INTEGER,
  categorie     TEXT NOT NULL DEFAULT 'Général',
  description   TEXT DEFAULT '',
  image_url     TEXT DEFAULT '',
  en_stock      BOOLEAN DEFAULT true,
  badge_text    TEXT,
  badge_type    TEXT,
  badge_color   TEXT,
  ordre         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table backups (clones de sécurité)
CREATE TABLE IF NOT EXISTS vendor_backups (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   UUID REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_data JSONB NOT NULL,
  products_data JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  note        TEXT DEFAULT 'Backup automatique'
);

-- Index
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_ordre  ON products(ordre);
CREATE INDEX IF NOT EXISTS idx_vendors_slug    ON vendors(slug);
CREATE INDEX IF NOT EXISTS idx_backups_vendor  ON vendor_backups(vendor_id);

-- RLS (Row Level Security)
ALTER TABLE vendors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_backups ENABLE ROW LEVEL SECURITY;

-- Policies — lecture publique pour les vitrines
CREATE POLICY "Vitrines publiques" ON vendors
  FOR SELECT USING (actif = true);

CREATE POLICY "Produits publics" ON products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id AND v.actif = true)
  );

-- Policies — vendeur peut tout faire sur SES données
CREATE POLICY "Vendeur insère" ON vendors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Vendeur modifie sa boutique" ON vendors
  FOR UPDATE USING (true);

CREATE POLICY "Produits insert" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Produits update" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Produits delete" ON products
  FOR DELETE USING (true);

-- Backups
CREATE POLICY "Backup insert" ON vendor_backups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Backup select" ON vendor_backups
  FOR SELECT USING (true);

CREATE POLICY "Backup delete" ON vendor_backups
  FOR DELETE USING (true);

-- Storage bucket pour les photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('boutique-images', 'boutique-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Images publiques" ON storage.objects
  FOR SELECT USING (bucket_id = 'boutique-images');

CREATE POLICY "Upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'boutique-images');

CREATE POLICY "Update images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'boutique-images');

CREATE POLICY "Delete images" ON storage.objects
  FOR DELETE USING (bucket_id = 'boutique-images');
