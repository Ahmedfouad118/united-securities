// Server-side invoice HTML renderer — used for email body & attachment.
function fmt(n: any) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}
function fmtDate(d: any) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()}-${dt.getMonth() + 1}-${dt.getFullYear()}`
}

const TITLES: Record<string, string> = {
  REGULAR: 'Service Fees', MANAGEMENT_FEE: 'Management Fees', PERFORMANCE_FEE: 'Performance Fees',
  DEBIT_NOTE: 'Tax Debit Note', CREDIT_NOTE: 'Tax Credit Note',
}

export function renderInvoiceHtml(inv: any, company: any): string {
  const c = company || {}
  const nameEn = c.nameEn || 'United Securities Company L.L.C'
  const vat = c.vatNumber || 'OM1100021056'
  const poBox = c.poBox ? `P.O Box ${c.poBox}${c.postalCode ? ', PC ' + c.postalCode : ''}` : 'P.O Box 2566, PC 112 Ruwi'
  const phone = c.phone || '+968 24763300'
  const fax = c.fax || '+968 24503750'
  const address = c.address || 'Muscat, Sultanate of Oman'
  const email = c.email || 'accounts@usoman.com'
  const website = c.website || 'www.usoman.com'
  const logo = c.logoUrl ? `<img src="${c.logoUrl}" style="width:90px;height:auto;max-height:100px;object-fit:contain" />` : `<div style="font-size:34px;font-weight:900;color:#B8860B">U</div>`

  const title = TITLES[inv.invoiceType] || 'Tax Invoice'
  const isFee = inv.invoiceType === 'MANAGEMENT_FEE' || inv.invoiceType === 'PERFORMANCE_FEE'
  const isPerf = inv.invoiceType === 'PERFORMANCE_FEE'

  let feeData: any[] = []
  try { feeData = JSON.parse(inv.feeData || '[]') } catch {}

  // Build the body table
  let bodyTable = ''
  if (isFee && feeData.length) {
    const heads = isPerf ? ['Year', 'Performance Fees', 'VAT (5%)', 'Net Performance Fees']
      : ['Month', 'Days', 'Total NAV', 'Management Fees', 'VAT (5%)', 'Net Fees']
    const rows = feeData.map(r => isPerf
      ? `<tr><td>${r.year || r.month}</td><td style="text-align:right">${fmt(r.fee)}</td><td style="text-align:right">${fmt(r.vat)}</td><td style="text-align:right">${fmt(r.net)}</td></tr>`
      : `<tr><td>${r.month}</td><td style="text-align:center">${r.days}</td><td style="text-align:right">${fmt(r.nav)}</td><td style="text-align:right">${fmt(r.fee)}</td><td style="text-align:right">${fmt(r.vat)}</td><td style="text-align:right">${fmt(r.net)}</td></tr>`
    ).join('')
    bodyTable = `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:12px" border="1">
      <thead><tr style="background:#1e3a5f;color:#fff">${heads.map(h => `<th style="padding:6px">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody></table>`
  } else {
    const rows = (inv.items || []).map((it: any) =>
      `<tr><td>${it.description}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:right">${fmt(it.unitPrice)}</td><td style="text-align:right">${fmt(it.total)}</td></tr>`
    ).join('')
    bodyTable = `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:12px" border="1">
      <thead><tr style="background:#1e3a5f;color:#fff"><th style="padding:6px">Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody></table>`
  }

  const bank = inv.bankAccount ? `
    <div style="margin:12px 0;border:1px solid #ccc;padding:10px;background:#fafafa;font-size:12px">
      <b>Bank Details:</b><br/>
      ${inv.bankAccount.bankName ? `Bank Name: ${inv.bankAccount.bankName}<br/>` : ''}
      ${inv.bankAccount.accountName ? `Account Name: ${inv.bankAccount.accountName}<br/>` : ''}
      ${inv.bankAccount.iban ? `IBAN: ${inv.bankAccount.iban}<br/>` : ''}
      ${inv.bankAccount.accountNumber ? `Account Number: ${inv.bankAccount.accountNumber}<br/>` : ''}
      ${inv.bankAccount.swiftCode ? `Swift: ${inv.bankAccount.swiftCode}` : ''}
    </div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;color:#222;max-width:720px;margin:0 auto;padding:20px">
    <table style="width:100%;border-bottom:2px solid #1e3a5f;padding-bottom:12px"><tr>
      <td style="width:120px;text-align:center">${logo}</td>
      <td style="text-align:center"><h2 style="margin:0;color:#1e3a5f">Tax Invoice</h2><h3 style="margin:4px 0">${title}</h3></td>
      <td style="text-align:right;font-size:11px;color:#555">
        <b style="color:#1e3a5f">${nameEn}</b><br/>VAT #: <b>${vat}</b><br/>${poBox}<br/>Phone: ${phone}<br/>Fax: ${fax}<br/>${address}
      </td>
    </tr></table>

    <p style="text-align:right;font-size:12px;margin:12px 0">
      Invoice Number: <b>${inv.invoiceNumber}</b> &nbsp;&nbsp; Invoice Date: <b>${fmtDate(inv.date)}</b>
    </p>

    <p style="font-size:12px"><b>After Compliments,</b></p>

    <div style="border:1px solid #ccc;padding:10px;background:#fafafa;font-size:12px;margin-bottom:8px">
      ${inv.customer?.name ? `Client Name: <b>${inv.customer.name}</b><br/>` : ''}
      ${inv.customer?.clientNumber ? `Client Number: ${inv.customer.clientNumber}<br/>` : ''}
      ${inv.customer?.vatNumber ? `VAT Number: ${inv.customer.vatNumber}<br/>` : ''}
      ${inv.customer?.address ? `Address: ${inv.customer.address}<br/>` : ''}
      ${inv.customer?.email ? `Email: ${inv.customer.email}` : ''}
    </div>

    ${bodyTable}

    <table style="width:280px;margin-left:auto;border-collapse:collapse;font-size:12px" border="1">
      <tr><td style="padding:5px;background:#f5f5f5">Subtotal</td><td style="text-align:right;padding:5px">${fmt(inv.subtotal)}</td></tr>
      <tr><td style="padding:5px;background:#f5f5f5">VAT (${inv.vatRate}%)</td><td style="text-align:right;padding:5px">${fmt(inv.vatAmount)}</td></tr>
      <tr style="background:#1e3a5f;color:#fff"><td style="padding:6px"><b>NET Value</b></td><td style="text-align:right;padding:6px"><b>RO ${fmt(inv.totalAmount)}</b></td></tr>
    </table>

    ${bank}

    <p style="font-size:10px;color:#777;font-style:italic;margin-top:14px">Disclaimer: This invoice is computer generated and does not require any signature.</p>
    <hr/>
    <p style="text-align:center;font-size:10px;color:#777">${nameEn}, ${poBox}<br/>Tel: ${phone} | Fax: ${fax} | ${website} | ${email}</p>
  </body></html>`
}
