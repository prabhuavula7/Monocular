import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Monocular',
  description: 'AI-powered project scoping for service firms',
  icons: {
    icon: '/monocular_logo_pack/monocular-icon-color.svg',
    apple: '/monocular_logo_pack/monocular-icon-color.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${plusJakarta.variable} h-full antialiased`} suppressHydrationWarning>
        <head>
          {/* Runs synchronously before first paint — prevents theme flash */}
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&d))document.documentElement.classList.add('dark')}catch(e){}})()` }} />
        </head>
        <body className="min-h-full bg-canvas text-ink font-sans">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
