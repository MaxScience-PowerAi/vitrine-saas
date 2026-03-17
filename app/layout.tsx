import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'VitrinePro — Votre boutique en ligne', template: '%s | VitrinePro' },
  description: 'Créez votre boutique WhatsApp en quelques minutes. Gérez vos produits, photos et prix en ligne.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
