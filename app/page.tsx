'use client'
import Link from 'next/link'
import { ShoppingBag, Zap, Shield, Star, ArrowRight, Check, Globe } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--ink)' }}>

      {/* Nav */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
            <ShoppingBag className="w-4 h-4" style={{ color: 'var(--ink)' }} />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--cream)' }}>VitrinePro</span>
        </div>
        <div className="flex gap-3">
          <Link href="/connexion"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,.6)' }}>
            Se connecter
          </Link>
          <Link href="/inscription"
            className="btn-gold px-5 py-2.5 text-sm rounded-xl">
            Créer ma boutique
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-32 text-center relative">
        {/* Orbe décoratif */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)' }} />

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 glass-gold text-sm font-semibold animate-fade-in"
          style={{ color: 'var(--gold)' }}>
          <Zap className="w-3.5 h-3.5" />
          Boutique WhatsApp en 5 minutes
        </div>

        <h1 className="font-display font-bold leading-tight mb-6 animate-fade-up"
          style={{ fontSize: 'clamp(40px, 6vw, 80px)', color: 'var(--cream)' }}>
          Votre boutique en ligne.{' '}
          <span className="text-gradient">Vos clients sur WhatsApp.</span>
        </h1>

        <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto animate-fade-up"
          style={{ color: 'rgba(255,255,255,.5)', lineHeight: 1.8, animationDelay: '.1s' }}>
          Créez un catalogue magnifique, gérez vos produits et photos directement en ligne.
          Vos clients commandent en un clic via WhatsApp. Aucun code requis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '.2s' }}>
          <Link href="/inscription"
            className="btn-gold flex items-center justify-center gap-2 text-base px-8 py-4 rounded-2xl">
            Créer ma boutique gratuite <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/boutique/demo"
            className="flex items-center justify-center gap-2 text-base px-8 py-4 rounded-2xl font-semibold transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.1)' }}>
            <Globe className="w-4 h-4" /> Voir une démo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ShoppingBag, title: 'Catalogue illimité', desc: 'Ajoutez autant de produits que vous voulez. Photos depuis votre téléphone, prix, descriptions, badges promo.', color: 'var(--gold)' },
            { icon: Zap,         title: 'Mise à jour instantanée', desc: 'Changez un prix, ajoutez un produit, marquez-le épuisé — votre boutique se met à jour en temps réel.', color: '#2ECC71' },
            { icon: Shield,      title: 'Vos données protégées', desc: 'Backup automatique de toute votre boutique. En cas de problème, restauration en un clic.', color: '#6366f1' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-8 animate-fade-up" style={{ animationDelay: `${i * .1}s` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--cream)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.45)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="glass-gold rounded-3xl p-12">
          <Star className="w-10 h-10 mx-auto mb-6" style={{ color: 'var(--gold)' }} />
          <h2 className="font-display font-bold text-3xl mb-4" style={{ color: 'var(--cream)' }}>
            Prêt·e à vendre ?
          </h2>
          <p className="mb-8 text-sm" style={{ color: 'rgba(255,255,255,.5)' }}>
            Inscription gratuite. Boutique active en moins de 5 minutes.
          </p>
          <Link href="/inscription" className="btn-gold inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base">
            Commencer maintenant <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,.2)', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        VitrinePro — Propulsé par PowerAi · Douala, Cameroun
      </footer>
    </div>
  )
}
