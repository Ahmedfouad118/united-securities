# 🚀 دليل رفع البرنامج على Vercel + Supabase

## الخطوة 1 — نسخ بيانات قاعدة Supabase
1. افتح مشروعك في Supabase
2. اضغط زر **Connect** الأخضر (فوق)
3. اختار تبويب **ORMs** → **Prisma**
4. هتلاقي سطرين: `DATABASE_URL` و `DIRECT_URL` — انسخهم
5. مكان `[YOUR-PASSWORD]` حط باسوورد قاعدة البيانات اللي اخترته وانت بتعمل المشروع

## الخطوة 2 — إنشاء الجداول على Supabase (مرة واحدة)
في Git Bash داخل مجلد المشروع، نفّذ (بعد ما تحط الـ connection strings في ملف `.env.local`):
```bash
npx prisma db push      # ينشئ كل الجداول على Supabase
npm run db:seed         # ينشئ المستخدم الأدمن والبيانات الأساسية
```
> بعد كده تقدر تدخل بـ: **admin@company.com** / **Admin@123**

## الخطوة 3 — رفع الكود على GitHub
```bash
git init
git add .
git commit -m "United Securities invoice system"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## الخطوة 4 — الربط مع Vercel
1. في Vercel → **Add New Project** → **Continue with GitHub** → اختار الـ repo
2. في **Environment Variables** ضيف الأربعة دول:
   | المتغير | القيمة |
   |---|---|
   | `DATABASE_URL` | (من Supabase — منفذ 6543) |
   | `DIRECT_URL` | (من Supabase — منفذ 5432) |
   | `NEXTAUTH_SECRET` | أي نص عشوائي طويل |
   | `NEXTAUTH_URL` | رابط مشروعك على Vercel (هتعرفه بعد أول نشر) |
3. اضغط **Deploy**

## الخطوة 5 — بعد أول نشر
- خد رابط المشروع (مثلاً `https://your-app.vercel.app`)
- رجّع حدّث متغير `NEXTAUTH_URL` بالرابط ده → **Redeploy**
- خلاص! البرنامج شغّال على النت 🎉

## التحديثات المستقبلية
أي تعديل في الكود → `git push` → Vercel ينشره تلقائياً خلال دقيقتين.
