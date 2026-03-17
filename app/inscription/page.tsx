'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Eye, EyeOff, Check, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hashPassword, generateSlug } from '../../lib/utils'

export default function InscriptionPage() {
  const router = useRouter()
  const [step, setStep]       = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [cguAccepted, setCguAccepted] = useState(false)

  const [form, setForm] = useState({
    // Infos personnelles
    nom: '', email: '', telephone: '', residence: '', password: '',
    // Infos boutique
    boutique_nom: '', boutique_whatsapp: '', boutique_location: 'Douala, Cameroun',
  })

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom || !form.email || !form.telephone || !form.residence || !form.password) {
      setError('Tous les champs sont obligatoires.'); return
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.'); return
    }
    setError(''); setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cguAccepted) { setError('Vous devez accepter les conditions d\'utilisation.'); return }
    if (!form.boutique_nom || !form.boutique_whatsapp) {
      setError('Le nom de boutique et le WhatsApp sont obligatoires.'); return
    }
    setLoading(true); setError('')

    const slug = generateSlug(form.boutique_nom)
    const passwordHash = await hashPassword(form.password)

    const { error: err } = await supabase.from('vendors').insert([{
      slug,
      nom:               form.nom,
      email:             form.email,
      telephone:         form.telephone,
      residence:         form.residence,
      password_hash:     passwordHash,
      cgu_acceptee:      true,
      cgu_date:          new Date().toISOString(),
      actif:             true,
      boutique_nom:      form.boutique_nom,
      boutique_tagline:  '',
      boutique_description: '',
      boutique_telephone:form.telephone,
      boutique_whatsapp: form.boutique_whatsapp.replace(/\D/g, ''),
      boutique_location: form.boutique_location,
    }])

    if (err) {
      if (err.message.includes('unique')) setError('Cet email ou ce nom de boutique existe déjà.')
      else setError('Erreur lors de l\'inscription. Réessaie.')
      setLoading(false); return
    }

    // Stocker slug en session pour l'admin
    sessionStorage.setItem('vitrine_vendor_slug', slug)
    sessionStorage.setItem('vitrine_vendor_email', form.email)
    router.push(`/admin/${slug}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--ink)' }}>
      {/* Orbe décoratif */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
            <ShoppingBag className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--cream)' }}>VitrinePro</span>
        </Link>

        {/* Indicateur étapes */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s
                  ? 'text-[var(--ink)]'
                  : 'text-white/30'
              }`} style={step >= s ? { background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' } : { background: 'rgba(255,255,255,.1)' }}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className="w-12 h-px" style={{ background: step > 1 ? 'var(--gold)' : 'rgba(255,255,255,.1)' }} />}
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-8">
          <h1 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--cream)' }}>
            {step === 1 ? 'Vos informations' : 'Votre boutique'}
          </h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,.4)' }}>
            {step === 1 ? 'Ces informations sont confidentielles et sécurisées.' : 'Comment s\'appellera votre boutique ?'}
          </p>

          {error && (
            <div className="mb-5 p-4 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Nom complet
                </label>
                <input type="text" required className="input-dark" placeholder="Marie Dupont"
                  value={form.nom} onChange={e => update('nom', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Adresse email
                </label>
                <input type="email" required className="input-dark" placeholder="marie@email.com"
                  value={form.email} onChange={e => update('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Numéro de téléphone
                </label>
                <input type="tel" required className="input-dark" placeholder="+237 6XX XXX XXX"
                  value={form.telephone} onChange={e => update('telephone', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Résidence (Quartier, Ville)
                </label>
                <input type="text" required className="input-dark" placeholder="Akwa, Douala"
                  value={form.residence} onChange={e => update('residence', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Mot de passe
                </label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} required className="input-dark pr-12"
                    placeholder="8 caractères minimum"
                    value={form.password} onChange={e => update('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: 'rgba(255,255,255,.3)' }}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-gold w-full flex items-center justify-center gap-2 mt-6 py-4 rounded-xl">
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Nom de votre boutique
                </label>
                <input type="text" required className="input-dark" placeholder="Marie Mode Boutique"
                  value={form.boutique_nom} onChange={e => update('boutique_nom', e.target.value)} />
                {form.boutique_nom && (
                  <p className="text-xs mt-1.5 font-mono" style={{ color: 'var(--gold)' }}>
                    Votre lien : /boutique/{generateSlug(form.boutique_nom)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Numéro WhatsApp boutique
                </label>
                <input type="tel" required className="input-dark" placeholder="237678831868 (sans +)"
                  value={form.boutique_whatsapp} onChange={e => update('boutique_whatsapp', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                  Localisation boutique
                </label>
                <input type="text" className="input-dark" placeholder="Douala, Cameroun"
                  value={form.boutique_location} onChange={e => update('boutique_location', e.target.value)} />
              </div>

              {/* CGU — transparente et claire */}
              <div className="rounded-xl p-4 mt-4" style={{ background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.2)' }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--gold)' }}>
                  Conditions d'utilisation
                </h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,.5)' }}>
                  En créant votre boutique sur VitrinePro, vous acceptez que vos informations personnelles
                  <strong style={{ color: 'rgba(255,255,255,.7)' }}> (nom, email, téléphone, résidence)</strong> ainsi que
                  les données de votre boutique soient hébergées et gérées par <strong style={{ color: 'rgba(255,255,255,.7)' }}>PowerAi</strong>.
                  Ces données sont utilisées uniquement pour la gestion de votre compte et la fourniture du service.
                  Elles ne sont pas revendues à des tiers. Vous pouvez demander la suppression de votre compte à tout moment.
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input type="checkbox" className="sr-only" checked={cguAccepted} onChange={e => setCguAccepted(e.target.checked)} />
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${cguAccepted ? 'text-[var(--ink)]' : ''}`}
                      style={cguAccepted ? { background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' } : { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}>
                      {cguAccepted && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,.6)' }}>
                    J'ai lu et j'accepte les conditions d'utilisation de VitrinePro.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-4 rounded-xl font-semibold text-sm transition-all hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
                  Retour
                </button>
                <button type="submit" disabled={loading || !cguAccepted}
                  className="btn-gold flex-2 flex items-center justify-center gap-2 py-4 rounded-xl" style={{ flex: 2 }}>
                  {loading ? 'Création...' : <>Créer ma boutique <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,.3)' }}>
          Déjà une boutique ?{' '}
          <Link href="/connexion" className="transition-colors hover:text-white/60" style={{ color: 'var(--gold)' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
