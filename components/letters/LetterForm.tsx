'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'

const CURRENCIES = ['OMR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'EGP', 'JOD', 'INR', 'CHF', 'JPY', 'CNY', 'CAD', 'AUD']

// client-side amount-to-words (mirrors server)
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
function b1000(n: number): string { let s = ''; if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' Hundred '; n %= 100 } if (n >= 20) { s += TENS[Math.floor(n / 10)] + ' '; n %= 10 } if (n > 0) s += ONES[n] + ' '; return s }
function toWords(n: number): string {
  const w = Math.floor(Math.abs(n)); if (w === 0) return 'Zero'
  let s = '', r = w
  for (const [v, l] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']] as [number, string][]) {
    if (r >= v) { s += b1000(Math.floor(r / v)) + l + ' '; r %= v }
  }
  return (s + b1000(r)).trim()
}
const CUR_INFO: Record<string, { name: string; sub: string; dec: number }> = {
  OMR: { name: 'Omani Rials', sub: 'Baizes', dec: 3 }, USD: { name: 'US Dollars', sub: 'Cents', dec: 2 },
  EUR: { name: 'Euros', sub: 'Cents', dec: 2 }, GBP: { name: 'Pounds Sterling', sub: 'Pence', dec: 2 },
  AED: { name: 'UAE Dirhams', sub: 'Fils', dec: 2 }, SAR: { name: 'Saudi Riyals', sub: 'Halalas', dec: 2 },
  KWD: { name: 'Kuwaiti Dinars', sub: 'Fils', dec: 3 }, BHD: { name: 'Bahraini Dinars', sub: 'Fils', dec: 3 },
}
function amountWordsOf(amount: number, cur: string): string {
  const i = CUR_INFO[cur] || { name: cur, sub: '', dec: 2 }
  const whole = Math.floor(amount), frac = Math.round((amount - whole) * Math.pow(10, i.dec))
  let s = `${i.name} ${toWords(whole)}`
  if (frac > 0 && i.sub) s += ` and ${i.sub} ${toWords(frac)}`
  return s + ' Only'
}

interface InvRow { remarks: string; invoiceNo: string; amount: number }

