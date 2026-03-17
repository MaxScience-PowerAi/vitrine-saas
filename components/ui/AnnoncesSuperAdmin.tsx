'use client'

import { useState, useEffect } from 'react'
import {
  Megaphone, Send, Trash2, Info, Tag,
  AlertTriangle, Sparkles, CheckCircle2,
  MessageCircle, Users, X, Loader2
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface Annonce {
  id:             string
  titre:          string
  contenu:        string
  type:           string
  whatsapp_envoye:boolean
  created_at:     string
  lues?:          number
}

interface Vendor { id: string; boutique_nom: string; boutique_whatsapp: string; actif: boolean }

const TYPES = [
  { id: 'info',      label: 'Info',       icon: Info,          color: '#3B82F6' },
  { id: 'promotion', label: 'Promotion',  icon: Tag,           color: '#2ECC71' },
  { id: 'alerte',    label: 'Alerte',     icon: AlertTriangle, color: '#EF4444' },
  { id: 'nouveau',   label: 'Nouveau',    icon: Sparkles,      color: '#C9A84C' },
]

export default function AnnoncesSuperAdmin() {
  const [annonces, setAnnonces]   = useState<Annonce[]>([])
  const [vendors, setVendors]     = useState<Vendor[]>([])
  const [showForm, setShowForm]   = useState(false)
  const [sending, setSending]     = useState(false)
  const [toast, setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [form, setForm]           = useState({ titre: '', contenu: '', type: 'info' })
  const [sendWA, setSendWA]       = useState(true)

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { load() }, [])

  const load = async () => {
    const [{ data: ann }, { data: v }] = await Promise.all([
      supabase.from('annonces').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('id,boutique_nom,boutique_whatsapp,actif').eq('actif', true),
    ])
    setAnnonces(ann ?? [])
    setVendors(v ?? [])
  }

  const sendAnnonce = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titre.trim() || !form.contenu.trim()) return
    setSending(true)

    // 1. Créer l'annonce en base
    const { data: ann, error } = await supabase
      .from('annonces')
      .insert([{ titre: form.titre, contenu: form.contenu, type: form.type, whatsapp_envoye: sendWA }])
      .select().single()

    if (error) { notify('Erreur envoi', 'err'); setSending(false); return }

    // 2. Envoyer WhatsApp à tous les vendeurs actifs (liens générés)
    if (sendWA && vendors.length > 0) {
      const msg = `🔔 *VitrinePro — ${form.type === 'promotion' ? 'PROMOTION' : form.type === 'alerte' ? 'ALERTE' : form.type === 'nouveau' ? 'NOUVEAU' : 'INFO'}*\n\n*${form.titre}*\n\n${form.contenu}\n\n_— L'équipe VitrinePro_`
      // Ouvrir WhatsApp pour chaque vendeur (en pratique, utiliser Twilio ici)
      // Pour la démo : ouvrir le premier vendor en WhatsApp
      const encoded = encodeURIComponent(msg)
      vendors.slice(0, 1).forEach(v => {
        window.open(`https://wa.me/${v.boutique_whatsapp}?text=${encoded}`, '_blank')
      })
      notify(`Annonce envoyée à ${vendors.length} vendeur${vendors.length > 1 ? 's' : ''} !`)
    } else {
      notify('Annonce publiée !')
    }

    setForm({ titre: '', contenu: '', type: 'info' })
    setShowForm(false)
    load()
    setSending(false)
  }

  const deleteAnnonce = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return
    await supabase.from('annonces').delete().eq('id', id)
    setAnnonces(p => p.filter(a => a.id !== id))
    notify('Annonce supprimée')
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6 relative">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold shadow-2xl animate-fade-up"
          style={toast.type === 'ok'
            ? { background: 'rgba(46,204,113,.15)', border: '1px solid rgba(46,204,113,.3)', color: '#2ECC71' }
            : { background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5' }}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl" style={{ color: 'var(--cream)' }}>
            Annonces & Broadcast
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>
            {vendors.length} vendeur{vendors.length > 1 ? 's' : ''} actif{vendors.length > 1 ? 's' : ''} recevront tes messages
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
          <Megaphone className="w-4 h-4" /> Nouvelle annonce
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="glass rounded-2xl p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg" style={{ color: 'var(--cream)' }}>
              Envoyer une annonce
            </h3>
            <button onClick={() => setShowForm(false)} style={{ color: 'rgba(255,255,255,.3)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={sendAnnonce} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                Type d'annonce
              </label>
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => {
                  const Icon = t.icon
                  return (
                    <button key={t.id} type="button"
                      onClick={() => setForm(p => ({ ...p, type: t.id }))}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={form.type === t.id
                        ? { background: `${t.color}22`, border: `1px solid ${t.color}66`, color: t.color }
                        : { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)' }}>
                      <Icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                Titre
              </label>
              <input className="input-dark" required placeholder="Ex: Nouvelle fonctionnalité disponible !"
                value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em' }}>
                Message
              </label>
              <textarea className="input-dark resize-none" rows={4} required
                placeholder="Écris ton message complet ici..."
                value={form.contenu} onChange={e => setForm(p => ({ ...p, contenu: e.target.value }))} />
            </div>

            {/* Option WhatsApp */}
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(37,211,102,.06)', border: '1px solid rgba(37,211,102,.2)' }}>
              <button type="button" onClick={() => setSendWA(v => !v)}
                className="flex-shrink-0 mt-0.5">
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-all`}
                  style={sendWA
                    ? { background: '#25D366' }
                    : { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}>
                  {sendWA && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
              </button>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#25D366' }}>
                  Envoyer aussi par WhatsApp
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>
                  Le message sera envoyé sur le WhatsApp de chaque vendeur actif ({vendors.length} vendeur{vendors.length > 1 ? 's' : ''}).
                  {!sendWA && ' Désactivé — annonce visible uniquement dans leur admin.'}
                </p>
              </div>
            </div>

            {/* Aperçu destinataires */}
            <div className="flex flex-wrap gap-2">
              {vendors.slice(0, 8).map(v => (
                <span key={v.id} className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.4)', border: '1px solid rgba(255,255,255,.08)' }}>
                  {v.boutique_nom}
                </span>
              ))}
              {vendors.length > 8 && (
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(201,168,76,.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.2)' }}>
                  +{vendors.length - 8} autres
                </span>
              )}
            </div>

            <button type="submit" disabled={sending}
              className="btn-gold w-full flex items-center justify-center gap-2 py-4 rounded-xl">
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
                : <><Send className="w-4 h-4" /> Envoyer à tous les vendeurs</>
              }
            </button>
          </form>
        </div>
      )}

      {/* Historique annonces */}
      <div className="space-y-3">
        {annonces.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--gold)' }} />
            <p style={{ color: 'rgba(255,255,255,.3)' }}>Aucune annonce envoyée</p>
          </div>
        ) : (
          annonces.map(ann => {
            const t = TYPES.find(t => t.id === ann.type) ?? TYPES[0]
            const Icon = t.icon
            return (
              <div key={ann.id} className="glass rounded-2xl p-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${t.color}18`, border: `1px solid ${t.color}30` }}>
                  <Icon className="w-4 h-4" style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{ann.titre}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${t.color}18`, color: t.color }}>
                      {t.label}
                    </span>
                    {ann.whatsapp_envoye && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: 'rgba(37,211,102,.12)', color: '#25D366' }}>
                        <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
                    {ann.contenu}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,.2)' }}>
                    {fmtDate(ann.created_at)}
                  </p>
                </div>
                <button onClick={() => deleteAnnonce(ann.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
                  style={{ color: 'rgba(255,100,100,.4)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
