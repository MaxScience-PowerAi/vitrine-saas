'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Upload, Save, X, LogOut,
  Package, Settings, Eye, ShoppingBag, RefreshCw,
  CheckCircle2, AlertCircle, Image as ImageIcon,
  ToggleLeft, ToggleRight, Tag, Megaphone, Users
} from 'lucide-react'
import { supabase, type Vendor, type Product } from '../../../lib/supabase'
import { THEMES } from '../../../lib/utils'

type Tab = 'produits' | 'boutique' | 'annonces' | 'communaute'

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>()
  const router   = useRouter()

  const [vendor, setVendor]     = useState<Vendor | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('produits')
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // États formulaire produit
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [productForm, setProductForm] = useState({
    nom: '', prix: '', prix_original: '', categorie: '',
    description: '', image_url: '', en_stock: true,
    badge_text: '', badge_type: 'none', badge_color: 'bg-amber-500',
  })

  // États formulaire boutique
  const [boutiqueForm, setBoutiqueForm] = useState<Partial<Vendor>>({})
  const [savingBoutique, setSavingBoutique] = useState(false)

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Vérif accès ────────────────────────────────────────────
  useEffect(() => {
    const savedSlug = sessionStorage.getItem('vitrine_vendor_slug')
    if (!savedSlug || savedSlug !== slug) {
      router.replace('/connexion'); return
    }
    loadData()
  }, [slug])

  const loadData = async () => {
    setLoading(true)
    const [{ data: v }, { data: p }] = await Promise.all([
      supabase.from('vendors').select('*').eq('slug', slug).single(),
      supabase.from('products').select('*').eq('vendor_id', (await supabase.from('vendors').select('id').eq('slug', slug).single()).data?.id).order('ordre'),
    ])
    if (v) { setVendor(v); setBoutiqueForm(v) }
    if (p) setProducts(p)
    setLoading(false)
  }

  // ── Upload photo ────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !vendor) return
    setUploadingImg(true)
    const ext  = file.name.split('.').pop()
    const path = `${vendor.id}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('boutique-images').upload(path, file, { upsert: true })
    if (error) { notify('Erreur upload photo', 'err'); setUploadingImg(false); return }
    const { data: { publicUrl } } = supabase.storage.from('boutique-images').getPublicUrl(path)
    setProductForm(p => ({ ...p, image_url: publicUrl }))
    setUploadingImg(false)
    notify('Photo uploadée !')
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !vendor) return
    setUploadingImg(true)
    const path = `${vendor.id}/cover.${file.name.split('.').pop()}`
    await supabase.storage.from('boutique-images').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('boutique-images').getPublicUrl(path)
    setBoutiqueForm(p => ({ ...p, boutique_cover_url: publicUrl }))
    setUploadingImg(false)
    notify('Photo de couverture uploadée !')
  }

  // ── Sauvegarde produit ──────────────────────────────────────
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor || !productForm.nom || !productForm.prix) return
    setSaving(true)

    const payload = {
      vendor_id:     vendor.id,
      nom:           productForm.nom,
      prix:          parseInt(productForm.prix) || 0,
      prix_original: productForm.prix_original ? parseInt(productForm.prix_original) : null,
      categorie:     productForm.categorie || 'Général',
      description:   productForm.description,
      image_url:     productForm.image_url,
      en_stock:      productForm.en_stock,
      badge_text:    productForm.badge_type !== 'none' ? productForm.badge_text : null,
      badge_type:    productForm.badge_type !== 'none' ? productForm.badge_type : null,
      badge_color:   productForm.badge_type !== 'none' ? productForm.badge_color : null,
      ordre:         editId ? undefined : products.length,
    }

    let error
    if (editId) {
      ({ error } = await supabase.from('products').update(payload).eq('id', editId))
    } else {
      ({ error } = await supabase.from('products').insert([payload]))
    }

    if (error) { notify('Erreur sauvegarde', 'err') }
    else {
      notify(editId ? 'Produit modifié !' : 'Produit ajouté !')
      setShowForm(false); setEditId(null)
      setProductForm({ nom: '', prix: '', prix_original: '', categorie: '', description: '', image_url: '', en_stock: true, badge_text: '', badge_type: 'none', badge_color: 'bg-amber-500' })
      loadData()
    }
    setSaving(false)
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit définitivement ?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(p => p.filter(x => x.id !== id))
    notify('Produit supprimé')
  }

  const toggleStock = async (id: string, current: boolean) => {
    await supabase.from('products').update({ en_stock: !current }).eq('id', id)
    setProducts(p => p.map(x => x.id === id ? { ...x, en_stock: !current } : x))
    notify(!current ? 'Produit disponible' : 'Produit épuisé')
  }

  const openEdit = (p: Product) => {
    setProductForm({
      nom: p.nom, prix: String(p.prix),
      prix_original: p.prix_original ? String(p.prix_original) : '',
      categorie: p.categorie, description: p.description,
      image_url: p.image_url, en_stock: p.en_stock,
      badge_text: p.badge_text || '', badge_type: p.badge_type || 'none',
      badge_color: p.badge_color || 'bg-amber-500',
    })
    setEditId(p.id); setShowForm(true)
  }

  // ── Sauvegarde boutique ─────────────────────────────────────
  const saveBoutique = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    setSavingBoutique(true)
    const { error } = await supabase.from('vendors').update({
      boutique_nom:         boutiqueForm.boutique_nom,
      boutique_tagline:     boutiqueForm.boutique_tagline,
      boutique_description: boutiqueForm.boutique_description,
      boutique_whatsapp:    boutiqueForm.boutique_whatsapp,
      boutique_location:    boutiqueForm.boutique_location,
      boutique_cover_url:   boutiqueForm.boutique_cover_url,
      boutique_theme:       boutiqueForm.boutique_theme,
      boutique_accent:      boutiqueForm.boutique_accent,
    }).eq('id', vendor.id)

    if (error) notify('Erreur sauvegarde', 'err')
    else { notify('Boutique mise à jour !'); loadData() }
    setSavingBoutique(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)' }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,255,255,.1)', borderTopColor: 'var(--gold)' }} />
      </div>
    )
  }

  if (!vendor) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--ink)' }}>

      {/* Toast */}
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
      <header className="sticky top-0 z-30 px-4 md:px-8 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
            <ShoppingBag className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none" style={{ color: 'var(--cream)' }}>
              {vendor.boutique_nom}
            </p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--gold)' }}>
              /boutique/{slug}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/boutique/${slug}`} target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.08)' }}>
            <Eye className="w-3.5 h-3.5" /> Voir
          </a>
          <button onClick={() => { sessionStorage.clear(); router.push('/connexion') }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,.4)' }}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit" style={{ background: 'rgba(255,255,255,.04)' }}>
          {([['produits', Package, 'Produits'], ['boutique', Settings, 'Ma Boutique'], ['annonces', Megaphone, 'Annonces'], ['communaute', Users, 'Communauté']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={tab === id
                ? { background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))', color: 'var(--ink)' }
                : { color: 'rgba(255,255,255,.4)' }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── TAB PRODUITS ── */}
        {tab === 'produits' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--cream)' }}>
                  Mes produits
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>
                  {products.length} produit{products.length !== 1 ? 's' : ''} dans votre catalogue
                </p>
              </div>
              <button onClick={() => { setShowForm(true); setEditId(null) }}
                className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {/* Formulaire produit */}
            {showForm && (
              <div className="glass rounded-2xl p-6 animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold text-lg" style={{ color: 'var(--cream)' }}>
                    {editId ? 'Modifier le produit' : 'Nouveau produit'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditId(null) }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    style={{ color: 'rgba(255,255,255,.4)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={saveProduct} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                        Nom du produit *
                      </label>
                      <input className="input-dark" placeholder="Ex: Robe de soirée..." required
                        value={productForm.nom} onChange={e => setProductForm(p => ({ ...p, nom: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                        Catégorie
                      </label>
                      <input className="input-dark" placeholder="Ex: Femmes, Chaussures..."
                        value={productForm.categorie} onChange={e => setProductForm(p => ({ ...p, categorie: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                        Prix (FCFA) *
                      </label>
                      <input className="input-dark" type="number" placeholder="25000" required
                        value={productForm.prix} onChange={e => setProductForm(p => ({ ...p, prix: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                        Ancien prix barré (optionnel)
                      </label>
                      <input className="input-dark" type="number" placeholder="35000"
                        value={productForm.prix_original} onChange={e => setProductForm(p => ({ ...p, prix_original: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                      Description
                    </label>
                    <textarea className="input-dark resize-none" rows={3} placeholder="Décrivez votre produit..."
                      value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} />
                  </div>

                  {/* Photo */}
                  <div>
                    <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                      Photo du produit
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className={`flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5 ${uploadingImg ? 'opacity-50' : ''}`}
                          style={{ border: '1px dashed rgba(255,255,255,.15)', color: 'rgba(255,255,255,.4)' }}>
                          {uploadingImg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          <span className="text-sm font-medium">
                            {uploadingImg ? 'Upload en cours...' : 'Choisir depuis téléphone'}
                          </span>
                          <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} />
                        </label>
                      </div>
                      {productForm.image_url && (
                        <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0"
                          style={{ border: '1px solid rgba(255,255,255,.1)' }}>
                          <img src={productForm.image_url} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                    </div>
                    <input className="input-dark mt-2 text-xs" placeholder="Ou coller un lien URL..."
                      value={productForm.image_url} onChange={e => setProductForm(p => ({ ...p, image_url: e.target.value }))} />
                  </div>

                  {/* Badge */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                        Badge
                      </label>
                      <select className="input-dark" value={productForm.badge_type}
                        onChange={e => setProductForm(p => ({ ...p, badge_type: e.target.value }))}>
                        <option value="none">Aucun</option>
                        <option value="trending">Bestseller</option>
                        <option value="sparkle">Nouveau</option>
                        <option value="sale">Promo</option>
                      </select>
                    </div>
                    {productForm.badge_type !== 'none' && (
                      <div>
                        <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                          Texte du badge
                        </label>
                        <input className="input-dark" placeholder="Bestseller"
                          value={productForm.badge_text} onChange={e => setProductForm(p => ({ ...p, badge_text: e.target.value }))} />
                      </div>
                    )}
                  </div>

                  {/* Stock + actions */}
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button type="button" onClick={() => setProductForm(p => ({ ...p, en_stock: !p.en_stock }))}
                        style={{ color: productForm.en_stock ? 'var(--jade)' : 'rgba(255,255,255,.3)' }}>
                        {productForm.en_stock ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                      <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,.5)' }}>
                        {productForm.en_stock ? 'En stock' : 'Épuisé'}
                      </span>
                    </label>
                    <button type="submit" disabled={saving} className="btn-gold flex items-center gap-2 px-6 py-3 rounded-xl">
                      <Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Liste produits */}
            {products.length === 0 ? (
              <div className="glass rounded-2xl p-16 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--gold)' }} />
                <p className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,.5)' }}>Aucun produit</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,.25)' }}>Ajoutez votre premier produit ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-4 group hover:border-white/10 transition-all">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.nom} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 opacity-20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--cream)' }}>{p.nom}</p>
                        {p.badge_text && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,.15)', color: 'var(--gold)' }}>
                            {p.badge_text}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.en_stock ? 'badge-active' : 'badge-inactive'}`}>
                          {p.en_stock ? 'En stock' : 'Épuisé'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--gold)' }}>
                        {p.prix.toLocaleString()} FCFA
                        {p.prix_original && <span style={{ color: 'rgba(255,255,255,.3)' }} className="line-through ml-2">{p.prix_original.toLocaleString()}</span>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>{p.categorie}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleStock(p.id, p.en_stock)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                        title={p.en_stock ? 'Marquer épuisé' : 'Marquer disponible'}
                        style={{ color: p.en_stock ? 'var(--jade)' : 'rgba(255,255,255,.3)' }}>
                        {p.en_stock ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                        style={{ color: 'rgba(255,255,255,.4)' }}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteProduct(p.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
                        style={{ color: 'rgba(255,100,100,.5)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB ANNONCES ── */}
        {tab === 'annonces' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--cream)' }}>Annonces de l'équipe</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,.35)' }}>Messages envoyés par VitrinePro à tous les vendeurs</p>
            </div>
            <div className="glass rounded-2xl p-8 text-center space-y-3">
              <Megaphone className="w-10 h-10 mx-auto opacity-30" style={{ color: 'var(--gold)' }} />
              <p className="font-semibold" style={{ color: 'rgba(255,255,255,.5)' }}>Annonces reçues</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,.3)' }}>Va sur <strong>/annonces</strong> pour voir toutes les annonces.</p>
              <a href={'/admin/' + slug + '/annonces'}
                className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm mt-2">
                <Megaphone className="w-4 h-4" /> Voir les annonces
              </a>
            </div>
          </div>
        )}

        {/* ── TAB COMMUNAUTÉ ── */}
        {tab === 'communaute' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--cream)' }}>Communauté</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,.35)' }}>Échange avec les autres vendeurs VitrinePro en temps réel</p>
            </div>
            <div className="glass rounded-2xl p-8 text-center space-y-3">
              <Users className="w-10 h-10 mx-auto opacity-30" style={{ color: 'var(--gold)' }} />
              <p className="font-semibold" style={{ color: 'rgba(255,255,255,.5)' }}>Groupe de vendeurs</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,.3)' }}>Partage tes produits, pose des questions, mentionne d'autres vendeurs avec @.</p>
              <a href={'/admin/' + slug + '/communaute'}
                className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm mt-2">
                <Users className="w-4 h-4" /> Rejoindre le groupe
              </a>
            </div>
          </div>
        )}

        {/* ── TAB BOUTIQUE ── */}
        {tab === 'boutique' && (
          <form onSubmit={saveBoutique} className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--cream)' }}>Paramètres boutique</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,.35)' }}>Toutes les modifications sont visibles instantanément</p>
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--gold)' }}>Informations principales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>Nom de la boutique</label>
                  <input className="input-dark" value={boutiqueForm.boutique_nom || ''} onChange={e => setBoutiqueForm(p => ({ ...p, boutique_nom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>Slogan</label>
                  <input className="input-dark" placeholder="Ex: La mode à votre portée" value={boutiqueForm.boutique_tagline || ''} onChange={e => setBoutiqueForm(p => ({ ...p, boutique_tagline: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>WhatsApp boutique</label>
                  <input className="input-dark" placeholder="237678..." value={boutiqueForm.boutique_whatsapp || ''} onChange={e => setBoutiqueForm(p => ({ ...p, boutique_whatsapp: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>Localisation</label>
                  <input className="input-dark" value={boutiqueForm.boutique_location || ''} onChange={e => setBoutiqueForm(p => ({ ...p, boutique_location: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>Description</label>
                <textarea className="input-dark resize-none" rows={3} value={boutiqueForm.boutique_description || ''} onChange={e => setBoutiqueForm(p => ({ ...p, boutique_description: e.target.value }))} />
              </div>
            </div>

            {/* Photo de couverture */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--gold)' }}>Photo de couverture</h3>
              <label className={`flex items-center justify-center gap-3 p-6 rounded-xl cursor-pointer hover:bg-white/5 transition-all ${uploadingImg ? 'opacity-50' : ''}`}
                style={{ border: '1px dashed rgba(255,255,255,.12)', color: 'rgba(255,255,255,.4)' }}>
                {uploadingImg ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <div>
                  <p className="text-sm font-semibold">{uploadingImg ? 'Upload...' : 'Choisir une photo de couverture'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.25)' }}>JPG, PNG, WEBP — depuis votre téléphone</p>
                </div>
                <input type="file" className="sr-only" accept="image/*" onChange={handleCoverUpload} disabled={uploadingImg} />
              </label>
              {boutiqueForm.boutique_cover_url && (
                <div className="mt-3 rounded-xl overflow-hidden h-32">
                  <img src={boutiqueForm.boutique_cover_url} alt="Cover" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Thème couleur */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--gold)' }}>Thème de couleur</h3>
              <div className="grid grid-cols-3 gap-3">
                {THEMES.map(t => (
                  <button key={t.id} type="button"
                    onClick={() => setBoutiqueForm(p => ({ ...p, boutique_theme: t.value, boutique_accent: t.id }))}
                    className={`p-3 rounded-xl text-xs font-semibold transition-all`}
                    style={{
                      background: `linear-gradient(135deg, ${t.value.includes('slate') ? '#0f172a,#1e293b' : t.value.includes('purple') ? '#3b0764,#4c0519' : t.value.includes('rose') ? '#4c0519,#3b0764' : t.value.includes('emerald') ? '#064e3b,#065f46' : t.value.includes('amber') ? '#451a03,#78350f' : '#1e1b4b,#312e81'})`,
                      border: boutiqueForm.boutique_accent === t.id ? `2px solid ${t.accent}` : '1px solid rgba(255,255,255,.08)',
                      color: boutiqueForm.boutique_accent === t.id ? t.accent : 'rgba(255,255,255,.5)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={savingBoutique} className="btn-gold w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base">
              <Save className="w-5 h-5" /> {savingBoutique ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
