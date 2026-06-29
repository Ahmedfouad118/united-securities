import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/types'
import bcrypt from 'bcryptjs'

async function guard() {
  const session = await getServerSession(authOptions)
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const role = (session.user as any).role as Role
  if (!hasPermission(role, 'MANAGE_USERS')) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { session }
}

// Edit user: name, email, role, active, permissions, password (optional)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard()
  if (g.error) return g.error

  const body = await req.json()
  const { name, email, userRole, active, password, permissions } = body

  const data: any = {}
  if (name !== undefined) data.name = name
  if (email !== undefined) data.email = email
  if (userRole !== undefined) data.role = userRole
  if (active !== undefined) data.active = active
  if (permissions !== undefined) data.permissions = permissions ? JSON.stringify(permissions) : null
  if (password) data.password = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, permissions: true, createdAt: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard()
  if (g.error) return g.error

  // Don't allow deleting yourself
  if ((g.session!.user as any).id === params.id)
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 })

  // If user created invoices/receipts, disable instead of hard delete to preserve FK
  const counts = await prisma.invoice.count({ where: { createdById: params.id } })
  if (counts > 0) {
    await prisma.user.update({ where: { id: params.id }, data: { active: false } })
    return NextResponse.json({ ok: true, softDeleted: true })
  }
  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
