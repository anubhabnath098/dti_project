"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useGoogleTranslate } from "@/context/googleTranslateContext"

export default function PreventNavigation() {
  const { isActive } = useGoogleTranslate()
  const router = useRouter()

  useEffect(() => {
    if (!isActive) return

    const showWarning = () => {
      alert("❌ Please turn off Google Translate before navigating to ensure proper functionality.")
    }

    const originalPush = router.push
    const originalReplace = router.replace
    const originalBack = router.back
    const originalForward = router.forward

    router.push = (...args: any[]) => {
      showWarning()
      return Promise.resolve(false)
    }

    router.replace = (...args: any[]) => {
      showWarning()
      return Promise.resolve(false)
    }

    router.back = () => {
      showWarning()
    }

    router.forward = () => {
      showWarning()
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "Google Translate is active. Please turn it off before navigating."
      return e.returnValue
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      showWarning()
      // Push current state back to prevent navigation
      window.history.pushState(null, "", window.location.href)
    }

    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")
      if (link && link.href && !link.href.startsWith("javascript:")) {
        e.preventDefault()
        e.stopPropagation()
        showWarning()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopState)
    document.addEventListener("click", handleLinkClick, true)

    window.history.pushState(null, "", window.location.href)

    return () => {
      router.push = originalPush
      router.replace = originalReplace
      router.back = originalBack
      router.forward = originalForward

      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
      document.removeEventListener("click", handleLinkClick, true)
    }
  }, [isActive, router])

  return null
}
