'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Bulk print: renders each invoice's print page in a stacked iframe, then prints all.
function BulkInner() {
  const params = useSearchParams()
  const ids = (params.get('ids') || '').split(',').filter(Boolean)
  const [loaded, setLoaded] = useState(0)

  useEffect(() => {
    if (ids.length && loaded >= ids.length) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [loaded, ids.length])

  if (!ids.length) return <div style={{ padding: 40, textAlign: 'center' }}>No invoices selected.</div>

  return (
    <>
      <style>{`
        @media print { @page { size: A4; margin: 0; } .no-print { display: none !important; } iframe { page-break-after: always; } }
        body { background: #fff; margin: 0; }
        iframe { width: 100%; height: 297mm; border: none; display: block; page-break-after: always; }
      `}</style>
      <div className="no-print" style={{ position: 'fixed', top: 12, right: 12, zIndex: 999, display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ background: '#1e3a5f', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer' }}>🖨 Print All ({ids.length})</button>
        <button onClick={() => window.close()} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>✕ Close</button>
      </div>
      {ids.map(id => (
        <iframe key={id} src={`/invoices/${id}/print?noauto=1`} onLoad={() => setLoaded(n => n + 1)} />
      ))}
    </>
  )
}

export default function BulkPrintPage() {
  return <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}><BulkInner /></Suspense>
}