export default function LetterForm({ letterId }: { letterId?: string }) {
  const router = useRouter()
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const isEdit = !!letterId

  const [types, setTypes] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [wordsTouched, setWordsTouched] = useState(false)

  const [f, setF] = useState<any>({
    refNumber: '', typeId: '', date: new Date().toISOString().split('T')[0],
    toBankName: '', toBankBranch: '', fromAccountName: 'United Securities LLC', fromAccountNo: '',
    customerId: '', supplierId: '', amount: '', currency: 'OMR', amountWords: '',
    benAccountName: '', benAccountNo: '', benBankName: '', benBranch: '', benIban: '', benSwift: '', benCurrency: '',
    corrBank: '', corrSwift: '', refLine: '', purpose: '', settlementDate: '',
    chargesNote: 'Please note that all charges related to the transfer will be borne by us.',
    extraNote: '', online: false,
  })
  const [invRows, setInvRows] = useState<InvRow[]>([])
  const [custQuery, setCustQuery] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/masters/letter-types').then(r => r.json()),
      fetch('/api/customers?limit=1000').then(r => r.json()),
      fetch('/api/masters/suppliers').then(r => r.json()),
      fetch('/api/masters/banks').then(r => r.json()),
      isEdit ? fetch(`/api/letters/${letterId}`).then(r => r.json()) : Promise.resolve(null),
    ]).then(([t, c, s, b, existing]) => {
      setTypes(Array.isArray(t) ? t.filter((x: any) => x.active !== false) : [])
      setCustomers(Array.isArray(c) ? c : c.customers || [])
      setSuppliers(Array.isArray(s) ? s.filter((x: any) => x.active !== false) : [])
      setBanks(Array.isArray(b) ? b : [])
      if (existing && existing.id) {
        setF({
          refNumber: existing.refNumber || '', typeId: existing.typeId || '',
          date: existing.date ? new Date(existing.date).toISOString().split('T')[0] : '',
          toBankName: existing.toBankName || '', toBankBranch: existing.toBankBranch || '',
          fromAccountName: existing.fromAccountName || '', fromAccountNo: existing.fromAccountNo || '',
          customerId: existing.customerId || '', supplierId: existing.supplierId || '',
          amount: String(existing.amount ?? ''), currency: existing.currency || 'OMR',
          amountWords: existing.amountWords || '',
          benAccountName: existing.benAccountName || '', benAccountNo: existing.benAccountNo || '',
          benBankName: existing.benBankName || '', benBranch: existing.benBranch || '',
          benIban: existing.benIban || '', benSwift: existing.benSwift || '', benCurrency: existing.benCurrency || '',
          corrBank: existing.corrBank || '', corrSwift: existing.corrSwift || '',
          refLine: existing.refLine || '', purpose: existing.purpose || '',
          settlementDate: existing.settlementDate ? new Date(existing.settlementDate).toISOString().split('T')[0] : '',
          chargesNote: existing.chargesNote ?? '', extraNote: existing.extraNote || '', online: !!existing.online,
        })
        setWordsTouched(true)
        try { const rows = JSON.parse(existing.invoiceData || '[]'); if (Array.isArray(rows)) setInvRows(rows) } catch {}
      }
      setLoading(false)
    })
  }, [letterId])

  const selType = types.find(t => t.id === f.typeId)

  useEffect(() => {
    if (!wordsTouched) {
      const a = Number(f.amount)
      setF((p: any) => ({ ...p, amountWords: a > 0 ? amountWordsOf(a, f.currency) : '' }))
    }
  }, [f.amount, f.currency, wordsTouched])

  function onType(id: string) {
    const t = types.find(x => x.id === id)
    setF((p: any) => ({ ...p, typeId: id, online: t ? !!t.online : p.online }))
  }

  const custMatches = useMemo(() => {
    const q = custQuery.trim().toLowerCase()
    if (!q) return []
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) || c.clientNumber?.includes(custQuery.trim())
    ).slice(0, 8)
  }, [custQuery, customers])

  function fillFromCustomer(c: any) {
    setF((p: any) => ({ ...p, customerId: c.id, benAccountName: c.name, benAccountNo: c.accountNumber || p.benAccountNo }))
    setCustQuery('')
    toast.success(L(`تم اختيار: ${c.name}`, `Selected: ${c.name}`))
  }
  function fillFromSupplier(id: string) {
    const s = suppliers.find(x => x.id === id)
    if (!s) { setF((p: any) => ({ ...p, supplierId: '' })); return }
    setF((p: any) => ({
      ...p, supplierId: id,
      benAccountName: s.name, benAccountNo: s.accountNumber || '', benBankName: s.bankName || '',
      benBranch: s.branch || '', benIban: s.iban || '', benSwift: s.swiftCode || '',
    }))
  }
  function fillFromBank(id: string) {
    const b = banks.find(x => x.id === id)
    if (!b) return
    setF((p: any) => ({ ...p, fromAccountNo: b.accountNumber || p.fromAccountNo }))
  }

  function addRow() { setInvRows(p => [...p, { remarks: 'Sell', invoiceNo: '', amount: 0 }]) }
  function delRow(i: number) { setInvRows(p => p.filter((_, x) => x !== i)) }
  function updRow(i: number, k: keyof InvRow, v: any) { setInvRows(p => p.map((r, x) => x === i ? { ...r, [k]: v } : r)) }
  const invTotal = invRows.reduce((s, r) => s + (String(r.remarks).toLowerCase().includes('buy') ? -Math.abs(Number(r.amount)) : Number(r.amount)), 0)

  async function save() {
    if (!f.amount || Number(f.amount) <= 0) return toast.error(L('أدخل المبلغ', 'Enter the amount'))
    if (!f.toBankName) return toast.error(L('أدخل اسم البنك المرسل إليه', 'Enter the addressed bank name'))
    setSaving(true)
    try {
      const payload = { ...f, amount: Number(f.amount), invoiceData: invRows.length ? JSON.stringify(invRows) : null }
      const res = await fetch(isEdit ? `/api/letters/${letterId}` : '/api/letters', {
        method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || L('فشل الحفظ', 'Save failed'), { duration: 6000 })
      toast.success(isEdit ? L('تم حفظ التعديلات ✓', 'Saved ✓') : L('تم إنشاء الرسالة ✓', 'Letter created ✓'))
      router.push('/letters')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-10 text-gray-400">{L('جاري التحميل...', 'Loading...')}</div>
  const inp = 'input text-sm'

  return (
    <div className="max-w-5xl space-y-5">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">{L('بيانات الرسالة', 'Letter Details')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">{L('نوع الرسالة', 'Letter Type')}</label>
            <select className={inp} value={f.typeId} onChange={e => onType(e.target.value)}>
              <option value="">{L('— اختر —', '— Select —')}</option>
              {types.map(t => <option key={t.id} value={t.id}>{lang === 'en' ? t.name : (t.nameAr || t.name)}</option>)}
            </select>
            {selType && <p className="text-[11px] text-gray-400 mt-1">{selType.fromParty} → {selType.toParty}</p>}
          </div>
          <div>
            <label className="label">{L('رقم المرجع (فارغ = تلقائي)', 'Ref Number (empty = auto)')}</label>
            <input className={inp + ' font-mono'} dir="ltr" placeholder="US/AF/650/2026" value={f.refNumber} onChange={e => setF({ ...f, refNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">{L('التاريخ', 'Date')}</label>
            <input type="date" className={inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          </div>
          <div>
            <label className="label">{L('البنك المرسل إليه (The Manager)', 'Addressed Bank (The Manager)')} <span className="text-red-500">*</span></label>
            <input className={inp} dir="ltr" placeholder="Bank Muscat" value={f.toBankName} onChange={e => setF({ ...f, toBankName: e.target.value })} />
          </div>
          <div>
            <label className="label">{L('الفرع', 'Branch')}</label>
            <input className={inp} dir="ltr" placeholder="Head Office / MBD Branch" value={f.toBankBranch} onChange={e => setF({ ...f, toBankBranch: e.target.value })} />
          </div>
          <div>
            <label className="label flex items-center justify-between">
              <span>{L('أونلاين؟', 'Online?')}</span>
              <label className="flex items-center gap-1 text-xs font-normal cursor-pointer">
                <input type="checkbox" className="accent-primary-600" checked={f.online} onChange={e => setF({ ...f, online: e.target.checked })} />
                {L('ختم الموافقة', 'Approval stamp')}
              </label>
            </label>
            <p className="text-[11px] text-gray-400">{L('يظهر ختم Online For Management approval', 'Shows the online approval stamp')}</p>
          </div>
          <div>
            <label className="label">{L('من (اسم الحساب)', 'From (Account Name)')}</label>
            <input className={inp} dir="ltr" value={f.fromAccountName} onChange={e => setF({ ...f, fromAccountName: e.target.value })} />
          </div>
          <div>
            <label className="label">{L('من حساب رقم', 'From Account No.')}</label>
            <div className="flex gap-1">
              <input className={inp} dir="ltr" value={f.fromAccountNo} onChange={e => setF({ ...f, fromAccountNo: e.target.value })} />
              <select className="input text-xs w-28" value="" onChange={e => fillFromBank(e.target.value)}>
                <option value="">{L('بنوكنا', 'Our banks')}</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.bankName}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">{L('المبلغ', 'Amount')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">{L('المبلغ', 'Amount')} <span className="text-red-500">*</span></label>
            <input type="number" step="0.001" className={inp + ' font-bold'} dir="ltr" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">{L('العملة', 'Currency')}</label>
            <select className={inp} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label">{L('المبلغ بالحروف (تلقائي — قابل للتعديل)', 'Amount in words (auto — editable)')}</label>
            <input className={inp} dir="ltr" value={f.amountWords} onChange={e => { setWordsTouched(true); setF({ ...f, amountWords: e.target.value }) }} />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 border-b pb-2 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-700">{L('بيانات المستفيد', 'Beneficiary Details')}</h3>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <input className="input text-xs w-56" placeholder={L('عميل: بحث بالاسم أو رقم العميل...', 'Customer: name or client no...')}
                value={custQuery} onChange={e => setCustQuery(e.target.value)} />
              {custMatches.length > 0 && (
                <div className="absolute z-20 bg-white border rounded-lg shadow-lg mt-1 w-72 max-h-56 overflow-auto">
                  {custMatches.map(c => (
                    <button key={c.id} type="button" onClick={() => fillFromCustomer(c)}
                      className="block w-full text-start px-3 py-2 hover:bg-gray-50 text-xs border-b last:border-0">
                      <span className="font-semibold">{c.name}</span>
                      {c.clientNumber && <span className="text-gray-400 font-mono"> — {c.clientNumber}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select className="input text-xs w-44" value={f.supplierId} onChange={e => fillFromSupplier(e.target.value)}>
              <option value="">{L('أو اختر مورد...', 'or pick supplier...')}</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><label className="label">Account Name</label><input className={inp} dir="ltr" value={f.benAccountName} onChange={e => setF({ ...f, benAccountName: e.target.value })} /></div>
          <div><label className="label">Account No.</label><input className={inp} dir="ltr" value={f.benAccountNo} onChange={e => setF({ ...f, benAccountNo: e.target.value })} /></div>
          <div><label className="label">Bank Name</label><input className={inp} dir="ltr" value={f.benBankName} onChange={e => setF({ ...f, benBankName: e.target.value })} /></div>
          <div><label className="label">Branch</label><input className={inp} dir="ltr" value={f.benBranch} onChange={e => setF({ ...f, benBranch: e.target.value })} /></div>
          <div><label className="label">IBAN</label><input className={inp} dir="ltr" value={f.benIban} onChange={e => setF({ ...f, benIban: e.target.value })} /></div>
          <div><label className="label">Swift Code</label><input className={inp} dir="ltr" value={f.benSwift} onChange={e => setF({ ...f, benSwift: e.target.value })} /></div>
          <div><label className="label">{L('عملة الحساب', 'Account Currency')}</label><input className={inp} dir="ltr" placeholder="US Dollars / Omani Riyal" value={f.benCurrency} onChange={e => setF({ ...f, benCurrency: e.target.value })} /></div>
          <div><label className="label">Correspondent Bank</label><input className={inp} dir="ltr" value={f.corrBank} onChange={e => setF({ ...f, corrBank: e.target.value })} /></div>
          <div><label className="label">Corr. Swift</label><input className={inp} dir="ltr" value={f.corrSwift} onChange={e => setF({ ...f, corrSwift: e.target.value })} /></div>
          <div><label className="label">Ref.</label><input className={inp} dir="ltr" placeholder="ACC: (A-0138...) Invoice:..." value={f.refLine} onChange={e => setF({ ...f, refLine: e.target.value })} /></div>
          <div><label className="label">{L('تاريخ التسوية', 'Settlement date')}</label><input type="date" className={inp} value={f.settlementDate} onChange={e => setF({ ...f, settlementDate: e.target.value })} /></div>
          <div><label className="label">Purpose of Remittance</label><input className={inp} dir="ltr" placeholder="Proceed of selling securities" value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h3 className="font-semibold text-gray-700">{L('جدول الفواتير (بيع/شراء) — اختياري', 'Invoices table (Sell/Buy) — optional')}</h3>
          <button type="button" onClick={addRow} className="btn-secondary text-xs py-1.5"><Plus size={13} /> {L('إضافة صف', 'Add Row')}</button>
        </div>
        {invRows.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
              <div className="col-span-3">Remarks</div>
              <div className="col-span-4">Invoice No.</div>
              <div className="col-span-4 text-center">{L('المبلغ', 'Amount')}</div>
              <div className="col-span-1"></div>
            </div>
            {invRows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                <div className="col-span-3">
                  <select className="input text-xs py-1.5" value={r.remarks} onChange={e => updRow(i, 'remarks', e.target.value)}>
                    <option value="Sell">Sell</option><option value="Buy">Buy</option><option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-4"><input className="input text-xs py-1.5" dir="ltr" value={r.invoiceNo} onChange={e => updRow(i, 'invoiceNo', e.target.value)} /></div>
                <div className="col-span-4"><input type="number" step="0.001" className="input text-xs py-1.5 text-center" value={r.amount} onChange={e => updRow(i, 'amount', Number(e.target.value))} /></div>
                <div className="col-span-1 flex justify-center"><button type="button" onClick={() => delRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></div>
              </div>
            ))}
            <p className="text-xs text-gray-500 text-end pt-1">{L('الإجمالي (البيع − الشراء):', 'Total (Sell − Buy):')} <b dir="ltr">{invTotal.toLocaleString('en-US', { minimumFractionDigits: 3 })}</b></p>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">{L('جملة المصاريف', 'Charges note')}</label>
            <input className={inp} dir="ltr" value={f.chargesNote} onChange={e => setF({ ...f, chargesNote: e.target.value })} />
          </div>
          <div>
            <label className="label">{L('ملاحظة إضافية (مثال: Kindly send us the SWIFT...)', 'Extra note (e.g. Kindly send us the SWIFT...)')}</label>
            <input className={inp} dir="ltr" value={f.extraNote} onChange={e => setF({ ...f, extraNote: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="btn-primary px-8">{saving ? L('جاري الحفظ...', 'Saving...') : isEdit ? L('حفظ التعديلات', 'Save Changes') : L('إنشاء الرسالة', 'Create Letter')}</button>
        <Link href="/letters" className="btn-secondary px-6">{L('إلغاء', 'Cancel')}</Link>
      </div>
    </div>
  )
}
