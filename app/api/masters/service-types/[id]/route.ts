import { NextRequest } from 'next/server'
import { masterPUT, masterDELETE } from '@/lib/masterApi'
export const PUT = (req: NextRequest, { params }: { params: { id: string } }) => masterPUT(req, 'serviceType', params.id)
export const DELETE = (_: NextRequest, { params }: { params: { id: string } }) => masterDELETE('serviceType', params.id)
