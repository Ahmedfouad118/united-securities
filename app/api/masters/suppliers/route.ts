import { NextRequest } from 'next/server'
import { masterGET, masterPOST } from '@/lib/masterApi'

export async function GET() { return masterGET('supplier') }
export async function POST(req: NextRequest) { return masterPOST(req, 'supplier') }
