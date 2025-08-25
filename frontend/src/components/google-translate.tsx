"use client"
import { useEffect } from "react"
import { useGoogleTranslate } from "@/context/googleTranslateContext"

export default function GoogleTranslate() {
  const { setIsActive } = useGoogleTranslate()

  useEffect(() => {
    // Ensure container exists once
    let container = document.getElementById("google_translate_element")
    if (!container) {
      container = document.createElement("div")
      container.id = "google_translate_element"
      container.className =
        "fixed top-1 left-3 z-[9999] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md"
      document.body.appendChild(container)
    }
    ;(window as any).googleTranslateElementInit = () => {
      if ((window as any).google?.translate) {
        const translateElement = new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,bn,mr,kn,te,ta,gu,pa",
            autoDisplay: false,
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element",
        )

        const checkTranslationStatus = () => {
          // Check if page is translated by looking for Google Translate elements
          const isTranslated =
            document.querySelector(".goog-te-banner-frame") !== null ||
            document.querySelector('html[lang]:not([lang="en"])') !== null ||
            document.body.classList.contains("translated-ltr") ||
            document.body.classList.contains("translated-rtl") ||
            window.location.hash.includes("#googtrans(")

          setIsActive(isTranslated)
        }

        const observer = new MutationObserver(checkTranslationStatus)
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "lang"],
        })

        window.addEventListener("hashchange", checkTranslationStatus)

        setTimeout(checkTranslationStatus, 1000)

        return () => {
          observer.disconnect()
          window.removeEventListener("hashchange", checkTranslationStatus)
        }
      }
    }

    // Load script only once
    if (!document.getElementById("google-translate-script")) {
      const addScript = document.createElement("script")
      addScript.id = "google-translate-script"
      addScript.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      addScript.async = true
      document.body.appendChild(addScript)
    } else {
      // Script already present → re-init
      ;(window as any).googleTranslateElementInit?.()
    }
  }, [setIsActive])

  // Nothing rendered by React
  return null
}
