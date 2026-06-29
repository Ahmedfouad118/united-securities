'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import { Plus, Shield, UserCheck, UserX, Pencil, Trash2, KeyRound, Lock } from 'lucide-react'
import { ROLE_LABELS, Role } from '@/types'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import toast from 'react-hot-toast'

const ROLES: Role[] = ['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER']

// Navigation modules a user can be granted (SPUR-style)
const NAV_MODULES: { key: string; ar: string; en: string }[] = [
  { key: 'dashboard', ar: 'لوحة التحكم', en: 'Dashboard' },
  { key: 'customers', ar: 'العملاء', en: 'Customers' },
  { key: 'invoices', ar: 'الفواتير', en: 'Invoices' },
  { key: 'receipts', ar: 'سندات القبض', en: 'Receipts' },
  { key: 'reports', ar: 'التقارير', en: 'Reports' },
  { key: 'masters', ar: 'البيانات الأساسية', en: 'Masters' },
  { key: 'users', ar: 'المستخدمين', en: 'Users' },
]
const ACTION_PERMS: { key: string; ar: string; en: string }[] = [
  { key: 'create_invoice', ar: 'إنشاء فاتورة', en: 'Create Invoice' },
  { key: 'edit_invoice', ar: 'تعديل فاتورة', en: 'Edit Invoice' },
  { key: 'delete_invoice', ar: 'حذف فاتورة', en: 'Delete Invoice' },
  { key: 'approve_invoice', ar: 'اعتماد فاتورة', en: 'Approve Invoice' },
  { key: 'create_payment', ar: 'تسجيل قبض', en: 'Create Receipt' },
  { key: 'delete_payment', ar: 'حذف قبض', en: 'Delete Receipt' },
  { key: 'manage_customers', ar: 'إدارة العملاء', en: 'Manage Customers' },
]

interface PermState { nav: string[]; actions: string[] }
const emptyPerm: PermState = { nav: [], actions: [] }

