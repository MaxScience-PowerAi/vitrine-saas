'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Bell, BellOff, Megaphone, Info, Tag, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

interface Annonce {
  id:         string
  titre:      string
  contenu:    string
  type:       'info' | 'promotion' | 'alerte' | 'nouveau'
  created_at: string
  lue:        boolean
}

const TYPE_CONFIG = {
  info:      { icon: Info,          color: '#3B82F6', bg: 'rgba(59,130,246,.1)',  border: 'rgba(59,130,246,.25)',  label: 'Info'      },
  promotion: { icon: Tag,           color: '#2ECC71', bg: 'rgba(46,204,113,.1)',  border: 'rgba(46,204,113,.25)',  label: 'Promotion' },
  alerte:    { icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,.1)',   border: 'rgba(239,68,68,.25)',   label: 'Alerte'    },
  nouveau:   { icon: Sparkles,      color: '#C9A84C', bg: 'rgba(201,168,76,.1)',  border: 'rgba(201,168,76,.25)',  label: 'Nouveau'   },
}

export default function AnnoncesPage() {
  const { slug } = useParams<{ slug: string }>()
  const router   = useRouter()

  const [annonces, setAnnonces]   = useState<Annonce[]>([])
  const [vendorId, setVendorId]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const savedSlug = sessionStorage.getItem('vitrine_vendor_slug')
    if (!savedSlug || savedSlug !== slug) { router.replace('/connexion'); return }
    loadAnnonces()
  }, [slug])

  const loadAnnonces = async () => {
    // Récupérer l'ID du vendeur
    const { data: v } = await supabase.from('vendors').select('id').eq('slug', slug).single()
    if (!v) return
    setVendorId(v.id)

    // Récupérer toutes les annonces
    const { data: ann } = await supabase
      .from('annonces')
      .select('*')
      .order('created_at', { ascending: false })

    // Récupérer les annonces déjà lues
    const { data: lues } = await supabase
      .from('annonces_lues')
      .select('annonce_id')
      .eq('vendor_id', v.id)

    const luesIds = new Set(lues?.map(l => l.annonce_id) ?? [])

    const enriched = (ann ?? []).map(a => ({
      ...a,
      lue: luesIds.has(a.id)
    }))

    setAnnonces(enriched)
    setUnreadCount(enriched.filter(a => !a.lue).length)
    setLoading(false)

    // Marquer toutes comme lues automatiquement après 2 secondes
    setTimeout(() => markAllAsRead(v.id, ann ?? [], luesIds), 2000)
  }

  const markAllAsRead = async (vid: string, ann: any[], alreadyRead: Set<string>) => {
    const unread = ann.filter(a => !alreadyRead.has(a.id))
    if (unread.length === 0) return

    await supabase.from('annonces_lues').insert(
      unread.map(a => ({ annonce_id: a.id, vendor_id: vid }))
    )
    setAnnonces(prev => prev.map(a => ({ ...a, lue: true })))
    setUnreadCount(0)
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen" style={{ background: 'var(--ink)' }}>

      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-4 flex items-center gap-3"
        style={{ background: 'rgba(10,10,15,.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <button onClick={() => router.push(`/admin/${slug}`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
          style={{ color: 'rgba(255,255,255,.4)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
          <Megaphone className="w-5 h-5" style={{ color: 'var(--ink)' }} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>Annonces de l'équipe</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout à jour'}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
            {unreadCount}
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(255,255,255,.1)', borderTopColor: 'var(--gold)' }} />
          </div>
        ) : annonces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)' }}>
              <BellOff className="w-8 h-8" style={{ color: 'rgba(201,168,76,.4)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'rgba(255,255,255,.3)' }}>Aucune annonce pour l'instant</p>
            <p className="text-sm text-center max-w-xs" style={{ color: 'rgba(255,255,255,.2)', lineHeight: 1.6 }}>
              L'équipe VitrinePro vous informera ici des nouvelles fonctionnalités et promotions.
            </p>
          </div>
        ) : (
          annonces.map(ann => {
            const cfg = TYPE_CONFIG[ann.type] ?? TYPE_CONFIG.info
            const Icon = cfg.icon
            return (
              <div key={ann.id}
                className="rounded-2xl p-5 transition-all animate-fade-up"
                style={{
                  background: ann.lue ? 'rgba(255,255,255,.03)' : cfg.bg,
                  border:     `1px solid ${ann.lue ? 'rgba(255,255,255,.06)' : cfg.border}`,
                }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      {!ann.lue && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                          Nouveau
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base mb-2" style={{ color: 'var(--cream)' }}>
                      {ann.titre}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>
                      {ann.contenu}
                    </p>
                    <p className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,.25)' }}>
                      {fmtDate(ann.created_at)}
                      {ann.lue && (
                        <span className="ml-2 inline-flex items-center gap-1" style={{ color: '#2ECC71' }}>
                          <CheckCircle2 className="w-3 h-3" /> Lu
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
