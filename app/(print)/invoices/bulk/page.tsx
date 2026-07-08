'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Bulk print: fetch each invoice's rendered HTML and stack them into ONE document,
// then print. Reliable (no iframes) → prints or saves to a single PDF.
function BulkInner() {
  const params = useSearchParams()
  const ids = (params.get('ids') || '').split(',').filter(Boolean)
  const [html, setHtml] = useState<string>('')
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    if (!ids.length) { setStatus('No invoices selected.'); return }
    let cancelled = false
    ;(async () => {
      const parts: string[] = []
      for (let i = 0; i < ids.length; i++) {
        setStatus(`Preparing ${i + 1} / ${ids.length}...`)
        try {
          const res = await fetch(`/api/invoices/${ids[i]}/html`)
          if (res.ok) {
            const t = await res.text()
            const m = t.match(/<body[^>]*>([\s\S]*)<\/body>/i)
            parts.push(`<div class="inv-page">${m ? m[1] : t}</div>`)
          }
        } catch {}
      }
      if (cancelled) return
      setHtml(parts.join(''))
      setStatus('')
      setTimeout(() => window.print(), 700)
    })()
    return () => { cancelled = true }
  }, [ids.join(',')])

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .no-print { display: none !important; }
          .inv-page { page-break-after: always; }
          .inv-page:last-child { page-break-after: auto; }
        }
        body { background: #fff; margin: 0; }
        .inv-page { max-width: 750px; margin: 0 auto 30px; }
      `}</style>
      <div className="no-print" style={{ position: 'fixed', top: 12, right: 12, zIndex: 999, display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ background: '#1e3a5f', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer' }}>🖨 Print / Save PDF ({ids.length})</button>
        <button onClick={() => window.close()} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>✕ Close</button>
      </div>
      {status && <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>{status}</div>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}

export default function BulkPrintPage() {
  return <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}><BulkInner /></Suspense>
}
