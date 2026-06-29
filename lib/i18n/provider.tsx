'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import ar from './ar'
import en from './en'

type Lang = 'ar' | 'en'
type T = typeof ar

interface I18nCtx { t: T; lang: Lang; setLang: (l: Lang) => void; isRTL: boolean }

export const I18nContext = createContext<I18nCtx>({ t: ar, lang: 'ar', setLang: () => {}, isRTL: true })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang
    if (stored) setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lang', l)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  const t = lang === 'ar' ? ar : en as unknown as T

  return (
    <I18nContext.Provider value={{ t, lang, setLang, isRTL: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() { return useContext(I18nContext) }
