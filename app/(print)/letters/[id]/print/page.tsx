'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// Letter print — fetches the server-rendered HTML so print/Word/email match exactly.
export default function LetterPrintPage() {
  const { id } = useParams() as { id: string }
  const [html, setHtml] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/letters/${id}/html`).then(async r => {
      if (!r.ok) { setErr('Not found'); return }
      const t = await r.text()
      const m = t.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      setHtml(m ? m[1] : t)
      const noauto = new URLSearchParams(window.location.search).get('noauto')
      if (!noauto) setTimeout(() => window.print(), 700)
    }).catch(() => setErr('Error'))
  }, [id])

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { background: #fff; margin: 0; }
      `}</style>
      <div className="no-print" style={{ position: 'fixed', top: 12, right: 12, zIndex: 99, display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ background: '#1e3a5f', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer' }}>🖨 Print / Save as PDF</button>
        <button onClick={() => window.close()} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>✕ Close</button>
      </div>
      {err ? <div style={{ padding: 40, textAlign: 'center' }}>{err}</div>
        : html ? <div dangerouslySetInnerHTML={{ __html: html }} />
        : <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>}
    </>
  )
}
