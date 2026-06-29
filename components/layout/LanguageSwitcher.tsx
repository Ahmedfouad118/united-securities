'use client'
import { useI18n } from '@/lib/i18n'

interface Props { compact?: boolean }

export default function LanguageSwitcher({ compact }: Props) {
  const { lang, setLang } = useI18n()
  return (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className={compact
        ? "text-xs px-2 py-1 rounded-lg bg-primary-700 hover:bg-primary-600 text-primary-200 hover:text-white transition-all font-mono"
        : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-800 hover:bg-primary-700 text-primary-200 hover:text-white transition-all text-sm font-medium"
      }
      title="Switch Language / تغيير اللغة"
    >
      {compact ? (lang === 'ar' ? 'EN' : 'عر') : (
        <><span className="text-base">{lang === 'ar' ? '🇬🇧' : '🇸🇦'}</span><span>{lang === 'ar' ? 'EN' : 'عر'}</span></>
      )}
    </button>
  )
}
