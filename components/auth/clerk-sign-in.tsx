'use client'

import { SignIn } from '@clerk/nextjs'
import { useTheme } from '@/components/ThemeProvider'

export function ClerkSignIn() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className={`
      rounded-2xl overflow-hidden
      ${isDark
        ? 'bg-black/35 border border-white/10 shadow-2xl shadow-black/60'
        : 'bg-white/50 border border-black/10 shadow-2xl shadow-black/20'}
      backdrop-blur-2xl
    `}>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#F97316',
            colorBackground: 'transparent',
            colorInputBackground: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            colorText: isDark ? '#fafafa' : '#09090b',
            colorTextSecondary: isDark ? '#a1a1aa' : '#52525b',
            colorInputText: isDark ? '#fafafa' : '#09090b',
            colorNeutral: isDark ? '#fafafa' : '#09090b',
            borderRadius: '10px',
            fontFamily: 'var(--font-sans)',
            fontSize: '15px',
          },
          elements: {
            card: { background: 'transparent', boxShadow: 'none', border: 'none' },
            rootBox: { width: '100%' },
            headerSubtitle: { color: isDark ? '#a1a1aa' : '#52525b' },
            socialButtonsBlockButton: {
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              color: isDark ? '#fafafa' : '#09090b',
            },
            dividerLine: { background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
            dividerText: { color: isDark ? '#71717a' : '#a1a1aa' },
            formFieldInput: {
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
              color: isDark ? '#fafafa' : '#09090b',
            },
            formFieldLabel: { color: isDark ? '#a1a1aa' : '#52525b' },
            footerActionLink: { color: '#F97316' },
            identityPreviewText: { color: isDark ? '#fafafa' : '#09090b' },
            identityPreviewEditButton: { color: '#F97316' },
          },
        }}
      />
    </div>
  )
}
