'use client'
import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useParams } from 'next/navigation'
import {
  MessageCircle, ShoppingCart, MapPin, Phone, Share2,
  Plus, Minus, X, Trash2, CheckCircle2, Search,
  Star, TrendingUp, Sparkles, ShoppingBag
} from 'lucide-react'
import { supabase, type Vendor, type Product } from '../../../lib/supabase'

const ImageWithSkeleton = memo(({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 rounded-[1.5rem] shimmer" />}
      <img src={src} alt={alt} className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
    </div>
  )
})

export default function BoutiquePage() {
  const { slug } = useParams<{ slug: string }>()
  const [vendor, setVendor]           = useState<Vendor | null>(null)
  const [products, setProducts]       = useState<Product[]>([])
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [activeCategory, setActiveCategory] = useState('Tout')
  const [search, setSearch]           = useState('')
  const [cart, setCart]               = useState<{ product: Product; quantity: number }[]>([])
  const [cartOpen, setCartOpen]       = useState(false)
  const [toast, setToast]             = useState<string | null>(null)

  useEffect(() => {
    loadBoutique()
  }, [slug])

  const loadBoutique = async () => {
    const { data: v } = await supabase.from('vendors').select('*').eq('slug', slug).eq('actif', true).single()
    if (!v) { setNotFound(true); setLoading(false); return }
    setVendor(v)
    const { data: p } = await supabase.from('products').select('*').eq('vendor_id', v.id).order('ordre')
    setProducts(p ?? [])
    setLoading(false)
  }

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const addToCart = useCallback((product: Product) => {
    if (!product.en_stock) return
    setCart(prev => {
      const exists = prev.find(i => i.product.id === product.id)
      if (exists) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    notify(`${product.nom} ajouté`)
  }, [])

  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== id) return i
      const q = Math.max(0, i.quantity + delta)
      return q === 0 ? null! : { ...i, quantity: q }
    }).filter(Boolean))
  }, [])

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.product.id !== id))
  }, [])

  const totalAmount = useMemo(() => cart.reduce((t, i) => t + i.product.prix * i.quantity, 0), [cart])
  const totalItems  = useMemo(() => cart.reduce((t, i) => t + i.quantity, 0), [cart])
  const categories  = useMemo(() => ['Tout', ...new Set(products.map(p => p.categorie))], [products])

  const filtered = useMemo(() => {
    let list = activeCategory === 'Tout' ? products : products.filter(p => p.categorie === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.nom.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    return list
  }, [products, activeCategory, search])

  const checkout = useCallback(() => {
    if (!vendor || cart.length === 0) return
    const hour = new Date().getHours()
    const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonsoir' : 'Bonne soirée'
    let msg = `${greet} *${vendor.boutique_nom}* ! 👋\nJe souhaite valider ma commande :\n\n🛒 *MON PANIER :*\n${'─'.repeat(28)}\n`
    cart.forEach(i => { msg += `▪️ ${i.quantity}x ${i.product.nom} _(${(i.product.prix * i.quantity).toLocaleString()} FCFA)_\n` })
    msg += `${'─'.repeat(28)}\n💰 *TOTAL : ${totalAmount.toLocaleString()} FCFA*\n\n📍 Cette commande est-elle disponible pour livraison ?`
    window.open(`https://wa.me/${vendor.boutique_whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
  }, [cart, vendor, totalAmount])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)' }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,255,255,.08)', borderTopColor: 'var(--gold)' }} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4" style={{ background: 'var(--ink)' }}>
        <div>
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--gold)' }} />
          <p className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--cream)' }}>Boutique introuvable</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,.4)' }}>Cette boutique n'existe pas ou a été désactivée.</p>
        </div>
      </div>
    )
  }

  if (!vendor) return null

  const accentHex = vendor.boutique_accent === 'emerald' ? '#10b981' : vendor.boutique_accent === 'rose' ? '#f43f5e' : vendor.boutique_accent === 'purple' ? '#a855f7' : vendor.boutique_accent === 'amber' ? '#f59e0b' : vendor.boutique_accent === 'indigo' ? '#6366f1' : '#3b82f6'

  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--ink)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold shadow-2xl animate-fade-up"
          style={{ background: 'rgba(46,204,113,.15)', border: '1px solid rgba(46,204,113,.3)', color: '#2ECC71', backdropFilter: 'blur(20px)' }}>
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <header className="relative overflow-hidden rounded-b-[3rem] mb-6">
        <div className={`h-52 md:h-72 bg-gradient-to-r ${vendor.boutique_theme} relative`}>
          {vendor.boutique_cover_url && (
            <img src={vendor.boutique_cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay" />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(10,10,15,.8))' }} />
        </div>
        <button onClick={() => navigator.share?.({ title: vendor.boutique_nom, url: window.location.href }).catch(() => {})}
          className="absolute top-5 right-5 p-2.5 rounded-full backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,.3)', color: '#fff' }}>
          <Share2 className="w-4 h-4" />
        </button>

        <div className="max-w-4xl mx-auto px-4 relative">
          <div className="relative -mt-16 flex justify-center mb-4">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-2 shadow-2xl ring-4"
              style={{ background: 'var(--ink-soft)', ringColor: 'var(--ink)' }}>
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${vendor.boutique_theme} flex items-center justify-center font-bold text-4xl text-white uppercase`}>
                {vendor.boutique_nom.substring(0, 2)}
              </div>
              <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full border-4"
                style={{ background: '#2ECC71', borderColor: 'var(--ink-soft)' }} />
            </div>
          </div>
          <div className="text-center space-y-2 pb-6">
            <h1 className="font-display font-bold text-2xl md:text-3xl" style={{ color: 'var(--cream)' }}>{vendor.boutique_nom}</h1>
            {vendor.boutique_tagline && <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.4)' }}>{vendor.boutique_tagline}</p>}
            {vendor.boutique_description && <p className="text-sm max-w-md mx-auto hidden sm:block" style={{ color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{vendor.boutique_description}</p>}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold glass" style={{ color: 'rgba(255,255,255,.5)' }}>
                <MapPin className="w-3 h-3" /> {vendor.boutique_location}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold glass" style={{ color: 'rgba(255,255,255,.5)' }}>
                <Phone className="w-3 h-3" /> +{vendor.boutique_whatsapp}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,.25)' }} />
          <input type="search" className="input-dark pl-11" placeholder="Rechercher un produit..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Catégories */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-6 no-scrollbar">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
              style={activeCategory === cat
                ? { background: accentHex, color: 'white' }
                : { background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.08)' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grille produits */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-10" style={{ color: 'var(--gold)' }} />
            <p style={{ color: 'rgba(255,255,255,.3)' }}>Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => {
              const inCart = cart.find(i => i.product.id === product.id)
              return (
                <div key={product.id}
                  className="glass rounded-[1.75rem] p-3 flex flex-col hover:-translate-y-1 transition-all duration-300 relative group">
                  {!product.en_stock && (
                    <div className="absolute top-5 right-5 z-10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase backdrop-blur-sm"
                      style={{ background: 'rgba(0,0,0,.7)', color: 'rgba(255,255,255,.7)' }}>Épuisé</div>
                  )}
                  {product.badge_text && (
                    <div className={`absolute top-5 left-5 z-10 ${product.badge_color} text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1`}>
                      {product.badge_type === 'trending' && <TrendingUp className="w-3 h-3" />}
                      {product.badge_type === 'sparkle'  && <Sparkles   className="w-3 h-3" />}
                      {product.badge_type === 'sale'     && <Star        className="w-3 h-3" />}
                      {product.badge_text}
                    </div>
                  )}
                  <div className="w-full h-52 rounded-[1.25rem] overflow-hidden bg-white/5 mb-4 relative">
                    {product.image_url ? (
                      <ImageWithSkeleton src={product.image_url} alt={product.nom}
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!product.en_stock ? 'grayscale opacity-40' : ''}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-10 h-10 opacity-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col px-1">
                    <h3 className="font-semibold text-sm leading-tight mb-2" style={{ color: 'var(--cream)' }}>{product.nom}</h3>
                    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                      <span className="font-black text-lg" style={{ color: 'var(--cream)' }}>
                        {product.prix.toLocaleString()} <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,.4)' }}>FCFA</span>
                      </span>
                      {product.prix_original && (
                        <>
                          <span className="text-xs line-through" style={{ color: 'rgba(255,255,255,.25)' }}>{product.prix_original.toLocaleString()}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171' }}>
                            -{Math.round((1 - product.prix / product.prix_original) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                    {product.description && <p className="text-xs mb-4 flex-1 line-clamp-2" style={{ color: 'rgba(255,255,255,.35)', lineHeight: 1.6 }}>{product.description}</p>}
                    <button onClick={() => addToCart(product)} disabled={!product.en_stock}
                      className="w-full py-3.5 rounded-[1rem] flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wide transition-all active:scale-[.97] mt-auto"
                      style={product.en_stock
                        ? { background: accentHex, color: 'white' }
                        : { background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.25)', cursor: 'not-allowed' }}>
                      <Plus className="w-4 h-4" />
                      {inCart ? `Ajouter (${inCart.quantity})` : product.en_stock ? 'Ajouter' : 'Indisponible'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Bouton flottant panier */}
      <button onClick={() => setCartOpen(true)}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-between px-5 text-white shadow-2xl transition-all duration-500 z-40 hover:scale-[1.02] active:scale-[.98]"
        style={{
          width: '92%', maxWidth: '400px', height: '58px', borderRadius: '2rem',
          background: accentHex,
          opacity: totalItems > 0 ? 1 : 0,
          transform: `translateX(-50%) ${totalItems > 0 ? 'translateY(0)' : 'translateY(80px)'}`,
          pointerEvents: totalItems > 0 ? 'auto' : 'none',
        }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full"
              style={{ color: accentHex }}>
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          </div>
          <span className="font-bold text-sm">Mon panier</span>
        </div>
        <span className="font-black">{totalAmount.toLocaleString()} FCFA</span>
      </button>

      {/* Modal panier */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(10px)' }}
          onClick={e => { if (e.target === e.currentTarget) setCartOpen(false) }}>
          <div className="w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden"
            style={{ background: 'var(--ink-soft)', border: '1px solid rgba(255,255,255,.08)', maxHeight: '90vh', animation: 'slideUp .3s cubic-bezier(.22,1,.36,1) both' }}>
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accentHex}, ${accentHex}88)` }} />
            <div className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              <h2 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: 'var(--cream)' }}>
                <ShoppingBag className="w-5 h-5 opacity-50" /> Ma Commande
                {totalItems > 0 && <span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,.3)' }}>({totalItems})</span>}
              </h2>
              <button onClick={() => setCartOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                style={{ color: 'rgba(255,255,255,.4)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-16 flex flex-col items-center" style={{ color: 'rgba(255,255,255,.25)' }}>
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-semibold">Panier vide</p>
                </div>
              ) : cart.map(item => (
                <div key={item.product.id} className="flex gap-3 items-center rounded-2xl p-3"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  {item.product.image_url && (
                    <img src={item.product.image_url} alt={item.product.nom} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--cream)' }}>{item.product.nom}</p>
                    <p className="text-sm font-black font-mono mt-0.5" style={{ color: accentHex }}>
                      {(item.product.prix * item.quantity).toLocaleString()} FCFA
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
                        <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg active:scale-90 transition-all" style={{ color: 'rgba(255,255,255,.5)' }}>
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-black" style={{ color: 'var(--cream)' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg active:scale-90 transition-all" style={{ color: 'rgba(255,255,255,.5)' }}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.product.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,100,100,.4)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="px-5 py-5 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.3)' }}>Total à régler</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>{totalItems} article{totalItems > 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-2xl font-black font-mono" style={{ color: 'var(--cream)' }}>{totalAmount.toLocaleString()} FCFA</span>
                </div>
                <button onClick={checkout}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-white uppercase tracking-wide active:scale-[.97] transition-all"
                  style={{ background: '#25D366' }}>
                  <MessageCircle className="w-5 h-5" /> Commander via WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}} />
    </div>
  )
}
