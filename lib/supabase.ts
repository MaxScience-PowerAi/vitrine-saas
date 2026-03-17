import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types base de données
export interface Vendor {
  id:            string
  slug:          string
  nom:           string
  email:         string
  telephone:     string
  residence:     string
  password_hash: string
  actif:         boolean
  cgu_acceptee:  boolean
  created_at:    string
  // Config boutique
  boutique_nom:        string
  boutique_tagline:    string
  boutique_description:string
  boutique_telephone:  string
  boutique_whatsapp:   string
  boutique_location:   string
  boutique_cover_url:  string | null
  boutique_theme:      string
  boutique_accent:     string
}

export interface Product {
  id:             string
  vendor_id:      string
  nom:            string
  prix:           number
  prix_original:  number | null
  categorie:      string
  description:    string
  image_url:      string
  en_stock:       boolean
  badge_text:     string | null
  badge_type:     string | null
  badge_color:    string | null
  ordre:          number
  created_at:     string
}
