'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

let COMPANY: any = {
  nameEn: 'United Securities Company L.L.C', nameAr: 'شركة متحدة للأوراق المالية',
  vat: 'OM1100021056', poBox: 'Po Box 2566, PC 112 Ruwi', phone: 'Phone: +968 24763300',
  fax: 'Fax +968 24503750', location: 'Muscat, Sultanate of Oman', email: 'accounts@usoman.com',
  website: 'www.usoman.com', logoUrl: '',
}
function applyCompany(s: any) {
  if (!s) return
  COMPANY = {
    nameEn: s.nameEn || COMPANY.nameEn, nameAr: s.nameAr || COMPANY.nameAr,
    vat: s.vatNumber || COMPANY.vat,
    poBox: s.poBox ? `Po Box ${s.poBox}${s.postalCode ? ', PC ' + s.postalCode : ''}` : COMPANY.poBox,
    phone: s.phone ? `Phone: ${s.phone}` : COMPANY.phone, fax: s.fax ? `Fax ${s.fax}` : COMPANY.fax,
    location: s.address || COMPANY.location, email: s.email || COMPANY.email,
    website: s.website || COMPANY.website, logoUrl: s.logoUrl || '',
  }
}
function fmt(n: any) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) }
function fmtDate(d: any) { if (!d) return ''; const dt = new Date(d); return `${dt.getDate()}-${dt.getMonth() + 1}-${dt.getFullYear()}` }

const PM: Record<string, string> = { CHECK: 'Check', TRANSFER: 'Transfer', CASH: 'Cash' }
const PT: Record<string, string> = { FULL: 'Full Payment', PARTIAL: 'Partial Payment', ADVANCE: 'Advance' }

// Convert a number to English words (simple, for OMR)
function toWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  function below1000(num: number): string {
    let s = ''
    if (num >= 100) { s += ones[Math.floor(num / 100)] + ' Hundred '; num %= 100 }
    if (num >= 20) { s += tens[Math.floor(num / 10)] + ' '; num %= 10 }
    if (num > 0) s += ones[num] + ' '
    return s
  }
  const whole = Math.floor(n)
  if (whole === 0) return 'Zero'
  let s = ''
  if (whole >= 1000) { s += below1000(Math.floor(whole / 1000)) + 'Thousand '; }
  s += below1000(whole % 1000)
  return s.trim()
}

export default function ReceiptPrintPage() {
  const { id } = useParams() as { id: string }
  const [r, setR] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/receipts/${id}`).then(x => x.json()),
      fetch('/api/masters/company').then(x => x.ok ? x.json() : null).catch(() => null),
    ]).then(([data, company]) => {
      applyCompany(company); setR(data)
      const noauto = new URLSearchParams(window.location.search).get('noauto')
      if (!noauto) setTimeout(() => window.print(), 800)
    })
  }, [id])

  if (!r) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  const logo = COMPANY.logoUrl
    ? <img src={COMPANY.logoUrl} alt="logo" style={{ width: 80, maxHeight: 90, objectFit: 'contain' }} />
    : <div style={{ fontSize: 32, fontWeight: 900, color: '#B8860B' }}>U</div>

  return (
    <>
      <style>{`
        @media print { @page { size: A5 landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        body { background: #fff; margin: 0; font-family: Arial, sans-serif; }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 99 }}>
        <button onClick={() => window.print()} style={{ background: '#1e3a5f', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer' }}>🖨 Print / Save as PDF</button>
        <button onClick={() => window.close()} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>✕ Close</button>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, color: '#222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e3a5f', paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ textAlign: 'center' }}>{logo}<p style={{ fontSize: 9, color: '#1e3a5f', fontWeight: 700, margin: '4px 0 0' }}>UNITED SECURITIES</p></div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1e3a5f', margin: '8px 0 2px' }}>Receipt Voucher</h2>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>سند قبض</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 10, color: '#555' }}>
            <p style={{ fontWeight: 700, color: '#1e3a5f', margin: '0 0 2px' }}>{COMPANY.nameEn}</p>
            <p style={{ margin: '1px 0' }}>VAT #: {COMPANY.vat}</p>
            <p style={{ margin: '1px 0' }}>{COMPANY.poBox}</p>
            <p style={{ margin: '1px 0' }}>{COMPANY.phone}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16 }}>
          <div><b>Voucher No:</b> {r.receiptNumber}</div>
          <div><b>Date:</b> {fmtDate(r.date)}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
          <tbody>
            <tr><td style={td(true)}>Received from</td><td style={td()}>{r.customer?.name}{r.customer?.clientNumber ? ` (Client ${r.customer.clientNumber})` : ''}</td></tr>
            <tr><td style={td(true)}>Amount (OMR)</td><td style={td()}><b style={{ fontSize: 15 }}>{fmt(r.amount)}</b></td></tr>
            <tr><td style={td(true)}>Amount in words</td><td style={td()}>{toWords(Number(r.amount))} Omani Rial{Math.round((Number(r.amount) % 1) * 1000) > 0 ? ` and ${Math.round((Number(r.amount) % 1) * 1000)}/1000` : ''} only</td></tr>
            <tr><td style={td(true)}>Payment Type</td><td style={td()}>{PT[r.paymentType] || r.paymentType}</td></tr>
            <tr><td style={td(true)}>Payment Method</td><td style={td()}>{PM[r.paymentMethod] || r.paymentMethod}</td></tr>
            {r.checkNumber && <tr><td style={td(true)}>Check No</td><td style={td()}>{r.checkNumber}{r.checkDate ? ` — ${fmtDate(r.checkDate)}` : ''}</td></tr>}
            {r.bankAccount && <tr><td style={td(true)}>Bank</td><td style={td()}>{r.bankAccount.bankName}</td></tr>}
            {r.invoice && <tr><td style={td(true)}>Against Invoice</td><td style={td()}>{r.invoice.invoiceNumber}</td></tr>}
            {r.notes && <tr><td style={td(true)}>Notes</td><td style={td()}>{r.notes}</td></tr>}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, fontSize: 11, color: '#555' }}>
          <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #999', width: 160, paddingTop: 4 }}>Received By</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #999', width: 160, paddingTop: 4 }}>Authorized Signature</div></div>
        </div>

        <div style={{ borderTop: '2px solid #1e3a5f', marginTop: 30, paddingTop: 6, textAlign: 'center', fontSize: 9, color: '#777' }}>
          {COMPANY.nameEn} | {COMPANY.phone} | {COMPANY.email}
        </div>
      </div>
    </>
  )
}

function td(label = false): React.CSSProperties {
  return { padding: '7px 10px', border: '1px solid #ddd', backgroundColor: label ? '#f5f5f5' : '#fff', fontWeight: label ? 600 : 400, width: label ? 160 : 'auto', color: label ? '#555' : '#222' }
}
