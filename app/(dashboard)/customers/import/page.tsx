'use client'
import { useState, useRef } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowRight, Upload, Download, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
}

export default function ImportCustomersPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|csv|xls)$/i)) return toast.error('يرجى رفع ملف Excel أو CSV')
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'فشل الاستيراد')
      setResult(data)
      toast.success(`تم استيراد ${data.created} عميل بنجاح`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="استيراد العملاء من Excel" />
      <div className="p-6 max-w-2xl mx-auto w-full">
        <Link href="/customers" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
          <ArrowRight size={16} /> العودة للعملاء
        </Link>

        {/* Step 1: Download template */}
        <div className="card mb-4">
          <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
            تحميل النموذج الاسترشادي
          </h3>
          <p className="text-sm text-gray-500 mb-4 mr-8">حمّل الملف، أدخل بيانات عملائك، ثم ارفعه في الخطوة التالية</p>
          <a href="/api/template" download className="btn-secondary w-fit">
            <Download size={16} />
            تحميل نموذج Excel
          </a>
        </div>

        {/* Step 2: Upload */}
        <div className="card mb-4">
          <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
            رفع الملف
          </h3>
          <p className="text-sm text-gray-500 mb-4 mr-8">يدعم الصيغ: .xlsx / .xls / .csv</p>

          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">اسحب الملف هنا أو اضغط للاختيار</p>
            <p className="text-gray-400 text-sm mt-1">Excel (.xlsx) أو CSV</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-3 text-primary-600">
              <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
              <span className="text-sm font-medium">جاري معالجة الملف...</span>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">نتيجة الاستيراد</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <CheckCircle size={24} className="text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-sm text-green-600">عميل تم إضافته</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <XCircle size={24} className="text-yellow-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                <p className="text-sm text-yellow-600">سطر تم تخطيه</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4">
                <p className="font-semibold text-red-700 mb-2">أخطاء ({result.errors.length})</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
            <Link href="/customers" className="btn-primary mt-4 w-fit">
              <Upload size={16} /> عرض العملاء
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
