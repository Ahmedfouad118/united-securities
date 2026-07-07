'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// United Securities Logo — uses uploaded company logo if set, else built-in SVG
const USLogo = () => {
  if (COMPANY.logoUrl) {
    return <img src={COMPANY.logoUrl} alt="logo" style={{ width: 90, height: 'auto', maxHeight: 100, objectFit: 'contain' }} />
  }
  return (
  <svg width="80" height="90" viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:'#D4A017',stopOpacity:1}} />
        <stop offset="50%" style={{stopColor:'#F5C842',stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'#B8860B',stopOpacity:1}} />
      </linearGradient>
    </defs>
    {/* Shield */}
    <path d="M40 5 L75 20 L75 55 Q75 78 40 88 Q5 78 5 55 L5 20 Z" fill="url(#goldGrad)" stroke="#B8860B" strokeWidth="1.5"/>
    {/* Crown */}
    <path d="M20 25 L20 18 L28 23 L40 15 L52 23 L60 18 L60 25 Z" fill="#fff" opacity="0.9"/>
    {/* U letter */}
    <path d="M27 30 L27 52 Q27 62 40 62 Q53 62 53 52 L53 30 L46 30 L46 50 Q46 56 40 56 Q34 56 34 50 L34 30 Z" fill="#fff"/>
  </svg>
  )
}

let COMPANY = {
  nameAr: 'شركة متحدة للأوراق المالية',
  nameEn: 'United Securities Company L.L.C',
  vat: 'OM1100021056',
  poBox: 'Po Box 2566, PC 112 Ruwi',
  phone: 'Phone: +968 24763300',
  fax: 'Fax +968 24503750',
  location: 'Muscat, Sultanate of Oman',
  email: 'accounts@usoman.com',
  website: 'www.usoman.com',
  logoUrl: '' as string,
}

function applyCompany(s: any) {
  if (!s) return
  COMPANY = {
    nameAr: s.nameAr || COMPANY.nameAr,
    nameEn: s.nameEn || COMPANY.nameEn,
    vat: s.vatNumber || COMPANY.vat,
    poBox: s.poBox ? `Po Box ${s.poBox}${s.postalCode ? ', PC ' + s.postalCode : ''}` : COMPANY.poBox,
    phone: s.phone ? `Phone: ${s.phone}` : COMPANY.phone,
    fax: s.fax ? `Fax ${s.fax}` : COMPANY.fax,
    location: s.address || COMPANY.location,
    email: s.email || COMPANY.email,
    website: s.website || COMPANY.website,
    logoUrl: s.logoUrl || '',
  }
}

// New Omani Rial currency symbol (CBO 2025) — stylized ع over two bars
const OMRSymbol = ({ size = '0.95em' }: { size?: string }) => (
  <svg viewBox="0 0 100 90" style={{ height: size, width: 'auto', verticalAlign: '-0.12em', display: 'inline-block' }} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M76 10 C58 -4 34 4 36 22 C37 32 45 38 56 40 L60 28 C52 27 48 24 48 19 C48 12 60 9 68 16 Z" />
    <path d="M16 44 L96 44 L90 58 L10 58 Z" />
    <path d="M8 66 L88 66 L82 80 L2 80 Z" />
  </svg>
)

