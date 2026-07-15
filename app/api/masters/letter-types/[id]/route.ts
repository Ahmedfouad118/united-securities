import { NextRequest } from 'next/server'
import { masterPUT, masterDELETE } from '@/lib/masterApi'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) { return masterPUT(req, 'letterType', params.id) }
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) { return masterDELETE('letterType', params.id) }
