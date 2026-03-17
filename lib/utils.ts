// Hash simple pour les mots de passe (côté client)
// En production, utiliser bcrypt côté serveur
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data     = encoder.encode(password + 'vitrine_saas_salt_2025')
  const buffer   = await crypto.subtle.digest('SHA-256', data)
  const array    = Array.from(new Uint8Array(buffer))
  return array.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30)
}

export const SUPER_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_SUPER_ADMIN_PASSWORD || 'SUPERADMIN_2025_POWERAI'

export const THEMES = [
  { id: 'slate',   label: 'Ardoise',   value: 'from-slate-900 to-slate-800',   accent: '#3b82f6' },
  { id: 'purple',  label: 'Violet',    value: 'from-purple-950 to-purple-900',  accent: '#a855f7' },
  { id: 'rose',    label: 'Rose',      value: 'from-rose-950 to-rose-900',      accent: '#f43f5e' },
  { id: 'emerald', label: 'Émeraude',  value: 'from-emerald-950 to-emerald-900',accent: '#10b981' },
  { id: 'amber',   label: 'Ambre',     value: 'from-amber-950 to-amber-900',    accent: '#f59e0b' },
  { id: 'indigo',  label: 'Indigo',    value: 'from-indigo-950 to-indigo-900',  accent: '#6366f1' },
]
