"use client"
import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export default function GoogleTranslateFixed() {
  const pathname = usePathname()
  const isInitialized = useRef(false)
  const currentLanguage = useRef("en")

  useEffect(() => {
    // Clean up any existing translation markup when route changes
    const cleanupTranslation = () => {
      // Remove Google Translate's injected elements
      const translatedElements = document.querySelectorAll('[class*="goog-"]')
      translatedElements.forEach((el) => {
        if (el.parentNode) {
          // Replace translated element with its text content
          const textNode = document.createTextNode(el.textContent || "")
          el.parentNode.replaceChild(textNode, el)
        }
      })

      // Remove translation artifacts
      const artifacts = document.querySelectorAll('font[style*="vertical-align"]')
      artifacts.forEach((el) => {
        if (el.parentNode) {
          const textNode = document.createTextNode(el.textContent || "")
          el.parentNode.replaceChild(textNode, el)
        }
      })
    }

    // Store current language before cleanup
    const storeCurrentLanguage = () => {
      const selectElement = document.querySelector(".goog-te-combo") as HTMLSelectElement
      if (selectElement && selectElement.value) {
        currentLanguage.current = selectElement.value
      }
    }

    // Restore language after re-initialization
    const restoreLanguage = () => {
      setTimeout(() => {
        const selectElement = document.querySelector(".goog-te-combo") as HTMLSelectElement
        if (selectElement && currentLanguage.current !== "en") {
          selectElement.value = currentLanguage.current
          selectElement.dispatchEvent(new Event("change"))
        }
      }, 1000)
    }

    // Store language and cleanup on route change
    if (isInitialized.current) {
      storeCurrentLanguage()
      cleanupTranslation()
    }

    // Ensure container exists
    let container = document.getElementById("google_translate_element")
    if (!container) {
      container = document.createElement("div")
      container.id = "google_translate_element"
      container.className =
        "fixed top-3 left-3 z-[9999] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md px-2 py-1"
      document.body.appendChild(container)
    } else {
      // Clear existing content
      container.innerHTML = ""
    }
    // Define init callback with error handling
    ;(window as any).googleTranslateElementInit = () => {
      try {
        if ((window as any).google?.translate) {
          ;new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: "en,hi,bn,mr,kn,te,ta,gu,pa",
              autoDisplay: false,
              layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            },
            "google_translate_element",
          )

          // Restore previous language selection after initialization
          if (isInitialized.current) {
            restoreLanguage()
          }

          isInitialized.current = true
        }
      } catch (error) {
        console.warn("Google Translate initialization failed:", error)
      }
    }

    // Load script only once
    if (!document.getElementById("google-translate-script")) {
      const addScript = document.createElement("script")
      addScript.id = "google-translate-script"
      addScript.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      addScript.async = true
      addScript.onerror = () => {
        console.warn("Failed to load Google Translate script")
      }
      document.body.appendChild(addScript)
    } else {
      // Script already present → re-init
      setTimeout(() => {
        ;(window as any).googleTranslateElementInit?.()
      }, 100)
    }

    // Add CSS to hide Google Translate banner and fix styling issues
    const style = document.createElement("style")
    style.textContent = `
      .goog-te-banner-frame { display: none !important; }
      .goog-te-menu-value { color: #000 !important; }
      body { top: 0 !important; }
      .goog-te-combo { 
        background: white !important; 
        border: 1px solid #ccc !important; 
        border-radius: 4px !important; 
        padding: 2px 4px !important;
      }
      .dark .goog-te-combo {
        background: #374151 !important;
        color: white !important;
        border-color: #6b7280 !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      // Cleanup on unmount
      if (isInitialized.current) {
        storeCurrentLanguage()
      }
    }
  }, [pathname]) // Re-run when pathname changes

  return null
}
