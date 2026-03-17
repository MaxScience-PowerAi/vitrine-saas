'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Store, Users, ToggleLeft, ToggleRight,
  Download, Trash2, Eye, RefreshCw, LogOut,
  CheckCircle2, AlertCircle, Search, Copy,
  ChevronDown, ChevronUp, Megaphone, MessageCircle
} from 'lucide-react'
import AnnoncesSuperAdmin from '../../components/ui/AnnoncesSuperAdmin'
import { supabase, type Vendor, type Product } from '../../lib/supabase'
import { SUPER_ADMIN_PASSWORD } from '../../lib/utils'

export default function SuperAdminPage() {
  const router = useRouter()
  const [authed, setAuthed]     = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [vendors, setVendors]   = useState<Vendor[]>([])
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [vendorProducts, setVendorProducts] = useState<Record<string, Product[]>>({})
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [adminTab, setAdminTab]  = useState<'vendeurs' | 'annonces'>('vendeurs')

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === SUPER_ADMIN_PASSWORD) {
      setAuthed(true)
      sessionStorage.setItem('vitrine_superadmin', 'true')
      loadVendors()
    } else {
      setAuthError('Mot de passe incorrect.')
    }
  }

  useEffect(() => {
    if (sessionStorage.getItem('vitrine_superadmin') === 'true') {
      setAuthed(true); loadVendors()
    }
  }, [])

  const loadVendors = async () => {
    setLoading(true)
    const { data } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
    setVendors(data ?? [])
    setLoading(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('vendors').update({ actif: !current }).eq('id', id)
    setVendors(p => p.map(v => v.id === id ? { ...v, actif: !current } : v))
    notify(!current ? 'Boutique réactivée' : 'Boutique désactivée')
  }

  const loadVendorProducts = async (vendorId: string) => {
    if (vendorProducts[vendorId]) return
    const { data } = await supabase.from('products').select('*').eq('vendor_id', vendorId)
    setVendorProducts(p => ({ ...p, [vendorId]: data ?? [] }))
  }

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    await loadVendorProducts(id)
  }

  // ── Clone / Backup ──────────────────────────────────────────
  const createBackup = async (vendor: Vendor) => {
    const { data: prods } = await supabase.from('products').select('*').eq('vendor_id', vendor.id)
    const { error } = await supabase.from('vendor_backups').insert([{
      vendor_id:     vendor.id,
      vendor_data:   vendor,
      products_data: prods ?? [],
      note:          `Backup manuel — ${new Date().toLocaleDateString('fr-FR')}`,
    }])
    if (error) notify('Erreur backup', 'err')
    else notify(`Backup créé pour ${vendor.boutique_nom}`)
  }

  const restoreBackup = async (vendor: Vendor) => {
    const { data: backups } = await supabase
      .from('vendor_backups')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!backups || backups.length === 0) { notify('Aucun backup trouvé', 'err'); return }
    const bk = backups[0]

    if (!confirm(`Restaurer le backup du ${new Date(bk.created_at).toLocaleDateString('fr-FR')} pour ${vendor.boutique_nom} ?`)) return

    // Restaurer les produits
    await supabase.from('products').delete().eq('vendor_id', vendor.id)
    if (bk.products_data.length > 0) {
      await supabase.from('products').insert(bk.products_data)
    }
    notify(`Boutique ${vendor.boutique_nom} restaurée !`)
  }

  const exportVendorData = (vendor: Vendor) => {
    const data = {
      vendeur: {
        nom: vendor.nom, email: vendor.email,
        telephone: vendor.telephone, residence: vendor.residence,
        inscription: vendor.created_at, boutique: vendor.boutique_nom,
      },
      produits: vendorProducts[vendor.id] ?? 'Non chargé'
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${vendor.slug}_export.json`; a.click()
    notify('Export téléchargé')
  }

  const filtered = vendors.filter(v =>
    !search.trim() ||
    v.nom.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase()) ||
    v.boutique_nom.toLowerCase().includes(search.toLowerCase()) ||
    v.telephone.includes(search) ||
    v.residence.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:   vendors.length,
    actif:   vendors.filter(v => v.actif).length,
    inactif: vendors.filter(v => !v.actif).length,
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
        <div className="fixed inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,.08) 0%, transparent 60%)' }} />
        <div className="w-full max-w-sm animate-scale-in">
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
              <Shield className="w-5 h-5" style={{ color: 'var(--ink)' }} />
            </div>
            <span className="font-display font-bold text-xl" style={{ color: 'var(--cream)' }}>SuperAdmin</span>
          </div>
          <div className="glass rounded-3xl p-8">
            <h1 className="font-display font-bold text-xl mb-6 text-center" style={{ color: 'var(--cream)' }}>
              Accès restreint
            </h1>
            {authError && (
              <div className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#fca5a5' }}>
                {authError}
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="password" className="input-dark text-center tracking-widest text-lg"
                placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" className="btn-gold w-full py-4 rounded-xl">Entrer</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ink)' }}>
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold shadow-2xl animate-fade-up`}
          style={toast.type === 'ok'
            ? { background: 'rgba(46,204,113,.15)', border: '1px solid rgba(46,204,113,.3)', color: '#2ECC71' }
            : { background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5' }}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
            <Shield className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          </div>
          <div>
            <p className="font-display font-bold text-base leading-none" style={{ color: 'var(--cream)' }}>VitrinePro</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--gold)' }}>Super Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadVendors} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(255,255,255,.4)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { sessionStorage.removeItem('vitrine_superadmin'); setAuthed(false) }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(255,255,255,.4)' }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Tabs superadmin */}
        <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit" style={{ background: 'rgba(255,255,255,.04)' }}>
          {([['vendeurs', Store, 'Vendeurs'], ['annonces', Megaphone, 'Annonces & Broadcast']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setAdminTab(id as any)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={adminTab === id
                ? { background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))', color: 'var(--ink)' }
                : { color: 'rgba(255,255,255,.4)' }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {adminTab === 'annonces' && <AnnoncesSuperAdmin />}
        {adminTab === 'vendeurs' && <>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { val: stats.total,   label: 'Total boutiques', color: 'var(--gold)',  icon: Store },
            { val: stats.actif,   label: 'Actives',         color: 'var(--jade)',  icon: CheckCircle2 },
            { val: stats.inactif, label: 'Désactivées',     color: '#FF6B6B',      icon: AlertCircle },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5">
              <p className="font-display font-bold text-3xl mb-1" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,.25)' }} />
          <input type="search" className="input-dark pl-11" placeholder="Rechercher par nom, email, téléphone, résidence..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Liste vendeurs */}
        <div className="space-y-3">
          {filtered.map(v => (
            <div key={v.id} className="glass rounded-2xl overflow-hidden">
              {/* Ligne principale */}
              <div className="p-5 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--gold-light)22, var(--gold-dark)22)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.2)' }}>
                  {v.boutique_nom.substring(0, 2).toUpperCase()}
                </div>

                {/* Infos principales */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold" style={{ color: 'var(--cream)' }}>{v.boutique_nom}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.actif ? 'badge-active' : 'badge-inactive'}`}>
                      {v.actif ? 'Active' : 'Désactivée'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>
                    {v.nom} · <span className="font-mono">{v.telephone}</span>
                  </p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,.2)' }}>
                    /boutique/{v.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a href={`/boutique/${v.slug}`} target="_blank"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(255,255,255,.4)' }} title="Voir la boutique">
                    <Eye className="w-4 h-4" />
                  </a>
                  <button onClick={() => createBackup(v)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(201,168,76,.6)' }} title="Créer un backup">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => exportVendorData(v)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(255,255,255,.3)' }} title="Exporter les données">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleActive(v.id, v.actif)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                    title={v.actif ? 'Désactiver' : 'Réactiver'}
                    style={{ color: v.actif ? 'var(--jade)' : 'rgba(255,100,100,.5)' }}>
                    {v.actif ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button onClick={() => toggleExpand(v.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(255,255,255,.3)' }}>
                    {expanded === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Détails expandés */}
              {expanded === v.id && (
                <div className="border-t px-5 py-4 space-y-4 animate-fade-in"
                  style={{ borderColor: 'rgba(255,255,255,.06)', background: 'rgba(0,0,0,.2)' }}>

                  {/* Infos personnelles complètes */}
                  <div>
                    <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--gold)', letterSpacing: '.08em' }}>
                      Informations personnelles
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Nom', value: v.nom },
                        { label: 'Email', value: v.email },
                        { label: 'Téléphone', value: v.telephone },
                        { label: 'Résidence', value: v.residence },
                      ].map(info => (
                        <div key={info.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                          <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'rgba(255,255,255,.3)', letterSpacing: '.06em' }}>
                            {info.label}
                          </p>
                          <p className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>{info.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,.2)' }}>
                      Inscrit le {new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · '}CGU acceptée : {v.cgu_acceptee ? '✓ Oui' : '✗ Non'}
                    </p>
                  </div>

                  {/* Produits */}
                  <div>
                    <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--gold)', letterSpacing: '.08em' }}>
                      Produits ({vendorProducts[v.id]?.length ?? '...'})
                    </p>
                    {vendorProducts[v.id] ? (
                      vendorProducts[v.id].length === 0 ? (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,.25)' }}>Aucun produit</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {vendorProducts[v.id].slice(0, 6).map(p => (
                            <div key={p.id} className="flex items-center gap-2 rounded-xl p-2.5"
                              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                              {p.image_url ? (
                                <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,.05)' }} />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: 'var(--cream)' }}>{p.nom}</p>
                                <p className="text-[10px] font-mono" style={{ color: 'var(--gold)' }}>{p.prix.toLocaleString()} F</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'rgba(255,255,255,.2)' }} />
                    )}
                  </div>

                  {/* Actions backup */}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => createBackup(v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: 'var(--gold)' }}>
                      <Download className="w-3.5 h-3.5" /> Créer backup
                    </button>
                    <button onClick={() => restoreBackup(v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', color: '#818cf8' }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Restaurer dernier backup
                    </button>
                    <button onClick={() => exportVendorData(v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)' }}>
                      <Copy className="w-3.5 h-3.5" /> Exporter JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-20">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-10" style={{ color: 'var(--gold)' }} />
              <p style={{ color: 'rgba(255,255,255,.3)' }}>Aucun vendeur pour l'instant</p>
            </div>
          )}
        </div>
      </>
      }
      </main>
    </div>
  )
}
