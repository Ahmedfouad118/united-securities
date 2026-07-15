// Server-side Transfer-of-Funds letter renderer — used by print, bulk, Word & email.

function fmtAmount(n: any, decimals = 3) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtDateLong(d: any) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
function fmtDateShort(d: any) {
  if (!d) return ''
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

// ---- number to English words ----
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below1000(n: number): string {
  let s = ''
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' Hundred '; n %= 100 }
  if (n >= 20) { s += TENS[Math.floor(n / 10)] + ' '; n %= 10 }
  if (n > 0) s += ONES[n] + ' '
  return s
}

export function numberToWords(n: number): string {
  const whole = Math.floor(Math.abs(n))
  if (whole === 0) return 'Zero'
  let s = ''
  const groups: [number, string][] = [
    [1_000_000_000, 'Billion'],
    [1_000_000, 'Million'],
    [1_000, 'Thousand'],
  ]
  let rem = whole
  for (const [val, label] of groups) {
    if (rem >= val) { s += below1000(Math.floor(rem / val)) + label + ' '; rem %= val }
  }
  s += below1000(rem)
  return s.trim()
}

// Currency info: subunit name and decimals
const CUR_INFO: Record<string, { name: string; sub: string; dec: number }> = {
  OMR: { name: 'Omani Rials', sub: 'Baizes', dec: 3 },
  USD: { name: 'US Dollars', sub: 'Cents', dec: 2 },
  EUR: { name: 'Euros', sub: 'Cents', dec: 2 },
  GBP: { name: 'Pounds Sterling', sub: 'Pence', dec: 2 },
  AED: { name: 'UAE Dirhams', sub: 'Fils', dec: 2 },
  SAR: { name: 'Saudi Riyals', sub: 'Halalas', dec: 2 },
  QAR: { name: 'Qatari Riyals', sub: 'Dirhams', dec: 2 },
  KWD: { name: 'Kuwaiti Dinars', sub: 'Fils', dec: 3 },
  BHD: { name: 'Bahraini Dinars', sub: 'Fils', dec: 3 },
  EGP: { name: 'Egyptian Pounds', sub: 'Piastres', dec: 2 },
}

export function amountToWords(amount: number, currency: string): string {
  const info = CUR_INFO[currency] || { name: currency, sub: '', dec: 2 }
  const whole = Math.floor(amount)
  const frac = Math.round((amount - whole) * Math.pow(10, info.dec))
  let s = `${info.name} ${numberToWords(whole)}`
  if (frac > 0 && info.sub) s += ` and ${info.sub} ${numberToWords(frac)}`
  return s + ' Only'
}

export function currencyDecimals(currency: string): number {
  return (CUR_INFO[currency] || { dec: 2 }).dec
}

export function currencyLongName(currency: string): string {
  const map: Record<string, string> = { OMR: 'Omani Riyal', USD: 'US Dollars', EUR: 'Euro', GBP: 'GBP', AED: 'UAE Dirham', SAR: 'Saudi Riyal' }
  return map[currency] || currency
}

