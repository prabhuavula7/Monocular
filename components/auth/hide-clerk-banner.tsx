'use client'

import { useEffect } from 'react'

// Clerk injects a "Development mode" banner into the DOM outside React's tree.
// There's no official API to suppress it, so we remove it via MutationObserver.
export function HideClerkBanner() {
  useEffect(() => {
    function removeBanner() {
      const link = document.querySelector<HTMLElement>('a[aria-label="Clerk logo"]')
      if (!link) return
      // Walk up exactly 4 levels — that's the outermost branding container per the DOM.
      // Never walk to body; that would hide the entire page.
      let node: HTMLElement = link
      for (let i = 0; i < 4; i++) {
        if (!node.parentElement || node.parentElement === document.body) break
        node = node.parentElement
      }
      node.style.display = 'none'
    }

    removeBanner()

    const observer = new MutationObserver(removeBanner)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return null
}
