/**
 * use-mobile.tsx — Responsive breakpoint detection hook.
 *
 * Returns `true` when the viewport width is below the mobile breakpoint (768 px).
 * Uses a `MediaQueryList` event listener so the value updates live on resize
 * without polling.
 *
 * Note: The prototype UI is designed for desktop; this hook is included for
 * completeness and future responsive adaptations.
 */
import * as React from "react"

/** Breakpoint below which the layout is considered "mobile" (px). */
const MOBILE_BREAKPOINT = 768

/**
 * Returns `true` when the window is narrower than `MOBILE_BREAKPOINT`.
 * Initialises to `false` (not undefined) after the first render so callers
 * can always treat the return value as a boolean without null-guarding.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
