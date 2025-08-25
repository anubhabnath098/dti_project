"use client"
import { useEffect } from "react"

export default function GoogleTranslate() {
  useEffect(() => {
    // Ensure container exists once
    let container = document.getElementById("google_translate_element")
    if (!container) {
      container = document.createElement("div")
      container.id = "google_translate_element"
      container.className =
        "fixed top-3 left-3 z-[9999] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md"
      document.body.appendChild(container)
    }
    // Define init callback
    ;(window as any).googleTranslateElementInit = () => {
      if ((window as any).google?.translate) {
        ;new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,bn",
            autoDisplay: false,
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element",
        )
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
  }, [])

  // Nothing rendered by React
  return null
}