function fmt(n: any) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}
function fmtDate(d: any) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()}-${dt.getMonth() + 1}-${dt.getFullYear()}`
}

// ─────────────────────────────────────────────────────────────
// Template A: Management Fee / Performance Fee
// ─────────────────────────────────────────────────────────────
function MgmtFeeTemplate({ inv }: { inv: any }) {
  const title = inv.invoiceType === 'MANAGEMENT_FEE' ? 'Management Fees' : 'Performance Fees'
  const titleAr = inv.invoiceType === 'MANAGEMENT_FEE' ? 'رسوم الإدارة' : 'رسوم الأداء'

  // Try to parse monthData from notes field (stored as JSON)
  const isPerf = inv.invoiceType === 'PERFORMANCE_FEE'
  let monthData: any[] = []
  try { monthData = JSON.parse(inv.feeData || inv.notes || '[]') } catch { monthData = [] }
  const hasMonthTable = Array.isArray(monthData) && monthData.length > 0

  const subtotal = Number(inv.subtotal)
  const vatAmt = Number(inv.vatAmount)
  const total = Number(inv.totalAmount)
  const vatRate = Number(inv.vatRate)
  const feeWord = isPerf ? 'Performance' : 'Management'

  return (
    <div className="invoice-sheet" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 750, margin: '0 auto', padding: '20px 30px', fontSize: 12, color: '#222', direction: 'ltr' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e3a5f', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <USLogo />
          <p style={{ fontSize: 10, color: '#1e3a5f', fontWeight: 700, marginTop: 4, textAlign: 'center' }}>المتحدة للأوراق المالية</p>
          <p style={{ fontSize: 9, color: '#555', textAlign: 'center' }}>UNITED SECURITIES</p>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1e3a5f', margin: '10px 0 4px' }}>Tax Invoice</h2>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', margin: '0 0 4px' }}>{inv.category?.name || title}</h3>
          {!inv.category?.name && titleAr && <p style={{ fontSize: 11, color: '#666', margin: 0 }}>{titleAr}</p>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <p style={{ fontWeight: 700, color: '#1e3a5f', margin: '0 0 2px' }}>{COMPANY.nameEn}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>United Securities VAT #:</p>
          <p style={{ margin: '1px 0', fontWeight: 700, fontStyle: 'italic' }}>{COMPANY.vat}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.poBox}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.phone}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.fax}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.location}</p>
        </div>
      </div>

      {/* Invoice meta */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40, marginBottom: 16, fontSize: 11 }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#555' }}>Invoice Number: </span>
          <span style={{ fontWeight: 700 }}>{inv.invoiceNumber}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#555' }}>Invoice Date: </span>
          <span style={{ fontWeight: 700 }}>{fmtDate(inv.date)}</span>
        </div>
      </div>

      {/* Greeting — category body text overrides the default paragraph */}
      <p style={{ marginBottom: 10, fontSize: 11 }}><strong>After Compliments,</strong></p>
      <p style={{ marginBottom: 16, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
        {inv.category?.bodyText
          ? inv.category.bodyText
          : `With reference to your discretionary portfolio management agreement, and according to the Annex's and Amendments which relate to the Investment Manager's management fees, we would like to notify you of the portfolio's ${title.toLowerCase()} accrued for the period of this invoice will be charged to your account under management as of the details below:`}
      </p>

      {/* Client Info */}
      <div style={{ marginBottom: 16, border: '1px solid #ccc', padding: '10px 14px', backgroundColor: '#fafafa' }}>
        {[
          ['Client Name:', inv.customer?.name],
          ['Client Number:', inv.customer?.clientNumber],
          ['Shareholder Number:', inv.customer?.accountNumber],
          ['Vat Number:', inv.customer?.vatNumber],
          ['Mobile Number:', inv.customer?.phone],
          ['Address:', inv.customer?.address],
          ['Email ID:', inv.customer?.email],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', padding: '3px 0', borderBottom: '1px solid #eee' }}>
            <span style={{ minWidth: 160, color: '#555', fontWeight: 600 }}>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>

      {/* Fee table — Performance = Year only (no NAV/Days); Management = monthly with NAV */}
      {hasMonthTable ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ backgroundColor: '#1e3a5f', color: '#fff', fontSize: 11 }}>
              {(isPerf
                ? ['Year', `${feeWord} Fees`, 'VAT (5%)', `Net ${feeWord} Fees`]
                : ['Month', 'Number of Days', 'Total NAV', `${feeWord} Fees`, 'VAT (5%)', `Net ${feeWord} Fees`]
              ).map(h => (
                <th key={h} style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #ccc', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthData.map((row: any, i: number) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                {isPerf ? (
                  <>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.year || row.month}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(row.fee)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(row.vat)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(row.net)}</td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.month}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.days}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(row.nav)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(row.fee)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(row.vat)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(row.net)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        // Fallback: show items table
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ backgroundColor: '#1e3a5f', color: '#fff' }}>
              {['Description', 'Amount'].map(h => <th key={h} style={{ padding: '7px 8px', border: '1px solid #ccc' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {inv.items?.map((item: any, i: number) => (
              <tr key={i}><td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>{item.description}</td><td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fmt(item.subtotal)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Totals */}
      <table style={{ width: 260, marginLeft: 'auto', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          <tr><td style={{ padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontWeight: 600 }}>{feeWord} Fees</td><td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(subtotal)}</td></tr>
          <tr><td style={{ padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontWeight: 600 }}>VAT ({vatRate}%)</td><td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(vatAmt)}</td></tr>
          <tr style={{ backgroundColor: '#1e3a5f', color: '#fff' }}>
            <td style={{ padding: '6px 8px', border: '1px solid #1e3a5f', fontWeight: 700 }}>NET {feeWord} Fees Value</td>
            <td style={{ padding: '6px 8px', border: '1px solid #1e3a5f', textAlign: 'right', fontWeight: 700 }}><OMRSymbol /> &nbsp; {fmt(total)}</td>
          </tr>
        </tbody>
      </table>

      <UserNotes inv={inv} />
      <BankDetails inv={inv} />
      <Disclaimers />
      <Footer inv={inv} />
    </div>
  )
}

// Shared bank details block — shown on any invoice that has a bank account selected
function BankDetails({ inv }: { inv: any }) {
  if (!inv.bankAccount) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, marginBottom: 8, fontStyle: 'italic' }}>
        We kindly request you settle the above amount with the following bank account details:
      </p>
      <div style={{ border: '1px solid #ccc', padding: '10px 14px', backgroundColor: '#fafafa' }}>
        {[
          ['Bank Name', inv.bankAccount.bankName],
          ['Account Name', inv.bankAccount.accountName || COMPANY.nameEn],
          ['IBAN', inv.bankAccount.iban],
          ['Account Number', inv.bankAccount.accountNumber],
          ['Swift code', inv.bankAccount.swiftCode],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', padding: '3px 0' }}>
            <span style={{ minWidth: 160, color: '#555' }}>{k}</span>
            <span style={{ fontWeight: 600 }}>: {v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Template B: Regular / Service Fees / Consulting
// ─────────────────────────────────────────────────────────────
function ServiceFeeTemplate({ inv }: { inv: any }) {
  const typeTitle = inv.category?.name || (inv.invoiceType === 'REGULAR' ? 'Service Fees' : 'Consulting Fees')
  const subtotal = Number(inv.subtotal)
  const vatAmt = Number(inv.vatAmount)
  const total = Number(inv.totalAmount)
  const vatRate = Number(inv.vatRate)

  // First item description as service description
  const serviceDesc = inv.items?.[0]?.description || ''

  return (
    <div className="invoice-sheet" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 750, margin: '0 auto', padding: '20px 30px', fontSize: 12, color: '#222', direction: 'ltr' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e3a5f', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <USLogo />
          <p style={{ fontSize: 10, color: '#1e3a5f', fontWeight: 700, marginTop: 4, textAlign: 'center' }}>المتحدة للأوراق المالية</p>
          <p style={{ fontSize: 9, color: '#555', textAlign: 'center' }}>UNITED SECURITIES</p>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1e3a5f', margin: '10px 0 4px' }}>Tax Invoice</h2>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', margin: 0 }}>{typeTitle}</h3>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <p style={{ fontWeight: 700, color: '#1e3a5f', margin: '0 0 2px' }}>{COMPANY.nameEn}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>United Securities VAT #:</p>
          <p style={{ margin: '1px 0', fontWeight: 700, fontStyle: 'italic' }}>{COMPANY.vat}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.poBox}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.phone}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.fax}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.location}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40, marginBottom: 16, fontSize: 11 }}>
        <div><span style={{ color: '#555' }}>Invoice Number: </span><span style={{ fontWeight: 700 }}>{inv.invoiceNumber}</span></div>
        <div><span style={{ color: '#555' }}>Invoice Date: </span><span style={{ fontWeight: 700 }}>{fmtDate(inv.date)}</span></div>
      </div>

      <p style={{ marginBottom: 10, fontSize: 11 }}><strong>After Compliments,</strong></p>
      <p style={{ marginBottom: 16, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
        {inv.category?.bodyText || 'You are kindly requested to settle the following fees against the services rendered hereunder:'}
      </p>

      {/* Client Info */}
      <div style={{ marginBottom: 16, border: '1px solid #ccc', padding: '10px 14px', backgroundColor: '#fafafa' }}>
        {[
          ['Service Description:', serviceDesc],
          ['Client Name:', inv.customer?.name],
          ['Attn:', inv.customer?.nameAr || ''],
          ['Vat Number:', inv.customer?.vatNumber],
          ['Address:', inv.customer?.address],
          ['Phone Number:', inv.customer?.phone],
          ['Email ID:', inv.customer?.email],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', padding: '3px 0', borderBottom: '1px solid #eee' }}>
            <span style={{ minWidth: 160, color: '#555', fontWeight: 600 }}>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>

      {/* Totals — foreign-currency invoices show the original currency (stored values are OMR) */}
      {(() => {
        const cur = inv.currency && inv.currency !== 'OMR' ? inv.currency : null
        const rate = Number(inv.exchangeRate) > 0 ? Number(inv.exchangeRate) : 1
        const fx = (v: number) => cur ? fmt(v / rate) : fmt(v)
        return (
          <table style={{ width: 320, marginLeft: 'auto', borderCollapse: 'collapse', marginBottom: 20 }}>
            <tbody>
              <tr><td style={{ padding: '5px 10px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontWeight: 600 }}>Service Fees {cur ? `(${cur})` : ''}</td><td style={{ padding: '5px 10px', border: '1px solid #ddd', textAlign: 'right' }}>{fx(subtotal)}</td></tr>
              <tr><td style={{ padding: '5px 10px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontWeight: 600 }}>VAT ({vatRate}%)</td><td style={{ padding: '5px 10px', border: '1px solid #ddd', textAlign: 'right' }}>{fx(vatAmt)}</td></tr>
              <tr style={{ backgroundColor: '#1e3a5f', color: '#fff' }}>
                <td style={{ padding: '6px 10px', fontWeight: 700 }}>NET Service fees Value</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{cur ? <>{cur} &nbsp; {fx(total)}</> : <><OMRSymbol /> &nbsp; {fx(total)}</>}</td>
              </tr>
              {cur && (
                <>
                  <tr><td style={{ padding: '4px 10px', border: '1px solid #ddd', backgroundColor: '#fafafa', fontSize: 10.5, color: '#555' }}>Amount before VAT (<OMRSymbol size="0.85em" />)</td><td style={{ padding: '4px 10px', border: '1px solid #ddd', textAlign: 'right', fontSize: 10.5, color: '#555' }}>{fmt(subtotal)}</td></tr>
                  <tr><td style={{ padding: '4px 10px', border: '1px solid #ddd', backgroundColor: '#fafafa', fontSize: 10.5, color: '#555' }}>VAT (<OMRSymbol size="0.85em" />)</td><td style={{ padding: '4px 10px', border: '1px solid #ddd', textAlign: 'right', fontSize: 10.5, color: '#555' }}>{fmt(vatAmt)}</td></tr>
                  <tr><td style={{ padding: '4px 10px', border: '1px solid #ddd', backgroundColor: '#f0f4f8', fontSize: 10.5, fontWeight: 700, color: '#1e3a5f' }}>Total (<OMRSymbol size="0.85em" />)</td><td style={{ padding: '4px 10px', border: '1px solid #ddd', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: '#1e3a5f' }}>{fmt(total)}</td></tr>
                </>
              )}
            </tbody>
          </table>
        )
      })()}

      <UserNotes inv={inv} />

      {/* Bank Details */}
      {inv.bankAccount && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, marginBottom: 8, fontStyle: 'italic' }}>
            We kindly request you settle the above amount with the following bank account details:
          </p>
          <div style={{ border: '1px solid #ccc', padding: '10px 14px', backgroundColor: '#fafafa' }}>
            {[
              ['Bank Name', inv.bankAccount.bankName],
              ['Account Name', inv.bankAccount.accountName || COMPANY.nameEn],
              ['IBAN', inv.bankAccount.iban],
              ['Account Number', inv.bankAccount.accountNumber],
              ['Swift code', inv.bankAccount.swiftCode],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', padding: '3px 0' }}>
                <span style={{ minWidth: 160, color: '#555' }}>: {k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Disclaimers />
      <Footer inv={inv} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Template C: Debit Note / Credit Note
// ─────────────────────────────────────────────────────────────
function DebitCreditTemplate({ inv }: { inv: any }) {
  const isCredit = inv.invoiceType === 'CREDIT_NOTE'
  const title = isCredit ? 'Tax Credit Note' : 'Tax Debit Note'
  const subtotal = Number(inv.subtotal)
  const vatAmt = Number(inv.vatAmount)
  const total = Number(inv.totalAmount)
  const vatRate = Number(inv.vatRate)

  return (
    <div className="invoice-sheet" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 750, margin: '0 auto', padding: '20px 30px', fontSize: 12, color: '#222', direction: 'ltr' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e3a5f', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <USLogo />
          <p style={{ fontSize: 10, color: '#1e3a5f', fontWeight: 700, marginTop: 4, textAlign: 'center' }}>المتحدة للأوراق المالية</p>
          <p style={{ fontSize: 9, color: '#555', textAlign: 'center' }}>UNITED SECURITIES</p>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: isCredit ? '#16a34a' : '#dc2626', margin: '10px 0 4px' }}>{title}</h2>
          {inv.referenceInvoiceId && <p style={{ fontSize: 10, color: '#666', margin: 0 }}>Ref: {inv.referenceInvoiceId}</p>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <p style={{ fontWeight: 700, color: '#1e3a5f', margin: '0 0 2px' }}>{COMPANY.nameEn}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>VAT #: <strong>{COMPANY.vat}</strong></p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.poBox}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.phone}</p>
          <p style={{ margin: '1px 0', color: '#555' }}>{COMPANY.location}</p>
        </div>
      </div>

      {inv.category?.bodyText && (
        <p style={{ marginBottom: 14, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{inv.category.bodyText}</p>
      )}

      {/* Two-column meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, fontSize: 11 }}>
        <div style={{ border: '1px solid #ddd', padding: 10 }}>
          <p style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 6 }}>Client Information</p>
          {[['Name', inv.customer?.name], ['NIN', inv.customer?.nin], ['Account No.', inv.customer?.accountNumber], ['Client No.', inv.customer?.clientNumber], ['VAT No.', inv.customer?.vatNumber]].filter(([, v]) => v).map(([k, v]) => (
            <div key={String(k)} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
              <span style={{ color: '#666', minWidth: 90 }}>{k}:</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ border: '1px solid #ddd', padding: 10 }}>
          <p style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 6 }}>Note Details</p>
          {[['Note Number', inv.invoiceNumber], ['Date', fmtDate(inv.date)]].filter(([, v]) => v).map(([k, v]) => (
            <div key={String(k)} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
              <span style={{ color: '#666', minWidth: 90 }}>{k}:</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      {(() => {
        const cur = inv.currency && inv.currency !== 'OMR' ? inv.currency : null
        const rate = Number(inv.exchangeRate) > 0 ? Number(inv.exchangeRate) : 1
        const fx = (v: any) => cur ? fmt(Number(v) / rate) : fmt(v)
        return (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ backgroundColor: '#1e3a5f', color: '#fff' }}>
                  {['#', 'Description', 'Qty', 'Amount', 'VAT%', 'VAT Amt', 'Total'].map(h => (
                    <th key={h} style={{ padding: '7px 8px', border: '1px solid #ccc', textAlign: 'center', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inv.items?.map((item: any, i: number) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                    <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{item.description}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fx(item.unitPrice)}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.vatRate}%</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{fx(item.vatAmount)}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 700 }}>{fx(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table style={{ width: 300, marginLeft: 'auto', borderCollapse: 'collapse', marginBottom: 20 }}>
              <tbody>
                <tr><td style={{ padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontWeight: 600 }}>Subtotal {cur ? `(${cur})` : ''}</td><td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fx(subtotal)}</td></tr>
                {vatAmt > 0 && <tr><td style={{ padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontWeight: 600 }}>VAT ({vatRate}%)</td><td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{fx(vatAmt)}</td></tr>}
                <tr style={{ backgroundColor: isCredit ? '#16a34a' : '#dc2626', color: '#fff' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700 }}>Total {isCredit ? 'Credit' : 'Debit'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{cur ? <>{cur} &nbsp; {fx(total)}</> : <><OMRSymbol /> &nbsp; {fx(total)}</>}</td>
                </tr>
                {cur && (
                  <>
                    <tr><td style={{ padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#fafafa', fontSize: 10.5, color: '#555' }}>Amount before VAT (<OMRSymbol size="0.85em" />)</td><td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: 10.5, color: '#555' }}>{fmt(subtotal)}</td></tr>
                    <tr><td style={{ padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#fafafa', fontSize: 10.5, color: '#555' }}>VAT (<OMRSymbol size="0.85em" />)</td><td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: 10.5, color: '#555' }}>{fmt(vatAmt)}</td></tr>
                    <tr><td style={{ padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#f0f4f8', fontSize: 10.5, fontWeight: 700, color: '#1e3a5f' }}>Total (<OMRSymbol size="0.85em" />)</td><td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: '#1e3a5f' }}>{fmt(total)}</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </>
        )
      })()}

      <UserNotes inv={inv} />
      <BankDetails inv={inv} />
      <Disclaimers />
      <Footer inv={inv} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Shared: Disclaimers + Footer
// ─────────────────────────────────────────────────────────────
function Disclaimers({ inv }: { inv?: any }) {
  return (
    <div style={{ marginTop: 16, marginBottom: 12 }}>
      <p style={{ fontSize: 10, color: '#555', fontStyle: 'italic' }}>
        Disclaimer: This invoice is computer generated and does not require any signature
      </p>
    </div>
  )
}

// User-entered invoice notes — shown above the bank/settlement section
function UserNotes({ inv }: { inv: any }) {
  if (!inv.notes) return null
  return (
    <p style={{ fontSize: 12, margin: '4px 0 14px', fontWeight: 600 }}>
      Notes: <span style={{ fontWeight: 400 }}>{inv.notes}</span>
    </p>
  )
}
function Footer({ inv }: { inv: any }) {
  return (
    <div className="invoice-footer" style={{ borderTop: '2px solid #1e3a5f', paddingTop: 8, marginTop: 16, textAlign: 'center', fontSize: 10, color: '#555' }}>
      <p style={{ margin: '2px 0' }}>{COMPANY.nameEn}, {COMPANY.poBox}, {COMPANY.location}</p>
      <p style={{ margin: '2px 0' }}>{COMPANY.phone} | {COMPANY.fax} | Website: {COMPANY.website} | Email: {COMPANY.email}</p>
      <p style={{ margin: '4px 0', color: '#999' }}>Printed: {new Date().toLocaleDateString('en-GB')}{inv.createdByUser?.name ? ` by ${inv.createdByUser.name}` : ''} | {inv.invoiceNumber}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main page — picks template by type
// ─────────────────────────────────────────────────────────────
export default function PrintInvoicePage() {
  const { id } = useParams() as { id: string }
  const [invoice, setInvoice] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then(r => r.json()),
      fetch('/api/masters/company').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([data, company]) => {
      applyCompany(company)
      setInvoice(data)
      const noauto = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('noauto')
      if (!noauto) setTimeout(() => window.print(), 900)
    })
  }, [id])

  if (!invoice) return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; height: auto; }
          .no-print { display: none !important; }
          /* Keep the whole invoice on a single page */
          .invoice-sheet { padding: 0 12px !important; font-size: 11px !important; }
          .invoice-sheet table { page-break-inside: avoid; }
          .invoice-sheet, .invoice-sheet * { page-break-inside: avoid; }
          /* Pin the company footer to the bottom of each printed page */
          .invoice-footer { position: fixed; bottom: 0; left: 0; right: 0; margin: 0 !important; background: #fff; padding-bottom: 4mm; }
        }
        body { background: white; margin: 0; }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 999 }}>
        <button onClick={() => window.print()} style={{ background: '#1e3a5f', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          🖨 Print / Save as PDF
        </button>
        <button onClick={() => window.close()} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          ✕ Close
        </button>
      </div>

      {(invoice.invoiceType === 'MANAGEMENT_FEE' || invoice.invoiceType === 'PERFORMANCE_FEE')
        ? <MgmtFeeTemplate inv={invoice} />
        : (invoice.invoiceType === 'DEBIT_NOTE' || invoice.invoiceType === 'CREDIT_NOTE')
          ? <DebitCreditTemplate inv={invoice} />
          : <ServiceFeeTemplate inv={invoice} />
      }
    </>
  )
}
