'use client'

import { SignUp } from '@clerk/nextjs'
import { HideClerkBanner } from './hide-clerk-banner'
import { useTheme } from '@/components/ThemeProvider'

export function ClerkSignUp() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const appearance = {
    variables: {
      colorPrimary: '#F97316',
      colorBackground: 'transparent',
      colorInputBackground: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
      colorText: isDark ? '#f4f4f5' : '#09090b',
      colorTextSecondary: isDark ? '#a1a1aa' : '#52525b',
      colorInputText: isDark ? '#f4f4f5' : '#09090b',
      colorNeutral: isDark ? '#f4f4f5' : '#09090b',
      borderRadius: '10px',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize: '15px',
    },
    elements: {
      card: { background: 'transparent', boxShadow: 'none', border: 'none' },
      rootBox: { width: '100%' },
      headerTitle: { color: isDark ? '#ffffff' : '#09090b', fontWeight: '700' },
      headerSubtitle: { color: isDark ? '#a1a1aa' : '#52525b' },
      socialButtonsBlockButton: {
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
        color: isDark ? '#f4f4f5' : '#09090b',
      },
      socialButtonsBlockButtonText: {
        color: isDark ? '#f4f4f5' : '#09090b',
        fontWeight: '500',
      },
      dividerLine: { background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)' },
      dividerText: { color: isDark ? '#71717a' : '#71717a' },
      formFieldLabel: { color: isDark ? '#a1a1aa' : '#52525b', fontWeight: '500' },
      formFieldInput: {
        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.16)',
        color: isDark ? '#f4f4f5' : '#09090b',
      },
      formFieldInputShowPasswordButton: { color: isDark ? '#a1a1aa' : '#71717a' },
      footer: {
        background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.6)',
        borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
      },
      footerAction: {
        background: 'transparent',
      },
      footerActionText: {
        color: isDark ? '#ffffff' : '#09090b',
        fontWeight: '500',
      },
      footerActionLink: {
        color: '#F97316',
        fontWeight: '700',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
      },
      footerPages: 'hidden',
      badge: 'hidden',
      identityPreviewText: { color: isDark ? '#f4f4f5' : '#09090b' },
      identityPreviewEditButton: { color: '#F97316' },
      alternativeMethodsBlockButton: {
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
        color: isDark ? '#f4f4f5' : '#09090b',
      },
    },
  } as const

  return (
    <div className={[
      'rounded-2xl overflow-hidden backdrop-blur-2xl',
      isDark
        ? 'bg-black/50 border border-white/10 shadow-2xl shadow-black/60'
        : 'bg-white/80 border border-black/10 shadow-xl shadow-black/10',
    ].join(' ')}>
      <HideClerkBanner />
      <SignUp appearance={appearance} />
    </div>
  )
}
