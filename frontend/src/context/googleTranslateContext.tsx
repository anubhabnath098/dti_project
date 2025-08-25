"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

type GoogleTranslateContextType = {
  isActive: boolean
  setIsActive: (active: boolean) => void
}

const GoogleTranslateContext = createContext<GoogleTranslateContextType | undefined>(undefined)

export const GoogleTranslateProvider = ({ children }: { children: React.ReactNode }) => {
  const [isActive, setIsActive] = useState(false)

  return <GoogleTranslateContext.Provider value={{ isActive, setIsActive }}>{children}</GoogleTranslateContext.Provider>
}

export const useGoogleTranslate = () => {
  const ctx = useContext(GoogleTranslateContext)
  if (!ctx) throw new Error("useGoogleTranslate must be used inside GoogleTranslateProvider")
  return ctx
}
