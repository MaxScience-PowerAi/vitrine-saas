'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Send, Image as ImageIcon, X, Reply, Flag,
  ShoppingBag, ArrowLeft, Users, Loader2,
  CheckCircle2, AlertCircle, AtSign,
} from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

interface Vendor {
  id: string; slug: string; boutique_nom: string; actif: boolean
}

interface Message {
  id:          string
  vendor_id:   string
  contenu:     string
  image_url:   string | null
  reply_to_id: string | null
  mentions:    string[]
  signalements:number
  cache:        boolean
  created_at:  string
  vendor?:     { slug: string; boutique_nom: string }
  reply_to?:   { contenu: string; vendor?: { boutique_nom: string } } | null
}

export default function CommunautePage() {
  const { slug } = useParams<{ slug: string }>()
  const router   = useRouter()

  const [vendor, setVendor]       = useState<Vendor | null>(null)
  const [allVendors, setAllVendors] = useState<Vendor[]>([])
  const [messages, setMessages]   = useState<Message[]>([])
  const [loading, setLoading]     = useState(true)
  const [text, setText]           = useState('')
  const [replyTo, setReplyTo]     = useState<Message | null>(null)
  const [imageUrl, setImageUrl]   = useState('')
  const [sending, setSending]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [toast, setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [onlineCount, setOnlineCount] = useState(1)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const channelRef  = useRef<any>(null)

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Auth check ─────────────────────────────────────────────
  useEffect(() => {
    const savedSlug = sessionStorage.getItem('vitrine_vendor_slug')
    if (!savedSlug || savedSlug !== slug) { router.replace('/connexion'); return }
    init()
    return () => { channelRef.current?.unsubscribe() }
  }, [slug])

  const init = async () => {
    // Charger vendeur courant
    const { data: v } = await supabase
      .from('vendors').select('id,slug,boutique_nom,actif').eq('slug', slug).single()
    if (!v) { router.replace('/connexion'); return }
    setVendor(v)

    // Charger tous les vendeurs pour les mentions
    const { data: all } = await supabase
      .from('vendors').select('id,slug,boutique_nom,actif').eq('actif', true)
    setAllVendors(all ?? [])

    // Charger messages (50 derniers avec vendor + reply)
    await loadMessages()
    setLoading(false)

    // Écoute Realtime
    channelRef.current = supabase
      .channel('communaute_live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'communaute_messages' },
        async (payload) => {
          const newMsg = payload.new as Message
          // Enrichir avec infos vendeur
          const { data: vd } = await supabase
            .from('vendors').select('slug,boutique_nom').eq('id', newMsg.vendor_id).single()
          const enriched = { ...newMsg, vendor: vd ?? undefined }
          setMessages(prev => [...prev, enriched])
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'communaute_messages' },
        (payload) => {
          setMessages(prev => prev.map(m =>
            m.id === payload.new.id ? { ...m, ...payload.new } : m
          ))
        }
      )
      .subscribe()
  }

  const loadMessages = async () => {
    const { data } = await supabase
      .from('communaute_messages')
      .select(`
        *,
        vendor:vendors!vendor_id(slug, boutique_nom),
        reply_to:communaute_messages!reply_to_id(
          contenu,
          vendor:vendors!vendor_id(boutique_nom)
        )
      `)
      .eq('cache', false)
      .order('created_at', { ascending: true })
      .limit(100)

    setMessages(data ?? [])
  }

  // ── Scroll bas ─────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 5 ? 'smooth' : 'auto' })
  }, [messages])

  // ── Détection mentions ─────────────────────────────────────
  const handleTextChange = (val: string) => {
    setText(val)
    const atMatch = val.match(/@(\w[-\w]*)$/)
    if (atMatch) {
      setMentionSearch(atMatch[1])
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (vendorSlug: string) => {
    const newText = text.replace(/@\w[-\w]*$/, `@${vendorSlug} `)
    setText(newText)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  // ── Upload image ───────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !vendor) return
    setUploading(true)
    const path = `communaute/${vendor.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('boutique-images').upload(path, file)
    if (error) { notify('Erreur upload', 'err'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('boutique-images').getPublicUrl(path)
    setImageUrl(publicUrl)
    setUploading(false)
    notify('Photo prête !')
  }

  // ── Envoyer message ────────────────────────────────────────
  const sendMessage = async () => {
    if ((!text.trim() && !imageUrl) || !vendor || sending) return
    setSending(true)

    // Extraire les mentions du texte
    const mentions = [...text.matchAll(/@([\w-]+)/g)].map(m => m[1])

    const { error } = await supabase.from('communaute_messages').insert([{
      vendor_id:   vendor.id,
      contenu:     text.trim(),
      image_url:   imageUrl || null,
      reply_to_id: replyTo?.id ?? null,
      mentions,
    }])

    if (error) { notify('Erreur envoi', 'err') }
    else {
      setText('')
      setImageUrl('')
      setReplyTo(null)
    }
    setSending(false)
  }

  // ── Signaler un message ────────────────────────────────────
  const reportMessage = async (id: string, current: number) => {
    await supabase
      .from('communaute_messages')
      .update({ signalements: current + 1 })
      .eq('id', id)
    notify('Message signalé — l\'admin sera notifié')
  }

  // ── Formatage date ─────────────────────────────────────────
  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000)  return "À l'instant"
    if (diff < 3600000) return `Il y a ${Math.floor(diff/60000)} min`
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const isOwn = (msg: Message) => msg.vendor_id === vendor?.id

  const filteredMentions = allVendors.filter(v =>
    v.slug !== slug &&
    (v.slug.includes(mentionSearch) || v.boutique_nom.toLowerCase().includes(mentionSearch.toLowerCase()))
  ).slice(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--ink)' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold shadow-2xl animate-fade-up"
          style={toast.type === 'ok'
            ? { background: 'rgba(46,204,113,.15)', border: '1px solid rgba(46,204,113,.3)', color: '#2ECC71', backdropFilter: 'blur(20px)' }
            : { background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', backdropFilter: 'blur(20px)' }}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-4 flex items-center gap-3"
        style={{ background: 'rgba(10,10,15,.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <button onClick={() => router.push(`/admin/${slug}`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors flex-shrink-0"
          style={{ color: 'rgba(255,255,255,.4)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
          <Users className="w-5 h-5" style={{ color: 'var(--ink)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-none" style={{ color: 'var(--cream)' }}>
            Communauté VitrinePro
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>
            {allVendors.length} boutique{allVendors.length > 1 ? 's' : ''} membre{allVendors.length > 1 ? 's' : ''}
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              En ligne
            </span>
          </p>
        </div>
      </header>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2" style={{ scrollbarWidth: 'none' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)' }}>
              <Users className="w-8 h-8" style={{ color: 'var(--gold)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'rgba(255,255,255,.4)' }}>
              Sois le premier à écrire !
            </p>
            <p className="text-sm text-center max-w-xs" style={{ color: 'rgba(255,255,255,.2)', lineHeight: 1.6 }}>
              Ce groupe réunit tous les vendeurs VitrinePro. Partage tes produits, pose des questions, échange avec la communauté.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const own     = isOwn(msg)
          const showAvt = !own && (i === 0 || messages[i-1].vendor_id !== msg.vendor_id)
          const initials = (msg.vendor?.boutique_nom ?? '?').substring(0, 2).toUpperCase()

          // Mettre en surbrillance les mentions de l'utilisateur courant
          const isMetioned = msg.mentions?.includes(slug)

          return (
            <div key={msg.id}
              className={`flex items-end gap-2 ${own ? 'flex-row-reverse' : 'flex-row'} group`}>

              {/* Avatar */}
              {!own && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${showAvt ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(135deg, var(--gold-light)44, var(--gold-dark)44)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.2)' }}>
                  {initials}
                </div>
              )}

              <div className={`max-w-[75%] space-y-1 ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Nom boutique */}
                {!own && showAvt && (
                  <p className="text-[10px] font-bold px-1" style={{ color: 'var(--gold)' }}>
                    {msg.vendor?.boutique_nom}
                  </p>
                )}

                {/* Bulle */}
                <div className={`relative rounded-2xl px-3.5 py-2.5 ${
                  own ? 'rounded-br-sm' : 'rounded-bl-sm'
                } ${isMetioned ? 'ring-1 ring-amber-400/40' : ''}`}
                  style={own
                    ? { background: 'linear-gradient(135deg, var(--gold-light)33, var(--gold-dark)33)', border: '1px solid rgba(201,168,76,.25)' }
                    : { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>

                  {/* Reply preview */}
                  {msg.reply_to && (
                    <div className="mb-2 pl-2 py-1 rounded-lg text-xs"
                      style={{ borderLeft: '2px solid rgba(201,168,76,.5)', background: 'rgba(201,168,76,.05)' }}>
                      <p className="font-semibold" style={{ color: 'var(--gold)', fontSize: '10px' }}>
                        {msg.reply_to.vendor?.boutique_nom}
                      </p>
                      <p className="truncate" style={{ color: 'rgba(255,255,255,.4)', maxWidth: '200px' }}>
                        {msg.reply_to.contenu}
                      </p>
                    </div>
                  )}

                  {/* Image */}
                  {msg.image_url && (
                    <div className="mb-2 rounded-xl overflow-hidden" style={{ maxWidth: '220px' }}>
                      <img src={msg.image_url} alt="photo"
                        className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.image_url!, '_blank')} />
                    </div>
                  )}

                  {/* Texte avec mentions colorées */}
                  {msg.contenu && (
                    <p className="text-sm leading-relaxed" style={{ color: own ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.8)', wordBreak: 'break-word' }}>
                      {msg.contenu.split(/(@[\w-]+)/g).map((part, j) =>
                        part.startsWith('@')
                          ? <span key={j} className="font-semibold cursor-pointer hover:underline" style={{ color: 'var(--gold)' }}>{part}</span>
                          : part
                      )}
                    </p>
                  )}

                  <p className={`text-[9px] mt-1 ${own ? 'text-right' : 'text-left'}`}
                    style={{ color: 'rgba(255,255,255,.25)' }}>
                    {fmtTime(msg.created_at)}
                    {msg.signalements > 0 && (
                      <span className="ml-2 text-red-400">⚑ {msg.signalements}</span>
                    )}
                  </p>
                </div>

                {/* Actions survol */}
                <div className={`flex gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                  <button onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,.3)' }}>
                    <Reply className="w-3 h-3" /> Répondre
                  </button>
                  {!own && (
                    <button onClick={() => reportMessage(msg.id, msg.signalements)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors hover:bg-red-500/10"
                      style={{ color: 'rgba(255,100,100,.4)' }}>
                      <Flag className="w-3 h-3" /> Signaler
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Zone saisie */}
      <div className="flex-shrink-0 px-3 pb-4 pt-2 space-y-2"
        style={{ background: 'rgba(10,10,15,.95)', borderTop: '1px solid rgba(255,255,255,.06)' }}>

        {/* Preview reply */}
        {replyTo && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)' }}>
            <Reply className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: 'var(--gold)' }}>
                Réponse à {replyTo.vendor?.boutique_nom}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,.4)' }}>{replyTo.contenu}</p>
            </div>
            <button onClick={() => setReplyTo(null)} style={{ color: 'rgba(255,255,255,.3)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Preview image */}
        {imageUrl && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <img src={imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            <p className="text-xs flex-1" style={{ color: 'rgba(255,255,255,.4)' }}>Photo prête à envoyer</p>
            <button onClick={() => setImageUrl('')} style={{ color: 'rgba(255,255,255,.3)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Popup mentions */}
        {showMentions && filteredMentions.length > 0 && (
          <div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--ink-soft)', border: '1px solid rgba(255,255,255,.1)' }}>
            {filteredMentions.map(v => (
              <button key={v.id} onClick={() => insertMention(v.slug)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,.15)', color: 'var(--gold)' }}>
                  {v.boutique_nom.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{v.boutique_nom}</p>
                  <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,.3)' }}>@{v.slug}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Champ de saisie */}
        <div className="flex items-end gap-2">
          {/* Bouton photo */}
          <label className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl cursor-pointer transition-all hover:bg-white/5 ${uploading ? 'opacity-50' : ''}`}
            style={{ color: 'rgba(255,255,255,.4)' }}>
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          </label>

          {/* Bouton mention */}
          <button onClick={() => { setText(t => t + '@'); inputRef.current?.focus() }}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,.4)' }}>
            <AtSign className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={e => {
                handleTextChange(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder="Écris un message... (@mention, Entrée pour envoyer)"
              className="w-full px-4 py-3 rounded-2xl resize-none outline-none text-sm leading-relaxed"
              style={{
                background:  'rgba(255,255,255,.06)',
                border:      '1px solid rgba(255,255,255,.1)',
                color:       'var(--cream)',
                fontFamily:  'DM Sans, sans-serif',
                minHeight:   '44px',
                maxHeight:   '120px',
                overflowY:   'auto',
              }}
            />
          </div>

          {/* Bouton envoyer */}
          <button onClick={sendMessage} disabled={(!text.trim() && !imageUrl) || sending}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))', color: 'var(--ink)' }}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
