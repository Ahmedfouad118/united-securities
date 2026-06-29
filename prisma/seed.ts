import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Users
  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: { name: 'مدير النظام', email: 'admin@company.com', password: await bcrypt.hash('Admin@123', 12), role: 'ADMIN' },
  })
  await prisma.user.upsert({
    where: { email: 'accountant@company.com' },
    update: {},
    create: { name: 'المحاسب', email: 'accountant@company.com', password: await bcrypt.hash('Account@123', 12), role: 'ACCOUNTANT' },
  })

  // Invoice Categories
  const categories = [
    { name: 'Regular Invoice', nameAr: 'فاتورة عادية', type: 'REGULAR' },
    { name: 'Management Fee', nameAr: 'رسوم الإدارة', type: 'MANAGEMENT_FEE' },
    { name: 'Performance Fee', nameAr: 'رسوم الأداء', type: 'PERFORMANCE_FEE' },
    { name: 'Debit Note', nameAr: 'مذكرة مدين', type: 'DEBIT_NOTE' },
    { name: 'Credit Note', nameAr: 'مذكرة دائن', type: 'CREDIT_NOTE' },
  ]
  for (const c of categories) {
    await prisma.invoiceCategory.upsert({ where: { id: c.type }, update: {}, create: { id: c.type, ...c } })
  }

  // Bank Accounts
  await prisma.bankAccount.upsert({
    where: { id: 'bank-1' },
    update: {},
    create: { id: 'bank-1', bankName: 'Bank Muscat', bankNameAr: 'بنك مسقط', swiftCode: 'BMUSOMRX', accountNumber: '0123456789', iban: 'OM210123456789', accountName: 'United Securities LLC', currency: 'OMR' },
  })

  // Service Types
  const services = [
    { name: 'Company Commission', nameAr: 'عمولة الشركة', vatRate: 5 },
    { name: 'Management Fees', nameAr: 'رسوم الإدارة', vatRate: 5 },
    { name: 'Performance Fees', nameAr: 'رسوم الأداء', vatRate: 5 },
    { name: 'Consulting Services', nameAr: 'خدمات استشارية', vatRate: 5 },
  ]
  for (const s of services) {
    await prisma.serviceType.upsert({ where: { id: s.name }, update: {}, create: { id: s.name, ...s } })
  }

  // Payment Categories
  const paymentCats = [
    { name: 'Full Payment', nameAr: 'سداد كامل' },
    { name: 'Partial Payment', nameAr: 'سداد جزئي' },
    { name: 'Advance Payment', nameAr: 'دفعة مقدمة' },
  ]
  for (const p of paymentCats) {
    await prisma.paymentCategory.upsert({ where: { id: p.name }, update: {}, create: { id: p.name, ...p } })
  }

  console.log('✅ Seed completed')
}

main().catch(console.error).finally(() => prisma.$disconnect())
