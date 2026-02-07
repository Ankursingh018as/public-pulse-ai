import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Public Pulse — Admin Dashboard',
  description: 'Civic Intelligence Platform for Vadodara - Real-time incident monitoring, AI predictions, and urban analytics.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f172a] antialiased">{children}</body>
    </html>
  )
}
