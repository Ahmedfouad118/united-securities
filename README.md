# نظام إدارة العملاء والفواتير

## خطوات التشغيل

### 1. تثبيت المتطلبات
```bash
cd customer-mgmt-app
npm install
```

### 2. إعداد قاعدة البيانات
- أنشئ مشروعاً على [Supabase](https://supabase.com) مجاناً
- انسخ `DATABASE_URL` من Project Settings → Database
- انسخ ملف `.env.example` باسم `.env.local` وأدخل القيم

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="any-random-long-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. إنشاء الجداول
```bash
npm run db:push
npm run db:seed
```

### 4. تشغيل المشروع
```bash
npm run dev
```
افتح: http://localhost:3000

## بيانات الدخول الافتراضية
| الدور | البريد | كلمة المرور |
|---|---|---|
| مدير | admin@company.com | Admin@123 |
| محاسب | accountant@company.com | Account@123 |

## النشر على Vercel
```bash
npm install -g vercel
vercel
```
أضف متغيرات البيئة في Vercel Dashboard.

## الصلاحيات
| الميزة | مدير | محاسب | مبيعات | قراءة فقط |
|---|---|---|---|---|
| لوحة التحكم | ✅ | ✅ | ✅ | ✅ |
| إضافة عميل | ✅ | ✅ | ✅ | ❌ |
| استيراد Excel | ✅ | ✅ | ❌ | ❌ |
| إنشاء فاتورة | ✅ | ✅ | ✅ | ❌ |
| تسجيل دفعة | ✅ | ✅ | ❌ | ❌ |
| حذف بيانات | ✅ | ❌ | ❌ | ❌ |
| إدارة المستخدمين | ✅ | ❌ | ❌ | ❌ |
