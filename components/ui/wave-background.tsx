'use client'

import { useEffect, useState } from 'react'
import { DitheringShader } from './dithering-shader'
import { useTheme } from '@/components/ThemeProvider'

export function WaveBackground() {
  const { resolvedTheme } = useTheme()
  const [dims, setDims] = useState({ w: 1440, h: 900 })

  useEffect(() => {
    function update() {
      setDims({ w: window.innerWidth, h: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="fixed inset-0 -z-10">
      <DitheringShader
        width={dims.w}
        height={dims.h}
        colorBack={isDark ? '#0a0a0a' : '#ffffff'}
        colorFront="#F97316"
        shape="wave"
        type="8x8"
        pxSize={3}
        speed={0.6}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
