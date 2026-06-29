import { NextRequest } from 'next/server'
import { masterPUT, masterDELETE } from '@/lib/masterApi'
export const PUT = (req: NextRequest, { params }: { params: { id: string } }) => masterPUT(req, 'paymentCategory', params.id)
export const DELETE = (_: NextRequest, { params }: { params: { id: string } }) => masterDELETE('paymentCategory', params.id)
