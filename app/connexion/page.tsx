'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hashPassword } from '../../lib/utils'

export default function ConnexionPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const hash = await hashPassword(password)
    const { data, error: err } = await supabase
      .from('vendors')
      .select('slug, actif, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (err || !data) {
      setError('Email ou mot de passe incorrect.'); setLoading(false); return
    }
    if (data.password_hash !== hash) {
      setError('Email ou mot de passe incorrect.'); setLoading(false); return
    }
    if (!data.actif) {
      setError('Votre boutique a été désactivée. Contactez le support.'); setLoading(false); return
    }

    sessionStorage.setItem('vitrine_vendor_slug', data.slug)
    sessionStorage.setItem('vitrine_vendor_email', email)
    router.push(`/admin/${data.slug}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
      <div className="fixed bottom-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md animate-scale-in">
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
            <ShoppingBag className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--cream)' }}>VitrinePro</span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--cream)' }}>Bon retour !</h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,.4)' }}>Connectez-vous à votre espace vendeur</p>

          {error && (
            <div className="mb-5 p-4 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                Email
              </label>
              <input type="email" required className="input-dark" placeholder="votre@email.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.4)', letterSpacing: '.08em' }}>
                Mot de passe
              </label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} required className="input-dark pr-12"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,.3)' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full py-4 rounded-xl mt-2">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,.3)' }}>
          Pas encore de boutique ?{' '}
          <Link href="/inscription" style={{ color: 'var(--gold)' }}>Créer la mienne</Link>
        </p>
      </div>
    </div>
  )
}