// ─────────────────────────────────────────────────────────────
export function renderLetterHtml(letter: any, company: any): string {
  const c = company || {}
  const companyName = c.nameEn || 'United Securities LLC'
  const dec = currencyDecimals(letter.currency)
  const words = letter.amountWords || amountToWords(Number(letter.amount), letter.currency)

  // optional Sell/Buy invoice table
  let invRows: any[] = []
  try { invRows = JSON.parse(letter.invoiceData || '[]') } catch {}
  let invTable = ''
  if (Array.isArray(invRows) && invRows.length) {
    const total = invRows.reduce((s, r) => s + (String(r.remarks).toLowerCase().includes('buy') ? -Math.abs(Number(r.amount)) : Number(r.amount)), 0)
    invTable = `<table border="1" style="border-collapse:collapse;margin:12px auto;font-size:12px;min-width:340px">
      <tr style="background:#f2f2f2"><th style="padding:4px 12px">Remarks</th><th style="padding:4px 12px">Invoice No.</th><th style="padding:4px 12px">Amount in ${letter.currency === 'OMR' ? 'R.O.' : letter.currency}</th></tr>
      ${invRows.map(r => {
        const isBuy = String(r.remarks).toLowerCase().includes('buy')
        const amt = Math.abs(Number(r.amount))
        return `<tr><td style="padding:3px 12px">${r.remarks}</td><td style="padding:3px 12px;text-align:center">${r.invoiceNo}</td><td style="padding:3px 12px;text-align:right">${isBuy ? `(${fmtAmount(amt, dec)})` : fmtAmount(amt, dec)}</td></tr>`
      }).join('')}
      <tr><td style="padding:3px 12px"></td><td style="padding:3px 12px;text-align:center"><b>Total Amount</b></td><td style="padding:3px 12px;text-align:right"><b>${fmtAmount(total, dec)}</b></td></tr>
    </table>`
  }

  // beneficiary key/value rows (only non-empty)
  const benRows: [string, any][] = [
    ['Account Name', letter.benAccountName],
    ['Account No.', letter.benAccountNo],
    ['Bank Name', letter.benBankName],
    ['Branch', letter.benBranch],
    ['IBAN', letter.benIban],
    ['Swift Code', letter.benSwift],
    ['Currency', letter.benCurrency],
    ['Correspondent Bank', letter.corrBank],
    ['Swift Code (Corr.)', letter.corrSwift],
    ['Ref.', letter.refLine],
    ['Settlement date', letter.settlementDate ? fmtDateShort(letter.settlementDate) : ''],
    ['Purpose of Remittance', letter.purpose],
  ]
  const benHtml = benRows.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:2px 0;width:190px">${k}</td><td style="padding:2px 8px;width:12px">:</td><td style="padding:2px 0"><b>${v}</b></td></tr>`
  ).join('')

  // Online approval stamp
  const stamp = letter.online ? `
    <div style="position:absolute;top:0;right:40px;width:120px;height:120px;border:1.5px solid #333;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.5;color:#333">
      Online<br/>For<br/>Management<br/>approval<br/><br/>US
    </div>` : ''

  const seqNo = letter.seq || (letter.refNumber || '').split('/').filter((p: string) => /^\d+$/.test(p))[0] || ''

  // Body paragraph — letter type bodyText overrides the default wording
  const defaultBody = `Kindly arrange to transfer ${letter.currency === 'OMR' ? 'an amount of' : 'the amount of'} ${letter.currency} <b>${fmtAmount(letter.amount, dec)}</b> (${words}) from our ${letter.fromAccountNo ? `current account no. <b>${letter.fromAccountNo}</b>` : 'account'} operated by ${letter.fromAccountName || companyName}. to the following details mentioned in <b>${currencyLongName(letter.currency)}</b>:`
  const body = letter.type?.bodyText
    ? letter.type.bodyText
        .replace(/\{amount\}/g, `${letter.currency} <b>${fmtAmount(letter.amount, dec)}</b>`)
        .replace(/\{words\}/g, words)
        .replace(/\{account\}/g, letter.fromAccountNo || '')
    : defaultBody

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;color:#111;margin:0">
   <div class="doc-body" style="max-width:660px;margin:0 auto;padding:20px 30px;box-sizing:border-box">
    <!-- letterhead space -->
    <div class="letterhead-space" style="height:110px"></div>
    <div style="text-align:right;color:#888;font-size:12px;margin-bottom:8px">${seqNo}</div>

    <div style="position:relative;font-size:12.5px;line-height:1.55">
      ${stamp}
      <p style="margin:0"><b>Date:</b> ${fmtDateLong(letter.date)}<br/><b>Ref:</b> ${letter.refNumber}</p>

      <p style="margin:26px 0 0">
        The Manager,<br/>
        <b>${letter.toBankName || ''}</b>,<br/>
        ${letter.toBankBranch ? `${letter.toBankBranch},<br/>` : ''}
        Sultanate of Oman.
      </p>

      <p style="margin:18px 0 0"><b><u>Sub: Transfer of funds</u></b></p>

      <p style="margin:14px 0 0">After Compliments,</p>

      <p style="margin:14px 0 0;text-align:justify;white-space:pre-line">${body}</p>

      ${invTable}

      <table style="margin:16px 0 0;font-size:12.5px;border-collapse:collapse">${benHtml}</table>

      ${letter.chargesNote ? `<p style="margin:18px 0 0"><b>${letter.chargesNote}</b></p>` : ''}
      ${letter.extraNote ? `<p style="margin:8px 0 0">${letter.extraNote}</p>` : ''}

      <p style="margin:26px 0 0">Yours sincerely,</p>
      <p style="margin:4px 0 0"><b>For ${letter.fromAccountName || companyName}.</b></p>

      <table style="width:100%;margin-top:80px;font-size:12.5px"><tr>
        <td style="width:50%"><b>Authorized signatory,</b></td>
        <td style="width:50%;text-align:left;padding-left:120px"><b>Authorized signatory</b></td>
      </tr></table>
    </div>
   </div>
  </body></html>`
}
