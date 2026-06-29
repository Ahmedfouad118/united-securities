import { NextRequest } from 'next/server'
import { masterPUT, masterDELETE } from '@/lib/masterApi'
export const PUT = (req: NextRequest, { params }: { params: { id: string } }) => masterPUT(req, 'invoiceCategory', params.id)
export const DELETE = (_: NextRequest, { params }: { params: { id: string } }) => masterDELETE('invoiceCategory', params.id)