export default function UsersPage() {
  const { lang } = useI18n()
  const L = (ar: string, en: string) => lang === 'en' ? en : ar
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', userRole: 'VIEWER' })
  const [perm, setPerm] = useState<PermState>(emptyPerm)
  const [saving, setSaving] = useState(false)

  async function fetchUsers() {
    const res = await fetch('/api/users')
    setUsers(await res.json())
    setLoading(false)
  }
  useEffect(() => { fetchUsers() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', userRole: 'VIEWER' })
    setPerm(emptyPerm)
    setModal(true)
  }
  function openEdit(u: any) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', userRole: u.role })
    let p = emptyPerm
    try { if (u.permissions) p = { ...emptyPerm, ...JSON.parse(u.permissions) } } catch {}
    setPerm(p)
    setModal(true)
  }

  function toggle(list: 'nav' | 'actions', key: string) {
    setPerm(prev => {
      const arr = prev[list]
      return { ...prev, [list]: arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key] }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const body: any = { name: form.name, email: form.email, userRole: form.userRole, permissions: perm }
        if (form.password) body.password = form.password
        const res = await fetch(`/api/users/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) { const err = await res.json(); return toast.error(err.error || L('فشل', 'Failed')) }
        toast.success(L('تم تحديث المستخدم', 'User updated'))
      } else {
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) { const err = await res.json(); return toast.error(err.error || L('فشل', 'Failed')) }
        // Save permissions on the created user
        const created = await res.json()
        if (perm.nav.length || perm.actions.length) {
          await fetch(`/api/users/${created.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: perm }) })
        }
        toast.success(L('تم إضافة المستخدم', 'User added'))
      }
      setModal(false)
      fetchUsers()
    } finally { setSaving(false) }
  }

  async function toggleActive(u: any) {
    const res = await fetch(`/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !u.active }) })
    if (res.ok) { toast.success(u.active ? L('تم الإيقاف', 'Disabled') : L('تم التفعيل', 'Activated')); fetchUsers() }
    else toast.error(L('فشل', 'Failed'))
  }

  async function deleteUser(u: any) {
    if (!confirm(L(`حذف المستخدم "${u.name}"؟`, `Delete user "${u.name}"?`))) return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) { toast.success(data.softDeleted ? L('تم إيقاف المستخدم (له فواتير)', 'User disabled (has invoices)') : L('تم الحذف', 'Deleted')); fetchUsers() }
    else toast.error(data.error || L('فشل', 'Failed'))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={L('إدارة المستخدمين', 'User Management')} />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">{users.length} {L('مستخدم في النظام', 'users in system')}</p>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {L('مستخدم جديد', 'New User')}</button>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                {[L('الاسم', 'Name'), L('البريد الإلكتروني', 'Email'), L('الدور', 'Role'), L('الحالة', 'Status'), L('تاريخ الإضافة', 'Created'), L('إجراءات', 'Actions')].map(h => (
                  <th key={h} className="table-header text-start">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell font-semibold">{u.name}</td>
                  <td className="table-cell text-gray-500" dir="ltr">{u.email}</td>
                  <td className="table-cell">
                    <span className="flex items-center gap-1.5 text-sm">
                      <Shield size={14} className="text-primary-500" />
                      {lang === 'en' ? u.role : ROLE_LABELS[u.role as Role]}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button onClick={() => toggleActive(u)} className="cursor-pointer">
                      {u.active
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-semibold"><UserCheck size={13} /> {L('نشط', 'Active')}</span>
                        : <span className="flex items-center gap-1 text-red-500 text-xs font-semibold"><UserX size={13} /> {L('معطّل', 'Disabled')}</span>}
                    </button>
                  </td>
                  <td className="table-cell text-gray-400 text-xs">{formatDate(u.createdAt, lang)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(u)} className="text-blue-500 hover:text-blue-700" title={L('تعديل', 'Edit')}><Pencil size={15} /></button>
                      <button onClick={() => toggleActive(u)} className={u.active ? 'text-amber-500 hover:text-amber-700' : 'text-green-500 hover:text-green-700'} title={u.active ? L('إيقاف', 'Disable') : L('تفعيل', 'Activate')}>
                        {u.active ? <Lock size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button onClick={() => deleteUser(u)} className="text-red-400 hover:text-red-600" title={L('حذف', 'Delete')}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? L('تعديل المستخدم', 'Edit User') : L('إضافة مستخدم جديد', 'Add New User')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{L('الاسم', 'Name')}</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">{L('البريد الإلكتروني', 'Email')}</label>
              <input type="email" className="input" dir="ltr" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label flex items-center gap-1"><KeyRound size={12} /> {editing ? L('كلمة مرور جديدة (اختياري)', 'New Password (optional)') : L('كلمة المرور', 'Password')}</label>
              <input type="password" className="input" dir="ltr" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editing} minLength={editing ? 0 : 8} placeholder={editing ? '••••••' : ''} />
            </div>
            <div>
              <label className="label">{L('الدور', 'Role')}</label>
              <select className="input" value={form.userRole} onChange={e => setForm(f => ({ ...f, userRole: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{lang === 'en' ? r : ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>

          {/* Permissions */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">{L('الشاشات المسموح بها', 'Allowed Screens')}</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {NAV_MODULES.map(m => (
                <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-gray-50 rounded">
                  <input type="checkbox" checked={perm.nav.includes(m.key)} onChange={() => toggle('nav', m.key)} className="accent-primary-600" />
                  {L(m.ar, m.en)}
                </label>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-600 mb-2">{L('الصلاحيات', 'Action Permissions')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ACTION_PERMS.map(m => (
                <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-gray-50 rounded">
                  <input type="checkbox" checked={perm.actions.includes(m.key)} onChange={() => toggle('actions', m.key)} className="accent-primary-600" />
                  {L(m.ar, m.en)}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">{L('اتركها فارغة لاستخدام صلاحيات الدور الافتراضية.', 'Leave empty to use default role permissions.')}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? L('جاري الحفظ...', 'Saving...') : editing ? L('حفظ التعديلات', 'Save Changes') : L('إضافة المستخدم', 'Add User')}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">{L('إلغاء', 'Cancel')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
