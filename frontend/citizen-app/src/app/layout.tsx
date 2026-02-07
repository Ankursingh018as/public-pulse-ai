import './globals.css'
import { UserProvider } from '../context/UserContext'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  title: 'Public Pulse — Vadodara Civic Reporting',
  description: 'Real-time civic issue reporting and AI-powered predictions for Vadodara city. Report traffic, garbage, water, and streetlight issues instantly.',
  keywords: 'Vadodara, civic issues, traffic, smart city, reporting, AI predictions',
  authors: [{ name: 'Public Pulse Team' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
