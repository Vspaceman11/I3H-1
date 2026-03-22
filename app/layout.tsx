import type { Metadata } from 'next'
import { Geist_Mono, Montserrat, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ConvexClientProvider } from '@/components/convex-provider'
import './globals.css'

/** Geometric sans, heavy weights — closer to Stenomatic-style wordmarks */
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-ui-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Pigeon-eye — Heilbronn City Reporter',
  description: 'Report city issues with photo, AI analysis and real-time tracking',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
